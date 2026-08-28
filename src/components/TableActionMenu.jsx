import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, MoreVertical } from 'lucide-react'

/**
 * Universal Responsive Table Action Menu
 * - Renders buttons inline on wide screens
 * - Gracefully collapses into a 3-dots (...) floating dropdown popover on small/mobile screens
 */
export default function TableActionMenu({
    items = null,
    children = null,
    align = 'right',
    maxInline = 3,
    forceDropdown = false
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, placement: 'bottom' })
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 1024)
    const triggerRef = useRef(null)
    const menuRef = useRef(null)

    // Window resize detector for responsive breakpoint
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1024)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Update menu position based on trigger rect
    const calculatePosition = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const menuWidth = 190
        const menuHeight = 220
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let left = align === 'right' ? rect.right - menuWidth : rect.left
        if (left < 10) left = 10
        if (left + menuWidth > viewportWidth - 10) left = viewportWidth - menuWidth - 10

        let top = rect.bottom + 6
        let placement = 'bottom'

        // If overflowing bottom, flip upwards
        if (top + menuHeight > viewportHeight - 10 && rect.top > menuHeight) {
            top = rect.top - 6
            placement = 'top'
        }

        setMenuPosition({ top, left, placement })
    }

    const toggleMenu = (e) => {
        e.stopPropagation()
        if (!isOpen) {
            calculatePosition()
            setIsOpen(true)
        } else {
            setIsOpen(false)
        }
    }

    // Close on click outside, scroll or Escape key
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false)
        }

        const handleScroll = (e) => {
            // Close if scrolling outside the menu
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }

        window.addEventListener('mousedown', handleClickOutside, true)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('scroll', handleScroll, true)

        return () => {
            window.removeEventListener('mousedown', handleClickOutside, true)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('scroll', handleScroll, true)
        }
    }, [isOpen])

    const showDropdown = forceDropdown || isMobile

    // Parse items from either explicit `items` array or React `children`
    const parsedItems = items || React.Children.toArray(children).map((child) => {
        if (!React.isValidElement(child)) return null
        const { title, onClick, className, children: childContent, disabled } = child.props || {}
        const isDanger = className?.includes('danger') || false
        const isSuccess = className?.includes('success') || false

        return {
            label: title || (typeof childContent === 'string' ? childContent : 'İşlem'),
            icon: childContent,
            onClick: (e) => {
                e.stopPropagation()
                setIsOpen(false)
                if (onClick) onClick(e)
            },
            danger: isDanger,
            success: isSuccess,
            disabled: !!disabled
        }
    }).filter(Boolean)

    return (
        <div className="table-action-menu-wrapper" style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
            {/* Desktop View: Show buttons inline */}
            {!showDropdown && (
                <div className="action-btns table-actions-inline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {children ? children : (
                        items?.map((item, idx) => {
                            if (item.hidden) return null
                            const Icon = item.icon
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`action-icon-btn ${item.danger ? 'danger' : ''} ${item.success ? 'success' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (item.onClick) item.onClick(e)
                                    }}
                                    title={item.title || item.label}
                                    disabled={item.disabled}
                                    style={item.style}
                                >
                                    {typeof Icon === 'function' ? <Icon size={14} /> : Icon}
                                </button>
                            )
                        })
                    )}
                </div>
            )}

            {/* Mobile / Narrow Screen View: 3-Dots Button */}
            {showDropdown && (
                <>
                    <button
                        ref={triggerRef}
                        type="button"
                        className={`table-3dots-btn ${isOpen ? 'active' : ''}`}
                        onClick={toggleMenu}
                        title="İşlemler"
                        style={{
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            background: isOpen ? 'var(--bg-tertiary, #27272a)' : 'transparent',
                            border: isOpen ? '1px solid var(--border-color, #3f3f46)' : '1px solid transparent',
                            color: isOpen ? 'var(--text-primary, #ffffff)' : 'var(--text-secondary, #a1a1aa)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
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
                                maxWidth: '240px',
                                background: 'var(--bg-secondary, #18181b)',
                                border: '1px solid var(--border-color, #27272a)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
                                padding: '4px',
                                zIndex: 99999,
                                backdropFilter: 'blur(12px)',
                                animation: 'fadeInScale 0.15s ease-out',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                            }}
                        >
                            {parsedItems.length === 0 ? (
                                <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>İşlem yok</div>
                            ) : (
                                parsedItems.map((item, idx) => {
                                    if (item.hidden) return null
                                    const Icon = item.icon

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={item.disabled}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIsOpen(false)
                                                if (item.onClick) item.onClick(e)
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                fontSize: '12.5px',
                                                fontWeight: 500,
                                                textAlign: 'left',
                                                background: 'transparent',
                                                border: 'none',
                                                color: item.danger ? '#ef4444' : item.success ? '#10b981' : 'var(--text-primary, #f4f4f5)',
                                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                                opacity: item.disabled ? 0.5 : 1,
                                                transition: 'background 0.12s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!item.disabled) {
                                                    e.currentTarget.style.background = item.danger
                                                        ? 'rgba(239, 68, 68, 0.12)'
                                                        : item.success
                                                        ? 'rgba(16, 185, 129, 0.12)'
                                                        : 'var(--bg-tertiary, #27272a)'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent'
                                            }}
                                        >
                                            {Icon && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '16px' }}>
                                                    {typeof Icon === 'function' ? <Icon size={14} /> : Icon}
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
                </>
            )}
        </div>
    )
}
