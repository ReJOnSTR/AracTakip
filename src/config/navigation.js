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
    CircleDollarSign,
    Users,
    UserCheck,
    Briefcase,
    Building2
} from 'lucide-react'

// Define menus per module
export const moduleMenus = {
    fleet: [
        {
            title: 'Genel',
            items: [
                { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { path: '/profile', label: 'Profil Bilgileri', icon: User },
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
        }
    ],
    hr: [
        {
            title: 'Personel Yönetimi',
            items: [
                { path: '/employees', label: 'Personeller', icon: Users }
            ]
        }
    ],
    works: [
        {
            title: 'İş & Operasyon',
            items: [
                { path: '/works', label: 'İş Takibi', icon: Briefcase }
            ]
        }
    ],
    customers: [
        {
            title: 'Cari & Müşteri',
            items: [
                { path: '/customers', label: 'Müşteriler', icon: Building2 }
            ]
        }
    ],
    portal: []
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

    // Fallback for settings
    if (path.startsWith('/settings')) return { label: 'Ayarlar', icon: Settings }

    // Fallback for detail pages
    if (path.startsWith('/vehicles/')) return { label: 'Araç Detay', icon: Car }
    if (path.startsWith('/employees/')) return { label: 'Personel Detay', icon: Users }
    if (path.startsWith('/works/')) return { label: 'İş Detayı', icon: Briefcase }
    if (path.startsWith('/customers/')) return { label: 'Müşteri Detay', icon: Building2 }
    if (path === '/portal' || path === '/') return { label: 'Ana Portal', icon: Layers }

    return { label: 'Sayfa', icon: FileText }
}

export const getActiveModule = (pathname, search = '') => {
    // 1. Prioritize module parameter from search string
    if (search) {
        const params = new URLSearchParams(search)
        const moduleParam = params.get('module')
        if (moduleParam && moduleMenus[moduleParam]) return moduleParam
    }

    // 2. Fallback to pathname-based detection
    if (pathname.startsWith('/finance') || pathname.startsWith('/checks')) return 'finance'
    if (pathname.startsWith('/meal-ticket')) return 'meals'
    if (pathname.startsWith('/employee')) return 'hr'
    if (pathname.startsWith('/works')) return 'works'
    if (pathname.startsWith('/customers')) return 'customers'
    if (pathname === '/portal' || pathname === '/') return 'portal'
    
    return 'fleet'
}
