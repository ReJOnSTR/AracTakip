import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Users, ArrowRight, ClipboardList, Wallet } from 'lucide-react'

import { useTab } from '../context/TabContext'

export default function Welcome() {
    const navigate = useNavigate()
    const { openTab } = useTab()

    const cards = [
        {
            key: 'dashboard',
            title: 'Araç Yönetimi',
            desc: 'Araç listesi, bakımlar ve operasyon.',
            icon: Car,
            bg: 'var(--bg-primary)',
            accent: 'var(--accent-primary)',
            iconBg: 'var(--accent-subtle)'
        },
        {
            key: 'personel-dashboard', // or employees
            title: 'Personel Yönetimi',
            desc: 'Personel listesi, izinler ve ödemeler.',
            icon: Users,
            bg: 'var(--bg-tertiary)',
            accent: '#10b981', // Success
            iconBg: 'rgba(16, 185, 129, 0.1)'
        },
        {
            key: 'works',
            title: 'İş Takibi',
            desc: 'Projeler, görevler ve iş akışı.',
            icon: ClipboardList,
            bg: 'var(--bg-secondary)',
            accent: '#f59e0b', // Warning/Orange
            iconBg: 'rgba(245, 158, 11, 0.1)'
        },
        {
            key: 'finance',
            title: 'Kasa Takibi',
            desc: 'Gelir, gider ve finansal raporlar.',
            icon: Wallet,
            bg: 'var(--bg-elevated)', // Darker, consistent with theme
            accent: '#3b82f6', // Info/Blue
            iconBg: 'rgba(59, 130, 246, 0.1)'
        }
    ]

    return (
        <div className="welcome-page" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            height: 'calc(100vh - 38px)', // Subtract TitleBar height
            width: '100%',
            overflow: 'hidden',
            fontFamily: 'var(--font-primary)'
        }}>
            {cards.map((card, index) => (
                <div
                    key={card.key}
                    onClick={() => {
                        openTab(card.key)
                        navigate('/app')
                    }}
                    style={{
                        backgroundColor: card.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        borderRight: (index % 2 === 0) ? '1px solid var(--border-color)' : 'none',
                        borderBottom: (index < 2) ? '1px solid var(--border-color)' : 'none',
                        position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                        e.currentTarget.querySelector('.icon-wrapper').style.transform = 'scale(1.1)'
                        e.currentTarget.querySelector('.arrow-icon').style.opacity = '1'
                        e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(0)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = card.bg
                        e.currentTarget.querySelector('.icon-wrapper').style.transform = 'scale(1)'
                        e.currentTarget.querySelector('.arrow-icon').style.opacity = '0'
                        e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(-20px)'
                    }}
                >
                    <div className="icon-wrapper" style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: card.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px',
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        color: card.accent
                    }}>
                        <card.icon size={40} strokeWidth={1.5} />
                    </div>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                        letterSpacing: '-0.5px'
                    }}>
                        {card.title}
                    </h2>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '14px',
                        maxWidth: '250px',
                        textAlign: 'center',
                        lineHeight: '1.5'
                    }}>
                        {card.desc}
                    </p>

                    <div className="arrow-icon" style={{
                        position: 'absolute',
                        bottom: '40px',
                        opacity: 0,
                        transform: 'translateX(-20px)',
                        transition: 'all 0.3s ease',
                        color: card.accent,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        Giriş Yap <ArrowRight size={18} />
                    </div>
                </div>
            ))}
        </div>
    )
}

