const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

// ========== VEHICLES ==========

async function getVehicles(companyId) {
    try {
        const vehicles = await prisma.vehicles.findMany({
            where: { company_id: companyId },
            include: {
                maintenances: true,
                inspections: true,
                insurances: true,
                services: true
            },
            orderBy: { created_at: 'desc' }
        });

        // Match the shape of legacy object output
        const formatted = vehicles.map(v => ({
            ...v,
            maintenances_count: v.maintenances.length,
            inspections_count: v.inspections.length,
            services_count: v.services.length
        }));

        return { success: true, data: formatted };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getVehicleById(vehicleId) {
    try {
        const vehicle = await prisma.vehicles.findUnique({
            where: { id: parseInt(vehicleId) }
        });
        return { success: true, data: vehicle };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createVehicle(data) {
    try {
        const { companyId, type, plate, ...rest } = data;
        const vehicle = await prisma.vehicles.create({
            data: {
                company_id: companyId,
                type,
                plate,
                brand: rest.brand || null,
                model: rest.model || null,
                year: rest.year ? parseInt(rest.year) : null,
                color: rest.color || null,
                status: rest.status || 'active',
                km: rest.km ? parseInt(rest.km) : 0,
                image: rest.image || null,
                notes: rest.notes || null
            }
        });
        return { success: true, data: vehicle };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateVehicle(data) {
    try {
        const { id, type, plate, ...rest } = data;
        const vehicle = await prisma.vehicles.update({
            where: { id: parseInt(id) },
            data: {
                type,
                plate,
                brand: rest.brand || null,
                model: rest.model || null,
                year: rest.year ? parseInt(rest.year) : null,
                color: rest.color || null,
                status: rest.status || 'active',
                km: rest.km ? parseInt(rest.km) : 0,
                image: rest.image || null,
                notes: rest.notes || null
            }
        });
        return { success: true, data: vehicle };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteVehicle(id) {
    try {
        await prisma.vehicles.delete({
            where: { id: parseInt(id) }
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ========== MAINTENANCE ==========

async function getMaintenances(vehicleId) {
    try {
        const data = await prisma.maintenances.findMany({
            where: { vehicle_id: vehicleId, is_archived: 0 },
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            include: { vehicles: true }
        });
        // Shape formatting for legacy compatibility 
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate, vehicle_plate: d.vehicles?.plate, model: d.vehicles?.model, brand: d.vehicles?.brand }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getAllMaintenances(companyId, isArchived) {
    try {
        const data = await prisma.maintenances.findMany({
            where: {
                is_archived: isArchived ? 1 : 0,
                vehicles: { company_id: parseInt(companyId) }
            },
            include: { vehicles: true },
            orderBy: [{ date: 'desc' }, { id: 'desc' }]
        });
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate, vehicle_plate: d.vehicles?.plate, model: d.vehicles?.model, brand: d.vehicles?.brand }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createMaintenance(data) {
    try {
        const result = await prisma.maintenances.create({
            data: {
                vehicle_id: data.vehicleId,
                type: data.type,
                description: data.description || null,
                date: new Date(data.date),
                cost: data.cost ? parseFloat(data.cost) : 0,
                next_km: data.nextKm ? parseInt(data.nextKm) : null,
                next_date: data.nextDate ? new Date(data.nextDate) : null,
                notes: data.notes || null,
                file_path: data.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateMaintenance(data) {
    try {
        const { id, vehicleId, ...rest } = data;
        const result = await prisma.maintenances.update({
            where: { id: parseInt(id) },
            data: {
                type: rest.type,
                description: rest.description || null,
                date: new Date(rest.date),
                cost: rest.cost ? parseFloat(rest.cost) : 0,
                next_km: rest.nextKm ? parseInt(rest.nextKm) : null,
                next_date: rest.nextDate ? new Date(rest.nextDate) : null,
                notes: rest.notes || null,
                file_path: rest.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteMaintenance(id) {
    try {
        await prisma.maintenances.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// Additional handlers for Inspections, Insurances, Assignments, Services can identically repeat Prisma structures...
// Due to payload sizes they will be mapped in similar files or unified under vehicle service.

module.exports = {
    getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle,
    getMaintenances, getAllMaintenances, createMaintenance, updateMaintenance, deleteMaintenance
};
