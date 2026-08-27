import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { formatDate } from '../utils/helpers'
import DataTable from '../components/DataTable'
import TopProgressBar from '../components/TopProgressBar'
import { 
    Crown, 
    Building2, 
    Users, 
    Car, 
    Briefcase, 
    Activity, 
    Database, 
    Eye, 
    RefreshCw, 
    CheckCircle2, 
    XCircle, 
    Download, 
    HardDrive, 
    Cpu, 
    Clock, 
    Shield, 
    Sparkles, 
    Loader2 
} from 'lucide-react'
import './PlatformAdmin.css'

export default function PlatformAdmin() {
    const { user } = useAuth()
    const { companies, selectCompany } = useCompany()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('tenants') // 'tenants' | 'users' | 'health' | 'backups'
    const [loading, setLoading] = useState(true)
    const [overviewData, setOverviewData] = useState(null)
    const [platformUsers, setPlatformUsers] = useState([])
    const [backups, setBackups] = useState([])
    const [healthData, setHealthData] = useState(null)
    const [healthLoading, setHealthLoading] = useState(false)
    const [backupLoading, setBackupLoading] = useState(false)
    const [actionMsg, setActionMsg] = useState('')

    // Verify SuperAdmin access
    const isSuperAdmin = user?.role === 'superadmin' || user?.username === 'admin'

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/dashboard')
            return
        }
        loadAllData()
    }, [isSuperAdmin])

    const loadAllData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                loadOverview(),
                loadUsers(),
                loadBackups(),
                loadHealth()
            ])
        } catch (err) {
            console.error('Platform data load error:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadOverview = async () => {
        const res = await window.electronAPI.getPlatformOverview()
        if (res.success) {
            setOverviewData(res.data)
        }
    }

    const loadUsers = async () => {
        const res = await window.electronAPI.getPlatformUsers()
        if (res.success) {
            setPlatformUsers(res.data)
        }
    }

    const loadBackups = async () => {
        const res = await window.electronAPI.getPlatformBackups()
        if (res.success) {
            setBackups(res.data)
        }
    }

    const loadHealth = async () => {
        setHealthLoading(true)
        try {
            const res = await window.electronAPI.getPlatformSystemHealth()
            if (res.success) {
                setHealthData(res.data)
            }
        } finally {
            setHealthLoading(false)
        }
    }

    // Impersonate / Switch context to company
    const handleImpersonate = (company) => {
        selectCompany(company)
        setActionMsg(`"${company.name}" paneline geçiş yapıldı.`)
        setTimeout(() => {
            navigate('/dashboard')
        }, 600)
    }

    // Toggle Company Active State
    const handleToggleCompany = async (company) => {
        const nextState = company.is_active === 1 ? 0 : 1
        const res = await window.electronAPI.toggleCompanyStatus(company.id, nextState)
        if (res.success) {
            await loadOverview()
        }
    }

    // Toggle User Active State
    const handleToggleUser = async (u) => {
        const nextState = u.is_active === 1 ? 0 : 1
        const res = await window.electronAPI.toggleUserStatus(u.id, nextState)
        if (res.success) {
            await loadUsers()
        }
    }

    // Trigger Manual Backup
    const handleManualBackup = async () => {
        setBackupLoading(true)
        try {
            const res = await window.electronAPI.triggerPlatformBackup()
            if (res.success) {
                setActionMsg('Yeni veritabanı yedeği başarıyla oluşturuldu!')
                await loadBackups()
            } else {
                setActionMsg('Yedekleme hatası: ' + res.error)
            }
        } finally {
            setBackupLoading(false)
        }
    }

    if (!isSuperAdmin) {
        return null
    }

    const stats = overviewData?.stats || {
        totalCompanies: 0,
        totalVehicles: 0,
        totalEmployees: 0,
        totalWorks: 0,
        totalUsers: 0
    }

    // ── TABLE COLUMNS ──
    const tenantColumns = [
        { key: 'name', label: 'Şirket Adı', render: (val, r) => (
            <div>
                <strong style={{ color: 'var(--text-primary)' }}>{val}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kayıt: {formatDate(r.created_at)}</div>
            </div>
        )},
        { key: 'tax_number', label: 'Vergi No / İletişim', render: (val, r) => (
            <div>
                <div>VN: {val}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.phone}</div>
            </div>
        )},
        { key: 'counts', label: 'Kullanım Hacmi', render: (val) => (
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                <span className="badge badge-info">{val?.vehicles || 0} Araç</span>
                <span className="badge badge-warning">{val?.employees || 0} Personel</span>
                <span className="badge badge-success">{val?.works || 0} İş</span>
            </div>
        )},
        { key: 'is_active', label: 'Durum', render: (val) => (
            val === 1 ? (
                <span className="status-badge-active"><CheckCircle2 size={12} /> Aktif</span>
            ) : (
                <span className="status-badge-suspended"><XCircle size={12} /> Askıda</span>
            )
        )},
        { key: 'actions', label: 'Yönetim', render: (_, r) => (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                    className="ghost-btn"
                    onClick={() => handleImpersonate(r)}
                    title="Müşteri Modu: Bu şirketin paneline geçiş yap"
                >
                    <Eye size={14} />
                    <span>Şirkete Geç</span>
                </button>
                <button
                    className={`btn btn-sm ${r.is_active === 1 ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => handleToggleCompany(r)}
                    style={{ padding: '5px 10px', fontSize: '11px' }}
                >
                    {r.is_active === 1 ? 'Dondur' : 'Aktif Et'}
                </button>
            </div>
        )}
    ]

    const userColumns = [
        { key: 'username', label: 'Kullanıcı Adı', render: (val, r) => (
            <div>
                <strong>{val}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.email}</div>
            </div>
        )},
        { key: 'company_name', label: 'Bağlı Şirket', render: (val) => (
            <span style={{ fontWeight: 500 }}>{val}</span>
        )},
        { key: 'role', label: 'Rol', render: (val) => (
            <span className={`badge ${val === 'admin' || val === 'superadmin' ? 'badge-danger' : 'badge-primary'}`}>
                {val.toUpperCase()}
            </span>
        )},
        { key: 'created_at', label: 'Kayıt Tarihi', render: (val) => formatDate(val) },
        { key: 'is_active', label: 'Durum', render: (val) => (
            val === 1 ? (
                <span className="status-badge-active"><CheckCircle2 size={12} /> Aktif</span>
            ) : (
                <span className="status-badge-suspended"><XCircle size={12} /> Kilitli</span>
            )
        )},
        { key: 'actions', label: 'İşlem', render: (_, r) => (
            <button
                className={`btn btn-sm ${r.is_active === 1 ? 'btn-danger' : 'btn-success'}`}
                onClick={() => handleToggleUser(r)}
                style={{ padding: '4px 8px', fontSize: '11px' }}
            >
                {r.is_active === 1 ? 'Kilitle' : 'Kilidi Aç'}
            </button>
        )}
    ]

    const backupColumns = [
        { key: 'fileName', label: 'Yedek Dosyası', render: (val) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} style={{ color: '#10b981' }} />
                <code style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{val}</code>
            </div>
        )},
        { key: 'sizeFormatted', label: 'Boyut' },
        { key: 'createdAt', label: 'Yedek Tarihi', render: (val) => new Date(val).toLocaleString('tr-TR') }
    ]

    return (
        <div className="platform-admin-page">
            <TopProgressBar loading={loading || backupLoading} />

            {/* ── MASTER HEADER ── */}
            <div className="platform-header">
                <div className="platform-header-left">
                    <div className="platform-crown-icon">
                        <Crown size={26} />
                    </div>
                    <div className="platform-title-group">
                        <h1>
                            <span>Platform Yönetimi</span>
                            <span className="platform-badge">Master Portal</span>
                        </h1>
                        <p>KONTROL SaaS genel şirketler, kullanıcılar, sunucu durumu ve yedekleme merkezi.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={loadAllData} disabled={loading}>
                        <RefreshCw size={15} className={loading ? 'spin' : ''} />
                        <span>Yenile</span>
                    </button>
                </div>
            </div>

            {actionMsg && (
                <div className="ghost-mode-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} />
                        <span>{actionMsg}</span>
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={() => setActionMsg('')}>Kapat</button>
                </div>
            )}

            {/* ── STATS CARDS ── */}
            <div className="platform-stats-grid">
                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                        <Building2 size={22} />
                    </div>
                    <div className="platform-stat-info">
                        <span className="platform-stat-value">{stats.totalCompanies}</span>
                        <span className="platform-stat-label">Toplam Şirket (Tenant)</span>
                    </div>
                </div>

                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                        <Car size={22} />
                    </div>
                    <div className="platform-stat-info">
                        <span className="platform-stat-value">{stats.totalVehicles}</span>
                        <span className="platform-stat-label">Kayıtlı Filo Araçları</span>
                    </div>
                </div>

                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        <Users size={22} />
                    </div>
                    <div className="platform-stat-info">
                        <span className="platform-stat-value">{stats.totalEmployees}</span>
                        <span className="platform-stat-label">Kayıtlı Personel</span>
                    </div>
                </div>

                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                        <Briefcase size={22} />
                    </div>
                    <div className="platform-stat-info">
                        <span className="platform-stat-value">{stats.totalWorks}</span>
                        <span className="platform-stat-label">Toplam İş Hacmi</span>
                    </div>
                </div>
            </div>

            {/* ── NAVIGATION TABS ── */}
            <div className="platform-tabs">
                <button
                    className={`platform-tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tenants')}
                >
                    <Building2 size={16} />
                    <span>Şirketler & Müşteri Hub ({overviewData?.companies?.length || 0})</span>
                </button>

                <button
                    className={`platform-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={16} />
                    <span>Global Kullanıcılar ({platformUsers.length})</span>
                </button>

                <button
                    className={`platform-tab-btn ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('health'); loadHealth(); }}
                >
                    <Activity size={16} />
                    <span>Sistem Sağlığı & Metrikler</span>
                </button>

                <button
                    className={`platform-tab-btn ${activeTab === 'backups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('backups')}
                >
                    <Database size={16} />
                    <span>Veritabanı Yedekleri ({backups.length})</span>
                </button>
            </div>

            {/* ── TAB 1: TENANTS HUB ── */}
            {activeTab === 'tenants' && (
                <div>
                    <DataTable
                        columns={tenantColumns}
                        data={overviewData?.companies || []}
                        showSearch={true}
                        showPagination={true}
                        defaultPageSize={10}
                    />
                </div>
            )}

            {/* ── TAB 2: GLOBAL USERS ── */}
            {activeTab === 'users' && (
                <div>
                    <DataTable
                        columns={userColumns}
                        data={platformUsers}
                        showSearch={true}
                        showPagination={true}
                        defaultPageSize={10}
                    />
                </div>
            )}

            {/* ── TAB 3: SYSTEM HEALTH ── */}
            {activeTab === 'health' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button className="btn btn-secondary" onClick={loadHealth} disabled={healthLoading}>
                            <RefreshCw size={14} className={healthLoading ? 'spin' : ''} />
                            <span>Metrikleri Yenile</span>
                        </button>
                    </div>

                    <div className="health-dashboard-grid">
                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">Sistem Durumu</span>
                                <div className="health-status-dot pulse" />
                            </div>
                            <div className="health-metric-number" style={{ color: '#10b981' }}>
                                %100 Çevrimiçi
                            </div>
                            <div className="health-metric-subtext">
                                Kesintisiz Çalışma (Uptime): <strong>{healthData?.uptimeFormatted || 'Yükleniyor...'}</strong>
                            </div>
                        </div>

                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">PostgreSQL Yanıt Süresi</span>
                                <Database size={18} style={{ color: '#3b82f6' }} />
                            </div>
                            <div className="health-metric-number">
                                {healthData?.dbLatencyMs !== undefined ? `${healthData.dbLatencyMs} ms` : '-'}
                            </div>
                            <div className="health-metric-subtext">
                                Canlı Veritabanı Ping Gecikmesi (Dokploy Cloud)
                            </div>
                        </div>

                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">RAM / Bellek Kullanımı</span>
                                <Cpu size={18} style={{ color: '#8b5cf6' }} />
                            </div>
                            <div className="health-metric-number">
                                {healthData?.memory?.rssMb ? `${healthData.memory.rssMb} MB` : '-'}
                            </div>
                            <div className="health-metric-subtext">
                                Heap: {healthData?.memory?.heapUsedMb} MB / Toplam: {healthData?.memory?.heapTotalMb} MB
                            </div>
                        </div>

                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">Yazılım Sürümü</span>
                                <Shield size={18} style={{ color: '#f59e0b' }} />
                            </div>
                            <div className="health-metric-number" style={{ fontSize: '22px' }}>
                                v{healthData?.appVersion || '1.13.38'}
                            </div>
                            <div className="health-metric-subtext">
                                Node.js: {healthData?.nodeVersion || '-'} ({healthData?.platform || '-'})
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 4: BACKUPS HUB ── */}
            {activeTab === 'backups' && (
                <div>
                    <div className="backup-card-header">
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>
                                Otomatik & Manuel Veritabanı Yedekleri
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Sistem her gece 03:00'te otomatik tam gzip yedeği alır. İstediğiniz zaman anlık yedek de oluşturabilirsiniz.
                            </p>
                        </div>
                        <button
                            className="backup-now-btn"
                            onClick={handleManualBackup}
                            disabled={backupLoading}
                        >
                            {backupLoading ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    <span>Yedek Alınıyor...</span>
                                </>
                            ) : (
                                <>
                                    <Database size={16} />
                                    <span>⚡ Şimdi Anlık Yedek Al</span>
                                </>
                            )}
                        </button>
                    </div>

                    <DataTable
                        columns={backupColumns}
                        data={backups}
                        showSearch={true}
                        showPagination={true}
                        defaultPageSize={10}
                    />
                </div>
            )}
        </div>
    )
}
