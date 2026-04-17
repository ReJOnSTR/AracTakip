import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Settings, ChevronLeft } from 'lucide-react'

const moduleLabels = {
    fleet: 'Filo Yönetimi',
    finance: 'Finans',
    meals: 'Yemek Fişleri',
    hr: 'Personel Yönetimi',
    works: 'İş & Operasyon',
    customers: 'Cari & Müşteri'
}

export default function ModuleSettings() {
    const location = useLocation()
    const navigate = useNavigate()

    // Extract module from path: /module-settings/hr → hr
    const moduleKey = location.pathname.split('/module-settings/')[1] || 'fleet'
    const moduleLabel = moduleLabels[moduleKey] || moduleKey

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px', minWidth: 'unset' }}
                        onClick={() => navigate(-1)}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Settings size={22} />
                            {moduleLabel} Ayarları
                        </h1>
                        <p style={{ marginTop: '5px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Bu modüle özel ayarları buradan yönetebilirsiniz.
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'var(--accent-primary-alpha, rgba(59,130,246,0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                }}>
                    <Settings size={28} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {moduleLabel} Ayarları
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                    Bu modüle özel ayarlar yakında eklenecektir.
                </p>
            </div>
        </div>
    )
}
