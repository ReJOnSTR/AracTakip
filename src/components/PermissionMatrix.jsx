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
            gridTemplateColumns: '270px 1fr',
            gap: '16px',
            alignItems: 'stretch'
        }}>
            {/* Left Column: Role Preset Cards */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            }}>
                <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '6px 8px 8px 8px',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '4px'
                }}>
                    Rol Şablonu
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
                                    gap: '10px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                                    borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                    background: isSelected ? 'var(--bg-card)' : 'transparent',
                                    cursor: readOnly ? 'default' : 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                    width: '100%'
                                }}
                            >
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-tertiary)',
                                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    flexShrink: 0
                                }}>
                                    <PresetIcon size={14} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: isSelected ? 600 : 500,
                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {preset.label}
                                    </div>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {preset.subtext}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Right Column: Permission Matrix Table with Exact Headers & Unified Segmented Controls */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{
                            borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-card)'
                        }}>
                            <th style={{
                                padding: '10px 16px',
                                textAlign: 'left',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                Modül
                            </th>
                            <th style={{
                                padding: '10px 16px',
                                textAlign: 'right',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                width: '220px'
                            }}>
                                Erişim Seviyesi
                            </th>
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
                                        borderTop: idx !== 0 ? '1px solid var(--border-color)' : 'none',
                                        transition: 'background 0.15s ease'
                                    }}
                                >
                                    {/* Module Info */}
                                    <td style={{ padding: '8px 16px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--bg-tertiary)',
                                                color: 'var(--text-secondary)',
                                                flexShrink: 0
                                            }}>
                                                <Icon size={14} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                                    {mod.label}
                                                </div>
                                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                                    {mod.description}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Unified Segmented Pill Switcher */}
                                    <td style={{ padding: '8px 16px', textAlign: 'right', verticalAlign: 'middle', width: '220px' }}>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            padding: '2px',
                                            gap: '2px',
                                            height: '32px'
                                        }}>
                                            {/* None */}
                                            <button
                                                type="button"
                                                disabled={readOnly}
                                                onClick={() => onLevelChange && onLevelChange(mod.key, 'none')}
                                                style={{
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '0 12px',
                                                    height: '100%',
                                                    fontSize: '12px',
                                                    fontWeight: currentLevel === 'none' ? 600 : 400,
                                                    background: currentLevel === 'none' ? 'var(--bg-card)' : 'transparent',
                                                    color: currentLevel === 'none' ? 'var(--text-primary)' : 'var(--text-muted)',
                                                    boxShadow: currentLevel === 'none' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
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
                                                    borderRadius: '4px',
                                                    padding: '0 12px',
                                                    height: '100%',
                                                    fontSize: '12px',
                                                    fontWeight: currentLevel === 'viewer' ? 600 : 400,
                                                    background: currentLevel === 'viewer' ? 'var(--accent-primary)' : 'transparent',
                                                    color: currentLevel === 'viewer' ? '#ffffff' : 'var(--text-muted)',
                                                    boxShadow: currentLevel === 'viewer' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                                                    cursor: readOnly ? 'default' : 'pointer',
                                                    transition: 'all 0.15s ease'
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
                                                    borderRadius: '4px',
                                                    padding: '0 12px',
                                                    height: '100%',
                                                    fontSize: '12px',
                                                    fontWeight: currentLevel === 'editor' ? 600 : 400,
                                                    background: currentLevel === 'editor' ? 'var(--accent-primary)' : 'transparent',
                                                    color: currentLevel === 'editor' ? '#ffffff' : 'var(--text-muted)',
                                                    boxShadow: currentLevel === 'editor' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                                                    cursor: readOnly ? 'default' : 'pointer',
                                                    transition: 'all 0.15s ease'
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
    )
}
