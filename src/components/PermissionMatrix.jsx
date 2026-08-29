import React from 'react'
import { 
    Briefcase, 
    Users, 
    Truck, 
    Wallet, 
    Building2, 
    BarChart3, 
    Settings,
    Shield,
    CheckCircle2
} from 'lucide-react'

export const MODULE_DEFINITIONS = [
    { 
        key: 'works', 
        label: 'Puantaj & İşler', 
        description: 'Saha çalışma fişleri, saatlik & günlük işler',
        icon: Briefcase,
        color: '#3b82f6'
    },
    { 
        key: 'employees', 
        label: 'Personel & Bordro', 
        description: 'Personel listesi, izinler, mesailer ve maaşlar',
        icon: Users,
        color: '#10b981'
    },
    { 
        key: 'vehicles', 
        label: 'Araçlar & Filo', 
        description: 'Vinç/kamyon filosu, periyodik bakım ve muayene',
        icon: Truck,
        color: '#f59e0b'
    },
    { 
        key: 'customers', 
        label: 'Müşteriler & Cari', 
        description: 'Müşteri hesapları, cariler ve irtibatlar',
        icon: Building2,
        color: '#8b5cf6'
    },
    { 
        key: 'finance', 
        label: 'Finans, Kasa & Çek', 
        description: 'Kasa/Banka hareketleri, tahsilatlar ve çekler',
        icon: Wallet,
        color: '#ec4899'
    },
    { 
        key: 'reports', 
        label: 'Raporlar & Dökümler', 
        description: 'PDF raporları, hakediş icmalleri ve analizler',
        icon: BarChart3,
        color: '#06b6d4'
    },
    { 
        key: 'settings', 
        label: 'Şirket Ayarları', 
        description: 'Şirket profili, parametreler ve sistem ayarları',
        icon: Settings,
        color: '#64748b'
    }
]

export const ROLE_PRESETS = [
    {
        id: 'company_admin',
        label: 'Şirket Yöneticisi',
        subtext: 'Şirket içindeki tüm modüllerde tam yetki',
        badgeColor: 'badge-primary',
        levels: {
            works: 'editor',
            employees: 'editor',
            vehicles: 'editor',
            customers: 'editor',
            finance: 'editor',
            reports: 'editor',
            settings: 'editor'
        }
    },
    {
        id: 'manager',
        label: 'Operasyon & Puantör',
        subtext: 'Saha işleri ve araç yönetimi (Finans ve Kasa kapalı)',
        badgeColor: 'badge-info',
        levels: {
            works: 'editor',
            employees: 'viewer',
            vehicles: 'editor',
            customers: 'viewer',
            finance: 'none',
            reports: 'viewer',
            settings: 'none'
        }
    },
    {
        id: 'accountant',
        label: 'Ön Muhasebe & Finans',
        subtext: 'Kasa, cari, çek, fatura ve personel bordroları',
        badgeColor: 'badge-warning',
        levels: {
            works: 'viewer',
            employees: 'editor',
            vehicles: 'viewer',
            customers: 'editor',
            finance: 'editor',
            reports: 'editor',
            settings: 'none'
        }
    },
    {
        id: 'maintenance',
        label: 'Kademe & Bakım Şefi',
        subtext: 'Araç bakımı, muayene, sigorta ve arıza yönetimi',
        badgeColor: 'badge-warning',
        levels: {
            works: 'none',
            employees: 'none',
            vehicles: 'editor',
            customers: 'none',
            finance: 'none',
            reports: 'viewer',
            settings: 'none'
        }
    },
    {
        id: 'auditor',
        label: 'Mali Müşavir / Denetçi',
        subtext: 'Tüm modülleri sadece inceler (Silme/Değiştirme kapalı)',
        badgeColor: 'badge-neutral',
        levels: {
            works: 'viewer',
            employees: 'viewer',
            vehicles: 'viewer',
            customers: 'viewer',
            finance: 'viewer',
            reports: 'viewer',
            settings: 'none'
        }
    },
    {
        id: 'personnel',
        label: 'Saha Personeli / Şoför',
        subtext: 'Sadece kendine atanan işleri ve izinlerini görür',
        badgeColor: 'badge-success',
        levels: {
            works: 'none',
            employees: 'none',
            vehicles: 'none',
            customers: 'none',
            finance: 'none',
            reports: 'none',
            settings: 'none'
        }
    }
]

export default function PermissionMatrix({
    selectedPreset,
    onPresetChange,
    permissionLevels = {},
    onLevelChange,
    readOnly = false
}) {
    return (
        <div className="permission-matrix-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Presets Selector Bar */}
            <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    1. Hazır Rol Şablonu Seçin:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {ROLE_PRESETS.map((preset) => {
                        const isSelected = selectedPreset === preset.id
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => onPresetChange && onPresetChange(preset.id, preset.levels)}
                                disabled={readOnly}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                                    cursor: readOnly ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '3px' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                        {preset.label}
                                    </span>
                                    {isSelected && <CheckCircle2 size={14} color="var(--accent-primary)" />}
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                    {preset.subtext}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 3-Level Permission Matrix Grid */}
            <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        2. Modül Erişim Seviyeleri:
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        İstediğiniz modülün seviyesini değiştirebilirsiniz
                    </span>
                </div>

                <div style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--bg-card)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 600 }}>Modül Adı</th>
                                <th style={{ textAlign: 'center', width: '110px', padding: '9px 8px', fontWeight: 600 }}>Erişim Yok</th>
                                <th style={{ textAlign: 'center', width: '110px', padding: '9px 8px', fontWeight: 600 }}>Okuyucu</th>
                                <th style={{ textAlign: 'center', width: '110px', padding: '9px 8px', fontWeight: 600 }}>Düzenleyici</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MODULE_DEFINITIONS.map((mod, idx) => {
                                const Icon = mod.icon
                                const currentLevel = permissionLevels[mod.key] || 'none'

                                return (
                                    <tr 
                                        key={mod.key}
                                        style={{ 
                                            borderTop: idx !== 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                            background: currentLevel === 'editor' ? 'rgba(99, 102, 241, 0.02)' : 'transparent',
                                            transition: 'background 0.12s'
                                        }}
                                    >
                                        {/* Module Info */}
                                        <td style={{ padding: '9px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: `${mod.color}15`,
                                                    color: mod.color
                                                }}>
                                                    <Icon size={14} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                                                        {mod.label}
                                                    </div>
                                                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                                        {mod.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Option: None */}
                                        <td style={{ textAlign: 'center', padding: '9px 8px' }}>
                                            <label style={{ cursor: readOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                                                <input
                                                    type="radio"
                                                    name={`perm_${mod.key}`}
                                                    value="none"
                                                    checked={currentLevel === 'none'}
                                                    disabled={readOnly}
                                                    onChange={() => onLevelChange && onLevelChange(mod.key, 'none')}
                                                    style={{ accentColor: '#71717a', width: '14px', height: '14px', cursor: readOnly ? 'default' : 'pointer' }}
                                                />
                                            </label>
                                        </td>

                                        {/* Option: Viewer */}
                                        <td style={{ textAlign: 'center', padding: '9px 8px' }}>
                                            <label style={{ cursor: readOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                                                <input
                                                    type="radio"
                                                    name={`perm_${mod.key}`}
                                                    value="viewer"
                                                    checked={currentLevel === 'viewer'}
                                                    disabled={readOnly}
                                                    onChange={() => onLevelChange && onLevelChange(mod.key, 'viewer')}
                                                    style={{ accentColor: '#3b82f6', width: '14px', height: '14px', cursor: readOnly ? 'default' : 'pointer' }}
                                                />
                                            </label>
                                        </td>

                                        {/* Option: Editor */}
                                        <td style={{ textAlign: 'center', padding: '9px 8px' }}>
                                            <label style={{ cursor: readOnly ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                                                <input
                                                    type="radio"
                                                    name={`perm_${mod.key}`}
                                                    value="editor"
                                                    checked={currentLevel === 'editor'}
                                                    disabled={readOnly}
                                                    onChange={() => onLevelChange && onLevelChange(mod.key, 'editor')}
                                                    style={{ accentColor: '#10b981', width: '14px', height: '14px', cursor: readOnly ? 'default' : 'pointer' }}
                                                />
                                            </label>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
