import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'
import { Eye, X, Shield } from 'lucide-react'

export default function ImpersonationBanner() {
    const { isImpersonating, currentCompany, impersonatedCompanyName } = useCompany()
    const { user } = useAuth()

    if (!isImpersonating) return null

    const displayName = currentCompany?.name || impersonatedCompanyName || 'Seçili Şirket'

    const handleCloseWindow = () => {
        // Clear session storage if needed and close window
        sessionStorage.removeItem('aractakip_impersonate_company_id')
        sessionStorage.removeItem('aractakip_impersonate_company_name')
        window.close()
    }

    return (
        <div style={{
            background: 'linear-gradient(90deg, #92400e 0%, #b45309 50%, #d97706 100%)',
            color: '#ffffff',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 9999,
            position: 'relative'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                }}>
                    <Eye size={14} style={{ color: '#fef3c7' }} />
                    <span>Gözlemci Modu</span>
                </div>
                <span>
                    Şu anda <strong>"{displayName}"</strong> şirketinin operasyonel verilerini inceliyorsunuz.
                    <span style={{ opacity: 0.85, marginLeft: '8px', fontSize: '11.5px' }}>
                        (Süper Yönetici: {user?.username || 'Admin'})
                    </span>
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={handleCloseWindow}
                    style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'}
                >
                    <X size={13} />
                    <span>İncelemeyi Bitir / Pencereyi Kapat</span>
                </button>
            </div>
        </div>
    )
}
