const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

async function addDocument(data) {
    try {
        const result = await prisma.documents.create({
            data: {
                vehicle_id: data.vehicleId ? parseInt(data.vehicleId) : null,
                related_type: data.relatedType || null,
                related_id: data.relatedId ? parseInt(data.relatedId) : null,
                file_name: data.fileName,
                file_path: data.filePath,
                file_type: data.fileType || null,
                start_date: data.startDate ? new Date(data.startDate) : null,
                end_date: data.endDate ? new Date(data.endDate) : null
            }
        });
        return { success: true, id: result.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getDocument(id) {
    try {
        const doc = await prisma.documents.findUnique({
            where: { id: parseInt(id) }
        });
        if (!doc) return { success: false, error: "Not found" };
        return { success: true, data: JSON.parse(JSON.stringify(doc)) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getDocumentsByVehicle(vehicleId) {
    try {
        const docs = await prisma.documents.findMany({
            where: { vehicle_id: parseInt(vehicleId) },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: JSON.parse(JSON.stringify(docs)) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getDocumentsByCompany(companyId) {
    try {
        // Get all work IDs for this company to filter work-related documents
        const companyWorks = await prisma.works.findMany({
            where: { company_id: parseInt(companyId) },
            select: { id: true }
        });
        const workIds = companyWorks.map(w => w.id);

        const docs = await prisma.documents.findMany({
            where: {
                OR: [
                    {
                        vehicles: {
                            company_id: parseInt(companyId)
                        }
                    },
                    {
                        related_type: 'work',
                        related_id: {
                            in: workIds
                        }
                    }
                ]
            },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: JSON.parse(JSON.stringify(docs)) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteDocument(id) {
    try {
        await prisma.documents.delete({
            where: { id: parseInt(id) }
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getDocumentsByRelatedId(type, id) {
    try {
        const docs = await prisma.documents.findMany({
            where: {
                related_type: type,
                related_id: parseInt(id)
            },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: JSON.parse(JSON.stringify(docs)) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    addDocument,
    getDocument,
    getDocumentsByVehicle,
    getDocumentsByCompany,
    deleteDocument,
    getDocumentsByRelatedId
};
