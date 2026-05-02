import { NavLink, useLocation } from 'react-router-dom'
import { moduleMenus, getActiveModule } from '../config/navigation'
import logoCollapsed from '../assets/logos/Group1.svg'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useTabs } from '../context/TabContext'
import { useEffect } from 'react'


export default function Sidebar({ collapsed, onToggle }) {
    const { openNewTab } = useTabs()
    const location = useLocation()

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

            <div className="sidebar-footer">
                <button className="sidebar-toggle" onClick={onToggle}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span>Daralt</span>}
                </button>
            </div>
        </aside>
    )
}
