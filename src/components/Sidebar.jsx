import { NavLink, useLocation } from 'react-router-dom'
import { moduleMenus, getActiveModule } from '../config/navigation'
import logoCollapsed from '../assets/logos/Group1.svg'
import { ChevronRight, ChevronLeft, Crown } from 'lucide-react'
import { useTabs } from '../context/TabContext'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'


export default function Sidebar({ collapsed, onToggle }) {
    const { openNewTab } = useTabs()
    const { user } = useAuth()
    const location = useLocation()

    const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin' || user?.username === 'admin'

    // Determine the active module
    const activeModule = getActiveModule(location.pathname, location.search)
    const activeMenus = moduleMenus[activeModule] || []

    // Persist active module so we can recover it for non-module pages (like /settings)
    useEffect(() => {
        if (activeModule && activeModule !== 'portal') {
            sessionStorage.setItem('lastActiveModule', activeModule)
        }
    }, [activeModule])

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} `}>
            <div className="sidebar-header">
                <div className="sidebar-logo" style={{ background: 'transparent', boxShadow: 'none', width: '24px', height: '24px' }}>
                    <img src={logoCollapsed} alt="Kontrol Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                {!collapsed && <span className="sidebar-title">Kontrol</span>}
            </div>

            <nav className="sidebar-nav">
                {activeMenus.map((group, index) => (
                    <div className="nav-section" key={index}>
                        {group.title && <div className="nav-section-title">{group.title}</div>}
                        {group.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                title={collapsed ? item.label : ''}
                                onAuxClick={(e) => e.preventDefault()}
                                onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault()
                                        openNewTab(item.path)
                                    }
                                }}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isSuperAdmin && (
                    <button
                        onClick={() => openNewTab('/platform-admin', false, 'Platform Yönetimi')}
                        className="nav-item"
                        style={{
                            width: '100%',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: collapsed ? '10px 0' : '8px 12px',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            fontWeight: 600,
                            fontSize: '12.5px',
                            cursor: 'pointer'
                        }}
                        title={collapsed ? 'Platform Yönetimi' : ''}
                    >
                        <Crown size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                        {!collapsed && <span>Platform Yönetimi</span>}
                    </button>
                )}

                <button className="sidebar-toggle" onClick={onToggle}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span>Daralt</span>}
                </button>
            </div>
        </aside>
    )
}
