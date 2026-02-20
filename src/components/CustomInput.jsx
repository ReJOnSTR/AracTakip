import React, { useState } from 'react'

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
    ...props
}) {
    const [touched, setTouched] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const handleChange = (e) => {
        let val = e.target.value

        if (format === 'uppercase') {
            val = val.toUpperCase()
        } else if (format === 'title') {
            // Capitalize first letter of each word
            val = val.replace(/\b\w/g, c => c.toUpperCase())
        } else if (format === 'phone') {
            // Allow only numbers
            val = val.replace(/\D/g, '')
            // Limit to 10 digits (Turkish mobile usually without 0 prefix or 11 with 0)
            if (val.length > 10) val = val.slice(0, 10)

            // Format as (5XX) XXX XX XX
            if (val.length > 6) {
                val = `(${val.slice(0, 3)}) ${val.slice(3, 6)} ${val.slice(6, 8)} ${val.slice(8)}`
            } else if (val.length > 3) {
                val = `(${val.slice(0, 3)}) ${val.slice(3)}`
            } else if (val.length > 0) {
                val = `(${val}`
            }
        } else if (format === 'currency') {
            // Only allow digits and one dot/comma
            val = val.replace(/[^0-9.,]/g, '')
        }

        onChange(val)
    }

    const handleFocus = (e) => {
        setIsFocused(true)
        if (props.onFocus) props.onFocus(e)
    }

    const handleBlur = (e) => {
        setIsFocused(false)
        setTouched(true)
        if (props.onBlur) props.onBlur(e)
    }

    // Validation check
    const isInvalid = (touched && required && !value) || error

    // Determine if we should use floating label style
    const isFloating = true // Enforce floating label for consistency
    // Date/Time inputs always show a mask/placeholder natively, so label must float to avoid overlap
    const isDateType = ['date', 'time', 'datetime-local', 'month', 'week'].includes(type)

    // Hide '0' when not focused to allow label to be inside
    const shouldHideValue = !isFocused && (value === 0 || value === '0')
    const displayValue = shouldHideValue ? '' : value

    // Check if value exists (using displayValue logic)
    const hasValue = (displayValue !== undefined && displayValue !== null && displayValue !== '') || isDateType

    // Wrapper classes
    const wrapperClass = `form-group ${isFloating ? 'floating-label-group' : ''} ${hasValue ? 'has-value' : ''} ${className || ''}`

    return (
        <div className={wrapperClass}>
            {/* Input Element */}
            {type === 'textarea' || (props.multiline) ? (
                <textarea
                    className={`form-textarea ${isInvalid ? 'input-error' : ''}`}
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={isFloating ? '' : placeholder} // Hide placeholder if floating to avoid clash
                    rows={props.rows || 3}
                    style={isInvalid ? { borderColor: 'var(--danger)' } : {}}
                    {...props}
                />
            ) : (
                <input
                    type={type}
                    className={`form-input ${isInvalid ? 'input-error' : ''}`}
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={isFloating ? '' : placeholder}
                    style={isInvalid ? { borderColor: 'var(--danger)' } : {}}
                    {...props}
                />
            )}

            {/* Label (After input for CSS peer selector) */}
            {label && (
                <label className="form-label">
                    {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
            )}

            {/* Error Message */}
            {isInvalid && (
                <span className="input-error-text" style={{
                    color: 'var(--danger)',
                    fontSize: '11px',
                    marginTop: '4px',
                    display: 'block'
                }}>
                    {error || 'Bu alan zorunludur'}
                </span>
            )}
        </div>
    )
}
