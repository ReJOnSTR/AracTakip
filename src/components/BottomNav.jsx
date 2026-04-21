import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Car, Users, Wallet, Menu, Briefcase, Building2, UtensilsCrossed, Settings, LogOut, X, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { getActiveModule } from '../config/navigation'

export default function BottomNav() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { companies, currentCompany, selectCompany } = useCompany()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    // Helper to determine active state
    const activeModule = getActiveModule(location.pathname, location.search)

    const navItems = [
        { id: 'fleet', label: 'Filo', icon: Car, path: '/dashboard' },
        { id: 'hr', label: 'Personel', icon: Users, path: '/personel-dashboard' },
        { id: 'finance', label: 'Finans', icon: Wallet, path: '/finance-dashboard' },
        { id: 'works', label: 'İşler', icon: Briefcase, path: '/works' }
    ]

    return (
        <>
            {/* Mobile Bottom Navigation Bar */}
            <div className="bottom-nav">
                {navItems.map((item) => {
                    const isActive = activeModule === item.id || (item.id === 'works' && activeModule === 'customers')
                    return (
                        <div 
                            key={item.id} 
                            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <item.icon size={22} className="nav-icon" />
                            <span className="nav-label">{item.label}</span>
                        </div>
                    )
                })}
                <div 
                    className={`bottom-nav-item ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(true)}
                >
                    <Menu size={22} className="nav-icon" />
                    <span className="nav-label">Daha Fazla</span>
                </div>
            </div>

            {/* Mobile Full Screen Menu Overlay */}
            <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-content fade-in-up">
                    <div className="mobile-menu-header">
                        <div className="user-info">
                            <div className="user-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{user?.full_name || user?.username}</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{user?.email}</p>
                            </div>
                        </div>
                        <button className="close-menu-btn" onClick={() => setIsMenuOpen(false)}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="mobile-menu-body">
                        {/* Company Section */}
                        <div className="menu-group">
                            <div className="menu-group-title">Mevcut Şirket</div>
                            <div style={{ padding: '10px 15px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                                <Building2 size={18} color="var(--accent-primary)" />
                                <span style={{ fontWeight: '600' }}>{currentCompany?.name || 'Seçilmedi'}</span>
                            </div>
                            {companies.length > 1 && (
                                <div className="company-list">
                                    {companies.filter(c => c.id !== currentCompany?.id).map(c => (
                                        <div 
                                            key={c.id} 
                                            className="mobile-menu-item"
                                            onClick={() => { selectCompany(c); setIsMenuOpen(false); }}
                                        >
                                            <Building2 size={16} />
                                            <span>{c.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Other Modules */}
                        <div className="menu-group">
                            <div className="menu-group-title">Diğer Modüller</div>
                            <div className="mobile-menu-item" onClick={() => { navigate('/customers'); setIsMenuOpen(false); }}>
                                <Building2 size={18} />
                                <span>Cari & Müşteriler</span>
                            </div>
                            <div className="mobile-menu-item" onClick={() => { navigate('/meal-tickets'); setIsMenuOpen(false); }}>
                                <UtensilsCrossed size={18} />
                                <span>Yemek Fişleri</span>
                            </div>
                        </div>

                        {/* System */}
                        <div className="menu-group">
                            <div className="menu-group-title">Sistem & Profil</div>
                            <div className="mobile-menu-item" onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}>
                                <User size={18} />
                                <span>Profil Ayarları</span>
                            </div>
                            <div className="mobile-menu-item" onClick={() => { navigate('/settings?module=portal'); setIsMenuOpen(false); }}>
                                <Settings size={18} />
                                <span>Genel Ayarlar</span>
                            </div>
                        </div>
                    </div>

                    <div className="mobile-menu-footer">
                        <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { logout(); setIsMenuOpen(false); }}>
                            <LogOut size={16} /> Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
