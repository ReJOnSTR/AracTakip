import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
    User, 
    Mail, 
    Lock, 
    Save, 
    Key, 
    CheckCircle2, 
    AlertCircle,
    Shield,
    AtSign
} from 'lucide-react'
import TopProgressBar from '../components/TopProgressBar'
import CustomInput from '../components/CustomInput'

export default function Profile() {
    const { user, updateProfile } = useAuth()
    const [activeTab, setActiveTab] = useState('personal')
    
    const [profileData, setProfileData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        full_name: user?.full_name || ''
    })
    
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState({ type: '', text: '' })

    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMsg({ type: '', text: '' })
        const result = await updateProfile(profileData)
        if (result.success) setMsg({ type: 'success', text: 'Profil güncellendi' })
        else setMsg({ type: 'error', text: result.error || 'Hata oluştu' })
        setLoading(false)
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMsg({ type: 'error', text: 'Şifreler eşleşmiyor' })
            return
        }
        setLoading(true)
        setMsg({ type: '', text: '' })
        const result = await window.electronAPI.changePassword({
            userId: user.id,
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
        })
        if (result.success) {
            setMsg({ type: 'success', text: 'Şifre güncellendi' })
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } else setMsg({ type: 'error', text: result.error || 'Hata oluştu' })
        setLoading(false)
    }

    const profileStyles = `
        .profile-container {
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .profile-layout {
            display: grid;
            grid-template-columns: 240px 1fr;
            gap: 32px;
            margin-top: 24px;
        }

        .profile-nav-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 8px;
            height: fit-content;
        }

        .profile-nav-item {
            padding: 12px 16px;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            transition: var(--transition-normal);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .profile-nav-item:hover {
            color: var(--text-primary);
            background: var(--bg-tertiary);
        }

        .profile-nav-item.active {
            color: var(--accent-primary);
            background: var(--accent-subtle);
            font-weight: 600;
        }

        .profile-main-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 32px;
            position: relative;
            animation: fadeIn var(--transition-normal);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .profile-avatar-circle {
            width: 72px;
            height: 72px;
            border-radius: var(--radius-lg);
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 700;
            color: var(--accent-primary);
            margin-bottom: 24px;
        }

        .profile-section-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .profile-section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border-color);
        }

        .profile-alert {
            margin-bottom: 24px;
            padding: 14px 20px;
            border-radius: var(--radius-md);
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid transparent;
        }

        @media (max-width: 800px) {
            .profile-layout {
                grid-template-columns: 1fr;
            }
        }
    `

    return (
        <div className="profile-page" style={{ padding: '0 20px' }}>
            <style>{profileStyles}</style>
            <TopProgressBar loading={loading} />
            
            <div className="profile-container">
                <div className="page-header" style={{ marginBottom: '0' }}>
                    <div>
                        <h1 className="page-title">Profil Ayarları</h1>
                        <p style={{ marginTop: '5px', color: 'var(--text-muted)' }}>Kişisel bilgilerinizi ve hesap güvenliğinizi yönetin.</p>
                    </div>
                </div>

                <div className="profile-layout">
                    {/* Navigation */}
                    <aside className="profile-nav-card">
                        <div 
                            className={`profile-nav-item ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            <User size={18} />
                            <span>Kişisel Bilgiler</span>
                        </div>
                        
                        <div 
                            className={`profile-nav-item ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <Shield size={18} />
                            <span>Güvenlik</span>
                        </div>
                    </aside>

                    {/* Content */}
                    <main className="profile-main-card">
                        {msg.text && (
                            <div className="profile-alert" style={{
                                backgroundColor: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                                color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                                borderColor: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                                opacity: 0.8
                            }}>
                                {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                {msg.text}
                            </div>
                        )}

                        <div key={activeTab} style={{ animation: 'fadeIn var(--transition-normal)' }}>
                            {activeTab === 'personal' ? (
                                <form onSubmit={handleProfileSubmit}>
                                    <div className="profile-avatar-circle">
                                        {profileData.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                    </div>

                                    <h3 className="profile-section-title">Hesap Detayları</h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <CustomInput 
                                            label="Ad Soyad"
                                            value={profileData.full_name}
                                            onChange={val => setProfileData({...profileData, full_name: val})}
                                            placeholder="Tam isminiz"
                                        />
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <CustomInput 
                                                label="Kullanıcı Adı"
                                                required
                                                value={profileData.username}
                                                onChange={val => setProfileData({...profileData, username: val})}
                                                icon={<AtSign size={15} />}
                                            />
                                            <CustomInput 
                                                label="E-posta Adresi"
                                                type="email"
                                                required
                                                value={profileData.email}
                                                onChange={val => setProfileData({...profileData, email: val})}
                                                icon={<Mail size={15} />}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                                                <Save size={18} style={{ marginRight: '8px' }} />
                                                Değişiklikleri Kaydet
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handlePasswordSubmit}>
                                    <h3 className="profile-section-title">Şifre Değiştir</h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <CustomInput 
                                            label="Mevcut Şifre"
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={val => setPasswordData({...passwordData, currentPassword: val})}
                                            icon={<Key size={15} />}
                                            placeholder="••••••••"
                                        />

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <CustomInput 
                                                label="Yeni Şifre"
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={val => setPasswordData({...passwordData, newPassword: val})}
                                                icon={<Lock size={15} />}
                                                placeholder="Yeni şifreniz"
                                            />
                                            <CustomInput 
                                                label="Yeni Şifre Onayı"
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={val => setPasswordData({...passwordData, confirmPassword: val})}
                                                icon={<Lock size={15} />}
                                                placeholder="Yeni şifrenizi doğrulayın"
                                            />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '140px' }}>
                                                <Key size={18} style={{ marginRight: '8px' }} />
                                                Şifreyi Güncelle
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}
