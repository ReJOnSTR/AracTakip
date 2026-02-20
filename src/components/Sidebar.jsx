import { NavLink } from 'react-router-dom'
import { menuGroups } from '../config/navigation'
import logo from '../assets/logos/logo-chatgpt.png'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useTabs } from '../context/TabContext'


export default function Sidebar({ collapsed, onToggle }) {
    const { openNewTab } = useTabs()
    // Static menu definition used to be here


    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''} `}>
            <div className="sidebar-header">
                <div className="sidebar-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
                    <img src={logo} alt="Muayen Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span className="sidebar-title">Muayen</span>
            </div>

            <nav className="sidebar-nav">
                {menuGroups.map((group, index) => (
                    <div className="nav-section" key={index}>
                        <div className="nav-section-title">{group.title}</div>
                        {group.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                title={collapsed ? item.label : ''}
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
