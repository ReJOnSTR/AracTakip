const fs = require('fs');
const path = require('path');
const { getPrismaClient } = require('../prismaClient');
const prisma = getPrismaClient();

/**
 * Get comprehensive platform overview and stats
 */
async function getPlatformOverview() {
    try {
        const [companies, totalVehicles, totalEmployees, totalWorks, totalUsers] = await Promise.all([
            prisma.companies.findMany({
                include: {
                    _count: {
                        select: {
                            vehicles: true,
                            employees: true,
                            works: true,
                            documents: true
                        }
                    }
                },
                orderBy: { id: 'asc' }
            }),
            prisma.vehicles.count(),
            prisma.employees.count(),
            prisma.works.count(),
            prisma.users.count()
        ]);

        return {
            success: true,
            data: {
                stats: {
                    totalCompanies: companies.length,
                    totalVehicles,
                    totalEmployees,
                    totalWorks,
                    totalUsers
                },
                companies: companies.map(c => ({
                    id: c.id,
                    name: c.name,
                    tax_number: c.tax_number || '-',
                    phone: c.phone || '-',
                    address: c.address || '-',
                    created_at: c.created_at,
                    is_active: c.is_active !== undefined ? c.is_active : 1,
                    counts: {
                        vehicles: c._count.vehicles || 0,
                        employees: c._count.employees || 0,
                        works: c._count.works || 0,
                        documents: c._count.documents || 0
                    }
                }))
            }
        };
    } catch (error) {
        console.error('getPlatformOverview error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all users across the entire platform
 */
async function getPlatformUsers() {
    try {
        const users = await prisma.users.findMany({
            include: {
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        });

        const sanitized = users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role || 'user',
            is_active: u.is_active !== undefined ? u.is_active : 1,
            company_id: u.company_id,
            company_name: u.company?.name || 'Şirketsiz / Genel',
            created_at: u.created_at,
            last_login: u.last_login || null
        }));

        return { success: true, data: sanitized };
    } catch (error) {
        console.error('getPlatformUsers error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Toggle active state of a company
 */
async function toggleCompanyStatus(companyId, isActive) {
    try {
        const updated = await prisma.companies.update({
            where: { id: parseInt(companyId, 10) },
            data: { is_active: isActive ? 1 : 0 }
        });
        return { success: true, data: updated };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Toggle active state of a user
 */
async function toggleUserStatus(userId, isActive) {
    try {
        const updated = await prisma.users.update({
            where: { id: parseInt(userId, 10) },
            data: { is_active: isActive ? 1 : 0 }
        });
        return { success: true, data: updated };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get list of available database backups
 */
async function getPlatformBackups() {
    try {
        const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.sql.gz') || f.endsWith('.json.gz') || f.endsWith('.sql'))
            .map(f => {
                const fullPath = path.join(backupDir, f);
                const stats = fs.statSync(fullPath);
                const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
                return {
                    fileName: f,
                    sizeBytes: stats.size,
                    sizeFormatted: sizeMb > 0.05 ? `${sizeMb} MB` : `${(stats.size / 1024).toFixed(1)} KB`,
                    createdAt: stats.birthtime || stats.mtime
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return { success: true, data: files };
    } catch (error) {
        console.error('getPlatformBackups error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger manual database backup
 */
async function triggerPlatformBackup() {
    try {
        const { performBackup } = require('../../scripts/backup-service');
        const res = await performBackup();
        return res;
    } catch (error) {
        console.error('triggerPlatformBackup error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get live platform health metrics
 */
async function getPlatformSystemHealth() {
    try {
        const mem = process.memoryUsage();
        const uptimeSec = Math.floor(process.uptime());

        // Measure database ping latency
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatencyMs = Date.now() - start;

        return {
            success: true,
            data: {
                status: 'online',
                timestamp: new Date().toISOString(),
                uptimeSec,
                uptimeFormatted: formatUptime(uptimeSec),
                memory: {
                    rssMb: (mem.rss / (1024 * 1024)).toFixed(1),
                    heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(1),
                    heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(1)
                },
                dbLatencyMs,
                nodeVersion: process.version,
                platform: process.platform,
                appVersion: '1.13.38'
            }
        };
    } catch (error) {
        console.error('getPlatformSystemHealth error:', error);
        return {
            success: false,
            error: error.message,
            data: { status: 'degraded', dbLatencyMs: -1 }
        };
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (days > 0) return `${days}g ${hours}s ${minutes}d`;
    if (hours > 0) return `${hours}s ${minutes}d ${secs}sn`;
    return `${minutes}d ${secs}sn`;
}

module.exports = {
    getPlatformOverview,
    getPlatformUsers,
    toggleCompanyStatus,
    toggleUserStatus,
    getPlatformBackups,
    triggerPlatformBackup,
    getPlatformSystemHealth
};
