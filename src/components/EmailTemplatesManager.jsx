import { useState, useEffect, useRef } from 'react'
import { 
    Mail, 
    KeyRound, 
    Sparkles, 
    UserPlus, 
    RefreshCw, 
    Code2, 
    Eye, 
    Smartphone, 
    Monitor, 
    Send, 
    RotateCcw, 
    Save, 
    Copy, 
    Check, 
    Info, 
    AlertCircle, 
    CheckCircle2, 
    Loader2,
    Shield,
    User,
    Settings,
    Server,
    Lock
} from 'lucide-react'
import Modal from './Modal'
import CustomInput from './CustomInput'
import './EmailTemplatesManager.css'

export default function EmailTemplatesManager() {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeType, setActiveType] = useState('confirmation')
    const [deviceMode, setDeviceMode] = useState('desktop') // 'desktop' | 'mobile'
    
    // Editor State
    const [currentSubject, setCurrentSubject] = useState('')
    const [currentSenderName, setCurrentSenderName] = useState('')
    const [currentHtml, setCurrentHtml] = useState('')
    const [isDirty, setIsDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [resetting, setResetting] = useState(false)
    const [copiedVar, setCopiedVar] = useState(null)
    const [feedback, setFeedback] = useState(null)

    // Test Email Modal State
    const [testModalOpen, setTestModalOpen] = useState(false)
    const [testTargetEmail, setTestTargetEmail] = useState('')
    const [sendingTest, setSendingTest] = useState(false)

    // SMTP Settings Modal State
    const [smtpModalOpen, setSmtpModalOpen] = useState(false)
    const [smtpHost, setSmtpHost] = useState('')
    const [smtpPort, setSmtpPort] = useState('587')
    const [smtpSecure, setSmtpSecure] = useState(false)
    const [smtpUser, setSmtpUser] = useState('')
    const [smtpPass, setSmtpPass] = useState('')
    const [defaultSenderName, setDefaultSenderName] = useState('⚡ Kontrol Güvenlik Ekibi')
    const [defaultSenderEmail, setDefaultSenderEmail] = useState('noreply@kontrol-app.com')
    const [savingSmtp, setSavingSmtp] = useState(false)
    const [testingSmtp, setTestingSmtp] = useState(false)
    const [smtpTestResult, setSmtpTestResult] = useState(null)

    const editorRef = useRef(null)

    // Dynamic Variables Reference
    const DYNAMIC_VARIABLES = [
        { key: '{{ .ConfirmationURL }}', label: 'Onay Linki', desc: 'İşlem butonu güvenli URL bağlantısı' },
        { key: '{{ .Token }}', label: 'OTP Kod', desc: '6 haneli doğrulama kodu' },
        { key: '{{ .Email }}', label: 'Alıcı E-Posta', desc: 'Kullanıcı e-posta adresi' },
        { key: '{{ .SiteURL }}', label: 'Site URL', desc: 'SaaS platform web adresi' },
        { key: '{{ .Data.username }}', label: 'Kullanıcı Adı', desc: 'Kullanıcı adı' },
        { key: '{{ .Data.company_name }}', label: 'Şirket Adı', desc: 'Kayıtlı şirket unvanı' }
    ]

    useEffect(() => {
        loadTemplates()
        loadSmtpSettings()
    }, [])

    const loadTemplates = async () => {
        setLoading(true)
        try {
            const res = await window.electronAPI?.getEmailTemplates()
            if (res?.success && Array.isArray(res.data)) {
                setTemplates(res.data)
                const current = res.data.find(t => t.type === activeType) || res.data[0]
                if (current) {
                    setActiveType(current.type)
                    setCurrentSubject(current.subject || '')
                    setCurrentSenderName(current.senderName || '⚡ Kontrol Güvenlik Ekibi')
                    setCurrentHtml(current.htmlContent || '')
                    setIsDirty(false)
                }
            }
        } catch (err) {
            console.error('Failed to load email templates:', err)
            showToast('Şablonlar yüklenirken bir hata oluştu', 'error')
        } finally {
            setLoading(false)
        }
    }

    const loadSmtpSettings = async () => {
        try {
            const res = await window.electronAPI?.getEmailSettings()
            if (res?.success && res.data) {
                setSmtpHost(res.data.smtpHost || '')
                setSmtpPort(String(res.data.smtpPort || 587))
                setSmtpSecure(!!res.data.smtpSecure)
                setSmtpUser(res.data.smtpUser || '')
                setSmtpPass(res.data.smtpPass || '')
                setDefaultSenderName(res.data.senderName || '⚡ Kontrol Güvenlik Ekibi')
                setDefaultSenderEmail(res.data.senderEmail || 'noreply@kontrol-app.com')
            }
        } catch (err) {
            console.error('Failed to load SMTP settings:', err)
        }
    }

    const handleSelectTemplate = (type) => {
        if (isDirty) {
            if (!window.confirm('Kaydedilmemiş değişiklikleriniz var. Başka bir şablona geçmek istiyor musunuz?')) {
                return
            }
        }
        setActiveType(type)
        const t = templates.find(item => item.type === type)
        if (t) {
            setCurrentSubject(t.subject || '')
            setCurrentSenderName(t.senderName || '⚡ Kontrol Güvenlik Ekibi')
            setCurrentHtml(t.htmlContent || '')
            setIsDirty(false)
        }
    }

    const handleSubjectChange = (e) => {
        const val = e.target ? e.target.value : e
        setCurrentSubject(val)
        setIsDirty(true)
    }

    const handleSenderNameChange = (e) => {
        const val = e.target ? e.target.value : e
        setCurrentSenderName(val)
        setIsDirty(true)
    }

    const handleHtmlChange = (e) => {
        setCurrentHtml(e.target.value)
        setIsDirty(true)
    }

    const handleInsertVariable = (varKey) => {
        if (!editorRef.current) {
            navigator.clipboard.writeText(varKey)
            setCopiedVar(varKey)
            setTimeout(() => setCopiedVar(null), 2000)
            return
        }

        const textarea = editorRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value
        const newText = text.substring(0, start) + varKey + text.substring(end)
        
        setCurrentHtml(newText)
        setIsDirty(true)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + varKey.length, start + varKey.length)
        }, 0)

        setCopiedVar(varKey)
        setTimeout(() => setCopiedVar(null), 2000)
    }

    const handleSave = async () => {
        if (!currentSubject.trim() || !currentHtml.trim()) {
            showToast('Konu başlığı ve HTML içeriği boş bırakılamaz', 'error')
            return
        }

        setSaving(true)
        try {
            const res = await window.electronAPI?.saveEmailTemplate({
                type: activeType,
                subject: currentSubject,
                senderName: currentSenderName,
                htmlContent: currentHtml
            })

            if (res?.success) {
                showToast('E-posta şablonu başarıyla kaydedildi!', 'success')
                setIsDirty(false)
                setTemplates(prev => prev.map(t => t.type === activeType ? {
                    ...t,
                    subject: currentSubject,
                    senderName: currentSenderName,
                    htmlContent: currentHtml,
                    isCustomized: true,
                    updatedAt: new Date().toISOString()
                } : t))
            } else {
                showToast(res?.error || 'Kayıt başarısız', 'error')
            }
        } catch (err) {
            showToast(err.message || 'Kayıt sırasında hata oluştu', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleReset = async () => {
        if (!window.confirm('Bu şablonu orijinal varsayılan tasarımına sıfırlamak istediğinize emin misiniz?')) {
            return
        }

        setResetting(true)
        try {
            const res = await window.electronAPI?.resetEmailTemplate({ type: activeType })
            if (res?.success && res.data) {
                setCurrentSubject(res.data.subject)
                setCurrentSenderName(res.data.senderName)
                setCurrentHtml(res.data.htmlContent)
                setIsDirty(false)
                showToast('Şablon varsayılan tasarıma sıfırlandı!', 'success')
                
                setTemplates(prev => prev.map(t => t.type === activeType ? {
                    ...t,
                    subject: res.data.subject,
                    senderName: res.data.senderName,
                    htmlContent: res.data.htmlContent,
                    isCustomized: false,
                    updatedAt: null
                } : t))
            } else {
                showToast(res?.error || 'Sıfırlama başarısız', 'error')
            }
        } catch (err) {
            showToast(err.message || 'Sıfırlama hatası', 'error')
        } finally {
            setResetting(false)
        }
    }

    const handleSendTestEmail = async () => {
        if (!testTargetEmail || !testTargetEmail.includes('@')) {
            showToast('Lütfen geçerli bir test e-posta adresi giriniz', 'error')
            return
        }

        setSendingTest(true)
        try {
            const res = await window.electronAPI?.sendTestEmail({
                type: activeType,
                targetEmail: testTargetEmail.trim().toLowerCase(),
                subject: currentSubject,
                senderName: currentSenderName,
                htmlContent: currentHtml
            })

            if (res?.success) {
                showToast(res.message || 'Test e-postası başarıyla gönderildi!', 'success')
                setTestModalOpen(false)
            } else {
                showToast(res?.error || 'Test e-postası gönderilemedi', 'error')
            }
        } catch (err) {
            showToast(err.message || 'Test gönderim hatası', 'error')
        } finally {
            setSendingTest(false)
        }
    }

    const handleSaveSmtp = async () => {
        if (!smtpHost.trim()) {
            showToast('SMTP Sunucu adresi boş bırakılamaz', 'error')
            return
        }

        setSavingSmtp(true)
        try {
            const res = await window.electronAPI?.saveEmailSettings({
                smtpHost: smtpHost.trim(),
                smtpPort: parseInt(smtpPort || '587'),
                smtpSecure: smtpSecure,
                smtpUser: smtpUser.trim(),
                smtpPass: smtpPass,
                senderName: defaultSenderName.trim(),
                senderEmail: defaultSenderEmail.trim()
            })

            if (res?.success) {
                showToast('SMTP Ayarları başarıyla kaydedildi!', 'success')
                setSmtpModalOpen(false)
            } else {
                showToast(res?.error || 'Kayıt başarısız', 'error')
            }
        } catch (err) {
            showToast(err.message || 'SMTP kayıt hatası', 'error')
        } finally {
            setSavingSmtp(false)
        }
    }

    const handleTestSmtpConnection = async () => {
        setTestingSmtp(true)
        setSmtpTestResult(null)
        try {
            const res = await window.electronAPI?.testSmtpConnection({
                smtpHost: smtpHost.trim(),
                smtpPort: parseInt(smtpPort || '587'),
                smtpSecure: smtpSecure,
                smtpUser: smtpUser.trim(),
                smtpPass: smtpPass
            })

            if (res?.success) {
                setSmtpTestResult({ success: true, msg: '✅ Sunucu bağlantısı başarılı!' })
            } else {
                setSmtpTestResult({ success: false, msg: '❌ ' + (res?.error || 'Bağlantı hatası') })
            }
        } catch (err) {
            setSmtpTestResult({ success: false, msg: '❌ ' + (err.message || 'Bilinmeyen hata') })
        } finally {
            setTestingSmtp(false)
        }
    }

    const showToast = (msg, type = 'info') => {
        setFeedback({ msg, type })
        setTimeout(() => setFeedback(null), 4000)
    }

    // Replace template variables for live rendered mock preview
    const getRenderedPreview = () => {
        const mockSiteUrl = 'https://kontrol-app.com'
        const mockConfirmationUrl = 'https://kontrol-app.com/login?verified=true&preview=1'
        const mockToken = '849 201'
        const mockEmail = 'ahmet@sakvinc.com.tr'
        const mockUsername = 'ahmet_sak'
        const mockCompanyName = 'SAK PETROL LOJİSTİK A.Ş.'

        return currentHtml
            .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, mockConfirmationUrl)
            .replace(/\{\{\s*\.Token\s*\}\}/g, mockToken)
            .replace(/\{\{\s*\.Email\s*\}\}/g, mockEmail)
            .replace(/\{\{\s*\.SiteURL\s*\}\}/g, mockSiteUrl)
            .replace(/\{\{\s*\.Data\.username\s*\}\}/g, mockUsername)
            .replace(/\{\{\s*\.Data\.company_name\s*\}\}/g, mockCompanyName)
    }

    const activeTemplate = templates.find(t => t.type === activeType)

    const getIconForType = (type) => {
        switch(type) {
            case 'confirmation': return <Mail size={15} />
            case 'recovery': return <KeyRound size={15} />
            case 'magic_link': return <Sparkles size={15} />
            case 'invite': return <UserPlus size={15} />
            case 'change_email': return <RefreshCw size={15} />
            default: return <Mail size={15} />
        }
    }

    if (loading) {
        return (
            <div className="email-templates-loading">
                <Loader2 className="spin" style={{ color: 'var(--accent-primary)' }} size={32} />
                <p>E-Posta Şablonları yükleniyor...</p>
            </div>
        )
    }

    return (
        <div className="email-templates-studio">
            {/* Feedback Alert Toast */}
            {feedback && (
                <div className={`email-templates-toast ${feedback.type}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.msg}</span>
                </div>
            )}

            {/* 1. Standard Platform Tabs */}
            <div className="platform-tabs" style={{ marginBottom: '16px' }}>
                {templates.map(t => (
                    <button
                        key={t.type}
                        className={`platform-tab-btn ${activeType === t.type ? 'active' : ''}`}
                        onClick={() => handleSelectTemplate(t.type)}
                    >
                        {getIconForType(t.type)}
                        <span>{t.name?.split('(')[0]?.trim()}</span>
                        {t.isCustomized ? (
                            <span className="platform-tab-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' }}>Özel</span>
                        ) : null}
                    </button>
                ))}
            </div>

            {/* 2. Top Action Controls */}
            <div className="studio-action-bar">
                <div className="studio-template-description">
                    <strong>{activeTemplate?.name}</strong>: {activeTemplate?.description}
                </div>
                <div className="studio-actions-group">
                    <button 
                        className="btn btn-secondary"
                        onClick={() => setSmtpModalOpen(true)}
                        title="SMTP Mail Sunucusu ve Kimlik Bilgilerini Yapılandırın"
                    >
                        <Settings size={15} />
                        <span>SMTP Ayarları</span>
                    </button>

                    <button 
                        className="btn btn-secondary"
                        onClick={() => setTestModalOpen(true)}
                        title="Kendi e-posta adresinize gerçek bir test maili gönderin"
                    >
                        <Send size={15} />
                        <span>Test Maili Gönder</span>
                    </button>

                    {activeTemplate?.isCustomized && (
                        <button 
                            className="btn btn-secondary"
                            onClick={handleReset}
                            disabled={resetting}
                            title="Orijinal varsayılan şablona geri dön"
                        >
                            <RotateCcw size={15} className={resetting ? 'spin' : ''} />
                            <span>Varsayılana Sıfırla</span>
                        </button>
                    )}

                    <button 
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                    >
                        {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                        <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                    </button>
                </div>
            </div>

            {/* 3. Studio 2-Column Responsive Workspace */}
            <div className="studio-workspace-grid">
                
                {/* Left Column: Form Settings & HTML Code Editor */}
                <div className="studio-col-editor">
                    
                    {/* Card 1: Email Metadata Form */}
                    <div className="studio-card">
                        <div className="studio-card-header">
                            <span className="studio-card-title">
                                <User size={14} style={{ color: 'var(--accent-primary)' }} />
                                E-Posta Başlık & Gönderici Ayarları
                            </span>
                        </div>
                        <div className="studio-card-body">
                            <div className="studio-form-grid">
                                <div className="form-group">
                                    <label className="form-label">Gönderici Başlığı (From Name):</label>
                                    <CustomInput
                                        value={currentSenderName}
                                        onChange={handleSenderNameChange}
                                        placeholder="Örn: ⚡ Kontrol Güvenlik Ekibi"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">E-Posta Konusu (Subject):</label>
                                    <CustomInput
                                        value={currentSubject}
                                        onChange={handleSubjectChange}
                                        placeholder="E-posta konu satırı..."
                                    />
                                </div>
                            </div>

                            {/* Dynamic Variables Bar */}
                            <div className="studio-vars-wrap">
                                <span className="vars-label">Dinamik Değişkenler (Tıklayıp Ekleyin):</span>
                                <div className="vars-chip-list">
                                    {DYNAMIC_VARIABLES.map(v => (
                                        <button
                                            key={v.key}
                                            type="button"
                                            className={`vars-chip-btn ${copiedVar === v.key ? 'copied' : ''}`}
                                            onClick={() => handleInsertVariable(v.key)}
                                            title={`${v.label}: ${v.desc}`}
                                        >
                                            <code>{v.key}</code>
                                            {copiedVar === v.key ? <Check size={11} /> : <Copy size={11} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: HTML Code Editor */}
                    <div className="studio-card editor-card">
                        <div className="studio-card-header">
                            <span className="studio-card-title">
                                <Code2 size={14} style={{ color: 'var(--accent-primary)' }} />
                                HTML5 Kaynak Kodu
                            </span>
                            <button
                                type="button"
                                className="btn-ghost-copy"
                                onClick={() => {
                                    navigator.clipboard.writeText(currentHtml)
                                    showToast('HTML kodu panoya kopyalandı', 'info')
                                }}
                                title="Tüm HTML'i Kopyala"
                            >
                                <Copy size={12} />
                                <span>Kopyala</span>
                            </button>
                        </div>
                        <div className="studio-card-body editor-body">
                            <textarea
                                ref={editorRef}
                                className="studio-code-editor"
                                value={currentHtml}
                                onChange={handleHtmlChange}
                                placeholder="<!DOCTYPE html><html>..."
                                spellCheck="false"
                            />
                        </div>
                    </div>

                </div>

                {/* Right Column: Live Visual Render Preview */}
                <div className="studio-col-preview">
                    <div className="studio-card preview-card">
                        <div className="studio-card-header">
                            <span className="studio-card-title">
                                <Eye size={14} style={{ color: 'var(--success)' }} />
                                Canlı E-Posta Önizleme
                            </span>
                            <div className="device-switcher-pill">
                                <button 
                                    type="button"
                                    className={`dev-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
                                    onClick={() => setDeviceMode('desktop')}
                                    title="Masaüstü Ekranı (600px)"
                                >
                                    <Monitor size={13} />
                                    <span>Masaüstü</span>
                                </button>
                                <button 
                                    type="button"
                                    className={`dev-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
                                    onClick={() => setDeviceMode('mobile')}
                                    title="Mobil Telefon Ekranı (375px)"
                                >
                                    <Smartphone size={13} />
                                    <span>Mobil</span>
                                </button>
                            </div>
                        </div>

                        <div className={`studio-preview-wrapper ${deviceMode}`}>
                            <div className="mock-email-window">
                                <div className="mock-window-header">
                                    <div className="mock-window-dots">
                                        <span className="dot red"></span>
                                        <span className="dot yellow"></span>
                                        <span className="dot green"></span>
                                    </div>
                                    <div className="mock-window-info">
                                        <div className="info-row"><strong>Kimden:</strong> {currentSenderName || 'Kontrol Güvenlik'} &lt;{defaultSenderEmail || 'noreply@kontrol-app.com'}&gt;</div>
                                        <div className="info-row"><strong>Konu:</strong> {currentSubject || 'Konu Başlığı'}</div>
                                    </div>
                                </div>
                                <div className="mock-window-body">
                                    <iframe
                                        title="Live Rendered Email"
                                        className="preview-render-frame"
                                        srcDoc={getRenderedPreview()}
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Test Email Send Modal */}
            <Modal
                isOpen={testModalOpen}
                onClose={() => setTestModalOpen(false)}
                title="🧪 Canlı Test E-Postası Gönder"
                size="small"
            >
                <div className="test-email-modal-body">
                    <p className="test-modal-desc">
                        Bu şablonun e-posta istemcilerinizde nasıl görüntülendiğini test etmek için kendi e-posta adresinize gerçek bir test iletisi gönderin.
                    </p>

                    <div className="test-input-wrap">
                        <label className="form-label">Hedef E-Posta Adresi:</label>
                        <CustomInput
                            type="email"
                            placeholder="ornek@alanadiniz.com"
                            value={testTargetEmail}
                            onChange={(e) => setTestTargetEmail(e.target ? e.target.value : e)}
                            autoFocus
                        />
                    </div>

                    <div className="test-modal-info">
                        <Info size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span>E-posta doğrudan sunucunuzun SMTP servisi üzerinden özel HTML olarak iletilecektir.</span>
                    </div>

                    <div className="modal-actions-custom" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                            className="btn btn-secondary"
                            onClick={() => setTestModalOpen(false)}
                            disabled={sendingTest}
                        >
                            İptal
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={handleSendTestEmail}
                            disabled={sendingTest || !testTargetEmail}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {sendingTest ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                            <span>{sendingTest ? 'Gönderiliyor...' : 'Test Maili Gönder'}</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* SMTP & Server Settings Modal */}
            <Modal
                isOpen={smtpModalOpen}
                onClose={() => setSmtpModalOpen(false)}
                title="⚙️ SMTP E-Posta Sunucu Ayarları"
                size="medium"
            >
                <div className="test-email-modal-body">
                    <p className="test-modal-desc">
                        Sistem üzerinden giden tüm doğrulama, şifre sıfırlama ve test e-postalarının güvenle iletilmesi için SMTP sunucu bilgilerinizi giriniz.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <div className="test-input-wrap">
                            <label className="form-label">SMTP Sunucu Adresi (Host):</label>
                            <CustomInput
                                placeholder="Örn: 45.147.47.56 veya mail.kontrol-app.com"
                                value={smtpHost}
                                onChange={(e) => setSmtpHost(e.target ? e.target.value : e)}
                            />
                        </div>
                        <div className="test-input-wrap">
                            <label className="form-label">Port:</label>
                            <CustomInput
                                placeholder="587 / 465 / 25"
                                value={smtpPort}
                                onChange={(e) => setSmtpPort(e.target ? e.target.value : e)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="test-input-wrap">
                            <label className="form-label">SMTP Kullanıcı Adı / E-Posta:</label>
                            <CustomInput
                                placeholder="noreply@kontrol-app.com"
                                value={smtpUser}
                                onChange={(e) => setSmtpUser(e.target ? e.target.value : e)}
                            />
                        </div>
                        <div className="test-input-wrap">
                            <label className="form-label">SMTP Parolası:</label>
                            <CustomInput
                                type="password"
                                placeholder="••••••••"
                                value={smtpPass}
                                onChange={(e) => setSmtpPass(e.target ? e.target.value : e)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="test-input-wrap">
                            <label className="form-label">Varsayılan Gönderen Adı:</label>
                            <CustomInput
                                placeholder="⚡ Kontrol Güvenlik Ekibi"
                                value={defaultSenderName}
                                onChange={(e) => setDefaultSenderName(e.target ? e.target.value : e)}
                            />
                        </div>
                        <div className="test-input-wrap">
                            <label className="form-label">Varsayılan Gönderen E-Posta:</label>
                            <CustomInput
                                placeholder="noreply@kontrol-app.com"
                                value={defaultSenderEmail}
                                onChange={(e) => setDefaultSenderEmail(e.target ? e.target.value : e)}
                            />
                        </div>
                    </div>

                    {smtpTestResult && (
                        <div className={`email-templates-toast ${smtpTestResult.success ? 'success' : 'error'}`} style={{ position: 'static', margin: '8px 0' }}>
                            <span>{smtpTestResult.msg}</span>
                        </div>
                    )}

                    <div className="modal-actions-custom" style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                            className="btn btn-secondary"
                            onClick={handleTestSmtpConnection}
                            disabled={testingSmtp || !smtpHost}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {testingSmtp ? <Loader2 size={14} className="spin" /> : <Server size={14} />}
                            <span>{testingSmtp ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}</span>
                        </button>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setSmtpModalOpen(false)}
                                disabled={savingSmtp}
                            >
                                İptal
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleSaveSmtp}
                                disabled={savingSmtp}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {savingSmtp ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                                <span>{savingSmtp ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
