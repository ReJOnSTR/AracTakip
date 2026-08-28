import { NavLink, useLocation } from 'react-router-dom'
import { moduleMenus, getActiveModule } from '../config/navigation'
import logoCollapsed from '../assets/logos/Group1.svg'
import { ChevronRight, ChevronLeft, Crown, Layers } from 'lucide-react'
import { useTabs } from '../context/TabContext'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

import { useCompany } from '../context/CompanyContext'

export default function Sidebar({ collapsed, onToggle }) {
    const { openNewTab } = useTabs()
    const { user } = useAuth()
    const { isImpersonating } = useCompany()
    const location = useLocation()

    const isSuperAdmin = user?.role === 'superadmin'

    // Determine the active module (For standalone SuperAdmin, always 'platform')
    const activeModule = (isSuperAdmin && !isImpersonating) 
        ? 'platform' 
        : getActiveModule(location.pathname, location.search)
    const activeMenus = moduleMenus[activeModule] || []

    // Persist active module so we can recover it for non-module pages (like /settings)
    useEffect(() => {
        if (activeModule && activeModule !== 'portal' && !isSuperAdmin) {
            sessionStorage.setItem('lastActiveModule', activeModule)
        }
    }, [activeModule, isSuperAdmin])

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
                                className={({ isActive }) => {
                                    let isCurrent = false
                                    if (item.path.includes('?')) {
                                        const fullCurrent = `${location.pathname}${location.search}`
                                        isCurrent = fullCurrent === item.path || 
                                            (item.path === '/platform-admin?tab=users' && location.pathname === '/platform-admin' && (!location.search || location.search === '?tab=users'))
                                    } else {
                                        isCurrent = location.pathname === item.path && (!location.search || item.path !== '/platform-admin')
                                    }
                                    return `nav-item ${isCurrent || (isActive && !item.path.includes('?') && location.pathname === item.path) ? 'active' : ''}`
                                }}
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
                {/* Portal / Platform Quick Switches (Hidden for standalone SuperAdmin in main window) */}
                {isImpersonating && (
                    <div style={{
                        padding: collapsed ? '8px 4px' : '6px 10px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#f59e0b',
                        fontWeight: 600,
                        textAlign: 'center'
                    }}>
                        {collapsed ? '👁️' : '👁️ Gözlemci Modu'}
                    </div>
                )}

                <button className="sidebar-toggle" onClick={onToggle}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span>Daralt</span>}
                </button>
            </div>
        </aside>
    )
}
