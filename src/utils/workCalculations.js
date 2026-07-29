/**
 * Shared work price calculation logic.
 * This is the SINGLE SOURCE OF TRUTH for total price calculations.
 * Used by: WorkDetails.jsx (cards), work.service.js (list), WorkPdfReport.jsx (PDF)
 *
 * IMPORTANT: Must match WorkPdfReport.jsx logic EXACTLY.
 *
 * @param {Array} items - work_items array
 * @returns {Object} calculated stats
 */
export function calculateWorkStats(items, pazarMultiplier = 1.5, mesaiMultiplier = 1.5) {
    const pazarMultVal = parseFloat(pazarMultiplier)
    const parsedPazarMultiplier = (pazarMultiplier === "" || pazarMultiplier === null || pazarMultiplier === undefined || isNaN(pazarMultVal)) 
        ? 1.5 
        : pazarMultVal

    const mesaiMultVal = parseFloat(mesaiMultiplier)
    const parsedMesaiMultiplier = (mesaiMultiplier === "" || mesaiMultiplier === null || mesaiMultiplier === undefined || isNaN(mesaiMultVal)) 
        ? 1.5 
        : mesaiMultVal

    if (!items || items.length === 0) {
        return {
            totalHours: 0,
            totalOvertime: 0,
            totalPazarDayCount: 0,
            totalEkOdemeler: 0,
            grandTotal: 0,
            totalMesaiPriceAmount: 0,
            totalPazarPriceAmount: 0,
            totalGunTutar: 0,
            totalSaatlikTutar: 0,
            uniqueVehicles: new Set(),
            uniqueEmployees: new Set(),
            itemCount: 0
        }
    }

    let totalHours = 0
    let totalOvertime = 0
    let totalPazarDayCount = 0
    let totalGunCount = 0
    let totalSaatCount = 0
    let grandTotal = 0

    const uniqueVehicles = new Set()
    const uniqueEmployees = new Set()
    const groupedItems = {}

    // First pass: mark isPazar on each item (same as PDF report line 88-97)
    // This ensures sampleGunPrice filter correctly excludes Sunday items
    const processedItems = items.map(item => {
        if (item.vehicle_id) {
            uniqueVehicles.add(String(item.vehicle_id))
        } else if (item.custom_vehicle) {
            uniqueVehicles.add(`custom_${item.custom_vehicle}`)
        }
        if (item.employee_id) uniqueEmployees.add(item.employee_id)

        const descUpper = (item.description || '').toUpperCase()
        const dateObj = new Date(item.date)
        const isSunday = dateObj.getDay() === 0
        const isPazar = isSunday || descUpper.includes('PAZAR')

        // Clone item and normalize description for Pazar detection
        // (same as PDF: if it's Sunday but description doesn't say PAZAR, add [PAZAR])
        let normalizedDesc = item.description || ''
        if (isSunday && !descUpper.includes('PAZAR')) {
            normalizedDesc = normalizedDesc ? `[PAZAR] ${normalizedDesc}` : '[PAZAR]'
        }

        return { ...item, isPazar, _normalizedDesc: normalizedDesc }
    })

    // Araç ve Tarife bazında kalıtım (Fiyatsız devam/mesai satırlarının kendi fiyat grubuna bağlanması)
    const vehicleRateInfo = {}
    processedItems.forEach(item => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
        const unitPriceVal = Number(item.unit_price) || 0
        const cleanDesc = (item.description || '').replace(/\[(YOL|SAATLİK|AYLIK|PAZAR)\]\s*/gi, '').replace(/\[EK:[^:]+:[^\]]+\]\s*/gi, '').trim()

        if (!vehicleRateInfo[vehicleBaseKey]) {
            vehicleRateInfo[vehicleBaseKey] = {
                firstPositivePrice: 0,
                descByPrice: {}
            }
        }

        if (unitPriceVal > 0) {
            if (!vehicleRateInfo[vehicleBaseKey].firstPositivePrice) {
                vehicleRateInfo[vehicleBaseKey].firstPositivePrice = unitPriceVal
            }
            if (cleanDesc && !vehicleRateInfo[vehicleBaseKey].descByPrice[unitPriceVal]) {
                vehicleRateInfo[vehicleBaseKey].descByPrice[unitPriceVal] = cleanDesc
            }
        }
    })

    const resolveItemEffectiveInfo = (item) => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
        let unitPriceVal = Number(item.unit_price) || 0
        let cleanDesc = (item.description || '').replace(/\[(YOL|SAATLİK|AYLIK|PAZAR)\]\s*/gi, '').replace(/\[EK:[^:]+:[^\]]+\]\s*/gi, '').trim()

        const info = vehicleRateInfo[vehicleBaseKey]
        if (info) {
            if (unitPriceVal === 0 && info.firstPositivePrice > 0) {
                unitPriceVal = info.firstPositivePrice
            }
            if (!cleanDesc && unitPriceVal > 0 && info.descByPrice[unitPriceVal]) {
                cleanDesc = info.descByPrice[unitPriceVal]
            }
        }
        return { unitPriceVal, cleanDesc }
    }

    processedItems.forEach(item => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
        const { unitPriceVal, cleanDesc } = resolveItemEffectiveInfo(item)
        const descUpper = (item._normalizedDesc || '').toUpperCase()
        const isSaatlik = descUpper.includes('[SAATLİK]') || item.pricingType === 'hourly'
        const isAylik = descUpper.includes('[AYLIK]') || item.pricingType === 'monthly'
        const rateTypeKey = isAylik ? 'aylik' : (isSaatlik ? 'saatlik' : 'gun')
        const key = `${vehicleBaseKey}_${rateTypeKey}_price_${unitPriceVal}_desc_${cleanDesc.toLowerCase()}`

        if (!groupedItems[key]) {
            groupedItems[key] = {
                unitPriceVal: unitPriceVal,
                cleanDesc: cleanDesc,
                items: [],
                totalGun: 0,
                totalPazar: 0,
                totalSaatlik: 0,
                totalMesai: 0,
                isAylik: false,
                isSaatlik: isSaatlik,
                additions: {}
            }
        }
        groupedItems[key].items.push(item)

        const gunSayisi = Number(item.hours) || 0
        const mesaiSaatleri = Number(item.overtime_hours) || 0
        const travelPrice = Number(item.travel_price) || 0

        if (isAylik) groupedItems[key].isAylik = true

        totalHours += gunSayisi
        if (isSaatlik) {
            totalSaatCount += gunSayisi
        } else {
            totalGunCount += gunSayisi
        }

        // Parse custom additions from description [EK:Type:Price]
        const additionMatches = (item.description || '').matchAll(/\[EK:([^:]+):([^\]]+)\]/g)
        let hasAddition = false

        for (const match of additionMatches) {
            hasAddition = true
            const type = match[1]
            const price = parseFloat(match[2]) || 0

            if (!groupedItems[key].additions[type]) {
                groupedItems[key].additions[type] = { count: 0, price: price }
            }
            groupedItems[key].additions[type].count += 1
        }

        // Fallback for legacy travel_price if no EK additions found
        if (!hasAddition && travelPrice > 0) {
            if (!groupedItems[key].additions['Yol']) {
                groupedItems[key].additions['Yol'] = { count: 0, price: travelPrice }
            }
            groupedItems[key].additions['Yol'].count += 1
        }

        if (item.isPazar) {
            groupedItems[key].totalPazar += gunSayisi
            totalPazarDayCount += gunSayisi
        } else if (isSaatlik) {
            groupedItems[key].totalSaatlik += gunSayisi
        } else {
            groupedItems[key].totalGun += gunSayisi
        }

        groupedItems[key].totalMesai += mesaiSaatleri
        totalOvertime += mesaiSaatleri
    })

    let totalMesaiPriceAmount = 0
    let totalPazarPriceAmount = 0
    let totalGunTutar = 0
    let totalSaatlikTutar = 0
    let totalEkOdemeler = 0

    Object.values(groupedItems).forEach(group => {
        const sampleGunPrice = group.unitPriceVal || group.items.find(i =>
            !(i._normalizedDesc || '').toUpperCase().includes('PAZAR') &&
            !(i._normalizedDesc || '').toUpperCase().includes('[SAATLİK]') &&
            (Number(i.hours) > 0)
        )?.unit_price || 0

        const sampleSaatlikPrice = group.unitPriceVal || group.items.find(i =>
            (i._normalizedDesc || '').toUpperCase().includes('[SAATLİK]')
        )?.unit_price || 0

        const dailyRate = (group.isAylik && sampleGunPrice > 10000) ? sampleGunPrice / 26 : sampleGunPrice;

        const customRateItems = group.items.filter(i => !i.isPazar && !i.isSaatlik && i.unitPriceVal > 0 && Math.abs(i.unitPriceVal - dailyRate) > 1);
        const customRateDaysCount = customRateItems.reduce((s, i) => s + (Number(i.hours) || 0), 0);
        let customRateTotal = 0;
        customRateItems.forEach(i => {
            customRateTotal += (Number(i.hours) || 0) * i.unitPriceVal;
        });

        const baseMonthlyDays = Math.max(0, 26 - customRateDaysCount);
        const monthlyAmount = group.isAylik ? (baseMonthlyDays * dailyRate + customRateTotal) : 0;

        let samplePazarPrice = 0
        const pazarItemWithExplicitKatsayi = group.items.find(i => i.isPazar && (i._normalizedDesc || '').includes('[KATSAYI:'))
        if (pazarItemWithExplicitKatsayi && Number(pazarItemWithExplicitKatsayi.unit_price) > 0) {
            samplePazarPrice = Number(pazarItemWithExplicitKatsayi.unit_price)
        } else if (dailyRate > 0) {
            samplePazarPrice = dailyRate * parsedPazarMultiplier
        } else {
            const fallbackPrice = group.items.find(i => i.isPazar && Number(i.unit_price) > 0)?.unit_price || 0
            samplePazarPrice = fallbackPrice > 0 ? fallbackPrice * parsedPazarMultiplier : 0
        }

        const cg = group.isAylik ? monthlyAmount : (group.totalGun * dailyRate)
        const saatlikTutar = group.totalSaatlik * sampleSaatlikPrice
        const pazarTutar = group.totalPazar * samplePazarPrice

        let mesaiTutar = 0
        if (group.totalMesai > 0) {
            let baseHourlyRateForMesai = 0
            if (group.isSaatlik && sampleSaatlikPrice > 0) {
                baseHourlyRateForMesai = sampleSaatlikPrice
            } else if (dailyRate > 0) {
                baseHourlyRateForMesai = dailyRate / 9
            }
            mesaiTutar = group.totalMesai * baseHourlyRateForMesai * parsedMesaiMultiplier
        }

        // Ek ödemeler (additions: Yol, EK:xxx vb.)
        let additionsTutar = 0
        if (group.additions) {
            Object.values(group.additions).forEach(data => {
                additionsTutar += data.count * data.price
            })
        }

        totalMesaiPriceAmount += mesaiTutar
        totalPazarPriceAmount += pazarTutar
        totalGunTutar += cg
        totalSaatlikTutar += saatlikTutar
        totalEkOdemeler += additionsTutar

        grandTotal += cg + pazarTutar + saatlikTutar + mesaiTutar + additionsTutar
    })

    let durationText = '0 Gün'
    if (totalGunCount > 0 && totalSaatCount > 0) {
        durationText = `${totalGunCount} Gün + ${totalSaatCount} Saat`
    } else if (totalSaatCount > 0) {
        durationText = `${totalSaatCount} Saat`
    } else {
        durationText = `${totalGunCount} Gün`
    }

    return {
        totalHours,
        totalGunCount,
        totalSaatCount,
        durationText,
        totalOvertime,
        totalPazarDayCount,
        totalEkOdemeler,
        grandTotal,
        totalMesaiPriceAmount,
        totalPazarPriceAmount,
        totalGunTutar,
        totalSaatlikTutar,
        uniqueVehicles,
        uniqueEmployees,
        itemCount: items.length
    }
}
