import { useLocation } from 'react-router-dom'
import { Settings, Info, ToggleLeft, Sliders, Bell, Database, Shield, Palette } from 'lucide-react'

const moduleConfig = {
    fleet: {
        title: 'Filo Yönetimi',
        description: 'Araç filonuzla ilgili genel ayarları buradan yönetebilirsiniz.',
        icon: Sliders,
    },
    finance: {
        title: 'Finans',
        description: 'Finans modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Database,
    },
    meals: {
        title: 'Yemek Fişi',
        description: 'Yemek fişi modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Bell,
    },
    hr: {
        title: 'Personel',
        description: 'Personel yönetimi modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Shield,
    },
    works: {
        title: 'İş & Operasyon',
        description: 'İş takibi modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: ToggleLeft,
    },
    customers: {
        title: 'Müşteri',
        description: 'Cari ve müşteri modülüne özel ayarları buradan yönetebilirsiniz.',
        icon: Palette,
    }
}

export default function ModuleSettings() {
    const location = useLocation()

    const moduleKey = location.pathname.split('/module-settings/')[1] || 'fleet'
    const config = moduleConfig[moduleKey] || moduleConfig.fleet
    const ModuleIcon = config.icon

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{config.title} Ayarları</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>{config.description}</p>
                </div>
            </div>

            <div className="settings-layout">
                <div className="settings-column">
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
