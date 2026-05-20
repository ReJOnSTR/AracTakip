import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import CustomSelect from '../components/CustomSelect'
import { 
    Sun, Moon, Shield, Database, Palette, HardDrive, Lock, Globe, 
    Bell, Zap, Download, Upload, RefreshCw, Folder, User, Wallet, 
    Wrench, FileSearch, ClipboardCheck, Layout, Cog, Eye, EyeOff, Clock
} from 'lucide-react'
import TopProgressBar from '../components/TopProgressBar'

export default function Settings() {
    const { theme, toggleTheme } = useTheme()
    const { user } = useAuth()
    const { currentCompany } = useCompany()

    const [activeTab, setActiveTab] = useState('general')

    const [settings, setSettings] = useState({
        autoBackup: false,
        frequency: 'daily',
        backupPath: '',
        lastBackup: {},
        arvento: {
            enabled: false,
            username: '',
            pin1: '',
            pin2: '',
            language: 'tr'
        }
    })

    const [appVersion, setAppVersion] = useState('1.0.0')
    const [updateStatus, setUpdateStatus] = useState('idle')
    const [updateInfo, setUpdateInfo] = useState(null)
    const [progress, setProgress] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const [isBackupPathFocused, setIsBackupPathFocused] = useState(false)
    const [showLockPass, setShowLockPass] = useState(false)
    const [lockSettings, setLockSettings] = useState(() => {
        return JSON.parse(localStorage.getItem('aractakip_lock_settings') || '{"enabled":false,"timeout":5,"useCustomPassword":false,"customPassword":""}')
    })

    const [notifications, setNotifications] = useState({
        maintenance: localStorage.getItem('notify_maintenance') !== 'false',
        inspection: localStorage.getItem('notify_inspection') !== 'false',
        insurance: localStorage.getItem('notify_insurance') !== 'false',
        employee_document: localStorage.getItem('notify_employee_document') !== 'false',
        finance_check: localStorage.getItem('notify_finance_check') !== 'false'
    })

    const [testingConnection, setTestingConnection] = useState(false)
    const [connectionTestResult, setConnectionTestResult] = useState(null)

    const testArventoConnection = async () => {
        setTestingConnection(true)
        setConnectionTestResult(null)
        try {
            const result = await window.electronAPI.arventoTestConnection(settings.arvento)
            if (result.success) {
                setConnectionTestResult({ success: true, message: 'Bağlantı başarılı!' })
            } else {
                setConnectionTestResult({ success: false, message: `Bağlantı başarısız: ${result.error || 'Geçersiz kimlik bilgileri'}` })
            }
        } catch (error) {
            setConnectionTestResult({ success: false, message: `Hata: ${error.message}` })
        }
        setTestingConnection(false)
    }

    const handleLockSettingChange = (key, value) => {
        const newLockSettings = { ...lockSettings, [key]: value }
        setLockSettings(newLockSettings)
        localStorage.setItem('aractakip_lock_settings', JSON.stringify(newLockSettings))
    }

    const toggleNotification = async (key) => {
        const newVal = !notifications[key]
        const newNotifications = { ...notifications, [key]: newVal }
        setNotifications(newNotifications)
        localStorage.setItem(`notify_${key}`, newVal)
        
        const currentSettings = await window.electronAPI.getSettings()
        await window.electronAPI.saveSettings({
            ...currentSettings,
            notificationPreferences: newNotifications
        })
    }

    useEffect(() => {
        loadSettings()
        loadAppVersion()

        window.electronAPI.onUpdateStatus((data) => {
            setUpdateStatus(data.status)
            if (data.info) setUpdateInfo(data.info)
            if (data.error) setErrorMsg(data.error)
        })

        window.electronAPI.onUpdateProgress((data) => {
            setUpdateStatus('downloading')
            setProgress(data.percent)
        })

        return () => {
            window.electronAPI.removeUpdateListeners()
        }
    }, [])

    const loadSettings = async () => {
        const data = await window.electronAPI.getSettings()
        setSettings({
            ...data,
            arvento: data.arvento || { enabled: false, username: '', pin1: '', pin2: '', language: 'tr' }
        })
    }

    const loadAppVersion = async () => {
        const ver = await window.electronAPI.getAppVersion()
        setAppVersion(ver)
    }

    const handleSettingChange = async (key, value) => {
        const newSettings = {
            ...settings,
            [key]: value,
            userId: user?.id
        }
        setSettings(newSettings)
        await window.electronAPI.saveSettings(newSettings)
    }

    const handleArventoChange = async (key, value) => {
        const newArvento = {
            ...settings.arvento,
            [key]: value
        }
        const newSettings = {
            ...settings,
            arvento: newArvento,
            userId: user?.id
        }
        setSettings(newSettings)
        await window.electronAPI.saveSettings(newSettings)
    }

    const handleBackupPathSelect = async () => {
        const result = await window.electronAPI.selectFolder()
        if (result.filePaths && result.filePaths.length > 0) {
            handleSettingChange('backupPath', result.filePaths[0])
        }
    }

    const handleExport = async () => {
        if (!currentCompany) return
        const localStorageData = {}
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            localStorageData[key] = localStorage.getItem(key)
        }
        const result = await window.electronAPI.exportCompanyData({
            companyId: currentCompany.id,
            localStorageData,
            userId: user?.id
        })
        if (result.success) {
            window.electronAPI.showNotification('Başarılı', `Yedek alındı: ${result.filePath}`)
        } else {
            setErrorMsg(result.error)
        }
    }

    const handleImport = async () => {
        const result = await window.electronAPI.importCompanyData(user.id)
        if (result.success) {
            if (result.localStorage) {
                const { oldCompanyId, newCompanyId, localStorage: lsData } = result
                try {
                    const oldId = oldCompanyId ? oldCompanyId.toString() : ''
                    const newId = newCompanyId ? newCompanyId.toString() : ''
                    Object.entries(lsData).forEach(([key, value]) => {
                        if (oldId && newId && key.includes(oldId)) {
                            const newKey = key.replace(oldId, newId)
                            localStorage.setItem(newKey, value)
                        } else {
                            localStorage.setItem(key, value)
                        }
                    })
                    setNotifications({
                        maintenance: localStorage.getItem('notify_maintenance') !== 'false',
                        inspection: localStorage.getItem('notify_inspection') !== 'false',
                        insurance: localStorage.getItem('notify_insurance') !== 'false',
                        employee_document: localStorage.getItem('notify_employee_document') !== 'false',
                        finance_check: localStorage.getItem('notify_finance_check') !== 'false'
                    })
                    const newSettings = await window.electronAPI.getSettings()
                    setSettings(newSettings)
                } catch (err) {
                    console.error('LocalStorage restore error:', err)
                }
            }
            if (result.companyId) {
                localStorage.setItem('aractakip_company', result.companyId)
            }
            window.electronAPI.showNotification('Başarılı', 'Yedek başarıyla geri yüklendi. Sayfa yenileniyor...')
            setTimeout(() => window.location.reload(), 1500)
        } else {
            if (result.error !== 'Dosya seçilmedi' && result.error !== 'İşlem iptal edildi') {
                window.electronAPI.showNotification('Hata', result.error)
            }
        }
    }

    const checkForUpdates = async () => {
        setUpdateStatus('checking')
        setErrorMsg('')
        const result = await window.electronAPI.checkForUpdates()
        if (result && !result.success) {
            if (result.status === 'dev-mode') {
                setUpdateStatus('dev-mode')
            } else {
                setUpdateStatus('error')
                setErrorMsg(result.error || 'Kontrol edilemedi')
            }
        }
    }

    const downloadUpdate = async () => {
        setUpdateStatus('downloading')
        await window.electronAPI.downloadUpdate()
    }

    const quitAndInstall = async () => {
        await window.electronAPI.quitAndInstall()
    }

    const backupOptions = [
        { value: 'daily', label: 'Her Gün' },
        { value: 'weekly', label: 'Her Hafta' },
        { value: 'monthly', label: 'Her Ay' }
    ]

    const sidebarItems = [
        { id: 'general', label: 'Genel', icon: <Cog size={18} /> },
        { id: 'appearance', label: 'Görünüm', icon: <Palette size={18} /> },
        { id: 'security', label: 'Güvenlik', icon: <Shield size={18} /> },
        { id: 'notifications', label: 'Bildirimler', icon: <Bell size={18} /> },
        { id: 'data', label: 'Veri Yönetimi', icon: <Database size={18} /> },
        { id: 'arvento', label: 'Arvento Entegrasyonu', icon: <Globe size={18} /> },
    ]

    return (
        <div className="settings-page">
            <TopProgressBar loading={updateStatus === 'checking' || updateStatus === 'downloading'} />
            
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ayarlar</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-muted)' }}>Uygulama tercihlerini yönetin.</p>
                </div>
            </div>

            <div className="settings-container">
                {/* Sidebar Navigation */}
                <div className="settings-sidebar">
                    {sidebarItems.map(item => (
                        <div 
                            key={item.id} 
                            className={`settings-sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="settings-content">
                    
                    {activeTab === 'general' && (
                        <div className="tab-fade-in">
                            <div className="settings-card">
                                <h2 className="settings-card-title"><User size={20} className="text-primary" /> Profil Bilgileri</h2>
                                <div className="profile-card">
                                    <div className="profile-avatar">
                                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="profile-details">
                                        <h3>{user?.username}</h3>
                                        <p>{user?.email}</p>
                                        <span className="profile-badge">Aktif Kullanıcı</span>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-card">
                                <h2 className="settings-card-title"><Globe size={20} className="text-primary" /> Sistem Bilgileri</h2>
                                <div className="settings-list">
                                    <div className="settings-item">
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Uygulama Versiyonu</div>
                                            <div className="settings-item-desc">Mevcut çalışan sürüm</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                            <span className="badge badge-outline">v{appVersion}</span>
                                            {updateStatus === 'not-available' && <span className="text-success" style={{ fontSize: '11px' }}>Güncel</span>}
                                            {updateStatus === 'error' && <span className="text-danger" style={{ fontSize: '11px' }}>Hata</span>}
                                            
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {(updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error' || updateStatus === 'dev-mode') && (
                                                    <button className="btn btn-sm btn-secondary" onClick={checkForUpdates} disabled={updateStatus === 'checking'}>
                                                        <RefreshCw size={14} /> Güncellemeleri Denetle
                                                    </button>
                                                )}
                                                {updateStatus === 'available' && (
                                                    <button className="btn btn-sm btn-primary" onClick={downloadUpdate}>
                                                        <Download size={14} /> İndir (v{updateInfo?.version})
                                                    </button>
                                                )}
                                                {updateStatus === 'downloaded' && (
                                                    <button className="btn btn-sm btn-success" onClick={quitAndInstall}>
                                                        <RefreshCw size={14} /> Kur & Yeniden Başlat
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {updateStatus === 'downloading' && (
                                        <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch', background: 'rgba(var(--accent-primary-rgb), 0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Download size={16} className="text-primary" />
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Yeni Versiyon İndiriliyor</div>
                                                </div>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', background: 'var(--accent-subtle)', padding: '2px 8px', borderRadius: '6px' }}>
                                                    %{Math.round(progress)}
                                                </div>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                                                <div style={{ 
                                                    width: `${progress}%`, 
                                                    height: '100%', 
                                                    background: 'linear-gradient(90deg, var(--accent-primary), #6366f1)', 
                                                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: '0 0 12px rgba(var(--accent-primary-rgb), 0.4)'
                                                }}></div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lütfen uygulamayı kapatmayın...</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{updateInfo?.version} sürümüne güncelleniyor</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="settings-item">
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Veritabanı Durumu</div>
                                            <div className="settings-item-desc">Yerel SQLite bağlantısı</div>
                                        </div>
                                        <span className="badge badge-success">BAĞLI</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="tab-fade-in">
                            <div className="settings-card">
                                <h2 className="settings-card-title"><Palette size={20} className="text-primary" /> Görünüm Ayarları</h2>
                                    <div className="settings-item">
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Tema Tercihi</div>
                                            <div className="settings-item-desc">Açık veya koyu tema arasında geçiş yapın</div>
                                        </div>
                                        
                                        <div 
                                            className={`premium-theme-toggle ${theme}`}
                                            onClick={toggleTheme}
                                        >
                                            <div className="active-bg"></div>
                                            <div className={`toggle-icon-container light ${theme === 'light' ? 'active' : ''}`}>
                                                <Sun size={18} />
                                            </div>
                                            <div className={`toggle-icon-container dark ${theme === 'dark' ? 'active' : ''}`}>
                                                <Moon size={18} />
                                            </div>
                                        </div>
                                    </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="tab-fade-in">
                            <div className="settings-card">
                                <h2 className="settings-card-title"><Shield size={20} className="text-primary" /> Uygulama Güvenliği</h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                    Uygulamanın güvenliğini ve otomatik kilitleme tercihlerini yönetin.
                                </p>

                                <div className="settings-list">
                                    <div className="settings-item">
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Otomatik Kilitleme</div>
                                            <div className="settings-item-desc">Belirli bir süre işlem yapılmadığında uygulamayı kilitler.</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={lockSettings.enabled} 
                                                onChange={(e) => handleLockSettingChange('enabled', e.target.checked)} 
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    {lockSettings.enabled && (
                                        <>
                                            <div className="settings-item">
                                                <div className="settings-item-content">
                                                    <div className="settings-item-label">Kilitleme Süresi (Dakika)</div>
                                                    <div className="settings-item-desc">Kaç dakika hareketsizlikten sonra kilitlensin?</div>
                                                </div>
                                                <div style={{ width: '80px' }}>
                                                    <input 
                                                        type="number" 
                                                        className="form-input text-center" 
                                                        value={lockSettings.timeout}
                                                        min="1"
                                                        max="60"
                                                        onChange={(e) => handleLockSettingChange('timeout', parseInt(e.target.value) || 1)}
                                                        style={{ padding: '8px' }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="settings-item">
                                                <div className="settings-item-content">
                                                    <div className="settings-item-label">Özel Kilit Şifresi Kullan</div>
                                                    <div className="settings-item-desc">Giriş şifresi yerine farklı bir şifre ile kilit açma.</div>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={lockSettings.useCustomPassword} 
                                                        onChange={(e) => handleLockSettingChange('useCustomPassword', e.target.checked)} 
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>

                                            {lockSettings.useCustomPassword && (
                                                <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                                                    <div className="settings-item-label">Kilit Şifresini Belirle</div>
                                                    <div style={{ width: '100%', position: 'relative' }}>
                                                        <input 
                                                            type={showLockPass ? 'text' : 'password'} 
                                                            className="form-input" 
                                                            placeholder="Yeni kilit şifresi"
                                                            value={lockSettings.customPassword}
                                                            onChange={(e) => handleLockSettingChange('customPassword', e.target.value)}
                                                            style={{ paddingRight: '45px' }}
                                                        />
                                                        <button 
                                                            type="button"
                                                            className="password-toggle-btn" 
                                                            onClick={() => setShowLockPass(!showLockPass)}
                                                            title={showLockPass ? "Şifreyi Gizle" : "Şifreyi Göster"}
                                                        >
                                                            {showLockPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="tab-fade-in">
                            <div className="settings-card">
                                <h2 className="settings-card-title"><Bell size={20} className="text-primary" /> Bildirim Tercihleri</h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                    Hangi işlemler için hatırlatma almak istediğinizi buradan yönetebilirsiniz.
                                </p>
                                
                                <div className="settings-grid">
                                    <div className="settings-item card-style">
                                        <div className="settings-item-icon"><Wrench size={18} /></div>
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Bakım Bildirimleri</div>
                                            <div className="settings-item-desc">Servis ve periyodik bakımlar</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={notifications.maintenance} onChange={() => toggleNotification('maintenance')} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-item card-style">
                                        <div className="settings-item-icon"><ClipboardCheck size={18} /></div>
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Muayene Bildirimleri</div>
                                            <div className="settings-item-desc">Trafik ve egzoz muayeneleri</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={notifications.inspection} onChange={() => toggleNotification('inspection')} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-item card-style">
                                        <div className="settings-item-icon"><Shield size={18} /></div>
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Sigorta Bildirimleri</div>
                                            <div className="settings-item-desc">Kasko ve trafik sigortaları</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={notifications.insurance} onChange={() => toggleNotification('insurance')} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-item card-style">
                                        <div className="settings-item-icon"><User size={18} /></div>
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Personel Belgeleri</div>
                                            <div className="settings-item-desc">Ehliyet, SRC ve diğer belgeler</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={notifications.employee_document} onChange={() => toggleNotification('employee_document')} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-item card-style">
                                        <div className="settings-item-icon"><Wallet size={18} /></div>
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Finans Bildirimleri</div>
                                            <div className="settings-item-desc">Çek ve senet vadesi uyarıları</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={notifications.finance_check} onChange={() => toggleNotification('finance_check')} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div className="settings-section-divider" style={{ margin: '30px 0', borderTop: '1px solid var(--border-color)' }}></div>

                                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={18} className="text-primary" /> Günlük Hatırlatıcı Özeti
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                    Belirlediğiniz saatte, yaklaşan ve geciken tüm işlemlerin toplu özetini bildirim olarak alın.
                                </p>

                                <div className="settings-list">
                                    <div className="settings-item card-style">
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Günlük Özet Bildirimi</div>
                                            <div className="settings-item-desc">Tüm yaklaşan/gecikmiş işleri tek bildirimde raporlar.</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={settings.notificationSummaryEnabled || false} 
                                                onChange={(e) => handleSettingChange('notificationSummaryEnabled', e.target.checked)} 
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    {settings.notificationSummaryEnabled && (
                                        <div className="settings-item card-style">
                                            <div className="settings-item-content">
                                                <div className="settings-item-label">Hatırlatma Saati</div>
                                                <div className="settings-item-desc">Özet bildirimi her gün saat kaçta gönderilsin?</div>
                                            </div>
                                            <input 
                                                type="time" 
                                                className="form-input" 
                                                style={{ width: '120px' }}
                                                value={settings.notificationSummaryTime || '09:00'}
                                                onChange={(e) => handleSettingChange('notificationSummaryTime', e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="tab-fade-in">
                            <div className="settings-card">
                                <h2 className="settings-card-title"><Database size={20} className="text-primary" /> Yedekleme ve Geri Yükleme</h2>
                                <div className="settings-item" style={{ alignItems: 'flex-start' }}>
                                    <div className="settings-item-content">
                                        <div className="settings-item-label">Manuel Yedekleme</div>
                                        <div className="settings-item-desc">Mevcut şirket verilerini ve yerel ayarları bir dosyaya kaydeder.</div>
                                        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                                            <button className="btn btn-secondary" onClick={handleExport} disabled={!currentCompany}>
                                                <Download size={16} /> Verileri Dışa Aktar
                                            </button>
                                            <button className="btn btn-secondary" onClick={handleImport}>
                                                <Upload size={16} /> Verileri İçe Aktar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="settings-item" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                                    <div className="settings-item-content">
                                        <div className="settings-item-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            Otomatik Yedekleme
                                            {settings.autoBackup && <span className="badge badge-success" style={{ fontSize: '9px', padding: '2px 6px' }}>AKTİF</span>}
                                        </div>
                                        <div className="settings-item-desc">Belirlenen aralıklarla arka planda yedek alır.</div>
                                    </div>
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.autoBackup} 
                                            onChange={(e) => handleSettingChange('autoBackup', e.target.checked)} 
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                {settings.autoBackup && (
                                    <div className="auto-backup-config" style={{ 
                                        marginTop: '20px', 
                                        background: 'rgba(0, 0, 0, 0.02)', 
                                        padding: '24px', 
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-color)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px'
                                    }}>
                                        <div style={{ maxWidth: '300px' }}>
                                            <CustomSelect 
                                                label="Yedekleme Sıklığı"
                                                options={backupOptions}
                                                value={settings.frequency}
                                                onChange={(val) => handleSettingChange('frequency', val)}
                                            />
                                        </div>

                                        <div className="form-group floating-label-group has-value" style={{ margin: 0 }}>
                                            <div className="input-wrapper">
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    readOnly 
                                                    value={settings.backupPath || 'Varsayılan (Belgelerim)'} 
                                                    style={{ background: 'var(--bg-primary)' }}
                                                />
                                                <label className="form-label">Yedekleme Klasörü</label>
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ height: '42px', minWidth: '42px', padding: 0 }} 
                                                    onClick={handleBackupPathSelect}
                                                    title="Klasör Seç"
                                                >
                                                    <Folder size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'arvento' && (
                        <div className="tab-fade-in">
                            <div className="settings-card">
                                <h2 className="settings-card-title"><Globe size={20} className="text-primary" style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Arvento Entegrasyonu</h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                    Arvento API hizmetini kullanarak araçlarınızın konum, hız ve alarm bilgilerini sisteme aktarın.
                                </p>

                                <div className="settings-list">
                                    <div className="settings-item card-style">
                                        <div className="settings-item-content">
                                            <div className="settings-item-label">Entegrasyonu Etkinleştir</div>
                                            <div className="settings-item-desc">Arvento servisinin arka planda çalışmasını sağlar.</div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input 
                                                type="checkbox" 
                                                checked={settings.arvento?.enabled || false} 
                                                onChange={(e) => handleArventoChange('enabled', e.target.checked)} 
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    {settings.arvento?.enabled && (
                                        <div style={{ 
                                            marginTop: '20px', 
                                            background: 'rgba(0, 0, 0, 0.02)', 
                                            padding: '24px', 
                                            borderRadius: '16px',
                                            border: '1px solid var(--border-color)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '20px'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div className="form-group floating-label-group has-value" style={{ margin: 0 }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-input" 
                                                        value={settings.arvento?.username || ''} 
                                                        onChange={(e) => handleArventoChange('username', e.target.value)}
                                                        placeholder="Arvento kullanıcı adınız"
                                                    />
                                                    <label className="form-label" style={{ background: 'var(--bg-primary)' }}>Kullanıcı Adı</label>
                                                </div>

                                                <div className="form-group floating-label-group has-value" style={{ margin: 0 }}>
                                                    <input 
                                                        type="text" 
                                                        className="form-input" 
                                                        value={settings.arvento?.language || 'tr'} 
                                                        onChange={(e) => handleArventoChange('language', e.target.value)}
                                                        placeholder="Örn: tr, en"
                                                    />
                                                    <label className="form-label" style={{ background: 'var(--bg-primary)' }}>Dil Kodu</label>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div className="form-group floating-label-group has-value" style={{ margin: 0 }}>
                                                    <input 
                                                        type="password" 
                                                        className="form-input" 
                                                        value={settings.arvento?.pin1 || ''} 
                                                        onChange={(e) => handleArventoChange('pin1', e.target.value)}
                                                        placeholder="PIN 1 kodu"
                                                    />
                                                    <label className="form-label" style={{ background: 'var(--bg-primary)' }}>PIN 1</label>
                                                </div>

                                                <div className="form-group floating-label-group has-value" style={{ margin: 0 }}>
                                                    <input 
                                                        type="password" 
                                                        className="form-input" 
                                                        value={settings.arvento?.pin2 || ''} 
                                                        onChange={(e) => handleArventoChange('pin2', e.target.value)}
                                                        placeholder="PIN 2 kodu"
                                                    />
                                                    <label className="form-label" style={{ background: 'var(--bg-primary)' }}>PIN 2</label>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                                                <button 
                                                    className="btn btn-secondary" 
                                                    onClick={testArventoConnection}
                                                    disabled={testingConnection || !settings.arvento?.username || !settings.arvento?.pin1}
                                                >
                                                    {testingConnection ? 'Bağlantı Test Ediliyor...' : 'Bağlantıyı Test Et'}
                                                </button>
                                                
                                                {connectionTestResult && (
                                                    <span className={connectionTestResult.success ? 'text-success' : 'text-danger'} style={{ fontSize: '13px', fontWeight: 500 }}>
                                                        {connectionTestResult.message}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    )
}
