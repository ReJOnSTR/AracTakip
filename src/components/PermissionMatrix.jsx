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
    CheckCircle2,
    Crown,
    Calculator,
    Wrench,
    FileSearch,
    UserCheck,
    Eye,
    Check,
    Ban,
    Sparkles
} from 'lucide-react'

export const MODULE_DEFINITIONS = [
    { 
        key: 'works', 
        label: 'Puantaj & Saha İşleri', 
        description: 'Saha çalışma fişleri, saatlik & günlük iş kayıtları',
        icon: Briefcase,
        color: '#3b82f6'
    },
    { 
        key: 'employees', 
        label: 'Personel & Bordro', 
        description: 'Personel listesi, izinler, mesailer ve maaş puantajları',
        icon: Users,
        color: '#10b981'
    },
    { 
        key: 'vehicles', 
        label: 'Araçlar & Filo Yönetimi', 
        description: 'Vinç/kamyon filosu, periyodik bakım ve muayeneler',
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
        icon: Crown,
        subtext: 'Tüm modüllerde tam silme, düzenleme ve yönetim yetkisi',
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
        icon: Briefcase,
        subtext: 'Saha işleri ve araç operasyonu (Kasa ve Şirket ayarları kapalı)',
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
        icon: Calculator,
        subtext: 'Kasa, cari, çek, tahsilat, fatura ve personel bordroları',
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
        icon: Wrench,
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
        icon: FileSearch,
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
        icon: UserCheck,
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
        <div className="permission-matrix-split-container" style={{
            display: 'grid',
            gridTemplateColumns: '290px 1fr',
            gap: '16px',
            alignItems: 'stretch'
        }}>
            {/* Left Column: Role Preset Cards */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 4px 8px 4px',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '4px'
                }}>
                    Rol Şablonları
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ROLE_PRESETS.map((preset) => {
                        const isSelected = selectedPreset === preset.id
                        const PresetIcon = preset.icon || Shield
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => onPresetChange && onPresetChange(preset.id, preset.levels)}
                                disabled={readOnly}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-primary)',
                                    cursor: readOnly ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    width: '100%'
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                                    flexShrink: 0
                                }}>
                                    <PresetIcon size={16} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '13.5px',
                                        fontWeight: isSelected ? 700 : 600,
                                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {preset.label}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        marginTop: '1px'
                                    }}>
                                        {preset.subtext}
                                    </div>
                                </div>
                                {isSelected && (
                                    <CheckCircle2 size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Right Column: Permission Matrix Table with Segmented Controls */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Modül Yetkileri
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>• Yok: Kapalı</span>
                        <span>• Oku: Salt Okunur</span>
                        <span>• Düzenle: Tam Yetki</span>
                    </div>
                </div>

                <div style={{ overflowX: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {MODULE_DEFINITIONS.map((mod, idx) => {
                                const Icon = mod.icon
                                const currentLevel = permissionLevels[mod.key] || 'none'

                                return (
                                    <tr 
                                        key={mod.key}
                                        style={{ 
                                            borderTop: idx !== 0 ? '1px solid var(--border-color)' : 'none',
                                            background: currentLevel === 'editor' ? 'rgba(16, 185, 129, 0.03)' : (currentLevel === 'viewer' ? 'rgba(59, 130, 246, 0.03)' : 'transparent'),
                                            transition: 'background 0.15s ease'
                                        }}
                                    >
                                        {/* Module Info */}
                                        <td style={{ padding: '9px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: `${mod.color}15`,
                                                    color: mod.color,
                                                    flexShrink: 0
                                                }}>
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                                                        {mod.label}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                                        {mod.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Segmented Pill Switcher */}
                                        <td style={{ padding: '9px 16px', textAlign: 'right', verticalAlign: 'middle', width: '240px' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                background: 'var(--bg-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                padding: '3px',
                                                gap: '3px',
                                                height: '34px'
                                            }}>
                                                {/* None */}
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'none')}
                                                    style={{
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '0 12px',
                                                        height: '100%',
                                                        fontSize: '12px',
                                                        fontWeight: currentLevel === 'none' ? 600 : 500,
                                                        background: currentLevel === 'none' ? 'var(--bg-tertiary)' : 'transparent',
                                                        color: currentLevel === 'none' ? 'var(--text-primary)' : 'var(--text-muted)',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    Yok
                                                </button>

                                                {/* Viewer */}
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'viewer')}
                                                    style={{
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '0 12px',
                                                        height: '100%',
                                                        fontSize: '12px',
                                                        fontWeight: currentLevel === 'viewer' ? 600 : 500,
                                                        background: currentLevel === 'viewer' ? '#3b82f6' : 'transparent',
                                                        color: currentLevel === 'viewer' ? '#ffffff' : 'var(--text-muted)',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    Oku
                                                </button>

                                                {/* Editor */}
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'editor')}
                                                    style={{
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '0 12px',
                                                        height: '100%',
                                                        fontSize: '12px',
                                                        fontWeight: currentLevel === 'editor' ? 600 : 500,
                                                        background: currentLevel === 'editor' ? '#10b981' : 'transparent',
                                                        color: currentLevel === 'editor' ? '#ffffff' : 'var(--text-muted)',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    Düzenle
                                                </button>
                                            </div>
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
