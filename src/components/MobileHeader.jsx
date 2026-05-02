import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell } from 'lucide-react'

const pageTitles = {
    '/': 'Filo Özeti',
    '/portal': 'Ana Portal',
    '/dashboard': 'Filo Paneli',
    '/personel-dashboard': 'Personel Paneli',
    '/finance-dashboard': 'Finans Paneli',
    '/companies': 'Şirketler',
    '/vehicles': 'Araçlar',
    '/maintenance': 'Bakım Takibi',
    '/inspections': 'Muayene Takibi',
    '/insurance': 'Sigorta Yönetimi',
    '/assignments': 'Zimmet Takibi',
    '/services': 'Servis İşlemleri',
    '/reports': 'Raporlar',
    '/employees': 'Personel Listesi',
    '/payroll': 'Maaş & Ödemeler',
    '/works': 'İş Takibi',
    '/customers': 'Cari & Müşteriler',
    '/profile': 'Profil Ayarları',
    '/settings': 'Genel Ayarlar'
}

export default function MobileHeader() {
    const location = useLocation()
    const navigate = useNavigate()

    const getTitle = () => {
        if (location.pathname === '/') return 'Dashboard'
        if (location.pathname.startsWith('/vehicles/')) return 'Araç Detayı'
        if (location.pathname.startsWith('/employees/')) return 'Personel Detayı'
        if (location.pathname.startsWith('/works/')) return 'İş Detayı'
        if (location.pathname.startsWith('/customers/')) return 'Müşteri Detayı'
        
        return pageTitles[location.pathname] || 'Kontrol'
    }

    const showBack = !['/portal', '/dashboard', '/personel-dashboard', '/finance-dashboard', '/works'].includes(location.pathname)

    return (
        <div className="mobile-header">
            <div className="mobile-header-left">
                {showBack ? (
                    <button className="mobile-back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={22} />
                    </button>
                ) : (
                    <div className="mobile-logo-circle">M</div>
                )}
            </div>
            <div className="mobile-header-center">
                <h1 className="mobile-header-title">{getTitle()}</h1>
            </div>
            <div className="mobile-header-right">
                <button className="mobile-icon-btn">
                    <Bell size={20} />
                </button>
            </div>
        </div>
    )
}
