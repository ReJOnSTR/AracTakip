import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import CustomSelect from '../components/CustomSelect'
import { Sun, Moon, Shield, Database, Palette, HardDrive, Lock, Globe, Bell, Zap, Download, Upload, RefreshCw, Folder } from 'lucide-react'

export default function Settings() {
    const { theme, toggleTheme } = useTheme()
    const { user } = useAuth()
    const { currentCompany } = useCompany()

    const [settings, setSettings] = useState({
        autoBackup: false,
        frequency: 'daily',
        backupPath: '',
        lastBackup: {}
    })

    const [appVersion, setAppVersion] = useState('1.0.0')
    const [updateStatus, setUpdateStatus] = useState('idle') // idle, checking, available, not-available, downloading, downloaded, error, dev-mode
    const [updateInfo, setUpdateInfo] = useState(null)
    const [progress, setProgress] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        loadSettings()
        loadAppVersion()

        // Update Listeners
        window.electronAPI.onUpdateStatus((data) => {
            console.log('Update Status:', data)
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
        setSettings(data)
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

    const handleBackupPathSelect = async () => {
        const result = await window.electronAPI.selectFolder()
        if (result.filePaths && result.filePaths.length > 0) {
            handleSettingChange('backupPath', result.filePaths[0])
        }
    }

    const handleExport = async () => {
        if (!currentCompany) return alert('Lütfen önce bir şirket seçiniz')
        const result = await window.electronAPI.exportCompanyData(currentCompany.id)
        if (result.success) {
            alert(`Yedekleme başarılı: ${result.filePath}`)
        } else {
            if (result.error !== 'İşlem iptal edildi') alert('Hata: ' + result.error)
        }
    }

    const handleImport = async () => {
        const result = await window.electronAPI.importCompanyData(user.id)
        if (result.success) {
            alert('Veriler başarıyla içe aktarıldı. Yeni şirket oluşturuldu.')
            window.location.reload()
        } else {
            if (result.error !== 'Dosya seçilmedi') alert('Hata: ' + result.error)
        }
    }

    const checkForUpdates = async () => {
        setUpdateStatus('checking')
        setErrorMsg('')
        const result = await window.electronAPI.checkForUpdates()
        if (result && !result.success) {
            // If check fails immediately (e.g. network)
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

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Ayarlar</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Uygulama ayarları.</p>
                </div>
            </div>

            <div className="settings-layout">
                {/* Left Column */}
                <div className="settings-column">
                    {/* Profile Section */}
                    <div className="settings-section">
                        <h2 className="settings-section-title">Profil</h2>
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

                    {/* Appearance Section */}
                    <div className="settings-section">
                        <h2 className="settings-section-title">Görünüm</h2>
                        <div className="settings-list">
                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <Palette size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Tema</div>
                                    <div className="settings-item-desc">Uygulama görünümünü seçin</div>
                                </div>
                                <div className="theme-switcher">
                                    <button
                                        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                                        onClick={() => theme !== 'light' && toggleTheme()}
                                    >
                                        <Sun size={16} />
                                        <span>Açık</span>
                                    </button>
                                    <button
                                        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                                        onClick={() => theme !== 'dark' && toggleTheme()}
                                    >
                                        <Moon size={16} />
                                        <span>Koyu</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System & Update Section */}
                    <div className="settings-section">
                        <h2 className="settings-section-title">Sistem & Güncelleme</h2>
                        <div className="settings-list">
                            <div className="settings-item" style={{ alignItems: 'flex-start', gap: '15px' }}>
                                <div className="settings-item-icon" style={{ marginTop: '2px' }}>
                                    <Globe size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Versiyon</div>
                                    <div className="settings-item-desc" style={{ marginBottom: '8px' }}>Mevcut Sürüm: <span style={{ fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>v{appVersion}</span></div>

                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error' || updateStatus === 'dev-mode' ? (
                                            <button className="btn btn-sm btn-secondary" onClick={checkForUpdates} disabled={updateStatus === 'checking'}>
                                                {updateStatus === 'checking' ? 'Kontrol Ediliyor...' : 'Denetle'}
                                            </button>
                                        ) : null}

                                        {updateStatus === 'available' && (
                                            <button className="btn btn-sm btn-primary" onClick={downloadUpdate}>
                                                <Download size={14} /> İndir
                                            </button>
                                        )}

                                        {updateStatus === 'downloaded' && (
                                            <button className="btn btn-sm btn-success" onClick={quitAndInstall}>
                                                <RefreshCw size={14} /> Yeniden Başlat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Update Status Messages */}
                            {updateStatus !== 'idle' && (
                                <div style={{ padding: '0 15px 15px 15px' }}>
                                    {updateStatus === 'checking' && <span className="text-muted" style={{ fontSize: '12px' }}>Güncellemeler kontrol ediliyor...</span>}
                                    {updateStatus === 'not-available' && <span className="text-success" style={{ fontSize: '12px' }}>Sürümünüz güncel.</span>}
                                    {updateStatus === 'dev-mode' && <span className="text-warning" style={{ fontSize: '12px' }}>Geliştirici modundasınız.</span>}
                                    {updateStatus === 'error' && (
                                        <div style={{ fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger-bg)' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--danger)', fontWeight: '500', marginBottom: '8px' }}>
                                                <span>⚠️ Hata: {errorMsg}</span>
                                            </div>

                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                style={{ width: '100%', justifyContent: 'center' }}
                                                onClick={() => window.electronAPI.openExternal('https://github.com/ReJOnSTR/AracTakip/releases/latest')}
                                            >
                                                <Download size={14} /> Elle İndir (GitHub)
                                            </button>
                                            <p style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                                Mac güvenlik ayarları nedeniyle otomatik güncelleme yapılamadı. Lütfen yukarıdaki butona tıklayıp son sürümü elle indirip kurun.
                                            </p>
                                        </div>
                                    )}

                                    {updateStatus === 'available' && (
                                        <div style={{ fontSize: '12px' }}>
                                            <div className="text-primary" style={{ fontWeight: '600' }}>Yeni sürüm mevcut: v{updateInfo?.version}</div>
                                            <div style={{ marginTop: '5px' }}>Sürüm notları GitHub üzerinde mevcuttur.</div>
                                        </div>
                                    )}

                                    {updateStatus === 'downloading' && (
                                        <div style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                                <span>İndiriliyor...</span>
                                                <span>%{Math.round(progress)}</span>
                                            </div>
                                            <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <HardDrive size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Veritabanı</div>
                                    <div className="settings-item-desc">Yerel SQLite veritabanı</div>
                                </div>
                                <span className="settings-item-badge success">Aktif</span>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="settings-column">
                    {/* Notifications Section */}
                    <div className="settings-section">
                        <h2 className="settings-section-title">Bildirimler</h2>
                        <div className="settings-list">
                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <Bell size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Bakım Hatırlatmaları</div>
                                    <div className="settings-item-desc">Yaklaşan bakımlar için bildirim</div>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <Shield size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Muayene Uyarıları</div>
                                    <div className="settings-item-desc">Muayene tarihi yaklaşınca uyar</div>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <Zap size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Sigorta Bildirimleri</div>
                                    <div className="settings-item-desc">Sigorta bitiş tarihi hatırlatması</div>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Data Management Section */}
                    <div className="settings-section">
                        <h2 className="settings-section-title">Veri Yönetimi</h2>
                        <div className="settings-list">
                            <div className="settings-item" style={{ alignItems: 'flex-start' }}>
                                <div className="settings-item-icon" style={{ marginTop: '4px' }}>
                                    <Database size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Yedekleme ve Geri Yükleme</div>
                                    <div className="settings-item-desc">Şirket verilerini yönetin</div>
                                    <div className="settings-actions-row" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-sm btn-outline" onClick={handleExport} disabled={!currentCompany}>
                                            <Download size={14} /> Dışa Aktar
                                        </button>
                                        <button className="btn btn-sm btn-outline" onClick={handleImport}>
                                            <Upload size={14} /> İçe Aktar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <RefreshCw size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Otomatik Yedekleme</div>
                                    <div className="settings-item-desc">Periyodik olarak yedek al</div>
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
                                <>
                                    <div className="settings-item" style={{ borderTop: 'none', paddingTop: 0 }}>
                                        <div className="settings-item-content" style={{ paddingLeft: '44px', width: '100%' }}>
                                            <div className="settings-item-label" style={{ marginBottom: '8px' }}>Sıklık</div>
                                            <CustomSelect
                                                className="form-select-custom"
                                                options={backupOptions}
                                                value={settings.frequency}
                                                onChange={(val) => handleSettingChange('frequency', val)}
                                                placeholder="Seçiniz"
                                            />
                                        </div>
                                    </div>

                                    <div className="settings-item" style={{ borderTop: 'none', paddingTop: 0 }}>
                                        <div className="settings-item-content" style={{ paddingLeft: '44px', width: '100%' }}>
                                            <div className="settings-item-label" style={{ marginBottom: '8px' }}>Yedekleme Konumu</div>
                                            <div className="path-selector" style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    style={{ fontSize: '12px', padding: '6px 10px' }}
                                                    readOnly
                                                    value={settings.backupPath || 'Seçilmedi'}
                                                />
                                                <button className="btn btn-secondary" style={{ padding: '0 10px' }} onClick={handleBackupPathSelect}>
                                                    <Folder size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
