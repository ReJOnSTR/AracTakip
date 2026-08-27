import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
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
    const location = useLocation()
    const { currentCompany } = useCompany()
    const { user } = useAuth()
    const [announcements, setAnnouncements] = useState([])
    
    // Only display on main portal (/portal or /)
    const isPortal = location.pathname === '/portal' || location.pathname === '/'
    
    // Session-based dismiss (Re-appears on next login / app start)
    const [sessionDismissed, setSessionDismissed] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('session_dismissed_announcements') || '[]')
        } catch {
            return []
        }
    })

    // Permanent-based dismiss
    const [permanentDismissed, setPermanentDismissed] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('permanent_dismissed_announcements') || '[]')
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

    const handleDismiss = (announcement) => {
        const mode = announcement.is_dismissible !== undefined ? Number(announcement.is_dismissible) : 1
        if (mode === 2) {
            const next = [...permanentDismissed, announcement.id]
            setPermanentDismissed(next)
            localStorage.setItem('permanent_dismissed_announcements', JSON.stringify(next))
        } else {
            // Mode 1: Closes for current session, reappears on next app launch/login
            const next = [...sessionDismissed, announcement.id]
            setSessionDismissed(next)
            sessionStorage.setItem('session_dismissed_announcements', JSON.stringify(next))
        }
    }

    // Filter visible announcements according to dismissal rule
    const visibleAnnouncements = announcements.filter(a => {
        const mode = a.is_dismissible !== undefined ? Number(a.is_dismissible) : 1
        if (mode === 0) return true // Sabit / Non-dismissible
        if (mode === 2) return !permanentDismissed.includes(a.id)
        // Default mode 1: Session-dismissible (Her girişte tekrar görünür)
        return !sessionDismissed.includes(a.id)
    })

    if (!isPortal || visibleAnnouncements.length === 0) return null

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
                const mode = a.is_dismissible !== undefined ? Number(a.is_dismissible) : 1
                const isDismissible = mode !== 0

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
                                        onClick={() => handleDismiss(a)}
                                        title={mode === 1 ? 'Oturum Boyunca Kapat (Yeniden girişte tekrar gösterilir)' : 'Bildirimi Kapat'}
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
