import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useDataListener() {
    const queryClient = useQueryClient()

    useEffect(() => {
        // Ensure API exists
        if (!window.electronAPI?.onDbUpdate) return

        const handleDbUpdate = ({ table, action }) => {
            console.log(`[RealTime] DB Change detected: ${table} (${action})`)

            // Invalidate the specific table's query
            // Most pages use the table name as the primary query key
            queryClient.invalidateQueries({ queryKey: [table] })

            // Invalidate Dashboard Stats
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] })

            // Relationships:
            // If sub-items change, we might need to update vehicle lists if they show status/counts
            if (['maintenances', 'inspections', 'insurances', 'assignments', 'services'].includes(table)) {
                queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            }
        }

        const cleanup = window.electronAPI.onDbUpdate(handleDbUpdate)

        return () => {
            if (cleanup) cleanup()
        }
    }, [queryClient])
}
