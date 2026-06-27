const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { getPrismaClient } = require('../prismaClient');

// Timeout helper for cloud paths
const withTimeout = (promise, ms) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('Timed out'));
        }, ms);
    });
    return Promise.race([
        promise.then(val => {
            clearTimeout(timeoutId);
            return val;
        }),
        timeoutPromise
    ]);
};

async function copyOrCloneFile(sourcePath, destPath) {
    const isCloudPath = /cloud|onedrive|icloud|dropbox|google/i.test(sourcePath) || 
                        sourcePath.toLowerCase().includes('cloudstorage') ||
                        sourcePath.includes('Library/Mobile Documents/com~apple~CloudDocs');

    const isTimeoutOrIOError = (err) => {
        if (!err) return false;
        const errMsg = String(err.message || '').toUpperCase();
        const errCode = String(err.code || '').toUpperCase();
        return errMsg.includes('ETIMEDOUT') || errMsg.includes('EIO') || errMsg.includes('TIMEDOUT') ||
               errCode.includes('ETIMEDOUT') || errCode.includes('EIO') || errCode.includes('TIMEDOUT');
    };

    try {
        await withTimeout(fs.promises.copyFile(sourcePath, destPath), 15000);
    } catch (copyError) {
        console.warn(`copyFile failed for ${sourcePath}:`, copyError.message);
        if (isCloudPath || isTimeoutOrIOError(copyError)) {
            throw new Error(`Bulut (OneDrive/iCloud) dosya indirme zaman aşımına uğradı veya dosya okunamadı. Lütfen Finder'dan dosyaya çift tıklayarak bilgisayarınıza indirildiğinden emin olun veya dosyayı yerel bir klasöre (Masaüstü, İndirilenler vb.) kopyalayıp oradan seçin.`);
        }

        try {
            const buffer = await withTimeout(fs.promises.readFile(sourcePath), 15000);
            await fs.promises.writeFile(destPath, buffer);
        } catch (readError) {
            console.error(`Fallback readFile/writeFile failed for ${sourcePath}:`, readError.message);
            if (isCloudPath || isTimeoutOrIOError(readError)) {
                throw new Error(`Bulut (OneDrive/iCloud) dosya indirme zaman aşımına uğradı veya dosya okunamadı. Lütfen Finder'dan dosyaya çift tıklayarak bilgisayarınıza indirildiğinden emin olun veya dosyayı yerel bir klasöre (Masaüstü, İndirilenler vb.) kopyalayıp oradan seçin.`);
            }
            throw readError;
        }
    }
}

// Helper to save base64 files (for mobile API)
async function saveBase64File(fileName, fileData) {
    if (!fileData) return null;
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'files');
    
    if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
    }

    const ext = path.extname(fileName || '');
    const newFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext || '.bin'}`;
    const destPath = path.join(filesDir, newFileName);

    const buffer = Buffer.from(fileData, 'base64');
    await fs.promises.writeFile(destPath, buffer);
    return newFileName;
}

// Sync function to be called from create/update services
async function syncOperationDocument(relatedType, relatedId, data) {
    if (!data || !data.vehicleId) return null;

    const prisma = getPrismaClient();

    // Fetch companyId and plate
    const vehicle = await prisma.vehicles.findUnique({
        where: { id: parseInt(data.vehicleId) },
        select: { company_id: true, plate: true }
    });
    if (!vehicle) return null;
    const companyId = vehicle.company_id;
    const plate = vehicle.plate;

    // Define classification based on relatedType
    let category = 'Diğer';
    let folderName = 'Diğer Belgeler';
    let startDate = null;
    let endDate = null;
    let fileNamePrefix = '';

    if (relatedType === 'maintenance') {
        category = 'Bakım';
        folderName = 'Bakım Belgeleri';
        startDate = data.date ? new Date(data.date) : null;
        endDate = data.nextDate ? new Date(data.nextDate) : null;
        fileNamePrefix = `${plate}_Bakım`;
    } else if (relatedType === 'service') {
        category = 'Servis';
        folderName = 'Servisler';
        startDate = data.date ? new Date(data.date) : null;
        fileNamePrefix = `${plate}_Servis`;
    } else if (relatedType === 'inspection') {
        const isPeriodic = data.type === 'periodic';
        category = isPeriodic ? 'Egzoz Muayenesi' : 'Araç Muayenesi';
        folderName = 'Muayene Belgeleri';
        startDate = (data.date || data.inspectionDate) ? new Date(data.date || data.inspectionDate) : null;
        endDate = (data.validUntil || data.nextInspection) ? new Date(data.validUntil || data.nextInspection) : null;
        fileNamePrefix = `${plate}_${isPeriodic ? 'Egzoz_Muayene' : 'Araç_Muayene'}`;
    } else if (relatedType === 'insurance') {
        const isKasko = data.type === 'kasko';
        category = isKasko ? 'Kasko' : 'Trafik Sigortası';
        folderName = 'Sigortalar & Kaskolar';
        startDate = data.startDate ? new Date(data.startDate) : null;
        endDate = data.endDate ? new Date(data.endDate) : null;
        fileNamePrefix = `${plate}_${isKasko ? 'Kasko' : 'Trafik_Sigortasi'}`;
    }

    // Check if folder exists, if not create it
    if (companyId && folderName) {
        const existingFolder = await prisma.document_folders.findFirst({
            where: { company_id: parseInt(companyId), name: folderName }
        });
        if (!existingFolder) {
            await prisma.document_folders.create({
                data: { company_id: parseInt(companyId), name: folderName, is_archived: 0 }
            });
        }
    }

    // Look for existing document linked to this operation
    const existingDoc = await prisma.documents.findFirst({
        where: { related_type: relatedType, related_id: parseInt(relatedId) }
    });

    let filePath = null;
    let fileName = data.fileName;

    if (data.filePath) {
        if (typeof data.filePath === 'object' && data.filePath !== null) {
            filePath = data.filePath.path;
            if (!fileName) fileName = data.filePath.name;
        } else {
            filePath = data.filePath;
        }
    }

    const fileData = data.fileData; // base64 payload from mobile

    // Handle deletion
    if (!filePath && !fileData) {
        if (existingDoc) {
            await prisma.documents.delete({ where: { id: existingDoc.id } });
        }
        
        // Also clear file_path inside operation record
        const prismaModel = prisma[relatedType === 'inspection' ? 'inspections' : (relatedType === 'insurance' ? 'insurances' : (relatedType === 'service' ? 'services' : 'maintenances'))];
        if (prismaModel) {
            await prismaModel.update({
                where: { id: parseInt(relatedId) },
                data: { file_path: null }
            });
        }
        return null;
    }

    let savedFileName = filePath;

    if (fileData) {
        // Base64 file from mobile
        savedFileName = await saveBase64File(fileName || `${fileNamePrefix}_upload`, fileData);
    } else if (filePath) {
        // Local absolute file path from PC Web
        const isAbsolutePath = path.isAbsolute(filePath) || filePath.includes('/') || filePath.includes('\\');
        const userDataPath = app.getPath('userData');
        const filesDir = path.join(userDataPath, 'files');
        const isAlreadySaved = !isAbsolutePath || filePath.startsWith(filesDir);

        if (!isAlreadySaved) {
            if (!fs.existsSync(filesDir)) {
                fs.mkdirSync(filesDir, { recursive: true });
            }
            const ext = path.extname(filePath);
            const base = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
            const destPath = path.join(filesDir, base);
            await copyOrCloneFile(filePath, destPath);
            savedFileName = base;
        }
    }

    // Generate nice display file name
    const ext = path.extname(savedFileName);
    const dateStr = startDate ? startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const generatedDisplayName = `${fileNamePrefix}_${dateStr}${ext}`;

    const docData = {
        vehicle_id: parseInt(data.vehicleId),
        related_type: relatedType,
        related_id: parseInt(relatedId),
        file_name: existingDoc?.file_name || fileName || generatedDisplayName,
        file_path: savedFileName,
        file_type: ext,
        category: category,
        doc_type: category,
        folder: folderName,
        start_date: startDate,
        end_date: endDate,
        is_archived: 0
    };

    if (existingDoc) {
        await prisma.documents.update({
            where: { id: existingDoc.id },
            data: docData
        });
    } else {
        await prisma.documents.create({
            data: docData
        });
    }

    // Also update the operation record itself with the relative file_path
    const prismaModel = prisma[relatedType === 'inspection' ? 'inspections' : (relatedType === 'insurance' ? 'insurances' : (relatedType === 'service' ? 'services' : 'maintenances'))];
    if (prismaModel) {
        await prismaModel.update({
            where: { id: parseInt(relatedId) },
            data: { file_path: savedFileName }
        });
    }

    return savedFileName;
}

// Clean up function on deletion
async function deleteOperationDocument(relatedType, relatedId) {
    const prisma = getPrismaClient();
    try {
        await prisma.documents.deleteMany({
            where: { related_type: relatedType, related_id: parseInt(relatedId) }
        });
    } catch (err) {
        console.error(`Failed to delete linked document for ${relatedType}:`, err.message);
    }
}

module.exports = {
    syncOperationDocument,
    deleteOperationDocument
};
