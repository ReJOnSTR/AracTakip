const { getPrismaClient } = require('../prismaClient');
const log = require('../logger');

/**
 * Async, non-blocking Enterprise Audit Logger
 * @param {Object} entry
 * @param {number|null} entry.companyId
 * @param {number|null} entry.userId
 * @param {string|null} entry.username
 * @param {string|null} entry.userRole
 * @param {string} entry.action - CREATE, UPDATE, DELETE, LOGIN_SUCCESS, LOGIN_FAILED, IMPERSONATE, SECURITY, 2FA_VERIFY, 2FA_RESET
 * @param {string} entry.entityType - vehicle, employee, transaction, work, user, company, auth, settings, announcement
 * @param {string|number|null} entry.entityId
 * @param {string|null} entry.entityName - e.g. "34 ABC 123", "Ahmet Yılmaz"
 * @param {string} entry.description - Human readable summary
 * @param {Object|null} entry.details - { before: {...}, after: {...}, reason: "..." }
 * @param {string|null} entry.ipAddress
 * @param {string|null} entry.userAgent
 * @param {string} [entry.severity='info'] - info, warn, critical
 */
function logAudit(entry) {
    // Fire and forget so we never block main user flows
    setImmediate(async () => {
        try {
            const prisma = getPrismaClient();
            if (!prisma || !prisma.audit_logs) return;

            let detailsJson = null;
            if (entry.details) {
                try {
                    detailsJson = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details);
                } catch {
                    detailsJson = null;
                }
            }

            await prisma.audit_logs.create({
                data: {
                    company_id: entry.companyId ? parseInt(entry.companyId, 10) : null,
                    user_id: entry.userId ? parseInt(entry.userId, 10) : null,
                    username: entry.username || null,
                    user_role: entry.userRole || null,
                    action: entry.action || 'ACTIVITY',
                    entity_type: entry.entityType || 'general',
                    entity_id: entry.entityId ? String(entry.entityId) : null,
                    entity_name: entry.entityName ? String(entry.entityName).slice(0, 255) : null,
                    description: entry.description || 'İşlem gerçekleştirildi',
                    details: detailsJson,
                    ip_address: entry.ipAddress || null,
                    user_agent: entry.userAgent ? String(entry.userAgent).slice(0, 500) : null,
                    severity: entry.severity || 'info',
                    created_at: new Date()
                }
            });
        } catch (error) {
            log.error('Failed to write audit log:', error.message);
        }
    });
}

/**
 * Fetch platform audit logs with pagination and multi-filter support
 */
async function getPlatformAuditLogs(params = {}) {
    try {
        const prisma = getPrismaClient();
        const {
            page = 1,
            limit = 50,
            companyId,
            userId,
            action,
            entityType,
            severity,
            search,
            startDate,
            endDate
        } = params;

        const where = {};

        if (companyId) {
            where.company_id = parseInt(companyId, 10);
        }

        if (userId) {
            where.user_id = parseInt(userId, 10);
        }

        if (action && action !== 'all') {
            where.action = action;
        }

        if (entityType && entityType !== 'all') {
            where.entity_type = entityType;
        }

        if (severity && severity !== 'all') {
            where.severity = severity;
        }

        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) where.created_at.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.created_at.lte = end;
            }
        }

        if (search && search.trim()) {
            const query = search.trim();
            where.OR = [
                { username: { contains: query } },
                { entity_name: { contains: query } },
                { description: { contains: query } }
            ];
        }

        const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
        const take = Math.min(200, Math.max(10, parseInt(limit, 10)));

        const [logs, total] = await Promise.all([
            prisma.audit_logs.findMany({
                where,
                include: {
                    companies: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take
            }),
            prisma.audit_logs.count({ where })
        ]);

        return {
            success: true,
            logs: logs.map(l => ({
                id: l.id,
                companyId: l.company_id,
                companyName: l.companies?.name || 'Sistem / Platform',
                userId: l.user_id,
                username: l.username || 'Sistem',
                userRole: l.user_role,
                action: l.action,
                entityType: l.entity_type,
                entityId: l.entity_id,
                entityName: l.entity_name,
                description: l.description,
                details: l.details ? (() => { try { return JSON.parse(l.details) } catch { return l.details } })() : null,
                ipAddress: l.ip_address,
                userAgent: l.user_agent,
                severity: l.severity,
                createdAt: l.created_at
            })),
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: take,
                totalPages: Math.ceil(total / take)
            }
        };
    } catch (error) {
        log.error('getPlatformAuditLogs error:', error.message);
        return { success: false, error: error.message, logs: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
}

/**
 * Get aggregated audit metrics for SuperAdmin summary cards
 */
async function getAuditSummaryMetrics() {
    try {
        const prisma = getPrismaClient();
        const now = new Date();
        const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            total24h,
            failedLogins24h,
            criticalDeletes24h,
            securityEvents24h,
            activeUsersCount
        ] = await Promise.all([
            // Total operations last 24h
            prisma.audit_logs.count({
                where: { created_at: { gte: past24Hours } }
            }),
            // Failed logins last 24h
            prisma.audit_logs.count({
                where: {
                    action: 'LOGIN_FAILED',
                    created_at: { gte: past24Hours }
                }
            }),
            // Deletions last 24h
            prisma.audit_logs.count({
                where: {
                    action: 'DELETE',
                    created_at: { gte: past24Hours }
                }
            }),
            // Security severity / warnings last 24h
            prisma.audit_logs.count({
                where: {
                    severity: { in: ['warn', 'critical'] },
                    created_at: { gte: past24Hours }
                }
            }),
            // Distinct users active in past 7 days
            prisma.audit_logs.groupBy({
                by: ['username'],
                where: {
                    username: { not: null },
                    created_at: { gte: past7Days }
                }
            }).then(res => res.length)
        ]);

        return {
            success: true,
            metrics: {
                total24h,
                failedLogins24h,
                criticalDeletes24h,
                securityEvents24h,
                activeUsersCount
            }
        };
    } catch (error) {
        log.error('getAuditSummaryMetrics error:', error.message);
        return {
            success: false,
            metrics: {
                total24h: 0,
                failedLogins24h: 0,
                criticalDeletes24h: 0,
                securityEvents24h: 0,
                activeUsersCount: 0
            }
        };
    }
}

/**
 * Clear old audit logs if needed
 */
async function clearAuditLogs(daysToKeep = 90) {
    try {
        const prisma = getPrismaClient();
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

        const result = await prisma.audit_logs.deleteMany({
            where: { created_at: { lt: cutoffDate } }
        });

        return { success: true, deletedCount: result.count };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = {
    logAudit,
    getPlatformAuditLogs,
    getAuditSummaryMetrics,
    clearAuditLogs
};
