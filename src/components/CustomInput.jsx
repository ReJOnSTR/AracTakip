import React, { useState } from 'react'
import { X } from 'lucide-react'

export default function CustomInput({
    label,
    value,
    onChange,
    required,
    format,
    placeholder,
    type = 'text',
    className,
    error,
    icon: Icon,
    floatingLabel = false,
    onClear
}) {
    const [touched, setTouched] = useState(false)
    const [focused, setFocused] = useState(false)

    const handleChange = (e) => {
        let val = e.target.value

        if (format === 'uppercase') {
            val = val.toUpperCase()
        } else if (format === 'title') {
            val = val.replace(/\b\w/g, c => c.toUpperCase())
        } else if (format === 'phone') {
            val = val.replace(/\D/g, '')
            if (val.length > 10) val = val.slice(0, 10)
            if (val.length > 6) val = `(${val.slice(0, 3)}) ${val.slice(3, 6)} ${val.slice(6, 8)} ${val.slice(8)}`
            else if (val.length > 3) val = `(${val.slice(0, 3)}) ${val.slice(3)}`
            else if (val.length > 0) val = `(${val}`
        } else if (format === 'currency') {
            val = val.replace(/[^0-9.,]/g, '')
        } else if (format === 'plate') {
            // TR Plate: 34 AB 1234
            val = val.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
            if (!val.includes(' ') && val.length > 2) {
                if (!isNaN(val.slice(0, 2))) {
                    val = `${val.slice(0, 2)} ${val.slice(2)}`
                }
            }
            // Simple space logic for second part
            const parts = val.split(' ')
            if (parts.length === 2 && parts[1].length > 3 && isNaN(parts[1].slice(0, 1)) && !isNaN(parts[1].slice(-1))) {
                // Heuristic: if middle part gets too long and ends with number, split (not perfect but helpful)
                // Better approach: Let user type freely or strict regex. Keeping it simple flexible.
            }
        }

        onChange(val)
    }

    const handleBlur = () => {
        setTouched(true)
        setFocused(false)
    }

    // Validation check
    const isInvalid = (touched && required && !value) || error

    // Floating label logic
    const isFloating = floatingLabel
    const hasValue = value && value.toString().length > 0
    const wrapperClass = isFloating ? `form-group floating-label-group ${hasValue ? 'has-value' : ''}` : 'form-group'

    return (
        <div className={`${wrapperClass} ${className || ''}`}>
            {!isFloating && label && (
                <label className="form-label">
                    {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
            )}

            <div className="input-wrapper">
                {Icon && <Icon className="input-icon" size={18} />}

                <input
                    type={type}
                    className={`form-input ${isInvalid ? 'input-error' : ''} ${Icon ? 'has-icon' : ''}`}
                    value={value || ''}
                    onChange={handleChange}
                    onFocus={() => setFocused(true)}
                    onBlur={handleBlur}
                    placeholder={isFloating ? '' : placeholder}
                    style={isInvalid ? { borderColor: 'var(--danger)' } : {}}
                />

                {isFloating && label && (
                    <label className="form-label">
                        {label} {required && <span>*</span>}
                    </label>
                )}

                {onClear && value && (
                    <button type="button" className="input-clear-btn" onClick={onClear}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {isInvalid && (
                <span className="input-error-text">
                    {error || 'Bu alan zorunludur'}
                </span>
            )}
        </div>
    )
}
