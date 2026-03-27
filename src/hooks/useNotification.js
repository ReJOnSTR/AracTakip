
import { useEffect, useRef } from 'react'
import { useCompany } from '../context/CompanyContext'

export const useNotification = () => {
    const { currentCompany } = useCompany()

    // Use ref to track if we already noticed this session to avoid spam
    const notifiedRef = useRef(false)

    useEffect(() => {
        if (!currentCompany || notifiedRef.current) return

        const checkUpcoming = async () => {
            // Get notification settings
            const settings = await window.electronAPI.getSettings()

            // Check notification preferences (default to enabled if not set)
            const notifSettings = settings?.notifications || {}
            const maintenanceEnabled = notifSettings.maintenance !== false
            const insuranceEnabled = notifSettings.insurance !== false
            const inspectionEnabled = notifSettings.inspection !== false

            // If all notifications are disabled, skip
            if (!maintenanceEnabled && !insuranceEnabled && !inspectionEnabled) return

            try {
                const upcoming = await window.electronAPI.getUpcomingEvents(currentCompany.id)
                if (upcoming.success && upcoming.data.length > 0) {
                    let maintenanceCount = 0
                    let insuranceCount = 0
                    let inspectionCount = 0

                    const now = new Date()

                    upcoming.data.forEach(item => {
                        const eventDate = new Date(item.date)
                        const diffMs = eventDate.getTime() - now.getTime()
                        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

                        if (daysLeft <= 15) {
                            if (item.eventType === 'maintenance') maintenanceCount++
                            if (item.eventType === 'insurance') insuranceCount++
                            if (item.eventType === 'inspection') inspectionCount++
                        }
                    })

                    // Trigger logical notifications (respecting settings)
                    if (maintenanceCount > 0 && maintenanceEnabled) {
                        window.electronAPI.showNotification(
                            'Bakım Hatırlatması',
                            `${maintenanceCount} aracın bakımı yaklaştı.`
                        )
                    }

                    if (insuranceCount > 0 && insuranceEnabled) {
                        window.electronAPI.showNotification(
                            'Sigorta Uyarısı',
                            `${insuranceCount} aracın sigorta süresi dolmak üzere.`
                        )
                    }

                    if (inspectionCount > 0 && inspectionEnabled) {
                        window.electronAPI.showNotification(
                            'Muayene Zamanı',
                            `${inspectionCount} aracın muayenesi yaklaştı.`
                        )
                    }

                    if (maintenanceCount + insuranceCount + inspectionCount > 0) {
                        notifiedRef.current = true
                    }
                }
            } catch (error) {
                console.error('Notification check failed:', error)
            }
        }

        // Delay slightly to let app load
        const timer = setTimeout(checkUpcoming, 3000)
        return () => clearTimeout(timer)
    }, [currentCompany])

    return null
}
