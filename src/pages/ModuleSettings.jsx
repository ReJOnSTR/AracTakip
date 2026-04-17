import { useLocation, useNavigate } from 'react-router-dom'
import { Settings, ChevronLeft, Info, ToggleLeft, Sliders, Bell, Database, Shield, Palette } from 'lucide-react'

const moduleConfig = {
    fleet: {
        title: 'Filo Yönetimi',
        description: 'Araç filonuzla ilgili genel ayarları buradan yönetebilirsiniz.',
        icon: Sliders,
        color: 'var(--accent-primary)'
    },
    finance: {
        title: 'Finans',
        description: 'Finans modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Database,
        color: 'var(--success)'
    },
    meals: {
        title: 'Yemek Fişi',
        description: 'Yemek fişi modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Bell,
        color: 'var(--warning)'
    },
    hr: {
        title: 'Personel',
        description: 'Personel yönetimi modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Shield,
        color: 'var(--info, #3b82f6)'
    },
    works: {
        title: 'İş & Operasyon',
        description: 'İş takibi modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: ToggleLeft,
        color: 'var(--accent-primary)'
    },
    customers: {
        title: 'Müşteri',
        description: 'Cari ve müşteri modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Palette,
        color: 'var(--danger, #ef4444)'
    }
}

export default function ModuleSettings() {
    const location = useLocation()
    const navigate = useNavigate()

    const moduleKey = location.pathname.split('/module-settings/')[1] || 'fleet'
    const config = moduleConfig[moduleKey] || moduleConfig.fleet
    const ModuleIcon = config.icon

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px', minWidth: 'unset' }}
                        onClick={() => navigate(-1)}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title">{config.title} Ayarları</h1>
                        <p style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {config.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Settings Layout */}
            <div className="settings-layout">
                <div className="settings-column">
                    {/* Placeholder Section */}
                    <div className="settings-section">
                        <h2 className="settings-section-title">Genel</h2>
                        <div className="settings-list">
                            <div className="settings-item" style={{ opacity: 0.5, cursor: 'default' }}>
                                <div className="settings-item-icon">
                                    <ModuleIcon size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Modül Tercihleri</div>
                                    <div className="settings-item-desc">Bu modüle özel tercihler yakında eklenecektir</div>
                                </div>
                                <span className="badge badge-warning" style={{ fontSize: '10px' }}>YAKINDA</span>
                            </div>

                            <div className="settings-item" style={{ opacity: 0.5, cursor: 'default' }}>
                                <div className="settings-item-icon">
                                    <Bell size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Bildirim Tercihleri</div>
                                    <div className="settings-item-desc">Bu modüle özel bildirim ayarları</div>
                                </div>
                                <span className="badge badge-warning" style={{ fontSize: '10px' }}>YAKINDA</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-column">
                    <div className="settings-section">
                        <h2 className="settings-section-title">Bilgi</h2>
                        <div className="settings-list">
                            <div className="settings-item" style={{ alignItems: 'flex-start' }}>
                                <div className="settings-item-icon" style={{ marginTop: '2px' }}>
                                    <Info size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">{config.title} Modülü</div>
                                    <div className="settings-item-desc" style={{ marginTop: '8px', lineHeight: '1.6' }}>
                                        Bu sayfa, <strong>{config.title}</strong> modülüne özel ayarların yönetileceği alandır.
                                        Yeni özellikler eklendikçe burada ilgili ayar seçenekleri görünecektir.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
