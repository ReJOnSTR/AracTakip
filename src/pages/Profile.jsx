import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
    User, 
    Mail, 
    Lock, 
    ShieldCheck, 
    Save, 
    KeyRound, 
    Eye, 
    EyeOff,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function Profile() {
    const { user, updateProfile } = useAuth()
    const { showToast } = useToast()
    
    // Profile Info State
    const [username, setUsername] = useState(user?.username || '')
    const [email, setEmail] = useState(user?.email || '')
    const [profileLoading, setProfileLoading] = useState(false)

    // Password State
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPasswords, setShowPasswords] = useState(false)
    const [passwordLoading, setPasswordLoading] = useState(false)

    useEffect(() => {
        if (user) {
            setUsername(user.username)
            setEmail(user.email)
        }
    }, [user])

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        if (!username || !email) {
            showToast('Kullanıcı adı ve e-posta gereklidir.', 'error')
            return
        }

        setProfileLoading(true)
        const result = await updateProfile({ username, email })
        if (result.success) {
            showToast('Profil bilgileriniz başarıyla güncellendi.', 'success')
        } else {
            showToast(result.error || 'Profil güncellenemedi.', 'error')
        }
        setProfileLoading(false)
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        
        if (!currentPassword) {
            showToast('Mevcut şifrenizi girmeniz gerekmektedir.', 'error')
            return
        }

        if (newPassword.length < 6) {
            showToast('Yeni şifre en az 6 karakter olmalıdır.', 'error')
            return
        }

        if (newPassword !== confirmPassword) {
            showToast('Şifreler eşleşmiyor.', 'error')
            return
        }

        setPasswordLoading(true)
        const result = await updateProfile({ 
            newPassword, 
            currentPassword 
        })
        
        if (result.success) {
            showToast('Şifreniz başarıyla değiştirildi.', 'success')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } else {
            showToast(result.error || 'Şifre değiştirilemedi.', 'error')
        }
        setPasswordLoading(false)
    }

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Profil Ayarları
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Hesap bilgilerinizi ve güvenlik ayarlarınızı buradan yönetebilirsiniz.
                </p>
            </div>

            <div style={{ display: 'grid', gap: '32px' }}>
                {/* Profile Information Section */}
                <section className="card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '10px', 
                            background: 'var(--accent-primary-alpha)', 
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <User size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Kişisel Bilgiler</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Giriş yapmak için kullandığınız temel bilgiler.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Kullanıcı Adı</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Kullanıcı adınız"
                                        style={{ paddingLeft: '40px' }}
                                    />
                                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">E-posta Adresi</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="email" 
                                        className="form-input" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="E-posta adresiniz"
                                        style={{ paddingLeft: '40px' }}
                                    />
                                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                disabled={profileLoading}
                                style={{ padding: '10px 24px' }}
                            >
                                <Save size={18} />
                                {profileLoading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Password Section */}
                <section className="card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '10px', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Güvenlik ve Şifre</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hesap güvenliğinizi korumak için şifrenizi düzenli olarak güncelleyin.</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword}>
                        <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Mevcut Şifre</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type={showPasswords ? 'text' : 'password'} 
                                        className="form-input" 
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Güvenlik için mevcut şifreniz"
                                        style={{ paddingLeft: '40px', paddingRight: '40px' }}
                                    />
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                    >
                                        {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label className="form-label">Yeni Şifre</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type={showPasswords ? 'text' : 'password'} 
                                            className="form-input" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="En az 6 karakter"
                                            style={{ paddingLeft: '40px' }}
                                        />
                                        <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Yeni Şifre (Tekrar)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type={showPasswords ? 'text' : 'password'} 
                                            className="form-input" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Tekrar girin"
                                            style={{ paddingLeft: '40px' }}
                                        />
                                        <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ 
                            padding: '12px 16px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: '8px', 
                            marginBottom: '24px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            border: '1px solid var(--border-color)'
                        }}>
                            <AlertCircle size={18} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Şifrenizi değiştirdiğinizde mevcut tüm oturumlarınızı korumaya devam etmek için yeni şifrenizle giriş yapmanız gerekmeyebilir ancak bu cihazdaki oturumunuz otomatik olarak güncellenecektir.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                disabled={passwordLoading}
                                style={{ padding: '10px 24px', background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                            >
                                <KeyRound size={18} />
                                {passwordLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    )
}
