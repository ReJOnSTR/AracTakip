import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'

export default function DateRangePicker({
    startDate,
    endDate,
    onChange, // returns { startDate, endDate }
    label = 'Tarih Aralığı',
    required = false,
    className
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [tempStart, setTempStart] = useState(startDate || '')
    const [tempEnd, setTempEnd] = useState(endDate || '')
    const containerRef = useRef(null)

    useEffect(() => {
        setTempStart(startDate || '')
        setTempEnd(endDate || '')
    }, [startDate, endDate])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleApply = () => {
        onChange({ startDate: tempStart, endDate: tempEnd })
        setIsOpen(false)
    }

    const handleClear = (e) => {
        e.stopPropagation()
        setTempStart('')
        setTempEnd('')
        onChange({ startDate: '', endDate: '' })
    }

    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const getDisplayText = () => {
        if (startDate && endDate) return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
        if (startDate) return `${formatDateDisplay(startDate)} - ...`
        if (endDate) return `... - ${formatDateDisplay(endDate)}`
        return 'Tarih Seçiniz'
    }

    return (
        <div className={`form-group ${className || ''}`} ref={containerRef}>
            {label && (
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: 'var(--accent-color)' }} />
                    {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
            )}

            <div style={{ position: 'relative' }}>
                <button
                    type="button"
                    className={`form-input ${isOpen ? 'active' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'var(--bg-secondary)',
                        color: (startDate || endDate) ? 'var(--text-primary)' : 'var(--text-secondary)',
                        position: 'relative',
                        zIndex: 10
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getDisplayText()}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(startDate || endDate) && (
                            <div
                                onClick={handleClear}
                                style={{
                                    padding: '4px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)'
                                }}
                                className="hover-bg-tertiary"
                            >
                                <X size={14} />
                            </div>
                        )}
                        <ChevronDown size={16} style={{
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease',
                            color: 'var(--text-secondary)'
                        }} />
                    </div>
                </button>

                {isOpen && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        zIndex: 9999,
                        boxShadow: 'var(--shadow-lg)',
                        animation: 'slideDown 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px' }}>Başlangıç</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={tempStart}
                                    onChange={(e) => setTempStart(e.target.value)}
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        colorScheme: 'dark'
                                    }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px' }}>Bitiş</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={tempEnd}
                                    onChange={(e) => setTempEnd(e.target.value)}
                                    min={tempStart}
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        color: 'var(--text-primary)',
                                        colorScheme: 'dark'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => setIsOpen(false)}
                                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={handleApply}
                                >
                                    Uygula
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
