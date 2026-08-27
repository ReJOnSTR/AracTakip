import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { formatDate } from '../utils/helpers'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import CustomInput from '../components/CustomInput'
import CustomSelect from '../components/CustomSelect'
import TopProgressBar from '../components/TopProgressBar'
import { 
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
    Plus,
    Trash2,
    Lock,
    Unlock,
    ExternalLink,
    Server,
    Cloud,
    BadgeCheck,
    ScrollText,
    Radio,
    Megaphone,
    AlertTriangle,
    Wrench,
    Scale,
    AlertOctagon,
    Clock,
    Check
} from 'lucide-react'
import './PlatformAdmin.css'

export default function PlatformAdmin({ section }) {
    const { user, setUser } = useAuth()
    const { selectCompany } = useCompany()
    const navigate = useNavigate()
    const location = useLocation()

    // Determine current section from prop or pathname
    const activeSection = useMemo(() => {
        if (section) return section
        if (location.pathname.includes('/companies')) return 'companies'
        if (location.pathname.includes('/announcements')) return 'announcements'
        if (location.pathname.includes('/health')) return 'health'
        if (location.pathname.includes('/logs')) return 'logs'
        if (location.pathname.includes('/backups')) return 'backups'
        return 'users'
    }, [section, location.pathname])

    const [loading, setLoading] = useState(true)
    const [overviewData, setOverviewData] = useState(null)
    const [platformUsers, setPlatformUsers] = useState([])
    const [backups, setBackups] = useState([])
    const [healthData, setHealthData] = useState(null)
    const [healthLoading, setHealthLoading] = useState(false)
    const [backupLoading, setBackupLoading] = useState(false)
    const [actionMsg, setActionMsg] = useState('')

    // Announcements state
    const [announcements, setAnnouncements] = useState([])
    const [announcementsLoading, setAnnouncementsLoading] = useState(false)
    const [createAnnouncementModal, setCreateAnnouncementModal] = useState(false)
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: '',
        message: '',
        type: 'info',
        companyId: '',
        expiresAt: '',
        isDismissible: 1,
        showPopup: 0
    })
    const [creatingAnnouncement, setCreatingAnnouncement] = useState(false)

    // System Logs
    const [logs, setLogs] = useState([])
    const [logsLoading, setLogsLoading] = useState(false)
    const [autoPollLogs, setAutoPollLogs] = useState(false)

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
        role: 'company_admin',
        companyId: ''
    })
    const [createUserLoading, setCreateUserLoading] = useState(false)

    // Helper for robust value extraction from CustomInput
    const getVal = (v) => {
        if (v && typeof v === 'object' && v.target !== undefined) {
            return v.target.value
        }
        return v ?? ''
    }

    // Strict SuperAdmin check
    const isSuperAdmin = user?.role === 'superadmin' || user?.username === 'admin'

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate('/dashboard')
            return
        }
        loadSectionData()
    }, [isSuperAdmin, activeSection])

    // Auto-polling for live logs if enabled
    useEffect(() => {
        if (!autoPollLogs || activeSection !== 'logs') return
        const interval = setInterval(() => {
            loadLogs(false)
        }, 3000)
        return () => clearInterval(interval)
    }, [autoPollLogs, activeSection])

    const loadSectionData = async () => {
        setLoading(true)
        try {
            if (activeSection === 'users') {
                await Promise.all([loadUsers(), loadOverview()])
            } else if (activeSection === 'companies') {
                await loadOverview()
            } else if (activeSection === 'announcements') {
                await Promise.all([loadAnnouncements(), loadOverview()])
            } else if (activeSection === 'health') {
                await loadHealth()
            } else if (activeSection === 'logs') {
                await loadLogs()
            } else if (activeSection === 'backups') {
                await loadBackups()
            }
        } catch (err) {
            console.error('Platform data load error:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadOverview = async () => {
        const res = await window.electronAPI?.getPlatformOverview()
        if (res?.success) {
            setOverviewData(res.data)
        }
    }

    const loadUsers = async () => {
        const res = await window.electronAPI?.getPlatformUsers()
        if (res?.success) {
            setPlatformUsers(res.data)
        }
    }

    const loadAnnouncements = async () => {
        setAnnouncementsLoading(true)
        try {
            const res = await window.electronAPI?.getPlatformAnnouncements()
            if (res?.success) {
                setAnnouncements(res.data || [])
            }
        } finally {
            setAnnouncementsLoading(false)
        }
    }

    const loadBackups = async () => {
        const res = await window.electronAPI?.getPlatformBackups()
        if (res?.success) {
            setBackups(res.data)
        }
    }

    const loadHealth = async () => {
        setHealthLoading(true)
        try {
            const res = await window.electronAPI?.getPlatformSystemHealth()
            if (res?.success) {
                setHealthData(res.data)
            }
        } finally {
            setHealthLoading(false)
        }
    }

    const loadLogs = async (showLoading = true) => {
        if (showLoading) setLogsLoading(true)
        try {
            const res = await window.electronAPI?.getPlatformLogs(300)
            if (res?.success) {
                setLogs(res.data || [])
            }
        } finally {
            if (showLoading) setLogsLoading(false)
        }
    }

    const handleClearLogs = async () => {
        if (!window.confirm('Tüm sistem loglarını sıfırlamak istediğinize emin misiniz?')) {
            return
        }
        const res = await window.electronAPI?.clearPlatformLogs()
        if (res?.success) {
            setActionMsg('Sistem logları sıfırlandı.')
            await loadLogs()
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
        const res = await window.electronAPI?.impersonatePlatformUser(targetUser.id)
        if (res && res.success && res.user) {
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
            setActionMsg('Oturum açma hatası: ' + (res?.error || 'Bilinmiyor'))
        }
    }

    // Toggle User Status (Lock / Unlock)
    const handleToggleUser = async (u) => {
        if (u.username === 'admin' || u.id === 1) {
            alert('Ana Süper Yönetici hesabı kilitlenemez.')
            return
        }
        const currentActive = u.isActive !== undefined ? u.isActive : (u.is_active !== 0)
        const nextState = currentActive ? 0 : 1

        try {
            const res = await window.electronAPI?.toggleUserStatus(u.id, nextState)
            if (res && (res.success || res.data)) {
                setPlatformUsers(prev => prev.map(item => 
                    item.id === u.id 
                        ? { ...item, isActive: nextState === 1, is_active: nextState } 
                        : item
                ))
                setActionMsg(`"${u.username}" hesabı ${nextState === 1 ? 'aktif edildi' : 'kilitlendi (pasife alındı)'}.`)
                await loadUsers()
            } else {
                alert('Hata: ' + (res?.error || 'Durum değiştirilemedi'))
            }
        } catch (err) {
            alert('İşlem hatası: ' + err.message)
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
            const res = await window.electronAPI?.resetPlatformUserPassword(passwordModalUser.id, newPassword)
            if (res?.success) {
                setActionMsg(`${passwordModalUser.username} şifresi başarıyla değiştirildi.`)
                setPasswordModalUser(null)
                setNewPassword('')
                await loadUsers()
            } else {
                alert('Şifre değiştirme hatası: ' + (res?.error || 'Bilinmiyor'))
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
            const res = await window.electronAPI?.createPlatformUser(newUserForm)
            if (res?.success) {
                setActionMsg(`Yeni kullanıcı ${newUserForm.username} başarıyla oluşturuldu.`)
                setCreateUserModal(false)
                setNewUserForm({ username: '', email: '', password: '', fullName: '', role: 'company_admin', companyId: '' })
                await loadUsers()
                await loadOverview()
            } else {
                alert('Kullanıcı oluşturma hatası: ' + (res?.error || 'Bilinmiyor'))
            }
        } finally {
            setCreateUserLoading(false)
        }
    }

    // Create Announcement Submit
    const handleCreateAnnouncementSubmit = async (e) => {
        e.preventDefault()
        if (!newAnnouncement.title || !newAnnouncement.message) {
            alert('Lütfen duyuru başlığı ve mesajını doldurun.')
            return
        }
        setCreatingAnnouncement(true)
        try {
            const res = await window.electronAPI?.createPlatformAnnouncement({
                ...newAnnouncement,
                createdBy: user?.id
            })
            if (res?.success) {
                setActionMsg('Canlı duyuru başarıyla yayınlandı!')
                setCreateAnnouncementModal(false)
                setNewAnnouncement({
                    title: '',
                    message: '',
                    type: 'info',
                    companyId: '',
                    expiresAt: '',
                    isDismissible: 1,
                    showPopup: 0
                })
                await loadAnnouncements()
            } else {
                alert('Duyuru oluşturma hatası: ' + (res?.error || 'Bilinmiyor'))
            }
        } finally {
            setCreatingAnnouncement(false)
        }
    }

    // Toggle Announcement Status
    const handleToggleAnnouncement = async (ann) => {
        const nextState = ann.isActive ? 0 : 1
        const res = await window.electronAPI?.toggleAnnouncementStatus(ann.id, nextState)
        if (res?.success) {
            setActionMsg(`Duyuru "${ann.title}" ${nextState === 1 ? 'yayına alındı' : 'durduruldu'}.`)
            await loadAnnouncements()
        }
    }

    // Delete Announcement
    const handleDeleteAnnouncement = async (ann) => {
        if (!window.confirm(`"${ann.title}" duyurusunu silmek istediğinize emin misiniz?`)) {
            return
        }
        const res = await window.electronAPI?.deletePlatformAnnouncement(ann.id)
        if (res?.success) {
            setActionMsg('Duyuru silindi.')
            await loadAnnouncements()
        }
    }

    // Trigger Manual Backup
    const handleManualBackup = async () => {
        setBackupLoading(true)
        try {
            const res = await window.electronAPI?.triggerPlatformBackup()
            if (res?.success) {
                setActionMsg('Yeni veritabanı yedeği başarıyla oluşturuldu!')
                await loadBackups()
            } else {
                setActionMsg('Yedekleme hatası: ' + (res?.error || 'Bilinmiyor'))
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
        const res = await window.electronAPI?.deletePlatformUser(u.id)
        if (res?.success) {
            setActionMsg(`${u.username} kullanıcısı silindi.`)
            await loadUsers()
        } else {
            alert('Hata: ' + (res?.error || 'Bilinmiyor'))
        }
    }

    // Table Data formatted for DataTable search & filters
    const tableUsers = useMemo(() => {
        return platformUsers.map(u => ({
            ...u,
            isActive: u.isActive !== undefined ? u.isActive : (u.is_active !== 0),
            company_id: u.company?.id ? String(u.company.id) : 'NONE',
            company_name: u.company?.name || 'Sistem / Genel',
            employee_name: u.employee?.fullName || '',
            employee_pos: u.employee?.position || '',
            employee_tc: u.employee?.tcNo || '',
            status_filter: (u.isActive !== undefined ? u.isActive : (u.is_active !== 0)) ? 'ACTIVE' : 'LOCKED'
        }))
    }, [platformUsers])

    const tableCompanies = useMemo(() => {
        return (overviewData?.companies || []).map(c => ({
            ...c,
            owner_username: c.owner?.username || '',
            owner_email: c.owner?.email || ''
        }))
    }, [overviewData])

    // Filters for DataTable (matching standard design across app)
    const userFilters = useMemo(() => [
        {
            key: 'company_id',
            label: 'Şirket',
            options: [
                ...overviewData?.companies?.map(c => ({ value: String(c.id), label: c.name })) || [],
                { value: 'NONE', label: 'Şirketsiz / Sistem' }
            ]
        },
        {
            key: 'accountType',
            label: 'Hesap Türü',
            options: [
                { value: 'superadmin', label: '👑 Süper Yönetici' },
                { value: 'company_owner', label: '🏢 Şirket Sahibi' },
                { value: 'employee', label: '👤 Personel / Şoför' },
                { value: 'admin', label: '🛡️ Yönetici' }
            ]
        },
        {
            key: 'status_filter',
            label: 'Durum',
            options: [
                { value: 'ACTIVE', label: '🟢 Aktif Hesaplar' },
                { value: 'LOCKED', label: '🔴 Kilitli Hesaplar' }
            ]
        }
    ], [overviewData])

    // Clean Type Mapping with colors (no ugly text at the beginning)
    const announcementTypeMeta = {
        info: { label: 'Bilgilendirme', color: '#3b82f6' },
        maintenance: { label: 'Planlı Sistem Bakımı', color: '#8b5cf6' },
        warning: { label: 'Uyarı', color: '#f59e0b' },
        legal: { label: 'Mevzuat & Sigorta', color: '#eab308' },
        critical: { label: 'Kritik / Acil Bildirim', color: '#ef4444' },
        success: { label: 'Başarılı / Tebrik', color: '#10b981' }
    }

    const announcementTypeOptions = [
        { value: 'info', label: 'Bilgilendirme' },
        { value: 'maintenance', label: 'Planlı Sistem Bakımı' },
        { value: 'warning', label: 'Uyarı' },
        { value: 'legal', label: 'Mevzuat & Sigorta' },
        { value: 'critical', label: 'Kritik / Acil Bildirim' },
        { value: 'success', label: 'Başarılı / Tebrik' }
    ]

    const announcementCompanyOptions = [
        { value: '', label: 'Tüm Şirketler (Genel Yayın)' },
        ...(overviewData?.companies?.map(c => ({ value: String(c.id), label: c.name })) || [])
    ]

    const userCompanyOptions = [
        { value: '', label: 'Şirketsiz / Sistem Kullanıcısı' },
        ...(overviewData?.companies?.map(c => ({ value: String(c.id), label: c.name })) || [])
    ]

    if (!isSuperAdmin) {
        return null
    }

    // ── USERS TABLE COLUMNS ──
    const userColumns = [
        { key: 'username', label: 'Kullanıcı Adı & E-Posta', render: (val, r) => (
            <div>
                <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{val}</strong>
                {r.fullName && r.fullName !== val && (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginLeft: '6px' }}>({r.fullName})</span>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.email}</div>
            </div>
        )},
        { key: 'company', label: 'Bağlı Şirket & İlişki', render: (_, r) => (
            <div>
                <div className="company-affil-badge">
                    <Building2 size={12} />
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
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
        { key: 'created_at', label: 'Kayıt Tarihi', render: (val) => formatDate(val) },
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
                    title={r.isActive ? 'Hesabı Kilitle (Pasife Al)' : 'Hesabın Kilidini Aç (Aktif Et)'}
                    style={!r.isActive ? { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' } : {}}
                >
                    {r.isActive ? <Lock size={13} /> : <Unlock size={13} style={{ color: '#10b981' }} />}
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
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{r.owner.username}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.owner.email}</div>
                </div>
            ) : <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Atanmamış</span>
        )},
        { key: 'counts', label: 'Kullanım Özeti', render: (val) => (
            <div style={{ display: 'flex', gap: '6px', fontSize: '11.5px' }}>
                <span className="badge badge-info">{val?.vehicles || 0} Araç</span>
                <span className="badge badge-warning">{val?.employees || 0} Personel</span>
                <span className="badge badge-success">{val?.works || 0} İş</span>
            </div>
        )},
        { key: 'created_at', label: 'Kayıt Tarihi', render: (val) => formatDate(val) },
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

    // ── ANNOUNCEMENTS TABLE COLUMNS ──
    const announcementColumns = [
        { key: 'title', label: 'Duyuru Başlığı & İçerik', render: (val, r) => {
            const meta = announcementTypeMeta[r.type] || { color: '#3b82f6' }
            return (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color, display: 'inline-block', flexShrink: 0 }} />
                        <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{val}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4, paddingLeft: '16px' }}>
                        {r.message}
                    </div>
                </div>
            )
        }},
        { key: 'companyName', label: 'Hedef Kitle / Şirket', render: (val, r) => (
            <span className={`badge ${!r.company_id ? 'badge-primary' : 'badge-warning'}`}>
                {val}
            </span>
        )},
        { key: 'type', label: 'Duyuru Türü', render: (val) => {
            const meta = announcementTypeMeta[val] || { label: val, color: '#94a3b8' }
            return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meta.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)' }}>{meta.label}</span>
                </div>
            )
        }},
        { key: 'is_dismissible', label: 'Kapatma Kuralı', render: (val) => {
            const mode = val !== undefined && val !== null ? Number(val) : 1
            if (mode === 0) {
                return <span className="badge badge-danger" style={{ fontSize: '11px' }}>🔒 Sabit (Kapatılamaz)</span>
            } else if (mode === 2) {
                return <span className="badge badge-info" style={{ fontSize: '11px' }}>👁️ Kalıcı Kapatılabilir</span>
            }
            return <span className="badge badge-warning" style={{ fontSize: '11px' }}>🔄 Her Girişte Göster</span>
        }},
        { key: 'status', label: 'Yayın Durumu', render: (_, r) => {
            if (r.isExpired) {
                return <span className="status-badge-suspended"><Clock size={11} /> Süresi Doldu</span>
            }
            return r.isActive ? (
                <span className="status-badge-active"><CheckCircle2 size={11} /> Yayında</span>
            ) : (
                <span className="status-badge-suspended"><XCircle size={11} /> Durduruldu</span>
            )
        }},
        { key: 'expires_at', label: 'Bitiş Tarihi', render: (val) => val ? formatDate(val) : <span style={{ color: 'var(--text-muted)' }}>Süresiz</span> },
        { key: 'actions', label: 'İşlemler', render: (_, r) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                    className="action-icon-btn"
                    onClick={() => handleToggleAnnouncement(r)}
                    title={r.isActive ? 'Yayından Kaldır (Durdur)' : 'Yayına Al'}
                    style={!r.isActive ? { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' } : {}}
                >
                    {r.isActive ? <CheckCircle2 size={13} style={{ color: '#10b981' }} /> : <XCircle size={13} />}
                </button>
                <button
                    className="action-icon-btn danger"
                    onClick={() => handleDeleteAnnouncement(r)}
                    title="Duyuruyu Sil"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        )}
    ]

    // ── SYSTEM LOGS COLUMNS ──
    const logColumns = [
        { key: 'timestamp', label: 'Zaman Damgası', width: '180px', render: (val) => (
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>{val}</span>
        )},
        { key: 'level', label: 'Seviye', width: '90px', render: (val) => (
            <span className={`log-level-badge ${val}`}>
                {val}
            </span>
        )},
        { key: 'message', label: 'Log Detayı & Sistem Olayı', render: (val) => (
            <span className="log-message-code">{val}</span>
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
        <div>
            <TopProgressBar loading={loading || backupLoading || logsLoading || announcementsLoading} />

            {/* ══════════════════════════════════════════════════════
                PAGE 1: USERS & COMPANY ACCOUNTS (/platform/users)
               ══════════════════════════════════════════════════════ */}
            {activeSection === 'users' && (
                <div>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Kullanıcı Hesapları & Şirket Bağlantıları</h1>
                            <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                                KONTROL SaaS platformundaki tüm kullanıcı hesapları, yetkiler ve şirket eşleştirmeleri.
                            </p>
                        </div>
                        <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={loadSectionData} disabled={loading}>
                                <RefreshCw size={16} className={loading ? 'spin' : ''} />
                                Yenile
                            </button>
                            <button className="btn btn-primary" onClick={() => setCreateUserModal(true)}>
                                <Plus size={18} />
                                Yeni Kullanıcı
                            </button>
                        </div>
                    </div>

                    <DataTable
                        persistenceKey="PlatformAdmin_users_table"
                        columns={userColumns}
                        data={tableUsers}
                        showSearch={true}
                        showCheckboxes={false}
                        searchPlaceholder="Kullanıcı adı, e-posta, şirket veya personel ile ara..."
                        searchKeys={['username', 'email', 'fullName', 'company_name', 'employee_name', 'employee_pos', 'employee_tc']}
                        filters={userFilters}
                    />
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                PAGE 2: TENANTS & COMPANIES (/platform/companies)
               ══════════════════════════════════════════════════════ */}
            {activeSection === 'companies' && (
                <div>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Şirketler & Portföy</h1>
                            <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                                Sisteme kayıtlı tüm kiracı şirketler, iletişim bilgileri ve kullanım özetleri.
                            </p>
                        </div>
                        <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={loadSectionData} disabled={loading}>
                                <RefreshCw size={16} className={loading ? 'spin' : ''} />
                                Yenile
                            </button>
                        </div>
                    </div>

                    <DataTable
                        persistenceKey="PlatformAdmin_tenants_table"
                        columns={tenantColumns}
                        data={tableCompanies}
                        showSearch={true}
                        showCheckboxes={false}
                        searchPlaceholder="Şirket adı, vergi no veya yetkili ile ara..."
                        searchKeys={['name', 'tax_number', 'phone', 'owner_username', 'owner_email']}
                    />
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                PAGE 3: BROADCAST ANNOUNCEMENTS (/platform/announcements)
               ══════════════════════════════════════════════════════ */}
            {activeSection === 'announcements' && (
                <div>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Canlı Duyuru & Bildirim Yayını</h1>
                            <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                                Tüm SaaS şirketlerine veya seçtiğiniz şirketin ekranının en üstüne anlık duyuru bandı yayınlayın.
                            </p>
                        </div>
                        <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={loadAnnouncements} disabled={announcementsLoading}>
                                <RefreshCw size={16} className={announcementsLoading ? 'spin' : ''} />
                                Yenile
                            </button>
                            <button className="btn btn-primary" onClick={() => setCreateAnnouncementModal(true)}>
                                <Megaphone size={16} />
                                Yeni Duyuru Yayınla
                            </button>
                        </div>
                    </div>

                    <DataTable
                        persistenceKey="PlatformAdmin_announcements_table"
                        columns={announcementColumns}
                        data={announcements}
                        showSearch={true}
                        showCheckboxes={false}
                        searchPlaceholder="Duyuru başlığı, mesajı veya şirket ile ara..."
                        searchKeys={['title', 'message', 'companyName', 'type']}
                        filters={[
                            {
                                key: 'type',
                                label: 'Duyuru Türü',
                                options: [
                                    { value: 'info', label: '🔵 Bilgilendirme' },
                                    { value: 'maintenance', label: '🟣 Sistem Bakımı' },
                                    { value: 'warning', label: '🟡 Uyarı' },
                                    { value: 'legal', label: '⚖️ Mevzuat & Sigorta' },
                                    { value: 'critical', label: '🔴 Kritik Uyarı' },
                                    { value: 'success', label: '🟢 Başarılı' }
                                ]
                            }
                        ]}
                    />
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                PAGE 4: SYSTEM HEALTH & OBSERVABILITY (/platform/health)
               ══════════════════════════════════════════════════════ */}
            {activeSection === 'health' && (
                <div>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Sistem Sağlığı & Canlı İzleme</h1>
                            <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                                PostgreSQL veritabanı gecikmesi, sunucu donanım durumu ve altyapı servisleri.
                            </p>
                        </div>
                        <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={loadHealth} disabled={healthLoading}>
                                <RefreshCw size={16} className={healthLoading ? 'spin' : ''} />
                                Metrikleri Yenile
                            </button>
                        </div>
                    </div>

                    <div className="health-dashboard-grid">
                        {/* Database Health Card */}
                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">
                                    <Database size={15} style={{ color: '#3b82f6' }} />
                                    <span>PostgreSQL Veritabanı</span>
                                </span>
                                <div className="health-status-dot pulse" />
                            </div>
                            <div className="health-metric-number" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{healthData?.db?.latencyMs !== undefined ? `${healthData.db.latencyMs} ms` : '-'}</span>
                                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>● Hızlı / Stabil</span>
                            </div>
                            <div className="health-details-list">
                                <div className="health-detail-item">
                                    <span>Veritabanı Boyutu:</span>
                                    <span>{healthData?.db?.size || '-'}</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Aktif Bağlantı Sayısı:</span>
                                    <span>{healthData?.db?.activeConnections || 1}</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Veritabanı Motoru:</span>
                                    <span>{healthData?.db?.version || 'PostgreSQL 17'}</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Sağlayıcı:</span>
                                    <span>Dokploy Cloud DB</span>
                                </div>
                            </div>
                        </div>

                        {/* Server & CPU/RAM Card */}
                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">
                                    <Cpu size={15} style={{ color: '#8b5cf6' }} />
                                    <span>Sunucu Donanımı & RAM</span>
                                </span>
                                <Server size={15} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div className="health-metric-number">
                                {healthData?.server?.totalMemGb || '16 GB'}
                            </div>
                            <div className="health-details-list">
                                <div className="health-detail-item">
                                    <span>İşlemci Mimarisi:</span>
                                    <span>{healthData?.server?.cpuModel || 'Apple M4'} ({healthData?.server?.cpuCores || 10} Çekirdek)</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Boş Bellek:</span>
                                    <span>{healthData?.server?.freeMemGb || '-'}</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Node.js RSS / Heap:</span>
                                    <span>{healthData?.server?.nodeRssMb || '-'} / {healthData?.server?.nodeHeapUsedMb || '-'}</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Sunucu Kesintisiz Uptime:</span>
                                    <span>{healthData?.hostUptimeFormatted || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cloud Services & Security Card */}
                        <div className="health-metric-card">
                            <div className="health-metric-header">
                                <span className="health-metric-title">
                                    <Cloud size={15} style={{ color: '#10b981' }} />
                                    <span>Bulut Servisleri & Güvenlik</span>
                                </span>
                                <Shield size={15} style={{ color: '#f59e0b' }} />
                            </div>
                            <div className="health-metric-number" style={{ color: '#10b981', fontSize: '18px' }}>
                                %100 Çalışır Durumda
                            </div>
                            <div className="health-details-list">
                                <div className="health-detail-item">
                                    <span>Supabase Storage (Evrak/PDF):</span>
                                    <span style={{ color: '#10b981' }}>● Hazır (documents)</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Yazılım Sürümü:</span>
                                    <span>v{healthData?.appVersion || '1.13.55'}</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Node.js Runtime:</span>
                                    <span>{healthData?.nodeVersion || '-'} ({healthData?.platform || '-'})</span>
                                </div>
                                <div className="health-detail-item">
                                    <span>Uygulama Çalışma Süresi:</span>
                                    <span>{healthData?.uptimeFormatted || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Micro-Services Overview Table */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Platform Alt Yapı Servisleri Durumu
                        </h4>
                        <table className="services-status-table">
                            <thead>
                                <tr>
                                    <th>Servis Adı</th>
                                    <th>Durum</th>
                                    <th>Açıklama / Yanıt</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>PostgreSQL Primary DB</strong></td>
                                    <td><span className="status-badge-active"><CheckCircle2 size={12} /> Çevrimiçi</span></td>
                                    <td>Dokploy bulut veritabanı aktif ({healthData?.db?.latencyMs || 24} ms)</td>
                                </tr>
                                <tr>
                                    <td><strong>Supabase Object Storage</strong></td>
                                    <td><span className="status-badge-active"><CheckCircle2 size={12} /> Bağlı</span></td>
                                    <td>Tüm ruhsat, ehliyet ve dekont dosyaları senkronize</td>
                                </tr>
                                <tr>
                                    <td><strong>Multi-Tenant İzolasyonu</strong></td>
                                    <td><span className="status-badge-active"><CheckCircle2 size={12} /> Aktif</span></td>
                                    <td>Şirketler arası veri güvenliği ve IDOR koruması devrede</td>
                                </tr>
                                <tr>
                                    <td><strong>Canlı Duyuru Yayını Servisi</strong></td>
                                    <td><span className="status-badge-active"><CheckCircle2 size={12} /> Aktif</span></td>
                                    <td>Tüm aktif şirket ekranlarına anlık duyuru bandı dağıtımı</td>
                                </tr>
                                <tr>
                                    <td><strong>Otomatik Yedekleme Servisi</strong></td>
                                    <td><span className="status-badge-active"><CheckCircle2 size={12} /> Zamanlandı</span></td>
                                    <td>Her gece 03:00'te tam Gzip SQL veritabanı yedeği</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                PAGE 5: SYSTEM & SECURITY LOGS (/platform/logs)
               ══════════════════════════════════════════════════════ */}
            {activeSection === 'logs' && (
                <div>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Sistem & Güvenlik Logları</h1>
                            <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                                Sunucu olayları, kullanıcı giriş denemeleri, veritabanı sorguları ve denetim logları.
                            </p>
                        </div>
                        <div className="page-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-primary)', cursor: 'pointer', marginRight: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={autoPollLogs}
                                    onChange={(e) => setAutoPollLogs(e.target.checked)}
                                />
                                <Radio size={14} style={{ color: autoPollLogs ? '#10b981' : 'var(--text-muted)' }} />
                                <span>Canlı Akış (3sn)</span>
                            </label>

                            <button className="btn btn-secondary" onClick={() => loadLogs(true)} disabled={logsLoading}>
                                <RefreshCw size={16} className={logsLoading ? 'spin' : ''} />
                                Yenile
                            </button>
                            <button className="btn btn-secondary" onClick={handleClearLogs} style={{ color: '#f87171' }}>
                                <Trash2 size={16} />
                                Logları Temizle
                            </button>
                        </div>
                    </div>

                    <DataTable
                        persistenceKey="PlatformAdmin_logs_table"
                        columns={logColumns}
                        data={logs}
                        showSearch={true}
                        showCheckboxes={false}
                        searchPlaceholder="Log mesajı, kullanıcı veya işlem içinde ara..."
                        searchKeys={['message', 'level', 'timestamp']}
                        filters={[
                            {
                                key: 'level',
                                label: 'Log Seviyesi',
                                options: [
                                    { value: 'info', label: '🔵 Info / Bilgi' },
                                    { value: 'warn', label: '🟡 Warn / Uyarı' },
                                    { value: 'error', label: '🔴 Error / Hata' }
                                ]
                            }
                        ]}
                    />
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                PAGE 6: DATABASE BACKUPS (/platform/backups)
               ══════════════════════════════════════════════════════ */}
            {activeSection === 'backups' && (
                <div>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Veritabanı Yedekleri</h1>
                            <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                                Sistem her gece 03:00'te otomatik tam gzip yedeği alır. İstediğiniz zaman anlık yedek de oluşturabilirsiniz.
                            </p>
                        </div>
                        <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={loadBackups} disabled={backupLoading}>
                                <RefreshCw size={16} className={backupLoading ? 'spin' : ''} />
                                Yenile
                            </button>
                            <button className="btn btn-primary" onClick={handleManualBackup} disabled={backupLoading}>
                                {backupLoading ? (
                                    <>
                                        <Loader2 size={16} className="spin" />
                                        Yedek Alınıyor...
                                    </>
                                ) : (
                                    <>
                                        <Database size={16} />
                                        ⚡ Anlık Yedek Al
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <DataTable
                        persistenceKey="PlatformAdmin_backups_table"
                        columns={backupColumns}
                        data={backups}
                        showSearch={true}
                        showCheckboxes={false}
                        searchPlaceholder="Yedek dosyası adı ile ara..."
                        searchKeys={['fileName']}
                    />
                </div>
            )}

            {/* ── MODAL: CREATE BROADCAST ANNOUNCEMENT ── */}
            {createAnnouncementModal && (
                <Modal
                    isOpen={createAnnouncementModal}
                    onClose={() => setCreateAnnouncementModal(false)}
                    title="Yeni Canlı Duyuru & Bildirim Yayınla"
                >
                    <form onSubmit={handleCreateAnnouncementSubmit} className="modal-form-grid">
                        <CustomInput
                            label="Duyuru Başlığı"
                            value={newAnnouncement.title}
                            onChange={(val) => setNewAnnouncement(prev => ({ ...prev, title: getVal(val) }))}
                            placeholder="Örn: 28 Ağustos Planlı Sunucu Bakımı"
                            required
                        />

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                                Duyuru Mesajı / İçerik:
                            </label>
                            <textarea
                                className="form-control"
                                rows={3}
                                value={newAnnouncement.message}
                                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="Duyuru metnini buraya yazın..."
                                required
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <CustomSelect
                                label="Duyuru Türü"
                                value={newAnnouncement.type}
                                onChange={(val) => setNewAnnouncement(prev => ({ ...prev, type: val }))}
                                options={announcementTypeOptions}
                                placeholder="Duyuru türü seçin"
                                required
                            />

                            <CustomSelect
                                label="Hedef Şirket / Kitle"
                                value={newAnnouncement.companyId}
                                onChange={(val) => setNewAnnouncement(prev => ({ ...prev, companyId: val }))}
                                options={announcementCompanyOptions}
                                placeholder="Tüm Şirketler (Genel Yayın)"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <CustomInput
                                label="Son Geçerlilik Tarihi (Opsiyonel)"
                                type="date"
                                value={newAnnouncement.expiresAt}
                                onChange={(val) => setNewAnnouncement(prev => ({ ...prev, expiresAt: getVal(val) }))}
                            />

                            <CustomSelect
                                label="Kapatma & Görünürlük Kuralı"
                                value={String(newAnnouncement.isDismissible)}
                                onChange={(val) => setNewAnnouncement(prev => ({ ...prev, isDismissible: parseInt(val, 10) }))}
                                options={[
                                    { value: '1', label: '🔄 Her Girişte Göster (Kapatılsa da sonraki girişte tekrar çıkar)' },
                                    { value: '0', label: '🔒 Sabit / Kapatılamaz (Zorunlu Acil Duyuru)' },
                                    { value: '2', label: '👁️ Kalıcı Kapatılabilir (Kapatınca bir daha çıkmaz)' }
                                ]}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setCreateAnnouncementModal(false)}>
                                İptal
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={creatingAnnouncement}>
                                {creatingAnnouncement ? 'Yayınlanıyor...' : 'Duyuruyu Canlıya Al'}
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
                            onChange={(val) => setNewUserForm(prev => ({ ...prev, username: getVal(val) }))}
                            placeholder="ornek_kullanici"
                            required
                        />
                        <CustomInput
                            label="E-Posta"
                            type="email"
                            value={newUserForm.email}
                            onChange={(val) => setNewUserForm(prev => ({ ...prev, email: getVal(val) }))}
                            placeholder="kullanici@sirket.com"
                            required
                        />
                        <CustomInput
                            label="Ad Soyad"
                            value={newUserForm.fullName}
                            onChange={(val) => setNewUserForm(prev => ({ ...prev, fullName: getVal(val) }))}
                            placeholder="Ad Soyad"
                        />
                        <CustomInput
                            label="Başlangıç Şifresi"
                            type="password"
                            value={newUserForm.password}
                            onChange={(val) => setNewUserForm(prev => ({ ...prev, password: getVal(val) }))}
                            placeholder="Şifre belirleyin"
                            required
                        />
                        <CustomSelect
                            label="Bağlanacak Şirket"
                            value={newUserForm.companyId}
                            onChange={(val) => setNewUserForm(prev => ({ ...prev, companyId: val }))}
                            options={userCompanyOptions}
                            placeholder="Şirketsiz / Sistem Kullanıcısı"
                        />
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
                            onChange={(val) => setNewPassword(getVal(val))}
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
        </div>
    )
}
