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
        <div className="permission-matrix-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Quick Presets Selector Bar */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        1. Hazır Rol Şablonu Seçin
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Seçilen şablon modül yetkilerini otomatik ayarlar
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                    {ROLE_PRESETS.map((preset) => {
                        const isSelected = selectedPreset === preset.id
                        return (
                            <div
                                key={preset.id}
                                onClick={() => !readOnly && onPresetChange && onPresetChange(preset.id, preset.levels)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    background: isSelected ? 'rgba(20, 184, 166, 0.08)' : 'var(--bg-secondary)',
                                    cursor: readOnly ? 'default' : 'pointer',
                                    transition: 'all 0.15s ease',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                        {preset.label}
                                    </span>
                                    {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)' }} />}
                                </div>
                                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    {preset.subtext}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 3-Level Permission Matrix Grid */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        2. Modül Erişim Seviyeleri (Özelleştirilebilir)
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#71717a' }}></span> Kapalı</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span> Okuyucu</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Düzenleyici</span>
                    </div>
                </div>

                <div style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: 'var(--bg-secondary)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Modül Adı</th>
                                <th style={{ textAlign: 'center', width: '320px', padding: '10px 16px', fontWeight: 600 }}>Erişim Düzeyi</th>
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
                                            background: currentLevel === 'editor' ? 'rgba(16, 185, 129, 0.03)' : (currentLevel === 'viewer' ? 'rgba(59, 130, 246, 0.03)' : 'transparent'),
                                            transition: 'background 0.12s'
                                        }}
                                    >
                                        {/* Module Info */}
                                        <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '8px',
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
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                                        {mod.label}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                        {mod.description}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Segmented 3-Level Pill Controller */}
                                        <td style={{ textAlign: 'right', padding: '10px 16px' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                background: 'var(--bg-tertiary)',
                                                padding: '3px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                gap: '2px'
                                            }}>
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'none')}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '11.5px',
                                                        fontWeight: currentLevel === 'none' ? 600 : 400,
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: currentLevel === 'none' ? '#3f3f46' : 'transparent',
                                                        color: currentLevel === 'none' ? '#ffffff' : 'var(--text-muted)',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.12s'
                                                    }}
                                                >
                                                    Yok
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'viewer')}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '11.5px',
                                                        fontWeight: currentLevel === 'viewer' ? 600 : 400,
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: currentLevel === 'viewer' ? '#2563eb' : 'transparent',
                                                        color: currentLevel === 'viewer' ? '#ffffff' : 'var(--text-muted)',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.12s'
                                                    }}
                                                >
                                                    Okuyucu
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={readOnly}
                                                    onClick={() => onLevelChange && onLevelChange(mod.key, 'editor')}
                                                    style={{
                                                        padding: '4px 12px',
                                                        fontSize: '11.5px',
                                                        fontWeight: currentLevel === 'editor' ? 600 : 400,
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        background: currentLevel === 'editor' ? '#059669' : 'transparent',
                                                        color: currentLevel === 'editor' ? '#ffffff' : 'var(--text-muted)',
                                                        cursor: readOnly ? 'default' : 'pointer',
                                                        transition: 'all 0.12s'
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
