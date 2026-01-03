import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Truck, Mail, Lock } from 'lucide-react'

export default function Login() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!email || !password) {
            setError('Lütfen tüm alanları doldurun')
            return
        }

        setLoading(true)
        const result = await login(email, password)

        if (!result.success) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo" style={{ visibility: 'hidden' }}>
                        <div className="auth-logo-icon">
                            <Truck />
                        </div>
                        <span className="auth-logo-text">Araç Takip</span>
                    </div>

                    <h1 className="auth-title">Hoş Geldiniz</h1>
                    <p className="auth-subtitle">Devam etmek için giriş yapın</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">E-posta</label>
                            <div style={{ position: 'relative' }}>
                                <Mail
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)'
                                    }}
                                />
                                <input
                                    type="email"
                                    className="form-input"
                                    style={{ paddingLeft: '44px' }}
                                    placeholder="ornek@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Şifre</label>
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)'
                                    }}
                                />
                                <input
                                    type="password"
                                    className="form-input"
                                    style={{ paddingLeft: '44px' }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && <div className="form-error" style={{ marginBottom: '16px' }}>{error}</div>}

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Hesabınız yok mu? <Link to="/register">Kayıt olun</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
