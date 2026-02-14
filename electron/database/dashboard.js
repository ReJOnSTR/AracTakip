// Dashboard module — stats, upcoming events, recent activity
module.exports = function (helpers) {
    const { runQuery, runQueryOne } = helpers

    function getDashboardStats(companyId) {
        try {
            const today = new Date().toISOString().split('T')[0]
            const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
            const monthPattern = `${currentMonth}%`

            // Combined stats query using CTE
            const statusStats = runQueryOne(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'passive' THEN 1 ELSE 0 END) as passive,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
                FROM vehicles WHERE company_id = ?
            `, [companyId])

            const upcomingInspections = runQueryOne(`
                SELECT COUNT(*) as count FROM inspections i
                JOIN vehicles v ON i.vehicle_id = v.id
                WHERE v.company_id = ? 
                AND i.next_inspection BETWEEN ? AND ?
                AND COALESCE(i.is_archived, 0) = 0
            `, [companyId, today, thirtyDaysLater])

            const expiringInsurances = runQueryOne(`
                SELECT COUNT(*) as count FROM insurances ins
                JOIN vehicles v ON ins.vehicle_id = v.id
                WHERE v.company_id = ? 
                AND ins.end_date BETWEEN ? AND ?
                AND COALESCE(ins.is_archived, 0) = 0
            `, [companyId, today, thirtyDaysLater])

            // Cost distribution — single query with subselects
            const costDistribution = runQueryOne(`
                SELECT
                    (SELECT COALESCE(SUM(cost), 0) FROM services s JOIN vehicles v ON s.vehicle_id = v.id WHERE v.company_id = ? AND s.date LIKE ?) as service,
                    (SELECT COALESCE(SUM(cost), 0) FROM maintenances m JOIN vehicles v ON m.vehicle_id = v.id WHERE v.company_id = ? AND m.date LIKE ?) as maintenance,
                    (SELECT COALESCE(SUM(cost), 0) FROM inspections i JOIN vehicles v ON i.vehicle_id = v.id WHERE v.company_id = ? AND i.inspection_date LIKE ?) as inspection,
                    (SELECT COALESCE(SUM(premium), 0) FROM insurances ins JOIN vehicles v ON ins.vehicle_id = v.id WHERE v.company_id = ? AND ins.start_date LIKE ?) as insurance
            `, [companyId, monthPattern, companyId, monthPattern, companyId, monthPattern, companyId, monthPattern])

            const monthlyCost = (costDistribution?.service || 0) + (costDistribution?.maintenance || 0) + (costDistribution?.inspection || 0) + (costDistribution?.insurance || 0)

            const topVehicles = runQuery(`
                SELECT plate, brand, model, km, image 
                FROM vehicles 
                WHERE company_id = ?
                ORDER BY km DESC 
                LIMIT 5
            `, [companyId])

            return {
                success: true,
                data: {
                    totalVehicles: statusStats?.total || 0,
                    activeVehicles: statusStats?.active || 0,
                    statusBreakdown: {
                        active: statusStats?.active || 0,
                        passive: statusStats?.passive || 0,
                        maintenance: statusStats?.maintenance || 0
                    },
                    upcomingInspections: upcomingInspections?.count || 0,
                    expiringInsurances: expiringInsurances?.count || 0,
                    monthlyCost,
                    costDistribution: {
                        service: costDistribution?.service || 0,
                        maintenance: costDistribution?.maintenance || 0,
                        inspection: costDistribution?.inspection || 0,
                        insurance: costDistribution?.insurance || 0
                    },
                    topVehicles: Array.isArray(topVehicles) ? topVehicles : []
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getUpcomingEvents(companyId) {
        try {
            const today = new Date().toISOString().split('T')[0]
            const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            const inspections = runQuery(`
                SELECT
                    CASE WHEN i.type = 'periodic' THEN 'Periyodik Kontrol' ELSE 'Muayene' END as type,
                    v.plate, v.brand, v.model,
                    i.next_inspection as date
                FROM inspections i
                JOIN vehicles v ON i.vehicle_id = v.id
                WHERE v.company_id = ? 
                AND i.next_inspection IS NOT NULL 
                AND i.next_inspection <= ?
                AND COALESCE(i.is_archived, 0) = 0
                ORDER BY i.next_inspection ASC
                LIMIT 20
            `, [companyId, maxDate])

            const insurances = runQuery(`
                SELECT 'Sigorta' as type,
                    v.plate, v.brand, v.model,
                    ins.end_date as date
                FROM insurances ins
                JOIN vehicles v ON ins.vehicle_id = v.id
                WHERE v.company_id = ? 
                AND ins.end_date IS NOT NULL 
                AND ins.end_date <= ?
                AND COALESCE(ins.is_archived, 0) = 0
                ORDER BY ins.end_date ASC
                LIMIT 20
            `, [companyId, maxDate])

            const maintenances = runQuery(`
                SELECT 'Bakım' as type,
                    v.plate, v.brand, v.model,
                    m.next_date as date
                FROM maintenances m
                JOIN vehicles v ON m.vehicle_id = v.id
                WHERE v.company_id = ? AND m.next_date IS NOT NULL AND m.next_date <= ?
                ORDER BY m.next_date ASC
                LIMIT 20
            `, [companyId, maxDate])

            let allEvents = [...inspections, ...insurances, ...maintenances]
            let calculatedEvents = []
            for (const event of allEvents) {
                if (!event.date) continue
                const evtDate = new Date(event.date)
                const todayDate = new Date(today)
                if (isNaN(evtDate.getTime())) continue
                const daysLeft = Math.ceil((evtDate - todayDate) / (1000 * 60 * 60 * 24))
                if (daysLeft > 60) continue
                calculatedEvents.push({ ...event, days_left: daysLeft })
            }

            calculatedEvents.sort((a, b) => a.days_left - b.days_left)
            return { success: true, data: calculatedEvents.slice(0, 50) }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getRecentActivity(companyId) {
        try {
            const services = runQuery(`
                SELECT 'Service' as type, s.date as date, v.plate, 'Servis Kaydı' as description, s.cost
                FROM services s JOIN vehicles v ON s.vehicle_id = v.id
                WHERE v.company_id = ? ORDER BY s.created_at DESC LIMIT 5
            `, [companyId])

            const maintenances = runQuery(`
                SELECT 'Maintenance' as type, m.date as date, v.plate, 'Bakım Kaydı' as description, m.cost
                FROM maintenances m JOIN vehicles v ON m.vehicle_id = v.id
                WHERE v.company_id = ? ORDER BY m.created_at DESC LIMIT 5
            `, [companyId])

            const assignments = runQuery(`
                SELECT 'Assignment' as type, a.start_date as date, v.plate, 'Zimmet Ataması' as description, 0 as cost
                FROM assignments a JOIN vehicles v ON a.vehicle_id = v.id
                WHERE v.company_id = ? ORDER BY a.created_at DESC LIMIT 5
            `, [companyId])

            let activities = [...services, ...maintenances, ...assignments]
            activities.sort((a, b) => {
                const dateA = new Date(a.date)
                const dateB = new Date(b.date)
                if (isNaN(dateA.getTime())) return 1
                if (isNaN(dateB.getTime())) return -1
                return dateB - dateA
            })

            return { success: true, data: activities.slice(0, 5) }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return { getDashboardStats, getUpcomingEvents, getRecentActivity }
}
