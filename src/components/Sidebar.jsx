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
    FileText,
    ClipboardList
} from 'lucide-react'
import logo from '../assets/logos/logo-chatgpt.png'



export default function Sidebar({ collapsed, onToggle }) {
    // Static menu definition
    const menuGroups = [
        {
            title: 'Genel',
            items: [
                { path: '/', label: 'Dashboard', icon: LayoutDashboard },
                { path: '/reports', label: 'Raporlar', icon: FileText }
            ]
        },
        {
            title: 'Kurumsal',
            items: [
                { path: '/companies', icon: Building2, label: 'Şirketler' }
            ]
        },
        {
            title: 'Araç Yönetimi',
            items: [
                { path: '/vehicles', icon: Car, label: 'Araçlar' }
            ]
        },
        {
            title: 'Operasyon',
            items: [
                { path: '/maintenance', icon: Wrench, label: 'Bakım' },
                { path: '/inspections', icon: ClipboardCheck, label: 'Muayene' },
                { path: '/periodic-inspections', icon: ClipboardList, label: 'Periyodik Kontrol' },
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
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </div>
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
