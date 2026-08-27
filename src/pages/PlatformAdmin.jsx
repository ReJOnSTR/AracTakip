import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { formatDate } from '../utils/helpers'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import CustomInput from '../components/CustomInput'
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
    HardDrive, 
    Cpu, 
    Shield, 
    Sparkles, 
    Loader2,
    KeyRound,
    UserPlus,
    Trash2,
    Lock,
    ExternalLink,
    Search,
    Filter,
    UserCheck,
    UserX,
    BadgeCheck
} from 'lucide-react'
import './PlatformAdmin.css'

export default function PlatformAdmin() {
    const { user, setUser } = useAuth()
    const { companies, selectCompany, refreshCompanies } = useCompany()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('users') // 'users' | 'tenants' | 'health' | 'backups'
    const [loading, setLoading] = useState(true)
    const [overviewData, setOverviewData] = useState(null)
    const [platformUsers, setPlatformUsers] = useState([])
    const [backups, setBackups] = useState([])
    const [healthData, setHealthData] = useState(null)
    const [healthLoading, setHealthLoading] = useState(false)
    const [backupLoading, setBackupLoading] = useState(false)
    const [actionMsg, setActionMsg] = useState('')

    // Filters for users
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL')
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL')
    const [searchTerm, setSearchTerm] = useState('')

    // Modals
    const [passwordModalUser, setPasswordModalUser] = useState(null)
    const [newPassword, setNewPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)

    const [createUserModal, setCreateUserModal] = useState(false)
    const [newUserForm, setNewUserForm] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: 'admin',
        companyId: ''
    })
    const [createUserLoading, setCreateUserLoading] = useState(false)

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

    // Impersonate Company (Ghost Mode)
    const handleImpersonateCompany = (company) => {
        selectCompany(company)
        setActionMsg(`"${company.name}" şirket paneline geçiş yapıldı.`)
        setTimeout(() => {
            navigate('/dashboard')
        }, 500)
    }

    // Impersonate User directly
    const handleImpersonateUser = async (targetUser) => {
        const res = await window.electronAPI.impersonatePlatformUser(targetUser.id)
        if (res.success && res.user) {
            if (setUser) setUser(res.user)
            localStorage.setItem('aractakip_user', JSON.stringify(res.user))
            if (res.company) {
                selectCompany(res.company)
            }
            setActionMsg(`"${targetUser.username}" kullanıcısı olarak oturum açıldı.`)
            setTimeout(() => {
                if (res.user.role === 'personnel') {
                    navigate('/personnel-profile')
                } else {
                    navigate('/dashboard')
                }
            }, 600)
        } else {
            setActionMsg('Oturum açma hatası: ' + (res.error || 'Bilinmiyor'))
        }
    }

    // Toggle User Status
    const handleToggleUser = async (u) => {
        const nextState = u.isActive ? 0 : 1
        const res = await window.electronAPI.toggleUserStatus(u.id, nextState)
        if (res.success) {
            await loadUsers()
            setActionMsg(`${u.username} durumu güncellendi.`)
        }
    }

    // Reset Password
    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault()
        if (!newPassword || newPassword.length < 4) {
            alert('Şifre en az 4 karakter olmalıdır')
            return
        }
        setPasswordLoading(true)
        try {
            const res = await window.electronAPI.resetPlatformUserPassword(passwordModalUser.id, newPassword)
            if (res.success) {
                setActionMsg(`${passwordModalUser.username} şifresi başarıyla değiştirildi.`)
                setPasswordModalUser(null)
                setNewPassword('')
                await loadUsers()
            } else {
                alert('Şifre değiştirme hatası: ' + res.error)
            }
        } finally {
            setPasswordLoading(false)
        }
    }

    // Create User Submit
    const handleCreateUserSubmit = async (e) => {
        e.preventDefault()
        setCreateUserLoading(true)
        try {
            const res = await window.electronAPI.createPlatformUser(newUserForm)
            if (res.success) {
                setActionMsg(`Yeni kullanıcı ${newUserForm.username} başarıyla oluşturuldu.`)
                setCreateUserModal(false)
                setNewUserForm({ username: '', email: '', password: '', fullName: '', role: 'admin', companyId: '' })
                await loadUsers()
                await loadOverview()
            } else {
                alert('Kullanıcı oluşturma hatası: ' + res.error)
            }
        } finally {
            setCreateUserLoading(false)
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

    // Delete User
    const handleDeleteUser = async (u) => {
        if (!window.confirm(`"${u.username}" kullanıcısını silmek istediğinize emin misiniz?`)) {
            return
        }
        const res = await window.electronAPI.deletePlatformUser(u.id)
        if (res.success) {
            setActionMsg(`${u.username} kullanıcısı silindi.`)
            await loadUsers()
        } else {
            alert('Hata: ' + res.error)
        }
    }

    // Filtered Users List
    const filteredUsers = useMemo(() => {
        return platformUsers.filter(u => {
            // Company Filter
            if (selectedCompanyFilter !== 'ALL') {
                if (String(u.company?.id) !== String(selectedCompanyFilter)) return false
            }
            // Type Filter
            if (selectedTypeFilter !== 'ALL') {
                if (u.accountType !== selectedTypeFilter) return false
            }
            // Search filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const uName = (u.username || '').toLowerCase()
                const uEmail = (u.email || '').toLowerCase()
                const uFull = (u.fullName || '').toLowerCase()
                const cName = (u.company?.name || '').toLowerCase()
                const empName = (u.employee?.fullName || '').toLowerCase()
                if (!uName.includes(term) && !uEmail.includes(term) && !uFull.includes(term) && !cName.includes(term) && !empName.includes(term)) {
                    return false
                }
            }
            return true
        })
    }, [platformUsers, selectedCompanyFilter, selectedTypeFilter, searchTerm])

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

    // ── USERS TABLE COLUMNS (HIGH DENSITY) ──
    const userColumns = [
        { key: 'identity', label: 'Kullanıcı & Hesap', render: (_, r) => (
            <div className="user-identity-cell">
                <div className="user-cell-avatar">
                    {r.username?.charAt(0).toUpperCase()}
                </div>
                <div className="user-cell-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="user-cell-name">{r.username}</span>
                        {r.fullName && r.fullName !== r.username && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({r.fullName})</span>
                        )}
                    </div>
                    <span className="user-cell-email">{r.email}</span>
                </div>
            </div>
        )},
        { key: 'company', label: 'Bağlı Şirket & İlişki', render: (_, r) => (
            <div>
                <div className="company-affil-badge">
                    <Building2 size={13} />
                    <span>{r.company?.name || 'Sistem / Genel'}</span>
                </div>
                {r.employee && (
                    <div className="employee-link-tag">
                        <BadgeCheck size={12} />
                        <span>Personel: <strong>{r.employee.fullName}</strong> ({r.employee.position})</span>
                    </div>
                )}
            </div>
        )},
        { key: 'role_type', label: 'Hesap Türü & Yetki', render: (_, r) => (
            <div>
                <span className={`badge ${
                    r.accountType === 'superadmin' ? 'badge-warning' : 
                    r.accountType === 'company_owner' ? 'badge-primary' : 
                    r.accountType === 'employee' ? 'badge-success' : 'badge-info'
                }`}>
                    {r.accountBadge}
                </span>
                {r.customRole && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Rol: {r.customRole}
                    </div>
                )}
            </div>
        )},
        { key: 'status', label: 'Durum', render: (_, r) => (
            r.isActive ? (
                <span className="status-badge-active"><CheckCircle2 size={11} /> Aktif</span>
            ) : (
                <span className="status-badge-suspended"><XCircle size={11} /> Kilitli</span>
            )
        )},
        { key: 'created_at', label: 'Kayıt', render: (val) => formatDate(val) },
        { key: 'actions', label: 'İşlemler', render: (_, r) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                    className="ghost-btn"
                    onClick={() => handleImpersonateUser(r)}
                    title="Bu Kullanıcı Olarak Oturum Aç (Ghost Login)"
                >
                    <ExternalLink size={12} />
                    <span>Giriş Yap</span>
                </button>
                <button
                    className="action-icon-btn"
                    onClick={() => { setPasswordModalUser(r); setNewPassword(''); }}
                    title="Şifre Sıfırla"
                >
                    <KeyRound size={13} />
                </button>
                <button
                    className="action-icon-btn"
                    onClick={() => handleToggleUser(r)}
                    title={r.isActive ? 'Hesabı Kilitle' : 'Kilidi Aç'}
                >
                    {r.isActive ? <Lock size={13} /> : <CheckCircle2 size={13} style={{ color: '#10b981' }} />}
                </button>
                {r.username !== 'admin' && r.id !== 1 && (
                    <button
                        className="action-icon-btn danger"
                        onClick={() => handleDeleteUser(r)}
                        title="Kullanıcıyı Sil"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        )}
    ]

    // ── TENANTS TABLE COLUMNS ──
    const tenantColumns = [
        { key: 'name', label: 'Şirket Adı & İletişim', render: (val, r) => (
            <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{val}</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>VN: {r.tax_number} | Tel: {r.phone}</div>
            </div>
        )},
        { key: 'owner', label: 'Yönetici / Kurucu', render: (_, r) => (
            r.owner ? (
                <div>
                    <span style={{ fontWeight: 600, fontSize: '12.5px' }}>{r.owner.username}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.owner.email}</div>
                </div>
            ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Atanmamış</span>
        )},
        { key: 'counts', label: 'Kullanım Özeti', render: (val) => (
            <div style={{ display: 'flex', gap: '6px', fontSize: '11.5px' }}>
                <span className="badge badge-info">{val?.vehicles || 0} Araç</span>
                <span className="badge badge-warning">{val?.employees || 0} Personel</span>
                <span className="badge badge-success">{val?.works || 0} İş</span>
            </div>
        )},
        { key: 'created_at', label: 'Kayıt', render: (val) => formatDate(val) },
        { key: 'actions', label: 'Yönetim', render: (_, r) => (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                    className="ghost-btn"
                    onClick={() => handleImpersonateCompany(r)}
                    title="Bu şirketin paneline geçiş yap"
                >
                    <Eye size={12} />
                    <span>Şirkete Geç</span>
                </button>
            </div>
        )}
    ]

    const backupColumns = [
        { key: 'fileName', label: 'Yedek Dosyası', render: (val) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={15} style={{ color: '#10b981' }} />
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
                        <Crown size={22} />
                    </div>
                    <div className="platform-title-group">
                        <h1>
                            <span>Platform Yönetimi</span>
                            <span className="platform-badge">Master Portal</span>
                        </h1>
                        <p>KONTROL SaaS şirket-hesap eşleştirmeleri, canlı sunucu metrikleri ve operasyonlar.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" onClick={() => setCreateUserModal(true)} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                        <UserPlus size={14} />
                        <span>Yeni Kullanıcı Ekle</span>
                    </button>
                    <button className="btn btn-secondary" onClick={loadAllData} disabled={loading} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        <span>Yenile</span>
                    </button>
                </div>
            </div>

            {actionMsg && (
                <div className="ghost-mode-banner" style={{ padding: '8px 16px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={15} />
                        <span>{actionMsg}</span>
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={() => setActionMsg('')}>Kapat</button>
                </div>
            )}

            {/* ── STATS CARDS (COMPACT) ── */}
            <div className="platform-stats-grid">
                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                        <Building2 size={18} />
                    </div>
                    <div className="platform-stat-info">
                        <span className="platform-stat-value">{stats.totalCompanies}</span>
                        <span className="platform-stat-label">Toplam Şirket</span>
                    </div>
                </div>

                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                        <Users size={18} />
                    </div>
                    <div className="platform-stat-info">
                        <span className="platform-stat-value">{stats.totalUsers}</span>
                        <span className="platform-stat-label">Toplam Kullanıcı</span>
                    </div>
                </div>

                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                        <Car size={18} />
                    </div>
                    <div className="platform-stat-info">
                        <span className="platform-stat-value">{stats.totalVehicles}</span>
                        <span className="platform-stat-label">Kayıtlı Araç</span>
                    </div>
                </div>

                <div className="platform-stat-card">
                    <div className="platform-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                        <Briefcase size={18} />
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
                    className={`platform-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={15} />
                    <span>Kullanıcılar & Şirket Bağlantıları ({platformUsers.length})</span>
                </button>

                <button
                    className={`platform-tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tenants')}
                >
                    <Building2 size={15} />
                    <span>Şirketler & Portföy ({overviewData?.companies?.length || 0})</span>
                </button>

                <button
                    className={`platform-tab-btn ${activeTab === 'health' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('health'); loadHealth(); }}
                >
                    <Activity size={15} />
                    <span>Sistem Sağlığı & Uptime</span>
                </button>

                <button
                    className={`platform-tab-btn ${activeTab === 'backups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('backups')}
                >
                    <Database size={15} />
                    <span>Veritabanı Yedekleri ({backups.length})</span>
                </button>
            </div>

            {/* ── TAB 1: USERS & COMPANY MAPPINGS ── */}
            {activeTab === 'users' && (
                <div>
                    {/* Filter & Search Bar */}
                    <div className="platform-filter-bar">
                        <div className="platform-filter-group">
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Şirket:</span>
                            <button
                                className={`filter-pill ${selectedCompanyFilter === 'ALL' ? 'active' : ''}`}
                                onClick={() => setSelectedCompanyFilter('ALL')}
                            >
                                Tümü ({platformUsers.length})
                            </button>
                            {overviewData?.companies?.map(c => (
                                <button
                                    key={c.id}
                                    className={`filter-pill ${String(selectedCompanyFilter) === String(c.id) ? 'active' : ''}`}
                                    onClick={() => setSelectedCompanyFilter(c.id)}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>

                        <div className="platform-filter-group">
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Tür:</span>
                            <button
                                className={`filter-pill ${selectedTypeFilter === 'ALL' ? 'active' : ''}`}
                                onClick={() => setSelectedTypeFilter('ALL')}
                            >
                                Tümü
                            </button>
                            <button
                                className={`filter-pill ${selectedTypeFilter === 'superadmin' ? 'active' : ''}`}
                                onClick={() => setSelectedTypeFilter('superadmin')}
                            >
                                👑 Süper
                            </button>
                            <button
                                className={`filter-pill ${selectedTypeFilter === 'company_owner' ? 'active' : ''}`}
                                onClick={() => setSelectedTypeFilter('company_owner')}
                            >
                                🏢 Şirket Sahibi
                            </button>
                            <button
                                className={`filter-pill ${selectedTypeFilter === 'employee' ? 'active' : ''}`}
                                onClick={() => setSelectedTypeFilter('employee')}
                            >
                                👤 Personel
                            </button>
                        </div>
                    </div>

                    <DataTable
                        columns={userColumns}
                        data={filteredUsers}
                        showSearch={true}
                        showPagination={true}
                        defaultPageSize={10}
                    />
                </div>
            )}

            {/* ── TAB 2: TENANTS HUB ── */}
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

            {/* ── TAB 3: SYSTEM HEALTH ── */}
            {activeTab === 'health' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                        <button className="btn btn-secondary" onClick={loadHealth} disabled={healthLoading}>
                            <RefreshCw size={13} className={healthLoading ? 'spin' : ''} />
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
                                <Database size={16} style={{ color: '#3b82f6' }} />
                            </div>
                            <div className="health-metric-number">
                                {healthData?.dbLatencyMs !== undefined ? `${healthData.dbLatencyMs} ms` : '-'}
                            </div>
                            <div className="health-metric-subtext">
                                Dokploy Cloud Canlı Veritabanı Gecikmesi
                            </div>
                        </div>

                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">RAM / Bellek Kullanımı</span>
                                <Cpu size={16} style={{ color: '#8b5cf6' }} />
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
                                <Shield size={16} style={{ color: '#f59e0b' }} />
                            </div>
                            <div className="health-metric-number" style={{ fontSize: '20px' }}>
                                v{healthData?.appVersion || '1.13.42'}
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
                            <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 600 }}>
                                Otomatik & Manuel Veritabanı Yedekleri
                            </h3>
                            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
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
                                    <Loader2 size={15} className="spin" />
                                    <span>Yedek Alınıyor...</span>
                                </>
                            ) : (
                                <>
                                    <Database size={15} />
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

            {/* ── MODAL: RESET PASSWORD ── */}
            {passwordModalUser && (
                <Modal
                    isOpen={!!passwordModalUser}
                    onClose={() => setPasswordModalUser(null)}
                    title={`Şifre Sıfırla: ${passwordModalUser.username}`}
                >
                    <form onSubmit={handleResetPasswordSubmit} className="modal-form-grid">
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                            <strong>{passwordModalUser.username}</strong> ({passwordModalUser.email}) kullanıcısı için yeni bir şifre belirleyin:
                        </p>
                        <CustomInput
                            label="Yeni Şifre"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Yeni şifreyi girin"
                            required
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setPasswordModalUser(null)}>
                                İptal
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                                {passwordLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── MODAL: CREATE USER ── */}
            {createUserModal && (
                <Modal
                    isOpen={createUserModal}
                    onClose={() => setCreateUserModal(false)}
                    title="Platforma Yeni Kullanıcı Ekle"
                >
                    <form onSubmit={handleCreateUserSubmit} className="modal-form-grid">
                        <CustomInput
                            label="Kullanıcı Adı"
                            value={newUserForm.username}
                            onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                            placeholder="ornek_kullanici"
                            required
                        />
                        <CustomInput
                            label="E-Posta"
                            type="email"
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                            placeholder="kullanici@sirket.com"
                            required
                        />
                        <CustomInput
                            label="Ad Soyad"
                            value={newUserForm.fullName}
                            onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                            placeholder="Ad Soyad"
                        />
                        <CustomInput
                            label="Başlangıç Şifresi"
                            type="password"
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                            placeholder="Şifre belirleyin"
                            required
                        />
                        <div>
                            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Bağlanacak Şirket:
                            </label>
                            <select
                                className="form-control"
                                value={newUserForm.companyId}
                                onChange={(e) => setNewUserForm({ ...newUserForm, companyId: e.target.value })}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Şirketsiz / Sistem Kullanıcısı</option>
                                {overviewData?.companies?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setCreateUserModal(false)}>
                                İptal
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={createUserLoading}>
                                {createUserLoading ? 'Ekleniyor...' : 'Kullanıcıyı Oluştur'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}
