/**
 * Shared work price calculation logic for Node.js (backend).
 * This is the SINGLE SOURCE OF TRUTH for total price calculations.
 * Mirrors: src/utils/workCalculations.js (frontend ESM version)
 * 
 * IMPORTANT: Must match WorkPdfReport.jsx and src/utils/workCalculations.js logic EXACTLY.
 */

function calculateWorkStats(items, pazarMultiplier = 1.5, mesaiMultiplier = 1.5) {
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

    const uniqueVehicles = new Set()
    const uniqueEmployees = new Set()

    // 1. Process items: resolution & vehicle base key
    const vehicleRateInfo = {}
    items.forEach(item => {
        if (item.vehicle_id) {
            uniqueVehicles.add(String(item.vehicle_id))
        } else if (item.custom_vehicle) {
            uniqueVehicles.add(`custom_${item.custom_vehicle}`)
        }
        if (item.employee_id) uniqueEmployees.add(item.employee_id)

        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
        const unitPriceVal = Number(item.unit_price) || 0

        if (!vehicleRateInfo[vehicleBaseKey]) {
            vehicleRateInfo[vehicleBaseKey] = { firstPositivePrice: 0 }
        }
        if (unitPriceVal > 0 && !vehicleRateInfo[vehicleBaseKey].firstPositivePrice) {
            vehicleRateInfo[vehicleBaseKey].firstPositivePrice = unitPriceVal
        }
    })

    // Group items by vehicleBaseKey ONLY (matches WorkPdfReport.jsx)
    const groupedByVehicle = {}

    items.forEach(item => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
        let unitPriceVal = Number(item.unit_price) || 0
        if (unitPriceVal === 0 && vehicleRateInfo[vehicleBaseKey]?.firstPositivePrice > 0) {
            unitPriceVal = vehicleRateInfo[vehicleBaseKey].firstPositivePrice
        }

        const cleanDesc = (item.description || '').replace(/\[[^\]]*\]\s*/g, '').trim()
        const descUpper = (item.description || '').toUpperCase()
        const dateObj = new Date(item.date)
        const isSunday = dateObj.getDay() === 0
        const isPazar = isSunday || descUpper.includes('PAZAR')
        const isSaatlik = descUpper.includes('[SAATLİK]') || item.pricingType === 'hourly'
        const isAylik = descUpper.includes('[AYLIK]') || item.pricingType === 'monthly'

        if (!groupedByVehicle[vehicleBaseKey]) {
            groupedByVehicle[vehicleBaseKey] = { items: [] }
        }

        groupedByVehicle[vehicleBaseKey].items.push({
            ...item,
            unitPriceVal,
            cleanDesc,
            isPazar,
            isSaatlik,
            isAylik
        })
    })

    let grandTotal = 0
    let totalHours = 0
    let totalOvertime = 0
    let totalPazarDayCount = 0
    let totalGunCount = 0
    let totalSaatCount = 0

    let totalMesaiPriceAmount = 0
    let totalPazarPriceAmount = 0
    let totalGunTutar = 0
    let totalSaatlikTutar = 0
    let totalEkOdemeler = 0

    const getItemEffectivePrice = (item, baseRate) => {
        const kMatch = (item.description || '').match(/\[KATSAYI:([^\]]+)\]/);
        if (kMatch) {
            const multVal = parseFloat(kMatch[1]) || 1;
            return (baseRate > 0 ? baseRate : (item.unitPriceVal || 0)) * multVal;
        }
        return item.unitPriceVal > 0 ? item.unitPriceVal : baseRate;
    };

    // Compute stats per vehicle group (exact same logic as WorkPdfReport.jsx)
    Object.values(groupedByVehicle).forEach(group => {
        const isAylikGroup = group.items.some(i => i.isAylik)
        const positivePriceItem = group.items.find(i => i.unitPriceVal > 0)
        const rawPrimaryPrice = positivePriceItem ? positivePriceItem.unitPriceVal : 0

        let dailyRate = rawPrimaryPrice
        let monthlyAmount = rawPrimaryPrice

        if (isAylikGroup && rawPrimaryPrice > 0) {
            if (rawPrimaryPrice > 10000) {
                dailyRate = rawPrimaryPrice / 26
                monthlyAmount = rawPrimaryPrice
            } else {
                dailyRate = rawPrimaryPrice
                monthlyAmount = rawPrimaryPrice * 26
            }
        }

        let groupPazarCount = 0
        let groupSaatlikCount = 0
        let groupGunCount = 0
        let groupMesaiCount = 0
        const additionsMap = {}

        group.items.forEach(item => {
            const hrs = Number(item.hours) || 0
            const mesaiHrs = Number(item.overtime_hours) || 0
            const travelPrice = Number(item.travel_price) || 0

            totalHours += hrs
            totalOvertime += mesaiHrs

            if (item.isPazar) {
                groupPazarCount += hrs
                totalPazarDayCount += hrs
            } else if (item.isSaatlik) {
                groupSaatlikCount += hrs
                totalSaatCount += hrs
            } else {
                groupGunCount += hrs
                if (!isAylikGroup) totalGunCount += hrs
            }

            if (mesaiHrs > 0) {
                groupMesaiCount += mesaiHrs
            }

            // Additions
            const additionMatches = (item.description || '').matchAll(/\[EK:([^:]+):([^\]]+)\]/g)
            let hasAddition = false
            for (const match of additionMatches) {
                hasAddition = true
                const type = match[1]
                const price = parseFloat(match[2]) || 0
                if (!additionsMap[type]) additionsMap[type] = { count: 0, price }
                additionsMap[type].count += 1
            }
            if (!hasAddition && travelPrice > 0) {
                if (!additionsMap['Yol']) additionsMap['Yol'] = { count: 0, price: travelPrice }
                additionsMap['Yol'].count += 1
            }
        })

        // Custom rate items
        const customRateItems = group.items.filter(i => {
            if (i.isPazar || i.isSaatlik) return false;
            const kMatch = (i.description || '').match(/\[KATSAYI:([^\]]+)\]/);
            if (kMatch && parseFloat(kMatch[1]) !== 1) return true;
            return i.unitPriceVal > 0 && Math.abs(i.unitPriceVal - dailyRate) > 1;
        });
        const customRateDaysCount = customRateItems.reduce((s, i) => s + (Number(i.hours) || 0), 0)

        let vehicleGunTutar = 0
        if (isAylikGroup) {
            const baseMonthlyDays = Math.max(0, 26 - customRateDaysCount)
            let customTotal = 0
            customRateItems.forEach(i => {
                const price = getItemEffectivePrice(i, dailyRate);
                customTotal += (Number(i.hours) || 0) * price
            })
            vehicleGunTutar = baseMonthlyDays * dailyRate + customTotal
        } else {
            const allDailyItems = group.items.filter(i => !i.isPazar && !i.isSaatlik)
            allDailyItems.forEach(i => {
                const price = getItemEffectivePrice(i, dailyRate)
                vehicleGunTutar += (Number(i.hours) || 0) * price
            })
        }

        // Pazar
        const pazarPrice = dailyRate > 0 ? dailyRate * parsedPazarMultiplier : 0
        const vehiclePazarTutar = groupPazarCount * pazarPrice

        // Saatlik
        const saatlikPrice = group.items.find(i => i.isSaatlik && i.unitPriceVal > 0)?.unitPriceVal || 0
        const vehicleSaatlikTutar = groupSaatlikCount * saatlikPrice

        // Mesai
        const hourlyRateForMesai = dailyRate > 0 ? dailyRate / 9 : 0
        const mesaiPrice = parseFloat((hourlyRateForMesai * parsedMesaiMultiplier).toFixed(2))
        const vehicleMesaiTutar = groupMesaiCount * mesaiPrice

        // Ek Ödemeler
        let vehicleAdditionsTutar = 0
        Object.values(additionsMap).forEach(data => {
            vehicleAdditionsTutar += data.count * data.price
        })

        totalGunTutar += vehicleGunTutar
        totalPazarPriceAmount += vehiclePazarTutar
        totalSaatlikTutar += vehicleSaatlikTutar
        totalMesaiPriceAmount += vehicleMesaiTutar
        totalEkOdemeler += vehicleAdditionsTutar

        const groupGrandTotal = vehicleGunTutar + vehiclePazarTutar + vehicleSaatlikTutar + vehicleMesaiTutar + vehicleAdditionsTutar
        grandTotal += groupGrandTotal
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

module.exports = { calculateWorkStats }
