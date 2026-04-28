import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, X, Search } from 'lucide-react'

export default function CustomMultiSelect({
    label,
    value = [], // Array of values
    onChange,
    options = [],
    placeholder = 'Seçiniz',
    className = '',
    required = false,
    error,
    icon: Icon
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [placement, setPlacement] = useState('bottom')
    const [dropdownStyle, setDropdownStyle] = useState({})
    const ref = useRef(null)
    const searchInputRef = useRef(null)

    const selectedOptions = options.filter(opt => value.includes(opt.value))

    const updatePosition = () => {
        if (!isOpen || !ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        
        let newPlacement = 'bottom'
        if (spaceBelow < 300 && spaceAbove > spaceBelow) {
            newPlacement = 'top'
        }
        setPlacement(newPlacement)

        setDropdownStyle({
            position: 'fixed',
            top: newPlacement === 'bottom' ? rect.bottom + 6 : 'auto',
            bottom: newPlacement === 'top' ? (window.innerHeight - rect.top) + 6 : 'auto',
            left: rect.left,
            width: rect.width,
            zIndex: 99999
        })
    }

    useEffect(() => {
        if (isOpen) {
            updatePosition()
            window.addEventListener('resize', updatePosition)
            window.addEventListener('scroll', updatePosition, true)
            setTimeout(() => searchInputRef.current?.focus(), 10)
            return () => {
                window.removeEventListener('resize', updatePosition)
                window.removeEventListener('scroll', updatePosition, true)
            }
        }
    }, [isOpen])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                const isDropdownClick = e.target.closest('.custom-select-dropdown')
                if (!isDropdownClick) {
                    setIsOpen(false)
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (optValue) => {
        const newValue = value.includes(optValue)
            ? value.filter(v => v !== optValue)
            : [...value, optValue]
        onChange(newValue)
    }

    const toggleAll = () => {
        if (value.length === options.length) {
            onChange([])
        } else {
            onChange(options.map(opt => opt.value))
        }
    }

    const filteredOptions = options.filter(opt => 
        opt.label.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
    )

    return (
        <div className={`custom-multi-select form-group ${className}`} ref={ref}>
            {label && (
                <label className="form-label">
                    {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
            )}

            <div className="input-wrapper" style={{ position: 'relative' }}>
                {Icon && <Icon className="input-icon" size={18} />}

                <div
                    className={`custom-select-trigger form-input ${isOpen ? 'open' : ''} ${error ? 'input-error' : ''} ${Icon ? 'has-icon' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ minHeight: '42px', height: 'auto', padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px', cursor: 'pointer' }}
                >
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map(opt => (
                            <span 
                                key={opt.value} 
                                style={{ 
                                    background: 'var(--accent-primary)', 
                                    color: '#fff', 
                                    padding: '2px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '12px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px' 
                                }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleSelect(opt.value)
                                }}
                            >
                                {opt.label}
                                <X size={12} />
                            </span>
                        ))
                    ) : (
                        <span className="placeholder" style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
                    )}
                    <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} style={{ marginLeft: 'auto', alignSelf: 'center' }} />
                </div>

                {isOpen && createPortal(
                    <div className={`custom-select-dropdown placement-${placement}`} style={dropdownStyle}>
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    className="form-input" 
                                    style={{ height: '32px', paddingLeft: '32px', fontSize: '13px' }}
                                    placeholder="Ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <div 
                                style={{ fontSize: '12px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, padding: '2px 4px' }}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    toggleAll()
                                }}
                            >
                                {value.length === options.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                            </div>
                        </div>
                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`custom-select-option ${value.includes(opt.value) ? 'selected' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSelect(opt.value)
                                        }}
                                    >
                                        <span>{opt.label}</span>
                                        {value.includes(opt.value) && <Check size={14} />}
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Sonuç bulunamadı</div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {error && (
                <span className="input-error-text">
                    {error}
                </span>
            )}
        </div>
    )
}
