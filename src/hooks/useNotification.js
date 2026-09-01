
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
                    const maintenanceItems = []
                    const insuranceItems = []
                    const inspectionItems = []

                    const now = new Date()

                    upcoming.data.forEach(item => {
                        const eventDate = new Date(item.date)
                        const diffMs = eventDate.getTime() - now.getTime()
                        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

                        if (daysLeft <= 15) {
                            const dateStr = eventDate.toLocaleDateString('tr-TR')
                            const text = `${item.plate} - ${item.type} (${dateStr})`
                            
                            if (item.eventType === 'maintenance') maintenanceItems.push(text)
                            if (item.eventType === 'insurance') insuranceItems.push(text)
                            if (item.eventType === 'inspection') inspectionItems.push(text)
                        }
                    })

                    const createBody = (items) => {
                        if (items.length === 0) return null
                        if (items.length <= 5) return items.join('\n')
                        return [...items.slice(0, 5), `...ve ${items.length - 5} araç daha`].join('\n')
                    }

                    // Trigger logical notifications (respecting settings)
                    if (maintenanceItems.length > 0 && maintenanceEnabled) {
                        window.electronAPI.showNotification(
                            'Bakım Hatırlatması',
                            createBody(maintenanceItems)
                        )
                    }

                    if (insuranceItems.length > 0 && insuranceEnabled) {
                        window.electronAPI.showNotification(
                            'Sigorta Uyarısı',
                            createBody(insuranceItems)
                        )
                    }

                    if (inspectionItems.length > 0 && inspectionEnabled) {
                        window.electronAPI.showNotification(
                            'Muayene Zamanı',
                            createBody(inspectionItems)
                        )
                    }

                    if (maintenanceItems.length > 0 || insuranceItems.length > 0 || inspectionItems.length > 0) {
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
