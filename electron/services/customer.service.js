const { getPrismaClient } = require('../prismaClient')

async function getCustomers(companyId, isArchived = 0) {
    try {
        const prisma = getPrismaClient()
        const customersList = await prisma.customers.findMany({
            where: { 
                company_id: parseInt(companyId),
                OR: [
                    { is_archived: isArchived },
                    { is_archived: null }
                ]
            },
            include: {
                works: {
                    include: {
                        work_items: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        // Format and calculate balance (bakiye = works total_price - transactions amount where customer is referenced... wait, we don't have transactions linked to customer yet!)
        // Wait, the user said "ödeme bilgileri yönetmebileceğim bir sistem", if we just look at works, total_price is the receivable. 
        // We might need to add customer_id to transactions later, or just calculate total work price for now and a basic collection from works if we had one.
        // Actually, we can sum the work_items total_price for balances right now.
        const formatted = customersList.map(c => {
            const totalWorkReceivable = (c.works || []).reduce((sum, w) => {
                if (w.status === 'paid' || w.status === 'cancelled') return sum;
                const workTotal = (w.work_items || []).reduce((wSum, item) => wSum + (item.total_price || 0), 0)
                return sum + workTotal
            }, 0)

            return {
                ...c,
                total_receivable: totalWorkReceivable,
                work_count: (c.works || []).length
            }
        })

        return { success: true, data: formatted }
    } catch (error) {
        console.error('Error fetching customers:', error)
        return { success: false, error: error.message }
    }
}

async function getCustomerDetails(id) {
    try {
        const prisma = getPrismaClient()
        const customer = await prisma.customers.findUnique({
            where: { id: parseInt(id) },
            include: {
                works: {
                    include: {
                        work_items: true,
                        vehicles: true,
                        employees: true
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        })

        if (!customer) return { success: false, error: 'Müşteri bulunamadı' }

        const totalWorkReceivable = (customer.works || []).reduce((sum, w) => {
            if (w.status === 'paid' || w.status === 'cancelled') return sum;
            const workTotal = (w.work_items || []).reduce((wSum, item) => wSum + (item.total_price || 0), 0)
            return sum + workTotal
        }, 0)

        // Enhance work details for display
        const enhancedWorks = (customer.works || []).map(w => {
            const itemDates = (w.work_items || []).filter(i => i.date).map(i => new Date(i.date).getTime());
            let dynamicStart = w.start_date;
            let dynamicEnd = w.end_date;

            if (itemDates.length > 0) {
                dynamicStart = new Date(Math.min(...itemDates));
                dynamicEnd = new Date(Math.max(...itemDates));
            }

            const uniqueDays = new Set((w.work_items || []).filter(i => i.date).map(i => {
                const d = new Date(i.date)
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
            })).size;

            return {
                ...w,
                start_date: dynamicStart,
                end_date: dynamicEnd,
                total_days: uniqueDays > 0 ? uniqueDays : 0,
                item_count: (w.work_items || []).length,
                total_hours: (w.work_items || []).reduce((sum, i) => sum + (i.hours || 0), 0),
                total_price: (w.work_items || []).reduce((sum, i) => sum + (i.total_price || 0), 0)
            }
        })

        // Sort enhanced works by start_date descending
        enhancedWorks.sort((a, b) => {
            const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
            const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
            return dateB - dateA;
        });

        return {
            success: true,
            data: {
                ...customer,
                works: enhancedWorks,
                total_receivable: totalWorkReceivable
            }
        }
    } catch (error) {
        console.error('Error fetching customer details:', error)
        return { success: false, error: error.message }
    }
}

async function createCustomer(data) {
    try {
        const prisma = getPrismaClient()
        const newCustomer = await prisma.customers.create({
            data: {
                company_id: parseInt(data.companyId),
                name: data.name,
                phone: data.phone,
                email: data.email,
                address: data.address,
                tax_number: data.tax_number,
                tax_office: data.tax_office,
                notes: data.notes
            }
        })
        return { success: true, data: newCustomer }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function updateCustomer(data) {
    try {
        const prisma = getPrismaClient()
        const updated = await prisma.customers.update({
            where: { id: parseInt(data.id) },
            data: {
                name: data.name,
                phone: data.phone,
                email: data.email,
                address: data.address,
                tax_number: data.tax_number,
                tax_office: data.tax_office,
                notes: data.notes
            }
        })
        return { success: true, data: updated }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function deleteCustomer(id) {
    try {
        const prisma = getPrismaClient()
        await prisma.customers.delete({
            where: { id: parseInt(id) }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

module.exports = {
    getCustomers,
    getCustomerDetails,
    createCustomer,
    updateCustomer,
    deleteCustomer
}
