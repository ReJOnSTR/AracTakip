const { getPrismaClient } = require('../prismaClient')

async function getWorks(companyId, isArchived = 0) {
    try {
        const prisma = getPrismaClient()
        const works = await prisma.works.findMany({
            where: { company_id: parseInt(companyId), is_archived: isArchived },
            include: {
                work_items: true,
                customers: true
            },
            orderBy: { created_at: 'desc' }
        })

        // Format to include item_count and totals
        const formatted = works.map(w => {
            const itemDates = w.work_items.filter(i => i.date).map(i => new Date(i.date).getTime());
            let dynamicStart = w.start_date;
            let dynamicEnd = w.end_date;

            if (itemDates.length > 0) {
                dynamicStart = new Date(Math.min(...itemDates));
                dynamicEnd = new Date(Math.max(...itemDates));
            }

            const uniqueDays = new Set(w.work_items.filter(i => i.date).map(i => {
                const d = new Date(i.date)
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
            })).size;

            return {
                ...w,
                customer_name: w.customers?.name || w.customer,
                start_date: dynamicStart,
                end_date: dynamicEnd,
                total_days: uniqueDays > 0 ? uniqueDays : 0,
                item_count: w.work_items.length,
                total_hours: w.work_items.reduce((sum, i) => sum + (i.hours || 0), 0),
                total_price: w.work_items.reduce((sum, i) => sum + (i.total_price || 0), 0)
            };
        })

        return { success: true, data: formatted }
    } catch (error) {
        console.error('Error fetching works:', error)
        return { success: false, error: error.message }
    }
}

async function getWorkDetails(id) {
    try {
        const prisma = getPrismaClient()
        const work = await prisma.works.findUnique({
            where: { id: parseInt(id) },
            include: {
                customers: true,
                work_items: {
                    include: {
                        vehicles: true,
                        employees: true
                    },
                    orderBy: [{ date: 'asc' }, { id: 'asc' }]
                }
            }
        })

        if (!work) return { success: false, error: 'İş bulunamadı' }

        // Flatten related data
        const formatted = {
            ...work,
            customer_name: work.customers?.name || work.customer,
            items: work.work_items.map(item => ({
                ...item,
                plate: item.vehicles?.plate || '',
                brand: item.vehicles?.brand || '',
                model: item.vehicles?.model || '',
                employee_name: item.employees?.first_name || '',
                employee_surname: item.employees?.last_name || ''
            }))
        }

        return { success: true, data: formatted }
    } catch (error) {
        console.error('Error fetching work details:', error)
        return { success: false, error: error.message }
    }
}

async function createWork(data) {
    try {
        const prisma = getPrismaClient()
        const newWork = await prisma.works.create({
            data: {
                company_id: parseInt(data.companyId),
                title: data.title,
                customer_id: data.customerId ? parseInt(data.customerId) : null,
                customer: data.customer, // keep fallback logic for now if any
                description: data.description,
                status: data.status || 'pending',
                location: data.location,
                work_start_time: data.work_start_time || '08:00',
                work_end_time: data.work_end_time || '17:00',
                start_date: data.startDate ? new Date(data.startDate) : null,
                end_date: data.endDate ? new Date(data.endDate) : null
            }
        })
        return { success: true, data: newWork }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function updateWork(data) {
    try {
        const prisma = getPrismaClient()
        const updated = await prisma.works.update({
            where: { id: parseInt(data.id) },
            data: {
                title: data.title !== undefined ? data.title : undefined,
                customer_id: data.customerId !== undefined ? (data.customerId ? parseInt(data.customerId) : null) : undefined,
                customer: data.customer !== undefined ? data.customer : undefined,
                description: data.description !== undefined ? data.description : undefined,
                status: data.status !== undefined ? data.status : undefined,
                location: data.location !== undefined ? data.location : undefined,
                work_start_time: data.work_start_time !== undefined ? data.work_start_time : undefined,
                work_end_time: data.work_end_time !== undefined ? data.work_end_time : undefined,
                start_date: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
                end_date: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined
            }
        })
        return { success: true, data: updated }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function deleteWork(id) {
    try {
        const prisma = getPrismaClient()
        await prisma.works.delete({
            where: { id: parseInt(id) }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ====== WORK ITEMS ======

function calculateItemTotalPrice(data) {
    const descUpper = (data.description || '').toUpperCase();
    const isSaatlik = descUpper.includes('[SAATLİK]');

    let isPazar = descUpper.includes('PAZAR');
    if (data.date) {
        const d = new Date(data.date);
        if (d.getDay() === 0) isPazar = true;
    }

    const hours = parseFloat(data.hours || 0);
    const overtimeHours = parseFloat(data.overtimeHours || 0);
    const unitPrice = parseFloat(data.unitPrice || 0);
    const travelPrice = parseFloat(data.travelPrice || 0);

    const isAylik = descUpper.includes('[AYLIK]');

    let baseTotal = 0;
    if (isSaatlik) {
        baseTotal = unitPrice * hours;
    } else {
        let gunRate = unitPrice;

        if (isAylik) {
            if (isPazar) {
                gunRate = unitPrice + (unitPrice * 1.5);
            }
        } else {
            if (isPazar) {
                gunRate = unitPrice * 1.5;
            }
        }

        const mesaiRate = (unitPrice / 8) * 1.5;
        baseTotal = (hours * gunRate) + (overtimeHours * mesaiRate);
    }

    // Add travel price (flat per entry)
    return baseTotal + travelPrice;
}

async function addWorkItem(data) {
    try {
        const prisma = getPrismaClient()

        let totalPrice = calculateItemTotalPrice(data);

        const newItem = await prisma.work_items.create({
            data: {
                work_id: parseInt(data.workId),
                date: new Date(data.date),
                receipt_no: data.receiptNo || null,
                vehicle_id: data.vehicleId ? parseInt(data.vehicleId) : null,
                employee_id: data.employeeId ? parseInt(data.employeeId) : null,
                start_time: data.startTime || null,
                end_time: data.endTime || null,
                hours: parseFloat(data.hours || 0),
                overtime_hours: parseFloat(data.overtimeHours || 0),
                unit_price: parseFloat(data.unitPrice || 0),
                travel_price: parseFloat(data.travelPrice || 0),
                total_price: totalPrice,
                description: data.description || null
            }
        })
        return { success: true, data: newItem }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function addBulkWorkItems(itemsData) {
    try {
        const prisma = getPrismaClient()

        // Prepare array for createMany
        const formattedItems = itemsData.map(data => {
            let totalPrice = calculateItemTotalPrice(data);
            return {
                work_id: parseInt(data.workId),
                date: new Date(data.date),
                receipt_no: data.receiptNo || null,
                vehicle_id: data.vehicleId ? parseInt(data.vehicleId) : null,
                employee_id: data.employeeId ? parseInt(data.employeeId) : null,
                start_time: data.startTime || null,
                end_time: data.endTime || null,
                hours: parseFloat(data.hours || 0),
                overtime_hours: parseFloat(data.overtimeHours || 0),
                unit_price: parseFloat(data.unitPrice || 0),
                travel_price: parseFloat(data.travelPrice || 0),
                total_price: totalPrice,
                description: data.description || null
            }
        });

        const result = await prisma.work_items.createMany({
            data: formattedItems
        });

        return { success: true, count: result.count }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function updateWorkItem(data) {
    try {
        const prisma = getPrismaClient()

        let totalPrice = calculateItemTotalPrice(data);

        const updated = await prisma.work_items.update({
            where: { id: parseInt(data.id) },
            data: {
                date: new Date(data.date),
                receipt_no: data.receiptNo || null,
                vehicle_id: data.vehicleId ? parseInt(data.vehicleId) : null,
                employee_id: data.employeeId ? parseInt(data.employeeId) : null,
                start_time: data.startTime || null,
                end_time: data.endTime || null,
                hours: parseFloat(data.hours || 0),
                overtime_hours: parseFloat(data.overtimeHours || 0),
                unit_price: parseFloat(data.unitPrice || 0),
                travel_price: parseFloat(data.travelPrice || 0),
                total_price: totalPrice,
                description: data.description || null
            }
        })
        return { success: true, data: updated }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function deleteWorkItem(id) {
    try {
        const prisma = getPrismaClient()
        await prisma.work_items.delete({
            where: { id: parseInt(id) }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function deleteBulkWorkItems(ids) {
    try {
        const prisma = getPrismaClient()
        await prisma.work_items.deleteMany({
            where: {
                id: { in: ids.map(id => parseInt(id)) }
            }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

module.exports = {
    getWorks,
    getWorkDetails,
    createWork,
    updateWork,
    deleteWork,
    addWorkItem,
    addBulkWorkItems,
    updateWorkItem,
    deleteWorkItem,
    deleteBulkWorkItems
}
