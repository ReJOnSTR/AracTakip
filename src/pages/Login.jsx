import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import logo from '../assets/logos/Group5.svg'
import './Login.css'

export default function Login() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const [capsLockActive, setCapsLockActive] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Load remembered user
    useEffect(() => {
        const saved = localStorage.getItem('aractakip_saved_user')
        if (saved) {
            setEmail(saved)
            setRememberMe(true)
        }
    }, [])

    const handleKeyDown = (e) => {
        if (e.getModifierState) {
            setCapsLockActive(e.getModifierState('CapsLock'))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        const cleanEmail = email.trim()
        const cleanPassword = password.trim()

        if (!cleanEmail || !cleanPassword) {
            setError('Lütfen kullanıcı adı/e-posta ve şifrenizi girin.')
            return
        }

        setLoading(true)

        try {
            const result = await login(cleanEmail, cleanPassword)

            if (result.success) {
                if (rememberMe) {
                    localStorage.setItem('aractakip_saved_user', cleanEmail)
                } else {
                    localStorage.removeItem('aractakip_saved_user')
                }
            } else {
                setError(result.error || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.')
                setLoading(false)
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası: ' + err.message)
            setLoading(false)
        }
    }

    return (
        <div className="modern-auth-page">
            <div className="modern-auth-container">
                {/* ── LEFT SIDE: BRANDING & HIGHLIGHTS ── */}
                <div className="auth-brand-panel">
                    <div>
                        <div className="brand-header">
                            <img src={logo} alt="Kontrol Logo" className="brand-logo-img" />
                        </div>
                        <h1 className="brand-hero-title">
                            Filo ve Operasyonlarınızı <br />
                            <span style={{ color: 'var(--accent-primary, #3b82f6)' }}>Tek Merkezden</span> Yönetin.
                        </h1>
                        <p className="brand-hero-desc">
                            Araç takip, muayene, sigorta, personel bordro ve operasyonel maliyetlerinizi bulut gücüyle kontrol altına alın.
                        </p>

                        <div className="brand-feature-list">
                            <div className="brand-feature-item">
                                <div className="brand-feature-icon">
                                    <CheckCircle2 size={14} />
                                </div>
                                <span>Canlı Araç Takibi & Muayene / Sigorta Takibi</span>
                            </div>
                            <div className="brand-feature-item">
                                <div className="brand-feature-icon">
                                    <CheckCircle2 size={14} />
                                </div>
                                <span>Otomatik Personel Bordro, İzin ve Mesai Yönetimi</span>
                            </div>
                            <div className="brand-feature-item">
                                <div className="brand-feature-icon">
                                    <CheckCircle2 size={14} />
                                </div>
                                <span>Finansal Kasa, Gelir / Gider ve Raporlama</span>
                            </div>
                        </div>
                    </div>

                    <div className="brand-footer-trust">
                        <ShieldCheck size={16} style={{ color: '#10b981' }} />
                        <span>256-Bit SSL Uçtan Uca Güvenli Bulut Altyapısı</span>
                    </div>
                </div>

                {/* ── RIGHT SIDE: MODERN LOGIN FORM ── */}
                <div className="auth-form-panel">
                    <div className="form-header-block">
                        <h2 className="form-header-title">Giriş Yap</h2>
                        <p className="form-header-subtitle">Yönetim paneline erişmek için bilgilerinizi girin.</p>
                    </div>

                    {error && (
                        <div className="auth-error-alert">
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group" style={{ marginBottom: '18px' }}>
                            <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontSize: '13px', fontWeight: 500 }}>
                                Kullanıcı Adı veya E-Posta
                            </label>
                            <div className="modern-input-wrapper">
                                <Mail size={18} className="input-leading-icon" />
                                <input
                                    type="text"
                                    className="modern-input-field"
                                    placeholder="admin veya ornek@sirket.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="username"
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '8px' }}>
                            <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontSize: '13px', fontWeight: 500 }}>
                                Şifre
                            </label>
                            <div className="modern-input-wrapper">
                                <Lock size={18} className="input-leading-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="modern-input-field"
                                    style={{ paddingRight: '42px' }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onKeyUp={handleKeyDown}
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="input-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                    title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {capsLockActive && (
                                <div className="caps-warning-pill">
                                    <AlertCircle size={12} />
                                    <span>Büyük Harf Kilidi (Caps Lock) Açık</span>
                                </div>
                            )}
                        </div>

                        <div className="auth-options-row">
                            <label className="remember-label">
                                <input
                                    type="checkbox"
                                    className="remember-checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    disabled={loading}
                                />
                                <span>Beni Hatırla</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="modern-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="spin" />
                                    <span>Giriş Yapılıyor...</span>
                                </>
                            ) : (
                                <>
                                    <span>Giriş Yap</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-bottom-footer">
                        Hesabınız yok mu? <Link to="/register">Hemen Kayıt Olun</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
