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
        <div className="permission-matrix-split-container" style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '18px',
            alignItems: 'start'
        }}>
            {/* Left Column: Role Preset Cards */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <Shield size={13} className="text-primary" />
                    <span>Hazır Rol Şablonları</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                                    padding: '9px 11px',
                                    borderRadius: '8px',
                                    border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-tertiary)',
                                    cursor: readOnly ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? '0 0 0 1px var(--accent-primary)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '2px' }}>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: isSelected ? 700 : 600,
                                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)'
                                    }}>
                                        {preset.label}
                                    </span>
                                    {isSelected && <CheckCircle2 size={13} color="var(--accent-primary)" />}
                                </div>
                                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                    {preset.subtext}
                                </span>
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
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em'
                    }}>
                        Modül Yetki Seviyeleri
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#71717a' }} />
                            Yok
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                            Okuyucu
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                            Düzenleyici
                        </span>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
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
                                        <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '7px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: `${mod.color}18`,
                                                    color: mod.color,
                                                    flexShrink: 0
                                                }}>
                                                    <Icon size={15} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                                                        {mod.label}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        {mod.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Segmented Pill Switcher */}
                                        <td style={{ padding: '10px 16px', textAlign: 'right', width: '250px' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '7px',
                                                padding: '2px',
                                                gap: '2px'
                                            }}>
                                                {/* None */}
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'none')}
                                                    style={{
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: currentLevel === 'none' ? 600 : 500,
                                                        background: currentLevel === 'none' ? 'var(--bg-card)' : 'transparent',
                                                        color: currentLevel === 'none' ? 'var(--text-primary)' : 'var(--text-muted)',
                                                        boxShadow: currentLevel === 'none' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.15s ease'
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
                                                        borderRadius: '5px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: currentLevel === 'viewer' ? 700 : 500,
                                                        background: currentLevel === 'viewer' ? '#3b82f6' : 'transparent',
                                                        color: currentLevel === 'viewer' ? '#ffffff' : 'var(--text-muted)',
                                                        boxShadow: currentLevel === 'viewer' ? '0 1px 3px rgba(59,130,246,0.4)' : 'none',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    Okuyucu
                                                </button>

                                                {/* Editor */}
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'editor')}
                                                    style={{
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        padding: '4px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: currentLevel === 'editor' ? 700 : 500,
                                                        background: currentLevel === 'editor' ? '#10b981' : 'transparent',
                                                        color: currentLevel === 'editor' ? '#ffffff' : 'var(--text-muted)',
                                                        boxShadow: currentLevel === 'editor' ? '0 1px 3px rgba(16,185,129,0.4)' : 'none',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    Düzenleyici
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
