const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

// Departments
async function getDepartments(companyId) {
    try {
        const data = await prisma.departments.findMany({
            where: { company_id: parseInt(companyId) },
            orderBy: { name: 'asc' }
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createDepartment(data) {
    try {
        const result = await prisma.departments.create({
            data: {
                company_id: parseInt(data.companyId),
                name: data.name
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateDepartment(data) {
    try {
        const result = await prisma.departments.update({
            where: { id: parseInt(data.id) },
            data: { name: data.name }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteDepartment(id) {
    try {
        await prisma.departments.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// Leave Types
async function getLeaveTypes(companyId) {
    try {
        const data = await prisma.leave_types.findMany({
            where: { company_id: parseInt(companyId) },
            orderBy: { name: 'asc' }
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createLeaveType(data) {
    try {
        const result = await prisma.leave_types.create({
            data: {
                company_id: parseInt(data.companyId),
                name: data.name
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateLeaveType(data) {
    try {
        const result = await prisma.leave_types.update({
            where: { id: parseInt(data.id) },
            data: { name: data.name }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteLeaveType(id) {
    try {
        await prisma.leave_types.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// Document Categories
async function getDocumentCategories(companyId, targetType = 'employee') {
    try {
        const data = await prisma.document_categories.findMany({
            where: { 
                company_id: parseInt(companyId),
                target_type: targetType
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createDocumentCategory(data) {
    try {
        const result = await prisma.document_categories.create({
            data: {
                company_id: parseInt(data.companyId),
                name: data.name,
                target_type: data.targetType || 'employee'
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateDocumentCategory(data) {
    try {
        const result = await prisma.document_categories.update({
            where: { id: parseInt(data.id) },
            data: { name: data.name }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteDocumentCategory(id) {
    try {
        await prisma.document_categories.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// Document Folders
async function getDocumentFolders(companyId) {
    try {
        const data = await prisma.document_folders.findMany({
            where: { company_id: parseInt(companyId) },
            orderBy: { name: 'asc' }
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createDocumentFolder(data) {
    try {
        const result = await prisma.document_folders.create({
            data: {
                company_id: parseInt(data.companyId),
                name: data.name
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateDocumentFolder(data) {
    try {
        const result = await prisma.document_folders.update({
            where: { id: parseInt(data.id) },
            data: { name: data.name }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteDocumentFolder(id) {
    try {
        await prisma.document_folders.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

// Vehicle Types
async function getVehicleTypes(companyId) {
    try {
        const data = await prisma.vehicle_types.findMany({
            where: { company_id: parseInt(companyId) },
            orderBy: { name: 'asc' }
        });
        return { success: true, data };
    } catch (error) { return { success: false, error: error.message }; }
}

async function createVehicleType(data) {
    try {
        const result = await prisma.vehicle_types.create({
            data: {
                company_id: parseInt(data.companyId),
                name: data.name
            }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function updateVehicleType(data) {
    try {
        const result = await prisma.vehicle_types.update({
            where: { id: parseInt(data.id) },
            data: { name: data.name }
        });
        return { success: true, data: result };
    } catch (error) { return { success: false, error: error.message }; }
}

async function deleteVehicleType(id) {
    try {
        await prisma.vehicle_types.delete({ where: { id: parseInt(id) } });
        return { success: true };
    } catch (error) { return { success: false, error: error.message }; }
}

module.exports = {
    getDepartments, createDepartment, updateDepartment, deleteDepartment,
    getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType,
    getDocumentCategories, createDocumentCategory, updateDocumentCategory, deleteDocumentCategory,
    getDocumentFolders, createDocumentFolder, updateDocumentFolder, deleteDocumentFolder,
    getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType
};
