import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, Calendar, FileText, Wallet, CheckCircle2, ChevronRight, X, Shield, Wrench, User } from 'lucide-react'
import { useCompany } from '../context/CompanyContext'
import { getDaysUntil, formatDate, formatCurrency } from '../utils/helpers'
import { useNavigate } from 'react-router-dom'

export default function NotificationCenter() {
    const { upcomingEvents } = useCompany()
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const dropdownRef = useRef(null)
    const navigate = useNavigate()

    // Filter events based on user preferences from localStorage
    const filteredEvents = upcomingEvents.filter(e => {
        const isEnabled = localStorage.getItem(`notify_${e.eventType}`) !== 'false'
        return isEnabled
    })

    // Filter events into categories
    const overdue = filteredEvents.filter(e => getDaysUntil(e.date) < 0)
    const upcoming = filteredEvents.filter(e => {
        const days = getDaysUntil(e.date)
        return days >= 0 && days <= 7
    })

    const allNotifications = [...overdue, ...upcoming]

    useEffect(() => {
        // Simple unread logic: any overdue or any event in next 3 days
        const count = filteredEvents.filter(e => {
            const days = getDaysUntil(e.date)
            return days < 3
        }).length
        setUnreadCount(count)
    }, [filteredEvents])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const getIcon = (type) => {
        switch (type) {
            case 'inspection': return <FileText size={16} className="text-primary" />
            case 'insurance': return <Shield size={16} className="text-success" />
            case 'maintenance': return <Wrench size={16} className="text-warning" />
            case 'employee_document': return <User size={16} className="text-info" />
            case 'finance_check': return <Wallet size={16} className="text-danger" />
            default: return <Bell size={16} />
        }
    }

    const handleItemClick = (event) => {
        setIsOpen(false)
        if (event.vehicleId) {
            navigate(`/vehicles/${event.vehicleId}`)
        } else if (event.employeeId) {
            navigate(`/employees/${event.employeeId}`)
        } else if (event.eventType === 'finance_check') {
            navigate('/finance')
        }
    }

    return (
        <div className="notification-center" ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
                className={`notification-bell ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    color: isOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        border: '2px solid var(--bg-primary)'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '10px',
                    width: '320px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'slideIn 0.2s ease-out'
                }}>
                    <div style={{
                        padding: '15px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-tertiary)'
                    }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Bildirimler</h3>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={16} />
                        </button>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {allNotifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <CheckCircle2 size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                <p style={{ fontSize: '13px' }}>Harika! Yaklaşan veya gecikmiş bir işleminiz bulunmuyor.</p>
                            </div>
                        ) : (
                            <div>
                                {overdue.length > 0 && (
                                    <div style={{ padding: '8px 15px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                        GECİKMİŞ İŞLEMLER
                                    </div>
                                )}
                                {overdue.map((e, idx) => (
                                    <NotificationItem key={`overdue-${idx}`} event={e} onClick={() => handleItemClick(e)} isOverdue />
                                ))}

                                {upcoming.length > 0 && (
                                    <div style={{ padding: '8px 15px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                        YAKLAŞAN (7 GÜN İÇİNDE)
                                    </div>
                                )}
                                {upcoming.map((e, idx) => (
                                    <NotificationItem key={`upcoming-${idx}`} event={e} onClick={() => handleItemClick(e)} />
                                ))}
                            </div>
                        )}
                    </div>

                    {allNotifications.length > 0 && (
                        <div 
                            onClick={() => { navigate('/'); setIsOpen(false); }}
                            style={{
                                padding: '12px',
                                textAlign: 'center',
                                fontSize: '12px',
                                color: 'var(--accent-primary)',
                                cursor: 'pointer',
                                borderTop: '1px solid var(--border-color)',
                                background: 'var(--bg-tertiary)',
                                fontWeight: '500'
                            }}
                        >
                            Tümünü Dashboard'da Gör
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function NotificationItem({ event, onClick, isOverdue }) {
    const days = getDaysUntil(event.date)
    
    const getUrgencyColor = () => {
        if (isOverdue) return 'var(--danger)'
        if (days <= 3) return 'var(--warning)'
        return 'var(--success)'
    }

    return (
        <div 
            onClick={onClick}
            style={{
                padding: '12px 15px',
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                gap: '12px',
                transition: 'background 0.2s',
                alignItems: 'flex-start'
            }}
            className="notification-item-hover"
        >
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: getUrgencyColor()
            }}>
                {event.eventType === 'inspection' && <Calendar size={16} />}
                {event.eventType === 'insurance' && <FileText size={16} />}
                {event.eventType === 'maintenance' && <Calendar size={16} />}
                {event.eventType === 'employee_document' && <FileText size={16} />}
                {event.eventType === 'finance_check' && <Wallet size={16} />}
            </div>
            
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {event.plate || event.employeeName || (event.eventType === 'finance_check' ? 'Çek Vadesi' : 'İşlem')}
                    </span>
                    <span style={{ fontSize: '10px', color: getUrgencyColor(), fontWeight: 'bold' }}>
                        {isOverdue ? `${Math.abs(days)} g. geçti` : (days === 0 ? 'Bugün' : `${days} gün kaldı`)}
                    </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {event.type}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatDate(event.date)}</span>
                    {event.amount && <span>{formatCurrency(event.amount)}</span>}
                </div>
            </div>
            <ChevronRight size={14} style={{ marginTop: '10px', color: 'var(--text-muted)' }} />
        </div>
    )
}
