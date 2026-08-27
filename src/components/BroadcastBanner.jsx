import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'
import { 
    Megaphone, 
    AlertTriangle, 
    AlertOctagon, 
    Wrench, 
    Scale, 
    Sparkles, 
    Info, 
    X,
    Clock
} from 'lucide-react'
import './BroadcastBanner.css'

export default function BroadcastBanner() {
    const { currentCompany } = useCompany()
    const { user } = useAuth()
    const [announcements, setAnnouncements] = useState([])
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]')
        } catch {
            return []
        }
    })

    const fetchAnnouncements = async () => {
        if (!window.electronAPI?.getActiveAnnouncements) return
        try {
            const res = await window.electronAPI.getActiveAnnouncements(currentCompany?.id || null)
            if (res && res.success && Array.isArray(res.data)) {
                setAnnouncements(res.data)
            }
        } catch (err) {
            console.error('Fetch broadcast announcements failed:', err)
        }
    }

    useEffect(() => {
        fetchAnnouncements()
        // Poll every 45 seconds for new broadcast alerts
        const interval = setInterval(fetchAnnouncements, 45000)
        return () => clearInterval(interval)
    }, [currentCompany?.id])

    const handleDismiss = (id) => {
        const next = [...dismissedIds, id]
        setDismissedIds(next)
        localStorage.setItem('dismissed_announcements', JSON.stringify(next))
    }

    // Filter visible announcements
    const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id))

    if (visibleAnnouncements.length === 0) return null

    // Pick icon based on type
    const getIcon = (type) => {
        switch (type) {
            case 'maintenance':
                return <Wrench size={16} className="broadcast-icon pulse" />
            case 'warning':
                return <AlertTriangle size={16} className="broadcast-icon" />
            case 'critical':
                return <AlertOctagon size={16} className="broadcast-icon pulse" />
            case 'legal':
                return <Scale size={16} className="broadcast-icon" />
            case 'success':
                return <Sparkles size={16} className="broadcast-icon" />
            default:
                return <Megaphone size={16} className="broadcast-icon" />
        }
    }

    return (
        <div className="broadcast-container">
            {visibleAnnouncements.map((a) => {
                const typeClass = `broadcast-${a.type || 'info'}`
                const isDismissible = a.is_dismissible !== 0

                return (
                    <div key={a.id} className={`broadcast-banner ${typeClass}`}>
                        <div className="broadcast-content">
                            <div className="broadcast-header">
                                {getIcon(a.type)}
                                <span className="broadcast-title">{a.title}</span>
                            </div>
                            <span className="broadcast-message">{a.message}</span>
                            {a.expires_at && (
                                <span className="broadcast-expiry">
                                    <Clock size={11} />
                                    {new Date(a.expires_at).toLocaleDateString('tr-TR')}
                                </span>
                            )}
                        </div>

                        {isDismissible && (
                            <button
                                className="broadcast-dismiss-btn"
                                onClick={() => handleDismiss(a.id)}
                                title="Bildirimi Kapat"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
