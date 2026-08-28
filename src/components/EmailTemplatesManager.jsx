import { useState, useEffect, useRef } from 'react'
import { 
    Mail, 
    KeyRound, 
    Sparkles, 
    UserPlus, 
    RefreshCw, 
    Code2, 
    Eye, 
    Columns, 
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
    Layers,
    Shield,
    User,
    ChevronDown
} from 'lucide-react'
import Modal from './Modal'
import CustomInput from './CustomInput'
import './EmailTemplatesManager.css'

export default function EmailTemplatesManager() {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeType, setActiveType] = useState('confirmation')
    const [viewMode, setViewMode] = useState('split') // 'split', 'code', 'preview'
    const [deviceMode, setDeviceMode] = useState('desktop') // 'desktop', 'mobile'
    
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

    const editorRef = useRef(null)

    // Dynamic Variables Reference
    const DYNAMIC_VARIABLES = [
        { key: '{{ .ConfirmationURL }}', label: 'Onay Linki', desc: 'İşlem butonu URL bağlantısı' },
        { key: '{{ .Token }}', label: 'OTP Kodu', desc: '6 haneli doğrulama kodu' },
        { key: '{{ .Email }}', label: 'Alıcı E-Posta', desc: 'Kullanıcı e-posta adresi' },
        { key: '{{ .SiteURL }}', label: 'Site URL', desc: 'Uygulama web adresi' },
        { key: '{{ .Data.username }}', label: 'Kullanıcı Adı', desc: 'Kullanıcı adı' },
        { key: '{{ .Data.company_name }}', label: 'Şirket Adı', desc: 'Kayıtlı şirket unvanı' }
    ]

    useEffect(() => {
        loadTemplates()
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
            case 'confirmation': return <Mail size={16} />
            case 'recovery': return <KeyRound size={16} />
            case 'magic_link': return <Sparkles size={16} />
            case 'invite': return <UserPlus size={16} />
            case 'change_email': return <RefreshCw size={16} />
            default: return <Mail size={16} />
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
        <div className="email-templates-card">
            {/* Feedback Toast */}
            {feedback && (
                <div className={`email-templates-toast ${feedback.type}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.msg}</span>
                </div>
            )}

            {/* Workspace Layout */}
            <div className="email-templates-workspace">
                
                {/* Left Sidebar: Template Navigation */}
                <div className="email-templates-sidebar">
                    <div className="sidebar-header">
                        <Layers size={15} style={{ color: 'var(--accent-primary)' }} />
                        <h3>Şablonlar</h3>
                    </div>
                    
                    <div className="sidebar-templates-list">
                        {templates.map(t => (
                            <button
                                key={t.type}
                                className={`template-nav-item ${activeType === t.type ? 'active' : ''}`}
                                onClick={() => handleSelectTemplate(t.type)}
                            >
                                <div className="template-nav-left">
                                    <span className="template-nav-icon-wrap">
                                        {getIconForType(t.type)}
                                    </span>
                                    <div className="template-nav-info">
                                        <div className="template-nav-name">{t.name}</div>
                                        <div className="template-nav-desc">{t.description}</div>
                                    </div>
                                </div>
                                {t.isCustomized && (
                                    <span className="badge-customized">Özel</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="sidebar-footer-hint">
                        <Shield size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span>Tüm e-posta istemcileriyle (Gmail, Outlook, Apple) %100 uyumludur.</span>
                    </div>
                </div>

                {/* Right Main Studio Workspace */}
                <div className="email-templates-main">
                    
                    {/* 1. Clean Top Header Bar (Integrated Subject + Actions) */}
                    <div className="studio-topbar">
                        {/* Subject Line & Active Template Pill */}
                        <div className="studio-subject-wrapper">
                            <span className="studio-template-pill">
                                {getIconForType(activeType)}
                                <span>{activeTemplate?.name?.split('(')[0]?.trim() || 'Şablon'}</span>
                            </span>
                            <div className="studio-subject-input-box">
                                <span className="subject-prefix">Konu:</span>
                                <input 
                                    type="text"
                                    className="studio-subject-input"
                                    value={currentSubject}
                                    onChange={handleSubjectChange}
                                    placeholder="E-posta konu başlığını yazın..."
                                />
                            </div>
                        </div>

                        {/* Right Actions: View Switcher & Action Buttons */}
                        <div className="studio-top-actions">
                            <div className="studio-view-tabs">
                                <button 
                                    className={`studio-tab ${viewMode === 'code' ? 'active' : ''}`}
                                    onClick={() => setViewMode('code')}
                                    title="Sadece HTML Kod Editörü"
                                >
                                    <Code2 size={13} />
                                    <span>Kod</span>
                                </button>
                                <button 
                                    className={`studio-tab ${viewMode === 'split' ? 'active' : ''}`}
                                    onClick={() => setViewMode('split')}
                                    title="Bölünmüş Ekran (Kod + Canlı Önizleme)"
                                >
                                    <Columns size={13} />
                                    <span>Bölünmüş</span>
                                </button>
                                <button 
                                    className={`studio-tab ${viewMode === 'preview' ? 'active' : ''}`}
                                    onClick={() => setViewMode('preview')}
                                    title="Sadece Canlı Önizleme"
                                >
                                    <Eye size={13} />
                                    <span>Önizleme</span>
                                </button>
                            </div>

                            <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => setTestModalOpen(true)}
                                title="Kendi e-postanıza canlı test iletisi gönderin"
                            >
                                <Send size={13} />
                                <span>Test Gönder</span>
                            </button>

                            {activeTemplate?.isCustomized && (
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleReset}
                                    disabled={resetting}
                                    title="Orijinal varsayılana sıfırla"
                                >
                                    <RotateCcw size={13} className={resetting ? 'spin' : ''} />
                                    <span>Sıfırla</span>
                                </button>
                            )}

                            <button 
                                className="btn btn-primary btn-sm"
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                            >
                                {saving ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
                                <span>{saving ? 'Kaydediliyor' : 'Kaydet'}</span>
                            </button>
                        </div>
                    </div>

                    {/* 2. Compact Metadata & Dynamic Variable Ribbon */}
                    <div className="studio-metadata-ribbon">
                        {/* Sender Input */}
                        <div className="ribbon-sender-box">
                            <span className="ribbon-label">Gönderen:</span>
                            <input 
                                type="text"
                                className="ribbon-sender-input"
                                value={currentSenderName}
                                onChange={handleSenderNameChange}
                                placeholder="Örn: ⚡ Kontrol Güvenlik Ekibi"
                            />
                        </div>

                        {/* Variables Inline Chips */}
                        <div className="ribbon-vars-box">
                            <span className="ribbon-vars-title">Değişkenler:</span>
                            <div className="ribbon-vars-list">
                                {DYNAMIC_VARIABLES.map(v => (
                                    <button
                                        key={v.key}
                                        type="button"
                                        className={`var-chip ${copiedVar === v.key ? 'copied' : ''}`}
                                        onClick={() => handleInsertVariable(v.key)}
                                        title={`${v.label}: ${v.desc} (Tıklayıp imlecin olduğu yere ekleyin)`}
                                    >
                                        <code>{v.key}</code>
                                        {copiedVar === v.key && <Check size={10} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3. Editor & Live Preview Grid */}
                    <div className={`studio-editor-grid ${viewMode}`}>
                        
                        {/* HTML Code Editor Pane */}
                        {(viewMode === 'code' || viewMode === 'split') && (
                            <div className="studio-code-pane">
                                <div className="pane-header">
                                    <div className="pane-header-title">
                                        <Code2 size={13} style={{ color: 'var(--accent-primary)' }} />
                                        <span>HTML5 Şablon Kodu</span>
                                    </div>
                                    <button 
                                        type="button"
                                        className="pane-tool-btn"
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
                                <div className="code-textarea-wrap">
                                    <textarea
                                        ref={editorRef}
                                        className="studio-code-textarea"
                                        value={currentHtml}
                                        onChange={handleHtmlChange}
                                        placeholder="<!DOCTYPE html><html>..."
                                        spellCheck="false"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Live Render Preview Pane */}
                        {(viewMode === 'preview' || viewMode === 'split') && (
                            <div className="studio-preview-pane">
                                <div className="pane-header">
                                    <div className="pane-header-title">
                                        <Eye size={13} style={{ color: 'var(--success)' }} />
                                        <span>Canlı E-Posta Önizleme</span>
                                    </div>
                                    <div className="preview-device-toggle">
                                        <button 
                                            className={`device-tab ${deviceMode === 'desktop' ? 'active' : ''}`}
                                            onClick={() => setDeviceMode('desktop')}
                                            title="Masaüstü Ekranı (600px)"
                                        >
                                            <Monitor size={12} />
                                            <span>Masaüstü</span>
                                        </button>
                                        <button 
                                            className={`device-tab ${deviceMode === 'mobile' ? 'active' : ''}`}
                                            onClick={() => setDeviceMode('mobile')}
                                            title="Mobil Telefon Ekranı (375px)"
                                        >
                                            <Smartphone size={12} />
                                            <span>Mobil</span>
                                        </button>
                                    </div>
                                </div>

                                <div className={`studio-preview-canvas ${deviceMode}`}>
                                    <div className="preview-viewport-frame">
                                        <iframe
                                            title="Email Template Live Preview"
                                            className="preview-iframe"
                                            srcDoc={getRenderedPreview()}
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

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
                        Bu şablonun e-posta kutunuzda nasıl görüntülendiğini test etmek için e-posta adresinize bir test iletisi gönderin.
                    </p>

                    <div className="test-input-wrap">
                        <label>Hedef E-Posta Adresi:</label>
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
                        <span>E-postada <code>{"{{ .Token }}"}</code> yerine örnek kod (849 201) ve canlı buton bağlantısı görüntülenecektir.</span>
                    </div>

                    <div className="modal-actions-custom">
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
        </div>
    )
}
