const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

async function getDashboardStats(companyId) {
    try {
        const cid = parseInt(companyId);

        // Count queries
        // Removed status: 'active' strict check because older DBs might have NULL or different case
        const totalVehicles = await prisma.vehicles.count({ where: { company_id: cid } });
        let activeVehicles = await prisma.vehicles.count({ where: { company_id: cid, status: 'aktif' } }).catch(() => 0); // Try 'aktif'
        if (activeVehicles === 0) {
            // Fallback for English status
            activeVehicles = await prisma.vehicles.count({ where: { company_id: cid, status: 'active' } }).catch(() => 0);
        }

        const totalEmployees = await prisma.employees.count({ where: { company_id: cid } });

        // Assignments (Active only, assuming return_date is null for active)
        const activeAssignments = await prisma.assignments.count({
            where: { vehicles: { company_id: cid }, return_date: null }
        }).catch(() => 0); // Catch schema mismatch if return_date doesn't exist

        // Current month bounds
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // 1. Maintenance Costs
        const maints = await prisma.maintenances.aggregate({
            _sum: { cost: true },
            where: { vehicles: { company_id: cid }, date: { gte: startOfMonth } }
        });
        const maintCost = maints._sum.cost || 0;

        // 2. Service Costs
        const servs = await prisma.services.aggregate({
            _sum: { cost: true },
            where: { vehicles: { company_id: cid }, date: { gte: startOfMonth } }
        });
        const serviceCost = servs._sum.cost || 0;

        // 3. Inspection Costs
        const insps = await prisma.inspections.aggregate({
            _sum: { cost: true },
            where: { vehicles: { company_id: cid }, inspection_date: { gte: startOfMonth } }
        });
        const inspCost = insps._sum.cost || 0;

        // 4. Insurance Costs
        const insurs = await prisma.insurances.aggregate({
            _sum: { premium: true },
            where: { vehicles: { company_id: cid }, start_date: { gte: startOfMonth } }
        });
        const insurCost = insurs._sum.premium || 0;

        const totalMonthlyCost = maintCost + serviceCost + inspCost + insurCost;

        // Alerts (Next 30 Days)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const today = new Date();

        const upcomingInspections = await prisma.inspections.count({
            where: { vehicles: { company_id: cid }, next_inspection: { lte: futureDate, gte: today } }
        }).catch(() => 0);

        const expiringInsurances = await prisma.insurances.count({
            where: { vehicles: { company_id: cid }, end_date: { lte: futureDate, gte: today } }
        }).catch(() => 0);

        return {
            success: true,
            data: {
                totalVehicles,
                activeVehicles: activeVehicles || totalVehicles, // Fallback if status tracking isn't matching
                activeAssignments,
                totalEmployees,
                upcomingInspections,
                expiringInsurances,
                monthlyCost: totalMonthlyCost,
                costDistribution: {
                    service: serviceCost,
                    maintenance: maintCost,
                    inspection: inspCost,
                    insurance: insurCost
                }
            }
        };
    } catch (error) {
        console.error("getDashboardStats Error:", error);
        return { success: false, error: error.message };
    }
}

async function getUpcomingEvents(companyId) {
    try {
        const cid = parseInt(companyId);
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30); // Next 30 days

        // Only get events from somewhat recently to future, ignore multi-year old past events
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - 365); // Support delayed up to 1 year

        const events = [];

        // 1. Get Inspections
        const inspections = await prisma.inspections.findMany({
            where: {
                vehicles: { company_id: cid },
                next_inspection: { lte: futureDate, gte: pastDate }
            },
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

        // 2. Get Insurances
        const insurances = await prisma.insurances.findMany({
            where: {
                vehicles: { company_id: cid },
                end_date: { lte: futureDate, gte: pastDate }
            },
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

        // 3. Get Maintenances
        const maintenances = await prisma.maintenances.findMany({
            where: {
                vehicles: { company_id: cid },
                next_date: { lte: futureDate, gte: pastDate }
            },
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

        // Sort by date ascending (closest first)
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Limit to 20 to prevent dashboard overload
        return { success: true, data: events.slice(0, 20) };
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
            orderBy: { date: 'desc' },
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
