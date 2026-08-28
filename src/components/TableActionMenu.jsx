import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

/**
 * Recursively extracts valid React elements/buttons out of Fragments & Arrays
 */
function extractButtons(nodes) {
    const buttons = []
    function traverse(items) {
        React.Children.forEach(items, (child) => {
            if (!child) return
            if (child.type === React.Fragment) {
                traverse(child.props?.children)
            } else if (React.isValidElement(child)) {
                buttons.push(child)
            }
        })
    }
    traverse(nodes)
    return buttons
}

/**
 * Universal Responsive Table Action Menu
 * - Gracefully collapses into a 3-dots (...) floating dropdown popover
 * - Accurately unrolls fragments and button actions with icons and labels
 */
export default function TableActionMenu({
    items = null,
    children = null,
    align = 'right',
    forceDropdown = true
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, placement: 'bottom' })
    const triggerRef = useRef(null)
    const menuRef = useRef(null)

    // Calculate menu position relative to trigger button
    const calculatePosition = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const menuWidth = 185
        const menuHeight = 240
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let left = align === 'right' ? rect.right - menuWidth : rect.left
        if (left < 10) left = 10
        if (left + menuWidth > viewportWidth - 10) left = viewportWidth - menuWidth - 10

        let top = rect.bottom + 5
        let placement = 'bottom'

        // If overflowing bottom, flip upwards
        if (top + menuHeight > viewportHeight - 10 && rect.top > menuHeight) {
            top = rect.top - 5
            placement = 'top'
        }

        setMenuPosition({ top, left, placement })
    }

    const toggleMenu = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isOpen) {
            calculatePosition()
            setIsOpen(true)
        } else {
            setIsOpen(false)
        }
    }

    // Close on click outside, resize, scroll or Escape key
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                setIsOpen(false)
            }
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false)
        }

        const handleScroll = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }

        window.addEventListener('mousedown', handleClickOutside, true)
        window.addEventListener('touchstart', handleClickOutside, true)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('scroll', handleScroll, true)
        window.addEventListener('resize', () => setIsOpen(false))

        return () => {
            window.removeEventListener('mousedown', handleClickOutside, true)
            window.removeEventListener('touchstart', handleClickOutside, true)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', () => setIsOpen(false))
        }
    }, [isOpen])

    // Parse items from either explicit `items` array or React `children`
    const parsedItems = useMemo(() => {
        if (items && items.length > 0) return items

        const rawButtons = extractButtons(children)
        return rawButtons.map((btn, index) => {
            const { title, onClick, className, style, disabled, children: btnChildren } = btn.props || {}
            
            let icon = null
            let textLabel = title || ''

            if (React.isValidElement(btnChildren)) {
                icon = btnChildren
            } else if (Array.isArray(btnChildren)) {
                btnChildren.forEach((c) => {
                    if (typeof c === 'string') textLabel = textLabel || c
                    else if (React.isValidElement(c)) {
                        if (c.type === 'span' && typeof c.props?.children === 'string') {
                            textLabel = textLabel || c.props.children
                        } else {
                            icon = icon || c
                        }
                    }
                })
            } else if (typeof btnChildren === 'string') {
                textLabel = textLabel || btnChildren
            }

            if (!textLabel) {
                textLabel = 'İşlem'
            }

            const isDanger = className?.includes('danger') || (style && (style.color === '#ef4444' || style.color === 'red'))
            const isSuccess = className?.includes('success') || (style && (style.color === '#10b981' || style.color === 'green'))

            return {
                key: btn.key || index,
                label: textLabel,
                title: title || textLabel,
                icon: icon || btnChildren,
                onClick: (e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                    if (onClick) onClick(e)
                },
                danger: isDanger,
                success: isSuccess,
                disabled: !!disabled,
                style
            }
        })
    }, [children, items])

    return (
        <div 
            className="table-action-menu-wrapper" 
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
        >
            <button
                ref={triggerRef}
                type="button"
                className={`table-3dots-btn ${isOpen ? 'active' : ''}`}
                onClick={toggleMenu}
                title="İşlemler Menüsü"
                style={{
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    background: isOpen ? 'var(--bg-tertiary, rgba(255, 255, 255, 0.12))' : 'rgba(255, 255, 255, 0.04)',
                    border: isOpen ? '1px solid var(--accent-primary, #3b82f6)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isOpen ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #a1a1aa)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isOpen ? '0 0 8px rgba(59, 130, 246, 0.3)' : 'none'
                }}
            >
                <MoreVertical size={16} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="table-action-popover"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        top: menuPosition.placement === 'top' ? 'auto' : `${menuPosition.top}px`,
                        bottom: menuPosition.placement === 'top' ? `${window.innerHeight - menuPosition.top}px` : 'auto',
                        left: `${menuPosition.left}px`,
                        minWidth: '175px',
                        maxWidth: '230px',
                        background: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: '8px',
                        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.4)',
                        padding: '5px',
                        zIndex: 999999,
                        backdropFilter: 'blur(16px)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                    }}
                >
                    {parsedItems.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted, #71717a)' }}>
                            İşlem yok
                        </div>
                    ) : (
                        parsedItems.map((item, idx) => {
                            if (item.hidden) return null
                            const Icon = item.icon

                            return (
                                <button
                                    key={item.key || idx}
                                    type="button"
                                    disabled={item.disabled}
                                    onClick={item.onClick}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '9px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12.5px',
                                        fontWeight: 500,
                                        textAlign: 'left',
                                        background: 'transparent',
                                        border: 'none',
                                        color: item.danger ? '#ef4444' : item.success ? '#10b981' : '#f4f4f5',
                                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                                        opacity: item.disabled ? 0.5 : 1,
                                        transition: 'all 0.12s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!item.disabled) {
                                            e.currentTarget.style.background = item.danger
                                                ? 'rgba(239, 68, 68, 0.16)'
                                                : item.success
                                                ? 'rgba(16, 185, 129, 0.16)'
                                                : 'rgba(255, 255, 255, 0.1)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent'
                                    }}
                                >
                                    {Icon && (
                                        <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            flexShrink: 0, 
                                            width: '18px',
                                            color: item.danger ? '#ef4444' : item.success ? '#10b981' : 'inherit'
                                        }}>
                                            {typeof Icon === 'function' ? <Icon size={15} /> : Icon}
                                        </span>
                                    )}
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.label}
                                    </span>
                                </button>
                            )
                        })
                    )}
                </div>,
                document.body
            )}
        </div>
    )
}
