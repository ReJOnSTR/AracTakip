import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { 
    Lock, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    AlertCircle, 
    ArrowRight, 
    Loader2, 
    ShieldCheck, 
    KeyRound,
    RefreshCw
} from 'lucide-react'
import logo from '../assets/logos/Group5.svg'
import './Login.css'

export default function ResetPassword() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)
    const [hasRecoverySession, setHasRecoverySession] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    
    // OTP Fallback state (if user arrives with an OTP code rather than a magic link)
    const [otpCode, setOtpCode] = useState('')
    const [manualEmail, setManualEmail] = useState('')
    const [verifyingOtp, setVerifyingOtp] = useState(false)

    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        let isMounted = true

        const checkRecoveryState = async () => {
            try {
                // 0. Check URL Hash for error parameters (e.g. otp_expired)
                const hash = window.location.hash
                if (hash) {
                    const params = new URLSearchParams(hash.replace(/^#/, ''))
                    const errorDesc = params.get('error_description')
                    const errorCode = params.get('error_code')
                    
                    if (errorCode === 'otp_expired' || errorDesc?.includes('expired') || errorDesc?.includes('invalid')) {
                        if (isMounted) {
                            setError('Bu bağlantı tek kullanımlıktır ve süresi dolmuş veya daha önce kullanılmış. Aşağıdaki alana e-postanızı ve 6 haneli doğrulama kodunuzu girerek işleminize devam edebilirsiniz.')
                            setCheckingSession(false)
                        }
                        return
                    }
                }

                // 1. Check existing session
                const { data: { session } } = await supabase.auth.getSession()
                
                if (session?.user) {
                    if (isMounted) {
                        setHasRecoverySession(true)
                        setUserEmail(session.user.email || '')
                        setCheckingSession(false)
                    }
                    return
                }

                // 2. Listen to Auth State Change (e.g. PASSWORD_RECOVERY event from URL hash)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (!isMounted) return
                    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                        setHasRecoverySession(true)
                        setUserEmail(session?.user?.email || '')
                        setCheckingSession(false)
                    }
                })

                // 3. Fallback timeout to stop spinner if no link hash is present
                setTimeout(() => {
                    if (isMounted) setCheckingSession(false)
                }, 1200)

                return () => {
                    subscription?.unsubscribe()
                }
            } catch (err) {
                console.error('Recovery check error:', err)
                if (isMounted) setCheckingSession(false)
            }
        }

        checkRecoveryState()

        return () => {
            isMounted = false
        }
    }, [])

    // Password strength calculation
    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, text: '', color: '' }
        let score = 0
        if (pass.length >= 6) score += 1
        if (pass.length >= 8) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1

        if (score <= 2) return { score: 1, text: 'Zayıf', color: '#ef4444' }
        if (score <= 3) return { score: 2, text: 'Orta', color: '#f59e0b' }
        if (score <= 4) return { score: 3, text: 'Güçlü', color: '#10b981' }
        return { score: 4, text: 'Çok Güçlü', color: '#059669' }
    }

    const strength = getPasswordStrength(password)

    // Verify 6-digit OTP code if no session
    const handleVerifyOtp = async (e) => {
        e?.preventDefault()
        setError('')
        const cleanEmail = manualEmail.trim()
        const cleanCode = otpCode.trim()

        if (!cleanEmail || !cleanCode) {
            setError('Lütfen e-posta adresinizi ve 6 haneli doğrulama kodunu girin.')
            return
        }

        setVerifyingOtp(true)
        try {
            const { data, error: otpErr } = await supabase.auth.verifyOtp({
                email: cleanEmail,
                token: cleanCode,
                type: 'recovery'
            })

            if (otpErr) {
                setError(otpErr.message || 'Geçersiz veya süresi dolmuş doğrulama kodu.')
                setVerifyingOtp(false)
                return
            }

            if (data?.session) {
                setHasRecoverySession(true)
                setUserEmail(data.session.user?.email || cleanEmail)
                setError('')
            }
        } catch (err) {
            setError('Doğrulama hatası: ' + err.message)
        } finally {
            setVerifyingOtp(false)
        }
    }

    // Submit new password
    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')

        if (!password) {
            setError('Lütfen yeni bir şifre girin.')
            return
        }

        if (password.length < 6) {
            setError('Şifreniz en az 6 karakter olmalıdır.')
            return
        }

        if (password !== confirmPassword) {
            setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.')
            return
        }

        setLoading(true)

        try {
            // 1. Update password in Supabase Auth
            const { data, error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                setError(updateError.message || 'Şifre güncellenirken bir hata oluştu.')
                setLoading(false)
                return
            }

            // 2. Sync password reset to local PostgreSQL database
            const activeEmail = userEmail || data?.user?.email || manualEmail
            if (activeEmail && window.electronAPI?.syncPasswordReset) {
                try {
                    await window.electronAPI.syncPasswordReset({
                        email: activeEmail,
                        newPassword: password
                    })
                } catch (syncErr) {
                    console.warn('Local database password sync warning:', syncErr)
                }
            }

            setSuccessMessage('Şifreniz başarıyla güncellendi! Giriş sayfasına yönlendiriliyorsunuz...')
            
            setTimeout(() => {
                navigate('/login')
            }, 2500)
        } catch (err) {
            setError('Şifre güncelleme hatası: ' + err.message)
            setLoading(false)
        }
    }

    return (
        <div className="modern-auth-page">
            <div className="modern-auth-container">
                {/* ── LEFT BRANDING PANEL ── */}
                <div className="auth-brand-panel">
                    <div>
                        <div className="brand-header">
                            <img src={logo} alt="Kontrol Logo" className="brand-logo-img" />
                        </div>
                        <div className="brand-hero">
                            <h1 className="brand-hero-title">
                                Güvenli Hesap <br />
                                <span>Şifre Sıfırlama</span>
                            </h1>
                            <p className="brand-hero-subtitle">
                                Hesabınızın güvenliği için yeni ve güçlü bir şifre belirleyin.
                            </p>
                        </div>
                    </div>

                    <div className="brand-footer-features">
                        <div className="feature-item">
                            <div className="feature-icon-box">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="feature-text">
                                <strong>Uçtan Uca Güvenlik</strong>
                                <span>256-bit şifreleme ve güvenli oturum doğrulama</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT FORM PANEL ── */}
                <div className="auth-form-panel">
                    {checkingSession ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <Loader2 size={36} className="spin" style={{ color: 'var(--accent-primary, #3b82f6)', margin: '0 auto 16px' }} />
                            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>Güvenlik Bağlantısı Kontrol Ediliyor...</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Lütfen bekleyiniz.</p>
                        </div>
                    ) : successMessage ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>Şifreniz Değiştirildi!</h2>
                            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                {successMessage}
                            </p>
                            <Link to="/login" className="modern-submit-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span>Giriş Sayfasına Git</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    ) : !hasRecoverySession ? (
                        /* ── OTP CODE ENTRY FALLBACK IF USER DOES NOT HAVE AN ACTIVE TOKEN SESSION ── */
                        <div>
                            <div className="form-header-block">
                                <h2 className="form-header-title">Şifre Sıfırlama Kodu</h2>
                                <p className="form-header-subtitle">E-postanıza gönderilen 6 haneli güvenlik kodunu girin.</p>
                            </div>

                            {error && (
                                <div className="auth-error-alert">
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp}>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label">E-Posta Adresiniz</label>
                                    <div className="modern-input-wrapper">
                                        <input
                                            type="email"
                                            className="modern-input-field"
                                            placeholder="ornek@sirket.com"
                                            value={manualEmail}
                                            onChange={(e) => setManualEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">6 Haneli Güvenlik Kodu (OTP)</label>
                                    <div className="modern-input-wrapper">
                                        <KeyRound size={18} className="input-leading-icon" />
                                        <input
                                            type="text"
                                            className="modern-input-field"
                                            placeholder="000000"
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                            style={{ letterSpacing: '6px', fontSize: '20px', textAlign: 'center', fontWeight: '700', fontFamily: 'monospace' }}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="modern-submit-btn"
                                    disabled={verifyingOtp}
                                >
                                    {verifyingOtp ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            <span>Kod Doğrulanıyor...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Kodu Onayla ve Devam Et</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="auth-bottom-footer" style={{ marginTop: '20px' }}>
                                <Link to="/login">← Giriş Sayfasına Dön</Link>
                            </div>
                        </div>
                    ) : (
                        /* ── SET NEW PASSWORD FORM ── */
                        <div>
                            <div className="form-header-block">
                                <h2 className="form-header-title">Yeni Şifre Belirleyin</h2>
                                <p className="form-header-subtitle">
                                    {userEmail ? <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong> : 'Hesabınız'} için yeni bir şifre tanımlayın.
                                </p>
                            </div>

                            {error && (
                                <div className="auth-error-alert">
                                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} noValidate>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label">Yeni Şifre</label>
                                    <div className="modern-input-wrapper">
                                        <Lock size={18} className="input-leading-icon" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="modern-input-field"
                                            style={{ paddingRight: '42px' }}
                                            placeholder="En az 6 karakter"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="input-toggle-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {password && (
                                        <div style={{ marginTop: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: strength.color, marginBottom: '4px' }}>
                                                <span>Şifre Gücü:</span>
                                                <strong style={{ fontWeight: 600 }}>{strength.text}</strong>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                                                {[1, 2, 3, 4].map((step) => (
                                                    <div
                                                        key={step}
                                                        style={{
                                                            flex: 1,
                                                            borderRadius: '2px',
                                                            background: step <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                    <label className="form-label">Yeni Şifre (Tekrar)</label>
                                    <div className="modern-input-wrapper">
                                        <Lock size={18} className="input-leading-icon" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            className="modern-input-field"
                                            style={{ paddingRight: '42px' }}
                                            placeholder="Şifrenizi tekrar girin"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            autoComplete="new-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="input-toggle-btn"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex="-1"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <div style={{ fontSize: '11.5px', color: '#ef4444', marginTop: '4px' }}>
                                            Şifreler eşleşmiyor.
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="modern-submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="spin" />
                                            <span>Şifre Kaydediliyor...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Şifremi Sıfırla ve Kaydet</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="auth-bottom-footer" style={{ marginTop: '20px' }}>
                                <Link to="/login">← Giriş Sayfasına Dön</Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
