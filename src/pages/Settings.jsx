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
    const [isBackupPathFocused, setIsBackupPathFocused] = useState(false)

    const [notifications, setNotifications] = useState({
        maintenance: localStorage.getItem('notify_maintenance') !== 'false',
        inspection: localStorage.getItem('notify_inspection') !== 'false',
        insurance: localStorage.getItem('notify_insurance') !== 'false'
    })

    const toggleNotification = (key) => {
        const newVal = !notifications[key]
        setNotifications(prev => ({ ...prev, [key]: newVal }))
        localStorage.setItem(`notify_${key}`, newVal)
    }

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
        if (!currentCompany) return

        // Gather LocalStorage Data
        const localStorageData = {}
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            localStorageData[key] = localStorage.getItem(key)
        }

        const result = await window.electronAPI.exportCompanyData({
            companyId: currentCompany.id,
            localStorageData
        })

        if (result.success) {
            window.electronAPI.showNotification('Başarılı', `Yedek alındı: ${result.filePath}`)
        } else {
            console.error(result.error)
            setErrorMsg(result.error)
        }
    }

    const handleImport = async () => {
        const result = await window.electronAPI.importCompanyData(user.id)

        if (result.success) {
            // Restore LocalStorage
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

                    // Refresh notifications state
                    setNotifications({
                        maintenance: localStorage.getItem('notify_maintenance') !== 'false',
                        inspection: localStorage.getItem('notify_inspection') !== 'false',
                        insurance: localStorage.getItem('notify_insurance') !== 'false'
                    })

                    // Re-load settings
                    const newSettings = await window.electronAPI.getSettings()
                    setSettings(newSettings)

                } catch (err) {
                    console.error('LocalStorage restore error:', err)
                }
            }

            window.electronAPI.showNotification('Başarılı', 'Yedek başarıyla geri yüklendi. Sayfa yenileniyor...')
            setTimeout(() => window.location.reload(), 1500)
        } else {
            if (result.error !== 'Dosya seçilmedi' && result.error !== 'İşlem iptal edildi') {
                console.error(result.error)
                window.electronAPI.showNotification('Hata', result.error)
            }
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                        <span style={{
                                            background: 'var(--bg-tertiary)',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            v{appVersion}
                                        </span>

                                        {updateStatus === 'not-available' && <span className="text-success" style={{ fontSize: '12px', fontWeight: 500 }}>Sürümünüz güncel</span>}
                                        {updateStatus === 'dev-mode' && <span className="text-warning" style={{ fontSize: '12px', fontWeight: 500 }}>Geliştirici modu</span>}
                                        {updateStatus === 'checking' && <span className="text-muted" style={{ fontSize: '12px' }}>Kontrol ediliyor...</span>}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error' || updateStatus === 'dev-mode' ? (
                                            <button className="btn btn-sm btn-secondary" onClick={checkForUpdates} disabled={updateStatus === 'checking'}>
                                                <RefreshCw size={14} /> Denetle
                                            </button>
                                        ) : null}

                                        {updateStatus === 'available' && (
                                            <button className="btn btn-sm btn-primary" onClick={downloadUpdate}>
                                                <Download size={14} /> İndir (v{updateInfo?.version})
                                            </button>
                                        )}

                                        {updateStatus === 'downloaded' && (
                                            <button className="btn btn-sm btn-success" onClick={quitAndInstall}>
                                                <RefreshCw size={14} /> Yeniden Başlat & Yükle
                                            </button>
                                        )}
                                    </div>

                                    {/* Error Message */}
                                    {updateStatus === 'error' && (
                                        <div style={{ marginTop: '12px', fontSize: '12px', background: 'var(--danger-bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger-border)' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--danger)', fontWeight: '600', marginBottom: '8px' }}>
                                                <span>⚠️ Güncelleme Hatası</span>
                                            </div>
                                            <p style={{ margin: 0, color: 'var(--text-primary)', marginBottom: '8px' }}>{errorMsg}</p>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                style={{ width: '100%', justifyContent: 'center' }}
                                                onClick={() => window.electronAPI.openExternal('https://github.com/ReJOnSTR/AracTakip/releases/latest')}
                                            >
                                                <Download size={14} /> GitHub'dan İndir
                                            </button>
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    {updateStatus === 'downloading' && (
                                        <div style={{ marginTop: '12px', width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                                <span>İndiriliyor...</span>
                                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>%{Math.round(progress)}</span>
                                            </div>
                                            <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s ease-out' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="settings-item">
                                <div className="settings-item-icon">
                                    <HardDrive size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Veritabanı</div>
                                    <div className="settings-item-desc">Yerel SQLite veritabanı</div>
                                </div>
                                <span className="badge badge-success" style={{ fontSize: '10px' }}>AKTİF</span>
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
                                    <input
                                        type="checkbox"
                                        checked={notifications.maintenance}
                                        onChange={() => toggleNotification('maintenance')}
                                    />
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
                                    <input
                                        type="checkbox"
                                        checked={notifications.inspection}
                                        onChange={() => toggleNotification('inspection')}
                                    />
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
                                    <input
                                        type="checkbox"
                                        checked={notifications.insurance}
                                        onChange={() => toggleNotification('insurance')}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Data Management Section */}
                    <div className="settings-section">
                        <h2 className="settings-section-title">Veri Yönetimi</h2>
                        <div className="settings-list" style={{ overflow: 'visible' }}>
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

                            <div className="settings-item" style={{ borderBottom: 'none', paddingBottom: settings.autoBackup ? '12px' : '16px' }}>
                                <div className="settings-item-icon">
                                    <RefreshCw size={18} />
                                </div>
                                <div className="settings-item-content">
                                    <div className="settings-item-label">Otomatik Yedekleme</div>
                                    <div className="settings-item-desc">Verileri periyodik olarak yedekle</div>
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

                            {/* Auto Backup Configuration Area */}
                            {settings.autoBackup && (
                                <div style={{
                                    margin: '0 16px 16px 16px',
                                    background: 'var(--bg-tertiary)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    animation: 'fadeIn 0.2s ease-out',
                                    overflow: 'visible' // Allow dropdown to overflow
                                }}>
                                    <div style={{ marginBottom: '16px', position: 'relative', zIndex: 10 }}>
                                        <CustomSelect
                                            label="Sıklık"
                                            options={backupOptions}
                                            value={settings.frequency}
                                            onChange={(val) => handleSettingChange('frequency', val)}
                                        />
                                    </div>

                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        <div
                                            className={`form-group floating-label-group has-value ${isBackupPathFocused ? 'focused' : ''}`}
                                            style={{
                                                marginBottom: 0,
                                                border: isBackupPathFocused ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                transition: 'all 0.2s ease',
                                                boxShadow: isBackupPathFocused ? '0 0 0 3px rgba(50, 200, 255, 0.25)' : 'none'
                                            }}
                                        >
                                            <div className="input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    id="backupPath"
                                                    className="form-input"
                                                    style={{
                                                        border: 'none',
                                                        borderRadius: 0,
                                                        boxShadow: 'none',
                                                        outline: 'none',
                                                        textOverflow: 'ellipsis',
                                                        paddingRight: '10px',
                                                        flex: 1,
                                                        background: 'transparent',
                                                        height: '40px'
                                                    }}
                                                    readOnly
                                                    value={settings.backupPath || 'Varsayılan (Belgelerim)'}
                                                    onFocus={() => setIsBackupPathFocused(true)}
                                                    onBlur={() => setIsBackupPathFocused(false)}
                                                />
                                                <label className="form-label" htmlFor="backupPath">
                                                    Yedekleme Konumu
                                                </label>

                                                <button
                                                    className="btn btn-secondary"
                                                    style={{
                                                        borderRadius: 0,
                                                        border: 'none',
                                                        borderLeft: '1px solid var(--border-color)',
                                                        padding: '0 12px',
                                                        height: '42px',
                                                        marginTop: '0',
                                                        background: 'var(--bg-secondary)',
                                                        outline: 'none'
                                                    }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleBackupPathSelect();
                                                    }}
                                                    title="Klasör Seç"
                                                    onFocus={() => setIsBackupPathFocused(true)}
                                                    onBlur={() => setIsBackupPathFocused(false)}
                                                >
                                                    <Folder size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
