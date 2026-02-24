import {
    LayoutDashboard,
    Car,
    Wrench,
    ClipboardCheck,
    Shield,
    Settings,
    FileText,
    ClipboardList,
    Layers,
    Truck,
    Wallet,
    FileSignature,
    Banknote,
    UtensilsCrossed,
    CircleDollarSign
} from 'lucide-react'

// Define menus per module
export const moduleMenus = {
    fleet: [
        {
            title: 'Genel',
            items: [
                { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
    ],
    finance: [
        {
            title: 'Finans',
            items: [
                { path: '/finance-dashboard', label: 'Finans Dashboard', icon: Wallet },
                { path: '/finance', label: 'Kasa & Banka Cüzdanı', icon: Banknote },
                { path: '/checks', label: 'Çek & Senetler', icon: FileSignature }
            ]
        },
        {
            title: 'Sistem',
            items: [
                { path: '/settings?module=finance', icon: Settings, label: 'Ayarlar' }
            ]
        }
    ],
    meals: [
        {
            title: 'Yemek Fişleri',
            items: [
                { path: '/meal-tickets', label: 'Yemek Fişleri', icon: UtensilsCrossed },
                { path: '/meal-ticket-report', label: 'Fiş Raporu', icon: ClipboardList },
                { path: '/meal-ticket-settings', label: 'Ücret Ayarları', icon: CircleDollarSign }
            ]
        },
        {
            title: 'Sistem',
            items: [
                { path: '/settings?module=meals', icon: Settings, label: 'Ayarlar' }
            ]
        }
    ]
}

// Keep the old menuGroups reference pointing to fleet for backwards compatibility
export const menuGroups = moduleMenus.fleet

// Flat list of all items used for reverse lookup
const getAllItems = () => {
    const all = []
    Object.values(moduleMenus).forEach(groups => {
        groups.forEach(group => {
            group.items.forEach(item => {
                if (!all.find(i => i.path === item.path)) {
                    all.push(item)
                }
            })
        })
    })
    return all
}

// Helper to find label by path
export const getRouteInfo = (path) => {
    const allItems = getAllItems()
    const item = allItems.find(i => i.path === path)
    if (item) return item

    // Fallback for detail pages
    if (path.startsWith('/vehicles/')) return { label: 'Araç Detay', icon: Car }
    if (path === '/portal' || path === '/') return { label: 'Ana Portal', icon: Layers }

    return { label: 'Sayfa', icon: FileText }
}

export const getActiveModule = (pathname, search = '') => {
    if (search.includes('module=finance') || pathname.startsWith('/finance') || pathname.startsWith('/checks')) return 'finance'
    if (pathname.startsWith('/meal-ticket') || search.includes('module=meals')) return 'meals'
    if (pathname === '/portal' || pathname === '/') return 'portal'
    return 'fleet'
}
