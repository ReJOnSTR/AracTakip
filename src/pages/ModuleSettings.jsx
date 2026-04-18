import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Settings, Info, ToggleLeft, Sliders, Bell, Database, Shield, Palette, Clock, Calculator, Pencil, X, Save } from 'lucide-react'

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

// HR Module Settings
function HrModuleContent() {
    const [weekdayMultiplier, setWeekdayMultiplier] = useState(() => {
        return parseFloat(localStorage.getItem('hr_overtime_weekday_multiplier')) || 1.5
    })
    const [sundayMultiplier, setSundayMultiplier] = useState(() => {
        return parseFloat(localStorage.getItem('hr_overtime_sunday_multiplier')) || 1.5
    })

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editWeekday, setEditWeekday] = useState(weekdayMultiplier)
    const [editSunday, setEditSunday] = useState(sundayMultiplier)

    const openModal = () => {
        setEditWeekday(weekdayMultiplier)
        setEditSunday(sundayMultiplier)
        setShowModal(true)
    }

    const handleSave = () => {
        const wVal = parseFloat(editWeekday)
        const sVal = parseFloat(editSunday)
        if (isNaN(wVal) || wVal <= 0 || isNaN(sVal) || sVal <= 0) return

        localStorage.setItem('hr_overtime_weekday_multiplier', wVal.toString())
        localStorage.setItem('hr_overtime_sunday_multiplier', sVal.toString())
        setWeekdayMultiplier(wVal)
        setSundayMultiplier(sVal)
        setShowModal(false)
    }

    return (
        <>
            <div className="settings-layout">
                <div className="settings-column">
                    <div className="settings-section">
                        <h2 className="settings-section-title">Mesai Ücret Katsayıları</h2>
                        <div className="settings-list">
                            {/* Weekday Overtime */}
                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <Clock size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Hafta İçi Mesai Katsayısı</div>
                                    <div className="settings-item-desc">Saatlik ücret bu katsayı ile çarpılır</div>
                                </div>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: 'var(--accent-primary)',
                                    background: 'var(--accent-primary-alpha, rgba(59,130,246,0.1))',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    minWidth: '50px',
                                    textAlign: 'center'
                                }}>
                                    {weekdayMultiplier}x
                                </span>
                            </div>

                            {/* Sunday Overtime */}
                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <Calculator size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Pazar Mesai Katsayısı</div>
                                    <div className="settings-item-desc">Günlük ücret bu katsayı ile çarpılır</div>
                                </div>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: 'var(--accent-primary)',
                                    background: 'var(--accent-primary-alpha, rgba(59,130,246,0.1))',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    minWidth: '50px',
                                    textAlign: 'center'
                                }}>
                                    {sundayMultiplier}x
                                </span>
                            </div>
                        </div>
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={openModal}>
                                <Pencil size={16} />
                                Düzenle
                            </button>
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

            {/* Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Mesai Katsayılarını Düzenle</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group floating-label-group">
                                <div className="input-wrapper">
                                    <input
                                        type="number"
                                        id="edit-weekday"
                                        className="form-input"
                                        value={editWeekday}
                                        onChange={e => setEditWeekday(e.target.value)}
                                        step="0.1"
                                        min="0.1"
                                        placeholder=" "
                                    />
                                    <label className="form-label" htmlFor="edit-weekday">Hafta İçi Mesai Katsayısı</label>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '2px' }}>
                                    Maaş ÷ 30 ÷ 10 × <strong>{editWeekday || '?'}</strong> = Saatlik mesai ücreti
                                </div>
                            </div>

                            <div className="form-group floating-label-group" style={{ marginTop: '16px' }}>
                                <div className="input-wrapper">
                                    <input
                                        type="number"
                                        id="edit-sunday"
                                        className="form-input"
                                        value={editSunday}
                                        onChange={e => setEditSunday(e.target.value)}
                                        step="0.1"
                                        min="0.1"
                                        placeholder=" "
                                    />
                                    <label className="form-label" htmlFor="edit-sunday">Pazar Mesai Katsayısı</label>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '2px' }}>
                                    Maaş ÷ 30 × <strong>{editSunday || '?'}</strong> = Günlük pazar mesai ücreti
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                <Save size={16} />
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
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
