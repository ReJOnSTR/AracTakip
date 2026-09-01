import { useState } from 'react'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'
import { Eye, X, Shield, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'

export default function ImpersonationBanner() {
    const { isImpersonating, currentCompany, impersonatedCompanyName } = useCompany()
    const { user } = useAuth()
    const [isExpanded, setIsExpanded] = useState(false)

    if (!isImpersonating) return null

    const displayName = currentCompany?.name || impersonatedCompanyName || 'Seçili Şirket'

    const handleCloseWindow = (e) => {
        e?.stopPropagation()
        sessionStorage.removeItem('aractakip_impersonate_company_id')
        sessionStorage.removeItem('aractakip_impersonate_company_name')
        window.close()
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                fontFamily: 'inherit',
                pointerEvents: 'auto'
            }}
        >
            {/* Popover Details (Shown when expanded) */}
            {isExpanded && (
                <div
                    style={{
                        marginBottom: '8px',
                        background: 'rgba(24, 24, 27, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '16px',
                        padding: '16px 18px',
                        width: '320px',
                        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 158, 11, 0.15)',
                        color: '#ffffff',
                        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: 'rgba(245, 158, 11, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fbbf24'
                            }}>
                                <Eye size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fef3c7' }}>Gözlemci Modu</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>İzole Şirket İncelemesi</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsExpanded(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>

                    <div style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginBottom: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Şirket:</span>
                            <span style={{ fontWeight: 600, color: '#ffffff' }}>{displayName}</span>
                        </div>
                        {currentCompany?.id && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Şirket ID:</span>
                                <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>#{currentCompany.id}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Yetkili:</span>
                            <span style={{ color: '#ffffff' }}>{user?.username || 'Süper Admin'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Oturum:</span>
                            <span style={{ color: '#34d399', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                                Güvenli / İzole
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleCloseWindow}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.35) 100%)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '10px',
                            color: '#fca5a5',
                            padding: '9px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(220, 38, 38, 0.5)'
                            e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.35) 100%)'
                            e.currentTarget.style.color = '#fca5a5'
                        }}
                    >
                        <X size={15} />
                        <span>İncelemeyi Bitir ve Pencereyi Kapat</span>
                    </button>
                </div>
            )}

            {/* Main Floating Pill */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    background: 'rgba(24, 24, 27, 0.88)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '999px',
                    padding: '6px 14px 6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.2)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.7)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)'
                }}
            >
                {/* Pulsing Live Radar Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '10px', height: '10px' }}>
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: '#f59e0b',
                        opacity: 0.75,
                        animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }} />
                    <div style={{
                        position: 'relative',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#fbbf24'
                    }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        color: '#fbbf24'
                    }}>
                        Gözlemci Modu
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#ffffff',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {displayName}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                    <button
                        onClick={handleCloseWindow}
                        title="İncelemeyi Kapat"
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            padding: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.5)'
                            e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                        }}
                    >
                        <X size={11} />
                    </button>
                    <div style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
