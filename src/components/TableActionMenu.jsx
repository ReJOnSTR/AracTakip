import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

/**
 * Recursively extracts action buttons from React Fragments, arrays, and elements
 */
function extractActionButtons(children) {
    const list = []

    function walk(node) {
        if (!node) return
        if (Array.isArray(node)) {
            node.forEach(walk)
            return
        }
        if (node.type === React.Fragment) {
            walk(node.props?.children)
            return
        }
        if (React.isValidElement(node)) {
            if (node.type === 'button' || node.props?.onClick) {
                list.push(node)
            } else if (node.props?.children) {
                walk(node.props.children)
            }
        }
    }

    walk(children)
    return list
}

/**
 * Universal Responsive Table Action Menu
 * - Desktop (>1024px): Renders standard action buttons inline
 * - Mobile / Tablet / Small screens (<=1024px): Collapses into a 3-dots (...) button with a dropdown popover
 */
export default function TableActionMenu({
    items = null,
    children = null,
    align = 'right'
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, placement: 'bottom' })
    const triggerRef = useRef(null)
    const menuRef = useRef(null)

    // Calculate menu position relative to trigger button
    const calculatePosition = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const menuWidth = 180
        const menuHeight = 220
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let left = align === 'right' ? rect.right - menuWidth : rect.left
        if (left < 10) left = 10
        if (left + menuWidth > viewportWidth - 10) left = viewportWidth - menuWidth - 10

        let top = rect.bottom + 4
        let placement = 'bottom'

        // If overflowing bottom, flip upwards
        if (top + menuHeight > viewportHeight - 10 && rect.top > menuHeight) {
            top = rect.top - 4
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

    // Close on click outside, resize, or Escape key
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

        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside)
            document.addEventListener('touchstart', handleClickOutside)
            document.addEventListener('keydown', handleKeyDown)
            window.addEventListener('resize', () => setIsOpen(false))
        }, 10)

        return () => {
            clearTimeout(timer)
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('resize', () => setIsOpen(false))
        }
    }, [isOpen])

    // Parse items from either explicit `items` array or React `children`
    const parsedItems = useMemo(() => {
        if (items && items.length > 0) return items

        const rawButtons = extractActionButtons(children)
        return rawButtons.map((btn, index) => {
            const props = btn.props || {}
            const { title, onClick, className, style, disabled } = props
            
            let label = title || ''
            let icon = null

            const btnChildren = props.children
            if (React.isValidElement(btnChildren)) {
                icon = btnChildren
            } else if (Array.isArray(btnChildren)) {
                btnChildren.forEach((c) => {
                    if (typeof c === 'string') {
                        label = label || c
                    } else if (React.isValidElement(c)) {
                        if (c.type === 'span' && typeof c.props?.children === 'string') {
                            label = label || c.props.children
                        } else {
                            icon = icon || c
                        }
                    }
                })
            } else if (typeof btnChildren === 'string') {
                label = label || btnChildren
            }

            if (!label) {
                if (className?.includes('danger') || title?.toLowerCase()?.includes('sil')) label = 'Sil'
                else if (title?.toLowerCase()?.includes('düzenle')) label = 'Düzenle'
                else if (title?.toLowerCase()?.includes('detay')) label = 'Detaya Git'
                else label = 'İşlem'
            }

            const isDanger = className?.includes('danger') || (style && (style.color === '#ef4444' || style.color === 'red'))
            const isSuccess = className?.includes('success') || (style && (style.color === '#10b981' || style.color === 'green'))

            return {
                key: btn.key || index,
                label,
                icon: icon || btnChildren,
                onClick: (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsOpen(false)
                    if (onClick) onClick(e)
                },
                disabled: !!disabled,
                isDanger,
                isSuccess,
                style
            }
        })
    }, [children, items])

    return (
        <div 
            className="table-action-menu-wrapper" 
            onClick={(e) => e.stopPropagation()}
        >
            {/* Desktop View: Render action buttons directly inline */}
            <div className="table-actions-desktop action-btns">
                {children ? children : (
                    items?.map((item, idx) => {
                        if (item.hidden) return null
                        const Icon = item.icon
                        return (
                            <button
                                key={idx}
                                type="button"
                                className={`action-icon-btn ${item.isDanger || item.danger ? 'danger' : ''} ${item.isSuccess || item.success ? 'success' : ''}`}
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

            {/* Mobile / Narrow Screens: Render 3-dots (...) trigger button */}
            <div className="table-actions-mobile">
                <button
                    ref={triggerRef}
                    type="button"
                    className={`table-3dots-btn ${isOpen ? 'active' : ''}`}
                    onClick={toggleMenu}
                    title="İşlemler Menüsü"
                >
                    <MoreVertical size={16} />
                </button>

                {isOpen && createPortal(
                    <div
                        ref={menuRef}
                        className="table-action-popover"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            top: menuPosition.placement === 'top' ? 'auto' : `${menuPosition.top}px`,
                            bottom: menuPosition.placement === 'top' ? `${window.innerHeight - menuPosition.top}px` : 'auto',
                            left: `${menuPosition.left}px`,
                        }}
                    >
                        {parsedItems.length === 0 ? (
                            <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted, #71717a)' }}>
                                İşlem yok
                            </div>
                        ) : (
                            parsedItems.map((item) => {
                                if (item.hidden) return null
                                const Icon = item.icon

                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        disabled={item.disabled}
                                        onClick={item.onClick}
                                        className={`table-action-popover-item ${item.isDanger ? 'danger' : ''} ${item.isSuccess ? 'success' : ''}`}
                                    >
                                        {Icon && (
                                            <span className="popover-item-icon">
                                                {typeof Icon === 'function' ? <Icon size={15} /> : Icon}
                                            </span>
                                        )}
                                        <span className="popover-item-label">
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
        </div>
    )
}
