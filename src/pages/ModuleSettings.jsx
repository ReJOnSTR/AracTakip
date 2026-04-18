import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Settings, Info, ToggleLeft, Sliders, Bell, Database, Shield, Palette, Clock, Calculator, Pencil, Save } from 'lucide-react'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'

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

    // Modal
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [editValue, setEditValue] = useState('')

    const settingsData = [
        {
            id: 'weekday',
            label: 'Hafta İçi Mesai Katsayısı',
            description: 'Saatlik ücret × katsayı (Maaş ÷ 30 ÷ 10 × katsayı)',
            value: weekdayMultiplier,
            storageKey: 'hr_overtime_weekday_multiplier'
        },
        {
            id: 'sunday',
            label: 'Pazar Mesai Katsayısı',
            description: 'Günlük ücret × katsayı (Maaş ÷ 30 × katsayı)',
            value: sundayMultiplier,
            storageKey: 'hr_overtime_sunday_multiplier'
        }
    ]

    const columns = [
        {
            key: 'label',
            label: 'Ayar',
            sortable: false,
            render: (val, item) => (
                <div>
                    <div style={{ fontWeight: '500' }}>{val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.description}</div>
                </div>
            )
        },
        {
            key: 'value',
            label: 'Değer',
            sortable: false,
            render: (val) => (
                <span style={{ fontWeight: '600', color: 'var(--accent-primary)', fontSize: '15px' }}>
                    {val}x
                </span>
            )
        }
    ]

    const openEdit = (item) => {
        setEditingItem(item)
        setEditValue(String(item.value))
        setShowModal(true)
    }

    const handleSave = (e) => {
        e.preventDefault()
        const numVal = parseFloat(editValue)
        if (isNaN(numVal) || numVal <= 0) return

        localStorage.setItem(editingItem.storageKey, numVal.toString())

        if (editingItem.id === 'weekday') setWeekdayMultiplier(numVal)
        if (editingItem.id === 'sunday') setSundayMultiplier(numVal)

        setShowModal(false)
        setEditingItem(null)
    }

    return (
        <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '25px', maxWidth: '500px' }}>
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">HAFTA İÇİ</div>
                        <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}><Clock size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value" style={{ fontSize: '22px' }}>{weekdayMultiplier}x</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Saatlik mesai katsayısı</div>
                    </div>
                </div>
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">PAZAR</div>
                        <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}><Calculator size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value" style={{ fontSize: '22px' }}>{sundayMultiplier}x</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Günlük mesai katsayısı</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                persistenceKey="ModuleSettings_hr_table_0"
                storageKey="module_settings_hr_cols"
                columns={columns}
                data={settingsData}
                emptyMessage="Ayar bulunamadı."
                searchable={false}
                paginated={false}
                actions={(item) => (
                    <button title="Düzenle" onClick={() => openEdit(item)}><Pencil size={16} /></button>
                )}
            />

            {/* Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingItem ? `${editingItem.label} Düzenle` : 'Düzenle'}
            >
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label className="form-label">Katsayı Değeri</label>
                        <input
                            type="number"
                            className="form-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            min="0.1"
                            step="0.1"
                            placeholder="Örn: 1.5"
                            autoFocus
                        />
                        {editingItem && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.6' }}>
                                {editingItem.id === 'weekday'
                                    ? <>Hesaplama: Maaş ÷ 30 ÷ 10 × <strong>{editValue || '?'}</strong> = Saatlik mesai ücreti</>
                                    : <>Hesaplama: Maaş ÷ 30 × <strong>{editValue || '?'}</strong> = Günlük pazar mesai ücreti</>
                                }
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary">
                            <Save size={15} />
                            Kaydet
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    )
}

export default function ModuleSettings() {
    const location = useLocation()

    const moduleKey = location.pathname.split('/module-settings/')[1] || 'fleet'
    const config = moduleConfig[moduleKey] || moduleConfig.fleet
    const ModuleIcon = config.icon

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{config.title} Ayarları</h1>
                    <p className="page-subtitle">{config.description}</p>
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
