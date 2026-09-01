import React, { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

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

    const handleMonthStep = (step) => {
        if (!value) return
        const [year, month] = value.split('-').map(Number)
        let newDate = new Date(year, month - 1 + step, 1)
        
        // Apply minDate restriction
        if (minDate) {
            const [minY, minM] = minDate.split('-').map(Number)
            const minDateTime = new Date(minY, minM - 1, 1)
            if (newDate < minDateTime) newDate = minDateTime
        }

        const newYear = newDate.getFullYear()
        const newMonth = (newDate.getMonth() + 1).toString().padStart(2, '0')
        onChange(`${newYear}-${newMonth}`)
    }

    const months = [
        '01', '02', '03', '04', '05', '06',
        '07', '08', '09', '10', '11', '12'
    ]

    const currentMonthIndex = value ? parseInt(value.split('-')[1]) - 1 : -1
    const currentYear = value ? parseInt(value.split('-')[0]) : -1

    const displayDate = value ? new Date(value + '-01').toLocaleDateString('tr-TR', { month: '2-digit', year: 'numeric' }) : 'Dönem Seç'

    return (
        <div className="month-pager-wrapper" ref={containerRef} style={{ position: 'relative' }}>
            <div 
                className="month-pager-controls" 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '10px',
                    padding: '3px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    height: '40px'
                }}
            >
                {/* Previous Month */}
                <button
                    className="pager-nav-btn"
                    onClick={() => handleMonthStep(-1)}
                    title="Önceki Ay"
                    style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <ChevronLeft size={20} />
                </button>

                {/* Central Trigger */}
                <button
                    className={`month-pager-trigger ${isOpen ? 'active' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        flex: 1,
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        border: 'none',
                        background: isOpen ? 'var(--bg-tertiary)' : 'transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '0 12px',
                        transition: 'all 0.2s ease',
                        minWidth: '130px'
                    }}
                    onMouseEnter={e => { if(!isOpen) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                    onMouseLeave={e => { if(!isOpen) e.currentTarget.style.background = 'transparent' }}
                >
                    <Calendar size={14} style={{ color: isOpen ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                    <span style={{ 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap'
                    }}>
                        {displayDate}
                    </span>
                </button>

                {/* Next Month */}
                <button
                    className="pager-nav-btn"
                    onClick={() => handleMonthStep(1)}
                    title="Sonraki Ay"
                    style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {isOpen && (
                <div 
                    className="month-picker-dropdown"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '240px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)',
                        zIndex: 1000,
                        padding: '16px',
                        animation: 'dropdownFadeIn 0.2s ease-out'
                    }}
                >
                    {/* Header: Year Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <button
                            onClick={() => handleYearChange(-1)}
                            disabled={minYear && viewYear <= minYear}
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                borderRadius: '6px', 
                                color: 'var(--text-secondary)', 
                                cursor: 'pointer', 
                                width: '28px', 
                                height: '28px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                transition: 'background 0.2s',
                                opacity: (minYear && viewYear <= minYear) ? 0.3 : 1
                            }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{viewYear}</span>
                        <button
                            onClick={() => handleYearChange(1)}
                            style={{ background: 'transparent', border: 'none', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                        >
                            <ChevronRight size={16} />
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
                                        height: '36px',
                                        fontSize: '12px',
                                        fontWeight: isSelected ? 700 : 500,
                                        borderRadius: '8px',
                                        background: isSelected ? 'var(--accent-primary)' : 'transparent',
                                        color: isSelected ? 'white' : (isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)'),
                                        border: isCurrentMonth && !isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                                        cursor: isDisabled ? 'default' : 'pointer',
                                        transition: 'all 0.1s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: isDisabled ? 0.4 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected && !isDisabled) {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                                            e.currentTarget.style.color = 'var(--accent-primary)'
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

            <style>{`
                @keyframes dropdownFadeIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                .month-pager-controls button:focus {
                    outline: none;
                }
            `}</style>
        </div>
    )
}

export default MonthFilter
