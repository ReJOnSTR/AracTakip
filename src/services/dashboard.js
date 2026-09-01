export const dashboardService = {
    getStats: (companyId) => window.electronAPI.getDashboardStats(companyId),
    getUpcomingEvents: (companyId) => window.electronAPI.getUpcomingEvents(companyId),
    getRecentActivity: (companyId) => window.electronAPI.getRecentActivity(companyId)
}
