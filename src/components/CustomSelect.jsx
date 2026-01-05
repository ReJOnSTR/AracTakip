import { useState, useRef, useEffect } from 'react'
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
    icon: Icon
}) {
    const [isOpen, setIsOpen] = useState(false)
    const ref = useRef(null)

    const selectedOption = options.find(opt => opt.value === value)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (optValue) => {
        onChange(optValue)
        setIsOpen(false)
    }

    // Floating label logic
    const isFloating = floatingLabel
    const hasValue = (selectedOption || isOpen) // Float if selected or open
    const wrapperClass = isFloating ? `custom-select form-group floating-label-group ${hasValue ? 'has-value' : ''}` : `custom-select form-group`

    return (
        <div className={`${wrapperClass} ${className}`} ref={ref}>
            {!isFloating && label && (
                <label className="form-label">
                    {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
            )}

            <div className="input-wrapper" style={{ position: 'relative' }}>
                {Icon && <Icon className="input-icon" size={18} />}

                <button
                    type="button"
                    className={`custom-select-trigger form-input ${isOpen ? 'open' : ''} ${error ? 'input-error' : ''} ${Icon ? 'has-icon' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className={selectedOption ? 'value-text' : 'placeholder'} style={{ opacity: isFloating && !selectedOption && !isOpen ? 0 : 1 }}>
                        {selectedOption ? selectedOption.label : (isFloating ? '' : placeholder)}
                    </span>
                    <ChevronDown size={16} className={`chevron ${isOpen ? 'rotate' : ''}`} />
                </button>

                {isFloating && label && (
                    <label className="form-label">
                        {label} {required && <span>*</span>}
                    </label>
                )}

                {isOpen && (
                    <div className="custom-select-dropdown">
                        {!required && placeholder && (
                            <div
                                className={`custom-select-option ${!value ? 'selected' : ''}`}
                                onClick={() => handleSelect('')}
                            >
                                <span style={{ opacity: 0.7 }}>{placeholder}</span>
                            </div>
                        )}
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <Check size={14} />}
                            </div>
                        ))}
                    </div>
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
