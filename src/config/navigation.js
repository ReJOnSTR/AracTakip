import {
    LayoutDashboard,
    Car,
    Wrench,
    ClipboardCheck,
    Shield,
    Truck,
    Settings,
    FileText,
    ClipboardList
} from 'lucide-react'

export const menuGroups = [
    {
        title: 'Genel',
        items: [
            { path: '/', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/reports', label: 'Raporlar', icon: FileText }
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

// Helper to find label by path
export const getRouteInfo = (path) => {
    for (const group of menuGroups) {
        const item = group.items.find(i => i.path === path)
        if (item) return item
    }
    // Fallback for detail pages
    if (path.startsWith('/vehicles/')) return { label: 'Araç Detay', icon: Car }

    return { label: 'Sayfa', icon: FileText }
}
