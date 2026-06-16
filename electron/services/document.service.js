const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

// Self-healing database migration helper in case auto-migrations failed or were skipped
async function handleMigrationSelfHealing(error) {
    const errMsg = String(error.message);
    if (errMsg.includes('start_date') || errMsg.includes('column') || errMsg.includes('does not exist')) {
        try {
            const { getPrismaClient } = require('../prismaClient');
            const p = getPrismaClient();
            
            // Alter table to add start_date and end_date columns
            await p.$executeRawUnsafe('ALTER TABLE documents ADD COLUMN start_date DATETIME');
            await p.$executeRawUnsafe('ALTER TABLE documents ADD COLUMN end_date DATETIME');
            return true; // Successfully healed
        } catch (retryErr) {
            console.error('Self-healing migration failed (columns might already exist):', retryErr.message);
        }
    }
    return false;
}

async function addDocument(data) {
    const execute = async () => {
        const result = await prisma.documents.create({
            data: {
                vehicle_id: data.vehicleId ? parseInt(data.vehicleId) : null,
                related_type: data.relatedType || null,
                related_id: data.relatedId ? parseInt(data.relatedId) : null,
                file_name: data.fileName,
                file_path: data.filePath,
                file_type: data.fileType || null,
                doc_type: data.docType || null,
                category: data.category || null,
                folder: data.folder || null,
                start_date: data.startDate ? new Date(data.startDate) : null,
                end_date: data.endDate ? new Date(data.endDate) : null
            }
        });
        return { success: true, id: result.id };
    };

    try {
        return await execute();
    } catch (error) {
        if (await handleMigrationSelfHealing(error)) {
            try {
                return await execute();
            } catch (retryErr) {
                return { success: false, error: retryErr.message };
            }
        }
        return { success: false, error: error.message };
    }
}

async function getDocument(id) {
    const execute = async () => {
        const doc = await prisma.documents.findUnique({
            where: { id: parseInt(id) }
        });
        if (!doc) return { success: false, error: "Not found" };
        return { success: true, data: JSON.parse(JSON.stringify(doc)) };
    };

    try {
        return await execute();
    } catch (error) {
        if (await handleMigrationSelfHealing(error)) {
            try {
                return await execute();
            } catch (retryErr) {
                return { success: false, error: retryErr.message };
            }
        }
        return { success: false, error: error.message };
    }
}

async function getDocumentsByVehicle(vehicleId, isArchived = 0) {
    const execute = async () => {
        const docs = await prisma.documents.findMany({
            where: { 
                vehicle_id: parseInt(vehicleId),
                is_archived: isArchived ? 1 : 0
            },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: JSON.parse(JSON.stringify(docs)) };
    };

    try {
        return await execute();
    } catch (error) {
        if (await handleMigrationSelfHealing(error)) {
            try {
                return await execute();
            } catch (retryErr) {
                return { success: false, error: retryErr.message };
            }
        }
        return { success: false, error: error.message };
    }
}

async function getDocumentsByCompany(companyId, isArchived = 0) {
    const execute = async () => {
        // Get all work IDs for this company to filter work-related documents
        const companyWorks = await prisma.works.findMany({
            where: { company_id: parseInt(companyId) },
            select: { id: true }
        });
        const workIds = companyWorks.map(w => w.id);

        // Get all customer IDs for this company to filter customer-related documents
        const companyCustomers = await prisma.customers.findMany({
            where: { company_id: parseInt(companyId) },
            select: { id: true }
        });
        const customerIds = companyCustomers.map(c => c.id);

        const docs = await prisma.documents.findMany({
            where: {
                is_archived: isArchived ? 1 : 0,
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
                    },
                    {
                        related_type: 'customer',
                        related_id: {
                            in: customerIds
                        }
                    }
                ]
            },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: JSON.parse(JSON.stringify(docs)) };
    };

    try {
        return await execute();
    } catch (error) {
        if (await handleMigrationSelfHealing(error)) {
            try {
                return await execute();
            } catch (retryErr) {
                return { success: false, error: retryErr.message };
            }
        }
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
    const execute = async () => {
        const docs = await prisma.documents.findMany({
            where: {
                related_type: type,
                related_id: parseInt(id)
            },
            orderBy: { created_at: 'desc' }
        });
        return { success: true, data: JSON.parse(JSON.stringify(docs)) };
    };

    try {
        return await execute();
    } catch (error) {
        if (await handleMigrationSelfHealing(error)) {
            try {
                return await execute();
            } catch (retryErr) {
                return { success: false, error: retryErr.message };
            }
        }
        return { success: false, error: error.message };
    }
}

async function updateDocument(id, data) {
    const execute = async () => {
        const result = await prisma.documents.update({
            where: { id: parseInt(id) },
            data: {
                file_name: data.fileName,
                start_date: data.startDate ? new Date(data.startDate) : null,
                end_date: data.endDate ? new Date(data.endDate) : null,
                doc_type: data.docType !== undefined ? data.docType : undefined,
                category: data.category !== undefined ? data.category : undefined,
                folder: data.folder !== undefined ? data.folder : undefined
            }
        });
        return { success: true, data: result };
    };

    try {
        return await execute();
    } catch (error) {
        if (await handleMigrationSelfHealing(error)) {
            try {
                return await execute();
            } catch (retryErr) {
                return { success: false, error: retryErr.message };
            }
        }
        return { success: false, error: error.message };
    }
}

module.exports = {
    addDocument,
    getDocument,
    getDocumentsByVehicle,
    getDocumentsByCompany,
    deleteDocument,
    getDocumentsByRelatedId,
    updateDocument
};
