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
    Building2,
    User
} from 'lucide-react'

// Define menus per module
export const moduleMenus = {
    fleet: [
        {
            title: 'Genel',
            items: [
                { path: '/dashboard', label: 'Filo Dashboard', icon: LayoutDashboard },
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
            title: '',
            items: [
                { path: '/module-settings/fleet', label: 'Filo Ayarları', icon: Settings }
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
            title: '',
            items: [
                { path: '/module-settings/finance', label: 'Finans Ayarları', icon: Settings }
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
            title: '',
            items: [
                { path: '/module-settings/meals', label: 'Yemek Fişi Ayarları', icon: Settings }
            ]
        }
    ],
    hr: [
        {
            title: 'Personel Yönetimi',
            items: [
                { path: '/personel-dashboard', label: 'Personel Dashboard', icon: LayoutDashboard },
                { path: '/employees', label: 'Personeller', icon: Users },
                { path: '/payroll', label: 'Maaş Tablosu', icon: Banknote }
            ]
        },
        {
            title: '',
            items: [
                { path: '/module-settings/hr', label: 'Personel Ayarları', icon: Settings }
            ]
        }
    ],
    works: [
        {
            title: 'İş & Operasyon',
            items: [
                { path: '/works', label: 'İş Takibi', icon: Briefcase }
            ]
        },
        {
            title: '',
            items: [
                { path: '/module-settings/works', label: 'İş Ayarları', icon: Settings }
            ]
        }
    ],
    customers: [
        {
            title: 'Cari & Müşteri',
            items: [
                { path: '/customers', label: 'Müşteriler', icon: Building2 }
            ]
        },
        {
            title: '',
            items: [
                { path: '/module-settings/customers', label: 'Müşteri Ayarları', icon: Settings }
            ]
        }
    ],
    portal: []
}

// Keep the old menuGroups reference pointing to fleet for backwards compatibility
export const menuGroups = moduleMenus.fleet

// Build a reverse lookup map: path → module key (data-driven, no hardcoded prefixes)
const buildPathToModuleMap = () => {
    const map = {}
    Object.entries(moduleMenus).forEach(([moduleKey, groups]) => {
        groups.forEach(group => {
            group.items.forEach(item => {
                map[item.path] = moduleKey
            })
        })
    })
    return map
}

const pathToModuleMap = buildPathToModuleMap()

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

    // Fallback for global settings
    if (path === '/settings') return { label: 'Ayarlar', icon: Settings }

    // Fallback for module settings
    if (path.startsWith('/module-settings/')) {
        const moduleKey = path.split('/module-settings/')[1]
        const labels = { fleet: 'Filo', finance: 'Finans', meals: 'Yemek', hr: 'Personel', works: 'İş', customers: 'Müşteri' }
        return { label: `${labels[moduleKey] || ''} Ayarları`, icon: Settings }
    }

    // Fallback for detail pages
    if (path.startsWith('/vehicles/')) return { label: 'Araç Detay', icon: Car }
    if (path === '/personel-dashboard') return { label: 'Personel Dashboard', icon: LayoutDashboard }
    if (path.startsWith('/employees/')) return { label: 'Personel Detay', icon: Users }
    if (path === '/payroll') return { label: 'Maaş & Ödeme Tablosu', icon: Banknote }
    if (path.startsWith('/works/')) return { label: 'İş Detayı', icon: Briefcase }
    if (path.startsWith('/customers/')) return { label: 'Müşteri Detay', icon: Building2 }
    if (path === '/portal' || path === '/') return { label: 'Ana Portal', icon: Layers }
    if (path === '/profile') return { label: 'Profil Ayarları', icon: User }

    return { label: 'Sayfa', icon: FileText }
}

export const getActiveModule = (pathname, search = '') => {
    // 1. Prioritize module parameter from search string
    if (search) {
        const params = new URLSearchParams(search)
        const moduleParam = params.get('module')
        if (moduleParam && moduleMenus[moduleParam]) return moduleParam
    }

    // 2. Exact match from data-driven path→module map
    if (pathToModuleMap[pathname]) return pathToModuleMap[pathname]

    // 3. Detail page prefix matching (for /vehicles/:id, /employees/:id, etc.)
    // These are child pages that belong to specific modules
    const detailPrefixMap = {
        '/vehicles/': 'fleet',
        '/employees/': 'hr',
        '/works/': 'works',
        '/customers/': 'customers',
        '/module-settings/fleet': 'fleet',
        '/module-settings/finance': 'finance',
        '/module-settings/meals': 'meals',
        '/module-settings/hr': 'hr',
        '/module-settings/works': 'works',
        '/module-settings/customers': 'customers'
    }

    for (const [prefix, moduleKey] of Object.entries(detailPrefixMap)) {
        if (pathname.startsWith(prefix)) return moduleKey
    }

    // 4. Portal
    if (pathname === '/portal' || pathname === '/') return 'portal'

    // 5. Global settings page — preserve the current module
    if (pathname === '/settings') {
        // Try to get from sessionStorage to avoid sidebar jump
        const stored = sessionStorage.getItem('lastActiveModule')
        if (stored && moduleMenus[stored]) return stored
        return 'fleet'
    }

    // 6. Ultimate fallback - try to match any path prefix from the map
    for (const [path, moduleKey] of Object.entries(pathToModuleMap)) {
        if (pathname.startsWith(path)) return moduleKey
    }

    // 7. If nothing matched, preserve last known module
    const lastModule = sessionStorage.getItem('lastActiveModule')
    if (lastModule && moduleMenus[lastModule]) return lastModule

    return 'fleet'
}
