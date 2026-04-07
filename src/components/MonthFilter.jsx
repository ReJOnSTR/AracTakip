import React, { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

const MonthFilter = ({ value, onChange, minDate }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [viewYear, setViewYear] = useState(new Date().getFullYear())
    const containerRef = useRef(null)

    const minYear = minDate ? parseInt(minDate.split('-')[0]) : null
    const minMonth = minDate ? parseInt(minDate.split('-')[1]) : null

    // Parse current value to sync viewYear when opening
    useEffect(() => {
        if (value) {
            setViewYear(parseInt(value.split('-')[0]))
        }
    }, [value, isOpen])

    // Click Outside Handling
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleYearChange = (delta) => {
        const nextYear = viewYear + delta
        if (minYear && nextYear < minYear) return
        setViewYear(nextYear)
    }

    const handleMonthSelect = (monthIndex) => {
        // monthIndex is 0-11
        const monthNum = monthIndex + 1
        if (minYear && viewYear === minYear && monthNum < minMonth) return

        const monthStr = monthNum.toString().padStart(2, '0')
        onChange(`${viewYear}-${monthStr}`)
        setIsOpen(false)
    }

    const months = [
        'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
        'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
    ]

    const currentMonthIndex = value ? parseInt(value.split('-')[1]) - 1 : -1
    const currentYear = value ? parseInt(value.split('-')[0]) : -1

    return (
        <div className="custom-date-picker" ref={containerRef}>
            <button
                className={`date-picker-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    height: '36px',
                    padding: '0 12px',
                    minWidth: '180px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: isOpen ? 'var(--accent-primary)' : 'var(--border-color)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: 'var(--text-primary)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                        {new Date(value).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '240px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    padding: '16px',
                }}>
                    {/* Header: Year Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <button
                            onClick={() => handleYearChange(-1)}
                            disabled={minYear && viewYear <= minYear}
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                borderRadius: '6px', 
                                color: (minYear && viewYear <= minYear) ? 'var(--text-muted)' : 'var(--text-secondary)', 
                                cursor: (minYear && viewYear <= minYear) ? 'default' : 'pointer', 
                                width: '28px', 
                                height: '28px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                transition: 'background 0.2s',
                                opacity: (minYear && viewYear <= minYear) ? 0.4 : 1
                            }}
                            onMouseEnter={(e) => { if (!(minYear && viewYear <= minYear)) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)' }}
                            onMouseLeave={(e) => { if (!(minYear && viewYear <= minYear)) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{viewYear}</span>
                        <button
                            onClick={() => handleYearChange(1)}
                            style={{ background: 'transparent', border: 'none', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                    </div>

                    {/* Body: Month Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {months.map((m, idx) => {
                            const isSelected = viewYear === currentYear && idx === currentMonthIndex
                            const isCurrentMonth = viewYear === new Date().getFullYear() && idx === new Date().getMonth()
                            const isDisabled = minYear && (viewYear < minYear || (viewYear === minYear && (idx + 1) < minMonth))

                            return (
                                <button
                                    key={m}
                                    onClick={() => !isDisabled && handleMonthSelect(idx)}
                                    disabled={isDisabled}
                                    style={{
                                        height: '32px',
                                        fontSize: '12px',
                                        fontWeight: isSelected ? 600 : 500,
                                        borderRadius: '8px',
                                        background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                        color: isSelected ? 'white' : (isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)'),
                                        border: isCurrentMonth && !isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                                        cursor: isDisabled ? 'default' : 'pointer',
                                        transition: 'all 0.1s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: isDisabled ? 0.3 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected && !isDisabled) {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                                            e.currentTarget.style.color = 'var(--text-primary)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected && !isDisabled) {
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                            e.currentTarget.style.color = 'var(--text-secondary)'
                                        }
                                    }}
                                >
                                    {m}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default MonthFilter
