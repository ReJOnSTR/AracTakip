import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Users, ArrowRight } from 'lucide-react'

import { useTab } from '../context/TabContext'

export default function Welcome() {
    const navigate = useNavigate()
    const { openTab } = useTab()

    return (
        <div className="welcome-page" style={{
            display: 'flex',
            height: 'calc(100vh - 38px)', // Subtract TitleBar height
            width: '100%',
            overflow: 'hidden',
            fontFamily: 'var(--font-primary)'
        }}>
            {/* Left Side - Vehicles */}
            <div
                className="welcome-split left"
                onClick={() => {
                    openTab('dashboard') // Or vehicles? User said "Araç Yönetimi" -> Vehicles. 
                    // But Sidebar defaults 'vehicles' module to 'dashboard'. 
                    // Let's open 'vehicles' list directly? Or dashboard? 
                    // The icon is "Araç Yönetimi". Usually implies the dashboard or the list.
                    // Sidebar says: if module='vehicles' -> navigate('/'). But I'm changing that.
                    // Let's open 'dashboard' (Araç Paneli).
                    openTab('dashboard')
                    navigate('/app')
                }}
                style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    borderRight: '1px solid var(--border-color)',
                    position: 'relative',
                    group: 'vehicles'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                    e.currentTarget.querySelector('.icon-wrapper').style.transform = 'scale(1.1)'
                    e.currentTarget.querySelector('.arrow-icon').style.opacity = '1'
                    e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(0)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                    e.currentTarget.querySelector('.icon-wrapper').style.transform = 'scale(1)'
                    e.currentTarget.querySelector('.arrow-icon').style.opacity = '0'
                    e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(-20px)'
                }}
            >
                <div className="icon-wrapper" style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '32px',
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    color: 'var(--accent-primary)'
                }}>
                    <Car size={64} strokeWidth={1.5} />
                </div>
                <h2 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                    letterSpacing: '-0.5px'
                }}>
                    Araç Yönetimi
                </h2>
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '16px',
                    maxWidth: '300px',
                    textAlign: 'center',
                    lineHeight: '1.5'
                }}>
                    Araç listesi, bakımlar, muayeneler ve diğer araç işlemleri.
                </p>

                <div className="arrow-icon" style={{
                    position: 'absolute',
                    bottom: '60px',
                    opacity: 0,
                    transform: 'translateX(-20px)',
                    transition: 'all 0.3s ease',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                }}>
                    Giriş Yap <ArrowRight size={20} />
                </div>
            </div>

            {/* Right Side - Employees */}
            <div
                className="welcome-split right"
                onClick={() => {
                    openTab('personel-dashboard')
                    navigate('/app')
                }}
                style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-tertiary)', // Slightly different bg
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)' // darkened
                    e.currentTarget.querySelector('.icon-wrapper').style.transform = 'scale(1.1)'
                    e.currentTarget.querySelector('.arrow-icon').style.opacity = '1'
                    e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(0)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                    e.currentTarget.querySelector('.icon-wrapper').style.transform = 'scale(1)'
                    e.currentTarget.querySelector('.arrow-icon').style.opacity = '0'
                    e.currentTarget.querySelector('.arrow-icon').style.transform = 'translateX(-20px)'
                }}
            >
                <div className="icon-wrapper" style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', // Success/Green subtle
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '32px',
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    color: '#10b981'
                }}>
                    <Users size={64} strokeWidth={1.5} />
                </div>
                <h2 style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                    letterSpacing: '-0.5px'
                }}>
                    Personel Yönetimi
                </h2>
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '16px',
                    maxWidth: '300px',
                    textAlign: 'center',
                    lineHeight: '1.5'
                }}>
                    Personel listesi, ödemeler, izinler ve diğer personel işlemleri.
                </p>

                <div className="arrow-icon" style={{
                    position: 'absolute',
                    bottom: '60px',
                    opacity: 0,
                    transform: 'translateX(-20px)',
                    transition: 'all 0.3s ease',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600
                }}>
                    Giriş Yap <ArrowRight size={20} />
                </div>
            </div>
        </div>
    )
}
