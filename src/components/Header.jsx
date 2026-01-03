import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import {
    Building2,
    ChevronDown,
    User,
    LogOut,
    Settings
} from 'lucide-react'

const pageTitles = {
    '/': 'Dashboard',
    '/companies': 'Şirketler',
    '/vehicles': 'Araçlar',
    '/maintenance': 'Bakım Takibi',
    '/inspections': 'Muayene Takibi',
    '/insurance': 'Sigorta Yönetimi',
    '/assignments': 'Zimmet Takibi',
    '/services': 'Servis İşlemleri',
    '/reports': 'Raporlar'
}

export default function Header() {
    const location = useLocation()
    const { user, logout } = useAuth()
    const { companies, currentCompany, selectCompany } = useCompany()
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
    const [showUserDropdown, setShowUserDropdown] = useState(false)

    const pageTitle = pageTitles[location.pathname] || 'Sayfa'

    const handleCompanySelect = (company) => {
        selectCompany(company)
        setShowCompanyDropdown(false)
    }

    return (
        <header className="header">
            <div className="header-left">
                <h1 className="header-title">{pageTitle}</h1>
            </div>

            <div className="header-right">
                {/* Company Selector */}
                <div className="company-selector">
                    <button
                        className="company-selector-btn"
                        onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                    >
                        <Building2 size={18} />
                        <span>{currentCompany?.name || 'Şirket Seçin'}</span>
                        <ChevronDown size={16} />
                    </button>

                    {showCompanyDropdown && (
                        <>
                            <div
                                className="dropdown-backdrop"
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 199
                                }}
                                onClick={() => setShowCompanyDropdown(false)}
                            />
                            <div className="company-dropdown">
                                {companies.length === 0 ? (
                                    <div className="company-dropdown-item">
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            Henüz şirket eklenmemiş
                                        </span>
                                    </div>
                                ) : (
                                    companies.map((company) => (
                                        <div
                                            key={company.id}
                                            className={`company-dropdown-item ${currentCompany?.id === company.id ? 'active' : ''}`}
                                            onClick={() => handleCompanySelect(company)}
                                        >
                                            <Building2 size={18} />
                                            <span>{company.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* User Menu */}
                <div className="user-menu">
                    <button
                        className="user-menu-btn"
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                    >
                        <div className="user-avatar">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <ChevronDown size={16} />
                    </button>

                    {showUserDropdown && (
                        <>
                            <div
                                className="dropdown-backdrop"
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 199
                                }}
                                onClick={() => setShowUserDropdown(false)}
                            />
                            <div className="user-dropdown">
                                <div className="user-dropdown-item" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <User size={16} />
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.email}</div>
                                    </div>
                                </div>
                                <div className="user-dropdown-item danger" onClick={logout}>
                                    <LogOut size={16} />
                                    <span>Çıkış Yap</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
