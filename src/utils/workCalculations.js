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

    processedItems.forEach(item => {
        const key = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
        if (!groupedItems[key]) {
            groupedItems[key] = {
                items: [],
                totalGun: 0,
                totalPazar: 0,
                totalSaatlik: 0,
                totalMesai: 0,
                isAylik: false,
                additions: {}
            }
        }
        groupedItems[key].items.push(item)

        const gunSayisi = Number(item.hours) || 0
        const mesaiSaatleri = Number(item.overtime_hours) || 0
        const travelPrice = Number(item.travel_price) || 0
        const descUpper = (item._normalizedDesc || '').toUpperCase()
        const isSaatlik = descUpper.includes('[SAATLİK]')
        const isAylik = descUpper.includes('[AYLIK]')

        if (isAylik) groupedItems[key].isAylik = true

        totalHours += gunSayisi

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
        // sampleGunPrice: normal gün fiyatı
        // Uses _normalizedDesc so Sunday items are correctly excluded via PAZAR keyword
        const sampleGunPrice = group.items.find(i =>
            !(i._normalizedDesc || '').toUpperCase().includes('PAZAR') &&
            !(i._normalizedDesc || '').toUpperCase().includes('[SAATLİK]') &&
            (Number(i.hours) > 0)
        )?.unit_price || 0

        const sampleSaatlikPrice = group.items.find(i =>
            (i._normalizedDesc || '').toUpperCase().includes('[SAATLİK]')
        )?.unit_price || 0

        // Pazar fiyatı: Use isPazar flag (catches both description and date-based Sundays)
        let samplePazarPrice = group.items.find(i => i.isPazar)?.unit_price || 0
        if (samplePazarPrice <= sampleGunPrice && sampleGunPrice > 0) {
            samplePazarPrice = sampleGunPrice * parsedPazarMultiplier
        }

        // Mesai fiyatı
        let sampleMesaiPrice = group.items.find(i => i.overtime_hours > 0)?.unit_price || 0
        if (sampleMesaiPrice <= sampleGunPrice && sampleGunPrice > 0) {
            sampleMesaiPrice = parseFloat(((sampleGunPrice / 8) * parsedMesaiMultiplier).toFixed(2))
        }

        const cg = group.isAylik ? (26 * sampleGunPrice) : (group.totalGun * sampleGunPrice)
        const mesaiTutar = group.totalMesai * sampleMesaiPrice
        const pazarTutar = group.totalPazar * samplePazarPrice
        const saatlikTutar = group.totalSaatlik * sampleSaatlikPrice

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

    return {
        totalHours,
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
