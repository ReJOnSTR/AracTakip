import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2, User, Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import logo from '../assets/logos/Group5.svg'
import './Login.css'

export default function Register() {
    const { register } = useAuth()
    const [companyName, setCompanyName] = useState('')
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        const cleanCompany = companyName.trim()
        const cleanUser = username.trim()
        const cleanEmail = email.trim()
        const cleanPassword = password.trim()
        const cleanConfirm = confirmPassword.trim()

        if (!cleanCompany || !cleanUser || !cleanEmail || !cleanPassword || !cleanConfirm) {
            setError('Lütfen şirket adı dahil tüm zorunlu alanları doldurun.')
            return
        }

        if (cleanPassword !== cleanConfirm) {
            setError('Girilen şifreler birbiriyle eşleşmiyor.')
            return
        }

        if (cleanPassword.length < 6) {
            setError('Şifreniz en az 6 karakter uzunluğunda olmalıdır.')
            return
        }

        setLoading(true)

        try {
            const result = await register(cleanUser, cleanEmail, cleanPassword, cleanCompany)

            if (!result.success) {
                setError(result.error || 'Kayıt işlemi gerçekleştirilemedi.')
                setLoading(false)
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası: ' + err.message)
            setLoading(false)
        }
    }

    return (
        <div className="modern-auth-page">
            <div className="modern-auth-container register-layout">
                {/* ── LEFT SIDE: BRANDING & HIGHLIGHTS ── */}
                <div className="auth-brand-panel">
                    <div>
                        <div className="brand-header">
                            <img src={logo} alt="Kontrol Logo" className="brand-logo-img" />
                        </div>
                        <h1 className="brand-hero-title">
                            Filo ve Şirketinizi <br />
                            <span style={{ color: 'var(--accent-primary, #3b82f6)' }}>Dakikalar İçinde</span> Kurun.
                        </h1>
                        <p className="brand-hero-desc">
                            Şirket hesabınızı oluşturun, araçlarınızı ve personellerinizi ekleyerek operasyonlarınızı anında dijitalleştirin.
                        </p>

                        <div className="brand-feature-list">
                            <div className="brand-feature-item">
                                <div className="brand-feature-icon">
                                    <CheckCircle2 size={14} />
                                </div>
                                <span>Sınırsız Araç ve Ekipman Tanımlama</span>
                            </div>
                            <div className="brand-feature-item">
                                <div className="brand-feature-icon">
                                    <CheckCircle2 size={14} />
                                </div>
                                <span>Rol Bazlı Yönetici ve Şoför Yetkilendirmesi</span>
                            </div>
                            <div className="brand-feature-item">
                                <div className="brand-feature-icon">
                                    <CheckCircle2 size={14} />
                                </div>
                                <span>Anlık Bulut Senkronizasyonu ve Yedekleme</span>
                            </div>
                        </div>
                    </div>

                    <div className="brand-footer-trust">
                        <ShieldCheck size={16} style={{ color: '#10b981' }} />
                        <span>Güvenli Bulut Altyapısı ve KVKK / GDPR Uyumu</span>
                    </div>
                </div>

                {/* ── RIGHT SIDE: MODERN REGISTER FORM ── */}
                <div className="auth-form-panel">
                    <div className="form-header-block">
                        <h2 className="form-header-title">Şirket Hesabı Oluştur</h2>
                        <p className="form-header-subtitle">Filo yönetim sistemine başlamak için formu doldurun.</p>
                    </div>

                    {error && (
                        <div className="auth-error-alert">
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group" style={{ marginBottom: '14px' }}>
                            <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '13px', fontWeight: 500 }}>
                                Şirket / Firma Adı *
                            </label>
                            <div className="modern-input-wrapper">
                                <Building2 size={18} className="input-leading-icon" />
                                <input
                                    type="text"
                                    className="modern-input-field"
                                    placeholder="Örn: SAK VİNÇ LTD. ŞTİ."
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="auth-form-grid" style={{ marginBottom: '14px' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '13px', fontWeight: 500 }}>
                                    Kullanıcı Adı *
                                </label>
                                <div className="modern-input-wrapper">
                                    <User size={18} className="input-leading-icon" />
                                    <input
                                        type="text"
                                        className="modern-input-field"
                                        placeholder="admin_kullanici"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '13px', fontWeight: 500 }}>
                                    E-Posta *
                                </label>
                                <div className="modern-input-wrapper">
                                    <Mail size={18} className="input-leading-icon" />
                                    <input
                                        type="email"
                                        className="modern-input-field"
                                        placeholder="ornek@sirket.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="auth-form-grid" style={{ marginBottom: '22px' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '13px', fontWeight: 500 }}>
                                    Şifre (Min. 6) *
                                </label>
                                <div className="modern-input-wrapper">
                                    <Lock size={18} className="input-leading-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="modern-input-field"
                                        style={{ paddingRight: '40px' }}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="input-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex="-1"
                                        title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '6px', display: 'block', fontSize: '13px', fontWeight: 500 }}>
                                    Şifre Tekrar *
                                </label>
                                <div className="modern-input-wrapper">
                                    <Lock size={18} className="input-leading-icon" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="modern-input-field"
                                        style={{ paddingRight: '40px' }}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="input-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex="-1"
                                        title={showConfirmPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="modern-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="spin" />
                                    <span>Hesap Oluşturuluyor...</span>
                                </>
                            ) : (
                                <>
                                    <span>Hesabı Oluştur ve Başla</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-bottom-footer">
                        Zaten bir hesabınız var mı? <Link to="/login">Giriş Yapın</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
