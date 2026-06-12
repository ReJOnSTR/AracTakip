import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export default function CustomSelect({
    label,
    value,
    onChange,
    options = [],
    placeholder = 'Seçiniz',
    className = '',
    required = false,
    error,
    floatingLabel = true,
    icon: Icon,
    disabled = false,
    style,
    creatable = false
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [placement, setPlacement] = useState('bottom')
    const [dropdownStyle, setDropdownStyle] = useState({})
    const ref = useRef(null)
    const searchInputRef = useRef(null)

    const selectedOption = options.find(opt => opt.value === value)

    const showSearch = options.length > 5 || creatable
    const filteredOptions = options.filter(opt => 
        opt.label && opt.label.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
    const hasExactMatch = options.some(opt => 
        opt.label && opt.label.toString().toLowerCase() === searchTerm.toLowerCase()
    )

    const updatePosition = () => {
        if (!isOpen || !ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        
        let newPlacement = 'bottom'
        if (spaceBelow < 250 && spaceAbove > spaceBelow) {
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
            
            const timer = setTimeout(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus()
                }
            }, 50)

            return () => {
                window.removeEventListener('resize', updatePosition)
                window.removeEventListener('scroll', updatePosition, true)
                clearTimeout(timer)
            }
        } else {
            setSearchTerm('')
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
        onChange(optValue)
        setIsOpen(false)
        setSearchTerm('')
    }

    const toggleOpen = () => {
        setIsOpen(!isOpen)
    }

    // Floating label logic
    const isFloating = floatingLabel
    const displayLabel = selectedOption ? selectedOption.label : (value || (isFloating ? '' : placeholder))
    const hasValue = !!(selectedOption || value)
    const wrapperClass = isFloating ? `custom-select form-group floating-label-group ${hasValue ? 'has-value' : ''}` : `custom-select form-group`

    return (
        <div className={`${wrapperClass} ${className}`} ref={ref} style={style}>
            {!isFloating && label && (
                <label className="form-label">
                    {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
            )}

            <div className="input-wrapper" style={{ position: 'relative' }}>
                {Icon && <Icon className="input-icon" size={18} />}

                <button
                    type="button"
                    className={`custom-select-trigger form-input ${isOpen ? 'open' : ''} ${error ? 'input-error' : ''} ${Icon ? 'has-icon' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={!disabled ? toggleOpen : undefined}
                    disabled={disabled}
                    style={disabled ? { opacity: 0.6, cursor: 'not-allowed', background: 'var(--bg-tertiary)' } : {}}
                >
                    <span className={hasValue ? 'value-text' : 'placeholder'} style={{ opacity: isFloating && !hasValue && !isOpen ? 0 : 1 }}>
                        {displayLabel}
                    </span>
                    <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} />
                </button>

                {isFloating && label && (
                    <label className="form-label">
                        {label} {required && <span>*</span>}
                    </label>
                )}

                {isOpen && createPortal(
                    <div className={`custom-select-dropdown placement-${placement}`} style={{ ...dropdownStyle, maxHeight: '250px', overflowY: 'auto' }}>
                        {showSearch && (
                            <div className="custom-select-search-wrapper" style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        )}
                        {!required && placeholder && !searchTerm && (
                            <div
                                className={`custom-select-option ${!value ? 'selected' : ''}`}
                                onClick={() => handleSelect('')}
                            >
                                <span style={{ opacity: 0.7 }}>{placeholder}</span>
                            </div>
                        )}
                        {filteredOptions.length === 0 && !creatable && (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Sonuç bulunamadı
                            </div>
                        )}
                        {filteredOptions.map((opt) => (
                            <div
                                key={opt.value}
                                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check size={14} />}
                            </div>
                        ))}
                        {creatable && searchTerm && !hasExactMatch && (
                            <div
                                className="custom-select-option creatable-option"
                                onClick={() => handleSelect(searchTerm)}
                                style={{ borderTop: '1px dashed var(--border-color)', color: 'var(--accent-primary)', fontWeight: 500 }}
                            >
                                <span>+ Ekle: "{searchTerm}"</span>
                            </div>
                        )}
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
