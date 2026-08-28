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
    Sliders,
    HelpCircle,
    ExternalLink
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
    
    // Editor State for currently active template
    const [currentSubject, setCurrentSubject] = useState('')
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

    // Available dynamic variables reference
    const DYNAMIC_VARIABLES = [
        { key: '{{ .ConfirmationURL }}', label: 'Onay / Sıfırlama Linki', desc: 'Kullanıcının tıklayacağı güvenli işlem bağlantısı' },
        { key: '{{ .Token }}', label: '6 Haneli OTP Kod', desc: 'Tek kullanımlık 6 haneli güvenlik doğrulama kodu' },
        { key: '{{ .Email }}', label: 'Alıcı E-Postası', desc: 'Kullanıcının e-posta adresi' },
        { key: '{{ .SiteURL }}', label: 'Site URL', desc: 'Uygulamanın ana web adresi (https://kontrol-app.com)' },
        { key: '{{ .Data.username }}', label: 'Kullanıcı Adı', desc: 'Kullanıcının sisteme kayıtlı kullanıcı adı' },
        { key: '{{ .Data.company_name }}', label: 'Şirket Adı', desc: 'Kullanıcının bağlı olduğu şirket / filo adı' }
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
                // Initialize active template data
                const current = res.data.find(t => t.type === activeType) || res.data[0]
                if (current) {
                    setActiveType(current.type)
                    setCurrentSubject(current.subject || '')
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
            setCurrentHtml(t.htmlContent || '')
            setIsDirty(false)
        }
    }

    const handleSubjectChange = (e) => {
        const val = e.target ? e.target.value : e
        setCurrentSubject(val)
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

        // Refocus & set cursor
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
                htmlContent: currentHtml
            })

            if (res?.success) {
                showToast('E-posta şablonu başarıyla kaydedildi!', 'success')
                setIsDirty(false)
                // Update local templates list
                setTemplates(prev => prev.map(t => t.type === activeType ? {
                    ...t,
                    subject: currentSubject,
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
                setCurrentHtml(res.data.htmlContent)
                setIsDirty(false)
                showToast('Şablon varsayılan tasarıma sıfırlandı!', 'success')
                
                setTemplates(prev => prev.map(t => t.type === activeType ? {
                    ...t,
                    subject: res.data.subject,
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

    // Generate live rendered mockup HTML for preview
    const getRenderedPreview = () => {
        const mockSiteUrl = 'https://kontrol-app.com'
        const mockConfirmationUrl = 'https://kontrol-app.com/login?verified=true&preview=1'
        const mockToken = '849201'
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
            case 'confirmation': return <Mail className="template-item-icon confirmation" />
            case 'recovery': return <KeyRound className="template-item-icon recovery" />
            case 'magic_link': return <Sparkles className="template-item-icon magic" />
            case 'invite': return <UserPlus className="template-item-icon invite" />
            case 'change_email': return <RefreshCw className="template-item-icon change" />
            default: return <Mail className="template-item-icon" />
        }
    }

    if (loading) {
        return (
            <div className="email-templates-loading">
                <Loader2 className="animate-spin text-blue-500" size={36} />
                <p>E-Posta Şablonları Yükleniyor...</p>
            </div>
        )
    }

    return (
        <div className="email-templates-container">
            {/* Feedback Alert Toast */}
            {feedback && (
                <div className={`email-templates-toast ${feedback.type}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{feedback.msg}</span>
                </div>
            )}

            {/* Layout: Sidebar + Main Workspace */}
            <div className="email-templates-workspace">
                
                {/* Left Sidebar: Template Selection */}
                <div className="email-templates-sidebar">
                    <div className="sidebar-header">
                        <Layers size={18} className="text-blue-400" />
                        <h3>E-Posta Şablonları</h3>
                    </div>
                    <div className="sidebar-templates-list">
                        {templates.map(t => (
                            <button
                                key={t.type}
                                className={`template-nav-item ${activeType === t.type ? 'active' : ''}`}
                                onClick={() => handleSelectTemplate(t.type)}
                            >
                                <div className="template-nav-left">
                                    {getIconForType(t.type)}
                                    <div className="template-nav-info">
                                        <div className="template-nav-name">{t.name}</div>
                                        <div className="template-nav-desc">{t.description}</div>
                                    </div>
                                </div>
                                {t.isCustomized ? (
                                    <span className="badge-customized" title="Özel HTML Şablonu Aktif">Özel</span>
                                ) : (
                                    <span className="badge-default" title="Varsayılan Şablon">Varsayılan</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="sidebar-footer-hint">
                        <Info size={14} className="text-slate-400 flex-shrink-0" />
                        <span>Kullanıcı kayıt, şifre sıfırlama ve davet mailleri burada tanımlanan HTML tasarımıyla gönderilir.</span>
                    </div>
                </div>

                {/* Right Area: Editor & Live Preview */}
                <div className="email-templates-main">
                    
                    {/* Main Header / Action Bar */}
                    <div className="template-main-header">
                        <div className="template-header-left">
                            <div className="template-title-wrap">
                                {getIconForType(activeType)}
                                <div>
                                    <h2>{activeTemplate?.name || 'Şablon'}</h2>
                                    <span className="template-subtext">{activeTemplate?.description}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Right Actions */}
                        <div className="template-header-actions">
                            <div className="view-mode-toggle">
                                <button 
                                    className={`view-btn ${viewMode === 'code' ? 'active' : ''}`}
                                    onClick={() => setViewMode('code')}
                                    title="Sadece HTML Kod Düzenleyici"
                                >
                                    <Code2 size={16} />
                                    <span>HTML</span>
                                </button>
                                <button 
                                    className={`view-btn ${viewMode === 'split' ? 'active' : ''}`}
                                    onClick={() => setViewMode('split')}
                                    title="Yan Yana Bölünmüş Ekran"
                                >
                                    <Columns size={16} />
                                    <span>Bölünmüş</span>
                                </button>
                                <button 
                                    className={`view-btn ${viewMode === 'preview' ? 'active' : ''}`}
                                    onClick={() => setViewMode('preview')}
                                    title="Sadece Canlı Önizleme"
                                >
                                    <Eye size={16} />
                                    <span>Önizleme</span>
                                </button>
                            </div>

                            <button 
                                className="btn-test-mail"
                                onClick={() => setTestModalOpen(true)}
                                title="Kendi e-posta adresinize gerçek bir test maili gönderin"
                            >
                                <Send size={15} />
                                <span>Test Gönder</span>
                            </button>

                            {activeTemplate?.isCustomized && (
                                <button 
                                    className="btn-reset-template"
                                    onClick={handleReset}
                                    disabled={resetting}
                                    title="Orijinal varsayılan şablona geri dön"
                                >
                                    <RotateCcw size={15} className={resetting ? 'animate-spin' : ''} />
                                    <span>Sıfırla</span>
                                </button>
                            )}

                            <button 
                                className={`btn-save-template ${isDirty ? 'dirty' : ''}`}
                                onClick={handleSave}
                                disabled={saving || !isDirty}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Subject Line & Dynamic Variable Bar */}
                    <div className="template-subject-bar">
                        <div className="subject-input-wrap">
                            <label>Konu Satırı (Subject):</label>
                            <input 
                                type="text"
                                className="subject-input"
                                value={currentSubject}
                                onChange={handleSubjectChange}
                                placeholder="E-posta konu başlığını giriniz..."
                            />
                        </div>

                        {/* Variables Pills Bar */}
                        <div className="dynamic-variables-bar">
                            <div className="variables-label">
                                <Sparkles size={13} className="text-amber-400" />
                                <span>Dinamik Değişkenler (Tıklayıp Ekleyin):</span>
                            </div>
                            <div className="variables-pills">
                                {DYNAMIC_VARIABLES.map(v => (
                                    <button
                                        key={v.key}
                                        type="button"
                                        className={`var-pill ${copiedVar === v.key ? 'copied' : ''}`}
                                        onClick={() => handleInsertVariable(v.key)}
                                        title={`${v.label}: ${v.desc}`}
                                    >
                                        {copiedVar === v.key ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        <code>{v.key}</code>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Editor & Preview Split Panels */}
                    <div className={`template-editor-grid ${viewMode}`}>
                        
                        {/* HTML Code Editor Panel */}
                        {(viewMode === 'code' || viewMode === 'split') && (
                            <div className="editor-panel">
                                <div className="panel-header">
                                    <div className="panel-title">
                                        <Code2 size={15} className="text-blue-400" />
                                        <span>HTML Şablon Kaynağı</span>
                                    </div>
                                    <span className="code-hint">Standart HTML5 ve CSS destekler</span>
                                </div>
                                <div className="code-editor-wrapper">
                                    <textarea
                                        ref={editorRef}
                                        className="html-code-textarea"
                                        value={currentHtml}
                                        onChange={handleHtmlChange}
                                        placeholder="<!DOCTYPE html><html>..."
                                        spellCheck="false"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Live Render Preview Panel */}
                        {(viewMode === 'preview' || viewMode === 'split') && (
                            <div className="preview-panel">
                                <div className="panel-header">
                                    <div className="panel-title">
                                        <Eye size={15} className="text-emerald-400" />
                                        <span>Canlı Görsel Önizleme (Live Render)</span>
                                    </div>
                                    <div className="device-switcher">
                                        <button 
                                            className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
                                            onClick={() => setDeviceMode('desktop')}
                                            title="Masaüstü Ekranı"
                                        >
                                            <Monitor size={14} />
                                            <span>Masaüstü</span>
                                        </button>
                                        <button 
                                            className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
                                            onClick={() => setDeviceMode('mobile')}
                                            title="Mobil Telefon Ekranı"
                                        >
                                            <Smartphone size={14} />
                                            <span>Mobil</span>
                                        </button>
                                    </div>
                                </div>

                                <div className={`preview-viewport ${deviceMode}`}>
                                    <div className="preview-frame-container">
                                        <iframe
                                            title="Email Template Preview"
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
                title="🧪 Gerçek Test E-Postası Gönder"
                size="small"
            >
                <div className="test-email-modal-body">
                    <p className="test-modal-desc">
                        Bu şablonun Gmail, Outlook veya Apple Mail gibi gerçek e-posta istemcilerinde nasıl göründüğünü test etmek için e-posta adresinize bir test gönderimi yapın.
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
                        <Info size={15} className="text-blue-400 flex-shrink-0" />
                        <span>Test e-postasında <code>{"{{ .Token }}"}</code> yerine örnek kod (849201) ve geçerli bağlantılar yer alacaktır.</span>
                    </div>

                    <div className="modal-actions-custom">
                        <button 
                            className="btn-cancel"
                            onClick={() => setTestModalOpen(false)}
                            disabled={sendingTest}
                        >
                            İptal
                        </button>
                        <button 
                            className="btn-primary-send"
                            onClick={handleSendTestEmail}
                            disabled={sendingTest || !testTargetEmail}
                        >
                            {sendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <span>{sendingTest ? 'Gönderiliyor...' : 'Test Maili Gönder'}</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
