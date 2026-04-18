import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Settings, Info, ToggleLeft, Sliders, Bell, Database, Shield, Palette, Clock, Calculator } from 'lucide-react'

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

// Default placeholder content for non-HR modules
function DefaultModuleContent({ config, ModuleIcon }) {
    return (
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
    )
}

// HR Module Settings with overtime multipliers
function HrModuleContent() {
    const [weekdayMultiplier, setWeekdayMultiplier] = useState(() => {
        return parseFloat(localStorage.getItem('hr_overtime_weekday_multiplier')) || 1.5
    })
    const [sundayMultiplier, setSundayMultiplier] = useState(() => {
        return parseFloat(localStorage.getItem('hr_overtime_sunday_multiplier')) || 1.5
    })
    const [saved, setSaved] = useState(false)

    const handleSave = (key, value, setter) => {
        const numVal = parseFloat(value)
        if (isNaN(numVal) || numVal <= 0) return
        setter(numVal)
        localStorage.setItem(key, numVal.toString())
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="settings-layout">
            <div className="settings-column">
                <div className="settings-section">
                    <h2 className="settings-section-title">Mesai Ücret Katsayıları</h2>
                    <div className="settings-list">
                        {/* Weekday Overtime */}
                        <div className="settings-item" style={{ alignItems: 'flex-start' }}>
                            <div className="settings-item-icon" style={{ marginTop: '4px' }}>
                                <Clock size={18} />
                            </div>
                            <div className="settings-item-content">
                                <div className="settings-item-label">Hafta İçi Mesai Katsayısı</div>
                                <div className="settings-item-desc">
                                    Saatlik ücret bu katsayı ile çarpılır. Varsayılan: 1.5x
                                </div>
                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: '100px', textAlign: 'center' }}
                                        value={weekdayMultiplier}
                                        onChange={(e) => setWeekdayMultiplier(e.target.value)}
                                        onBlur={(e) => handleSave('hr_overtime_weekday_multiplier', e.target.value, setWeekdayMultiplier)}
                                        step="0.1"
                                        min="0.1"
                                    />
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>x</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        (Maaş / 30 / 10 × {weekdayMultiplier})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sunday Overtime */}
                        <div className="settings-item" style={{ alignItems: 'flex-start' }}>
                            <div className="settings-item-icon" style={{ marginTop: '4px' }}>
                                <Calculator size={18} />
                            </div>
                            <div className="settings-item-content">
                                <div className="settings-item-label">Pazar Mesai Katsayısı</div>
                                <div className="settings-item-desc">
                                    Günlük ücret bu katsayı ile çarpılır. Varsayılan: 1.5x
                                </div>
                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: '100px', textAlign: 'center' }}
                                        value={sundayMultiplier}
                                        onChange={(e) => setSundayMultiplier(e.target.value)}
                                        onBlur={(e) => handleSave('hr_overtime_sunday_multiplier', e.target.value, setSundayMultiplier)}
                                        step="0.1"
                                        min="0.1"
                                    />
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>x</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        (Maaş / 30 × {sundayMultiplier})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {saved && (
                        <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--success)', fontWeight: 500, textAlign: 'center' }}>
                            ✓ Kaydedildi
                        </div>
                    )}
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
                                <div className="settings-item-label">Mesai Hesaplama Formülü</div>
                                <div className="settings-item-desc" style={{ marginTop: '8px', lineHeight: '1.8' }}>
                                    <strong>Hafta İçi Mesai:</strong><br />
                                    Saatlik Ücret = Maaş ÷ 30 ÷ 10<br />
                                    Mesai Ücreti = Saatlik Ücret × Katsayı × Saat<br /><br />
                                    <strong>Pazar Mesai:</strong><br />
                                    Günlük Ücret = Maaş ÷ 30<br />
                                    Mesai Ücreti = Günlük Ücret × Katsayı × Gün
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
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

            {moduleKey === 'hr' ? (
                <HrModuleContent />
            ) : (
                <DefaultModuleContent config={config} ModuleIcon={ModuleIcon} />
            )}
        </div>
    )
}
