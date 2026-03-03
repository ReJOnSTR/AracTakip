const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

// ========== INSPECTIONS ==========
async function getInspections(vehicleId) {
    try {
        const data = await prisma.inspections.findMany({
            where: { vehicle_id: vehicleId, is_archived: 0 },
            orderBy: { inspection_date: 'desc' },
            include: { vehicles: true }
        });
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate, vehicle_plate: d.vehicles?.plate, model: d.vehicles?.model, brand: d.vehicles?.brand }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getAllInspections(companyId, type, isArchived) {
    try {
        const where = { vehicles: { company_id: parseInt(companyId) }, is_archived: isArchived ? 1 : 0 };
        if (type !== 'all') where.type = type;
        const data = await prisma.inspections.findMany({
            where,
            include: { vehicles: true },
            orderBy: { inspection_date: 'desc' }
        });
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate, vehicle_plate: d.vehicles?.plate, model: d.vehicles?.model, brand: d.vehicles?.brand }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createInspection(data) {
    try {
        const result = await prisma.inspections.create({
            data: {
                vehicle_id: data.vehicleId,
                type: data.type,
                inspection_date: new Date(data.date || data.inspectionDate),
                next_inspection: data.validUntil || data.nextInspection ? new Date(data.validUntil || data.nextInspection) : null,
                result: data.result || null,
                cost: data.cost ? parseFloat(data.cost) : 0,
                notes: data.notes || null,
                file_path: data.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateInspection(data) {
    try {
        const { id, vehicleId, ...rest } = data;
        const result = await prisma.inspections.update({
            where: { id: parseInt(id) },
            data: {
                type: rest.type,
                inspection_date: new Date(rest.date || rest.inspectionDate),
                next_inspection: rest.validUntil || rest.nextInspection ? new Date(rest.validUntil || rest.nextInspection) : null,
                result: rest.result || null,
                cost: rest.cost ? parseFloat(rest.cost) : 0,
                notes: rest.notes || null,
                file_path: rest.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteInspection(id) {
    try {
        await prisma.inspections.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// ========== INSURANCES ==========
async function getInsurances(vehicleId) {
    try {
        const data = await prisma.insurances.findMany({
            where: { vehicle_id: vehicleId, is_archived: 0 },
            orderBy: { start_date: 'desc' },
            include: { vehicles: true }
        });
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate, vehicle_plate: d.vehicles?.plate, model: d.vehicles?.model, brand: d.vehicles?.brand }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getAllInsurances(companyId, isArchived) {
    try {
        const data = await prisma.insurances.findMany({
            where: { vehicles: { company_id: parseInt(companyId) }, is_archived: isArchived ? 1 : 0 },
            include: { vehicles: true },
            orderBy: { start_date: 'desc' }
        });
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate, vehicle_plate: d.vehicles?.plate, model: d.vehicles?.model, brand: d.vehicles?.brand }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createInsurance(data) {
    try {
        const result = await prisma.insurances.create({
            data: {
                vehicle_id: data.vehicleId,
                type: data.type,
                policy_no: data.policyNo || null,
                company: data.company || null,
                start_date: new Date(data.startDate),
                end_date: data.endDate ? new Date(data.endDate) : new Date(data.startDate),
                premium: data.premium ? parseFloat(data.premium) : 0,
                notes: data.notes || null,
                file_path: data.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateInsurance(data) {
    try {
        const { id, vehicleId, ...rest } = data;
        const result = await prisma.insurances.update({
            where: { id: parseInt(id) },
            data: {
                type: rest.type,
                policy_no: rest.policyNo || null,
                company: rest.company || null,
                start_date: new Date(rest.startDate),
                end_date: rest.endDate ? new Date(rest.endDate) : new Date(rest.startDate),
                premium: rest.premium ? parseFloat(rest.premium) : 0,
                notes: rest.notes || null,
                file_path: rest.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteInsurance(id) {
    try {
        await prisma.insurances.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// ========== ASSIGNMENTS ==========
async function getAssignments(vehicleId) {
    try {
        const data = await prisma.assignments.findMany({
            where: { vehicle_id: vehicleId, is_archived: 0 },
            orderBy: { start_date: 'desc' },
            include: { vehicles: true }
        });
        const mapped = data.map(d => ({
            ...d,
            plate: d.vehicles?.plate,
            employee_name: d.assigned_to || null
        }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getAllAssignments(companyId, isArchived) {
    try {
        const data = await prisma.assignments.findMany({
            where: { vehicles: { company_id: parseInt(companyId) }, is_archived: isArchived ? 1 : 0 },
            include: { vehicles: true },
            orderBy: { start_date: 'desc' }
        });
        const mapped = data.map(d => ({
            ...d,
            plate: d.vehicles?.plate,
            employee_name: d.assigned_to || null
        }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createAssignment(data) {
    try {
        const result = await prisma.assignments.create({
            data: {
                vehicle_id: data.vehicleId,
                item_name: data.itemName || 'Araç Zimmeti',
                quantity: data.quantity ? parseInt(data.quantity) : 1,
                assigned_to: data.assignedTo || data.employeeName || null,
                department: data.department || null,
                start_date: new Date(data.startDate),
                end_date: data.endDate ? new Date(data.endDate) : null,
                notes: data.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateAssignment(data) {
    try {
        const { id, vehicleId, ...rest } = data;
        const result = await prisma.assignments.update({
            where: { id: parseInt(id) },
            data: {
                item_name: rest.itemName || 'Araç Zimmeti',
                quantity: rest.quantity ? parseInt(rest.quantity) : 1,
                assigned_to: rest.assignedTo || rest.employeeName || null,
                department: rest.department || null,
                start_date: new Date(rest.startDate),
                end_date: rest.endDate ? new Date(rest.endDate) : null,
                notes: rest.notes || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteAssignment(id) {
    try {
        await prisma.assignments.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// ========== SERVICES ==========
async function getServices(vehicleId) {
    try {
        const data = await prisma.services.findMany({
            where: { vehicle_id: vehicleId, is_archived: 0 },
            orderBy: { date: 'desc' },
            include: { vehicles: true }
        });
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function getAllServices(companyId, isArchived) {
    try {
        const data = await prisma.services.findMany({
            where: { vehicles: { company_id: parseInt(companyId) }, is_archived: isArchived ? 1 : 0 },
            include: { vehicles: true },
            orderBy: { date: 'desc' }
        });
        const mapped = data.map(d => ({ ...d, plate: d.vehicles?.plate }));
        return { success: true, data: mapped };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createService(data) {
    try {
        const result = await prisma.services.create({
            data: {
                vehicle_id: data.vehicleId,
                type: data.type,
                description: data.description || null,
                date: new Date(data.date),
                cost: data.cost ? parseFloat(data.cost) : 0,
                km: data.km ? parseInt(data.km) : null,
                notes: data.notes || null,
                file_path: data.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateService(data) {
    try {
        const { id, vehicleId, ...rest } = data;
        const result = await prisma.services.update({
            where: { id: parseInt(id) },
            data: {
                type: rest.type,
                description: rest.description || null,
                date: new Date(rest.date),
                cost: rest.cost ? parseFloat(rest.cost) : 0,
                km: rest.km ? parseInt(rest.km) : null,
                notes: rest.notes || null,
                file_path: rest.filePath || null
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteService(id) {
    try {
        await prisma.services.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

module.exports = {
    getInspections, getAllInspections, createInspection, updateInspection, deleteInspection,
    getInsurances, getAllInsurances, createInsurance, updateInsurance, deleteInsurance,
    getAssignments, getAllAssignments, createAssignment, updateAssignment, deleteAssignment,
    getServices, getAllServices, createService, updateService, deleteService
};
