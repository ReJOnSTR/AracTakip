const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

async function getDashboardStats(companyId) {
    try {
        const cid = parseInt(companyId);

        // Count queries
        const totalVehicles = await prisma.vehicles.count({ where: { company_id: cid, status: 'active', is_archived: 0 } });
        const totalEmployees = await prisma.employees.count({ where: { company_id: cid, status: 'active' } });

        // Current month bounds
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Maintenance cost this month
        let maintenanceCost = 0;
        try {
            const maints = await prisma.maintenances.aggregate({
                _sum: { cost: true },
                where: { vehicles: { company_id: cid }, date: { gte: startOfMonth }, is_archived: 0 }
            });
            maintenanceCost = maints._sum.cost || 0;
        } catch (e) { console.error('Dashboard maintenances aggregate error:', e.message); }

        // Service cost this month
        let serviceCost = 0;
        try {
            const servs = await prisma.services.aggregate({
                _sum: { cost: true },
                where: { vehicles: { company_id: cid }, date: { gte: startOfMonth }, is_archived: 0 }
            });
            serviceCost = servs._sum.cost || 0;
        } catch (e) { console.error('Dashboard services aggregate error:', e.message); }

        // Inspection cost this month (field is inspection_date, NOT date)
        let inspectionCost = 0;
        try {
            const insps = await prisma.inspections.aggregate({
                _sum: { cost: true },
                where: { vehicles: { company_id: cid }, inspection_date: { gte: startOfMonth }, is_archived: 0 }
            });
            inspectionCost = insps._sum.cost || 0;
        } catch (e) { console.error('Dashboard inspections aggregate error:', e.message); }

        const currentMonthCost = maintenanceCost + serviceCost + inspectionCost;

        return {
            success: true, data: {
                totalVehicles,
                activeAssignments: 0,
                totalEmployees,
                monthlyCost: currentMonthCost
            }
        };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getUpcomingEvents(companyId) {
    try {
        const cid = parseInt(companyId);
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30); // Next 30 days

        const events = [];

        // 1. Get Inspections
        try {
            const inspections = await prisma.inspections.findMany({
                where: { vehicles: { company_id: cid }, next_inspection: { lte: futureDate }, is_archived: 0 },
                include: { vehicles: true }
            });
            inspections.forEach(i => {
                if (i.next_inspection) {
                    events.push({
                        id: i.id,
                        eventType: 'inspection',
                        type: i.type === 'traffic' ? 'Tüvtürk Muayene' : 'Periyodik Kontrol',
                        date: i.next_inspection,
                        vehicleId: i.vehicle_id,
                        plate: i.vehicles?.plate,
                        brand: i.vehicles?.brand,
                        model: i.vehicles?.model
                    });
                }
            });
        } catch (e) { console.error('getUpcomingEvents inspections error:', e.message); }

        // 2. Get Insurances
        try {
            const insurances = await prisma.insurances.findMany({
                where: { vehicles: { company_id: cid }, end_date: { lte: futureDate }, is_archived: 0 },
                include: { vehicles: true }
            });
            insurances.forEach(i => {
                if (i.end_date) {
                    events.push({
                        id: i.id,
                        eventType: 'insurance',
                        type: i.type === 'traffic' ? 'Trafik Sigortası' : 'Kasko',
                        date: i.end_date,
                        vehicleId: i.vehicle_id,
                        plate: i.vehicles?.plate,
                        brand: i.vehicles?.brand,
                        model: i.vehicles?.model
                    });
                }
            });
        } catch (e) { console.error('getUpcomingEvents insurances error:', e.message); }

        // 3. Get Maintenances
        try {
            const maintenances = await prisma.maintenances.findMany({
                where: { vehicles: { company_id: cid }, next_date: { lte: futureDate }, is_archived: 0 },
                include: { vehicles: true }
            });
            maintenances.forEach(m => {
                if (m.next_date) {
                    events.push({
                        id: m.id,
                        eventType: 'maintenance',
                        type: 'Araç Bakımı',
                        date: m.next_date,
                        vehicleId: m.vehicle_id,
                        plate: m.vehicles?.plate,
                        brand: m.vehicles?.brand,
                        model: m.vehicles?.model
                    });
                }
            });
        } catch (e) { console.error('getUpcomingEvents maintenances error:', e.message); }

        // Sort by date ascending (closest first)
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        return { success: true, data: events };
    } catch (error) {
        console.error("Dashboard getUpcomingEvents error:", error);
        return { success: false, error: error.message };
    }
}

async function getRecentActivity(companyId) {
    try {
        const cid = parseInt(companyId);

        // Fetch recent services as an example of recent activity. 
        // A more complete logging table might be needed for full audit trails.
        const recentServices = await prisma.services.findMany({
            where: { vehicles: { company_id: cid } },
            include: { vehicles: true },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            take: 10
        });

        const activities = recentServices.map(s => ({
            id: s.id,
            description: `${s.vehicles?.plate} için ${s.vendor} servisi.`,
            date: s.date,
            type: 'service'
        }));

        return { success: true, data: activities };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== WORKS (ISLER) ==========
async function getWorks(companyId) {
    try {
        const works = await prisma.works.findMany({
            where: { company_id: parseInt(companyId) },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: works };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createWork(data) {
    try {
        const result = await prisma.works.create({
            data: {
                company_id: parseInt(data.companyId),
                title: data.title,
                description: data.description || null,
                status: data.status || 'pending',
                price: parseFloat(data.price) || 0,
                location: data.location || null,
                start_date: data.startDate ? new Date(data.startDate) : null,
                end_date: data.endDate ? new Date(data.endDate) : null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}
async function updateWork(data) {
    try {
        const { id, companyId, ...rest } = data;
        const result = await prisma.works.update({
            where: { id: parseInt(id) },
            data: {
                title: rest.title,
                description: rest.description || null,
                status: rest.status || 'pending',
                price: parseFloat(rest.price) || 0,
                location: rest.location || null,
                start_date: rest.startDate ? new Date(rest.startDate) : null,
                end_date: rest.endDate ? new Date(rest.endDate) : null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}
async function deleteWork(id) {
    try {
        await prisma.works.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

module.exports = {
    getDashboardStats, getUpcomingEvents, getRecentActivity,
    getWorks, createWork, updateWork, deleteWork
};
