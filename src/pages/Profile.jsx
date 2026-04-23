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

    return (
        <div className="settings-page">
            <TopProgressBar loading={loading} />
            
            <div className="page-header">
                <div>
                    <h1 className="page-title">Profil Ayarları</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-muted)' }}>Kişisel bilgilerinizi ve hesap güvenliğinizi yönetin.</p>
                </div>
            </div>

            <div className="settings-container">
                {/* Sidebar Navigation */}
                <div className="settings-sidebar">
                    <div 
                        className={`settings-sidebar-item ${activeTab === 'personal' ? 'active' : ''}`}
                        onClick={() => setActiveTab('personal')}
                    >
                        <User size={18} />
                        <span>Kişisel Bilgiler</span>
                    </div>
                    
                    <div 
                        className={`settings-sidebar-item ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <Shield size={18} />
                        <span>Güvenlik</span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="settings-content">
                    {msg.text && (
                        <div className="profile-alert" style={{
                            backgroundColor: msg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                            color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                            borderColor: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                            padding: '12px 20px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '13px'
                        }}>
                            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {msg.text}
                        </div>
                    )}

                    <div className="settings-card">
                        {activeTab === 'personal' ? (
                            <form onSubmit={handleProfileSubmit}>
                                <div className="profile-card" style={{ marginBottom: '30px' }}>
                                    <div className="profile-avatar">
                                        {profileData.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                    </div>
                                    <div className="profile-details">
                                        <h3>{profileData.full_name || user?.username}</h3>
                                        <p>{profileData.email}</p>
                                        <span className="profile-badge">Sistem Yöneticisi</span>
                                    </div>
                                </div>

                                <h3 className="settings-card-title">Hesap Detayları</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <CustomInput 
                                        label="Ad Soyad"
                                        value={profileData.full_name}
                                        onChange={val => setProfileData({...profileData, full_name: val})}
                                        placeholder="Tam isminiz"
                                    />
                                    
                                    <div className="settings-grid">
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
                                            <Save size={18} />
                                            Değişiklikleri Kaydet
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handlePasswordSubmit}>
                                <h3 className="settings-card-title">Şifre Değiştir</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <CustomInput 
                                        label="Mevcut Şifre"
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={val => setPasswordData({...passwordData, currentPassword: val})}
                                        icon={<Key size={15} />}
                                        placeholder="••••••••"
                                    />

                                    <div className="settings-grid">
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
                                            <Key size={18} />
                                            Şifreyi Güncelle
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
