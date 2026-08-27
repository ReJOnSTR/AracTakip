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
        // Poll every 30 seconds for live updates
        const interval = setInterval(fetchAnnouncements, 30000)
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
                return <Wrench size={15} className="broadcast-icon pulse" />
            case 'warning':
                return <AlertTriangle size={15} className="broadcast-icon" />
            case 'critical':
                return <AlertOctagon size={15} className="broadcast-icon pulse" />
            case 'legal':
                return <Scale size={15} className="broadcast-icon" />
            case 'success':
                return <Sparkles size={15} className="broadcast-icon" />
            default:
                return <Megaphone size={15} className="broadcast-icon" />
        }
    }

    return (
        <div className="broadcast-container">
            {visibleAnnouncements.map((a) => {
                const typeClass = `broadcast-${a.type || 'info'}`
                const isDismissible = a.is_dismissible !== 0

                return (
                    <div key={a.id} className={`broadcast-banner ${typeClass}`}>
                        <div className="broadcast-content-wrapper">
                            <div className="broadcast-left">
                                <div className="broadcast-icon-wrap">
                                    {getIcon(a.type)}
                                </div>
                                <div className="broadcast-text-group">
                                    <span className="broadcast-title">{a.title}</span>
                                    <span className="broadcast-separator">•</span>
                                    <span className="broadcast-message">{a.message}</span>
                                </div>
                            </div>

                            <div className="broadcast-right">
                                {a.expires_at && (
                                    <span className="broadcast-expiry">
                                        <Clock size={12} />
                                        <span>Son Gün: {new Date(a.expires_at).toLocaleDateString('tr-TR')}</span>
                                    </span>
                                )}

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
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
