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

    floatingLabel = true,
    onClear,
    multiline = false,
    rows,
    style
}) {
    const [touched, setTouched] = useState(false)
    const [focused, setFocused] = useState(false)

    const handleChange = (e) => {
        let val = e.target.value
        const isDeleting = e.nativeEvent.inputType === 'deleteContentBackward' || e.nativeEvent.inputType === 'deleteContentForward'

        if (format === 'uppercase' || (!format && (type === 'text' || multiline))) {
            val = val.toLocaleUpperCase('tr-TR')
        } else if (format === 'title') {
            // Title Case: Capitalize first letter of every word
            val = val.replace(/(?:^|\s|["'([{])+\S/g, match => match.toLocaleUpperCase('tr-TR'))
        } else if (format === 'sentence') {
            // Sentence Case: Capitalize only the very first letter
            if (val.length > 0) {
                val = val.charAt(0).toLocaleUpperCase('tr-TR') + val.slice(1)
            }
        } else if (format === 'phone') {
            // If deleting, just allow the value to be updated without forcing format immediately
            // This prevents "getting stuck" when deleting parenthesis/spaces
            if (!isDeleting) {
                const clean = val.replace(/\D/g, '')
                if (clean.length > 0) {
                    if (clean.length <= 3) val = `(${clean}`
                    else if (clean.length <= 6) val = `(${clean.slice(0, 3)}) ${clean.slice(3)}`
                    else val = `(${clean.slice(0, 3)}) ${clean.slice(3, 6)} ${clean.slice(6, 10)}`
                } else {
                    val = ''
                }
            }
            // Limit length even when deleting to avoid overflow artifacts
            if (val.length > 15) val = val.slice(0, 15)

        } else if (format === 'currency') {
            val = val.replace(/[^0-9.,]/g, '')
            // Remove leading zeros if followed by another digit (e.g. 05 -> 5, but 0.5 stays)
            val = val.replace(/^0+(?=\d)/, '')
        } else if (format === 'plate') {
            // Flexible Plate: Only allow Alphanumeric + Uppercase + Symbols + Turkish Chars
            // User can format as they wish (e.g. 06 XXX 1234, IS MAKINA 01, 34-AB-123)
            val = val.toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9\s\-\.\/ÇĞİÖŞÜ]/g, '')
            // Prevent double spaces
            val = val.replace(/\s+/g, ' ')
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
    // Date/Time inputs have native placeholders (dd.mm.yyyy), so label MUST float to avoid overlap.
    // Numbers might show spinners, helpful to keep label up.
    const forceFloat = type === 'date' || type === 'datetime-local' || type === 'time' || type === 'month' || type === 'week'
    const hasValue = (value && value.toString().length > 0) || forceFloat
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

                {multiline ? (
                    <textarea
                        className={`form-input form-textarea ${isInvalid ? 'input-error' : ''} ${Icon ? 'has-icon' : ''}`}
                        value={value || ''}
                        onChange={handleChange}
                        onFocus={() => setFocused(true)}
                        onBlur={handleBlur}
                        placeholder={isFloating ? '' : placeholder}
                        style={{ ...style, ...(isInvalid ? { borderColor: 'var(--danger)' } : {}) }}
                        rows={rows || 3}
                    />
                ) : (
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
                )}

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
