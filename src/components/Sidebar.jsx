import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Building2,
    Car,
    Wrench,
    ClipboardCheck,
    Shield,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    Truck,
    Settings,
    FileText
} from 'lucide-react'
import logo from '../assets/logos/logo-chatgpt.png'

const menuGroups = [
    {
        title: 'Genel',
        items: [
            { path: '/', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/reports', label: 'Raporlar', icon: FileText }
        ]
    },
    {
        title: 'Filo Yönetimi',
        items: [
            { path: '/companies', icon: Building2, label: 'Şirketler' },
            { path: '/vehicles', icon: Car, label: 'Araçlar' },
            { path: '/assignments', icon: UserCheck, label: 'Zimmet' }
        ]
    },
    {
        title: 'Operasyon',
        items: [
            { path: '/maintenance', icon: Wrench, label: 'Bakım' },
            { path: '/inspections', icon: ClipboardCheck, label: 'Muayene' },
            { path: '/insurance', icon: Shield, label: 'Sigorta' },
            { path: '/services', icon: Truck, label: 'Servis' }
        ]
    },
    {
        title: 'Sistem',
        items: [
            { path: '/settings', icon: Settings, label: 'Ayarlar' }
        ]
    }
]

export default function Sidebar({ collapsed, onToggle }) {
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
