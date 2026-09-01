import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

/**
 * Recursively extracts action buttons from React elements, Fragments, and arrays
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
 * TableActionMenu - 3-Dot Action Dropdown Popover
 */
export default function TableActionMenu({
    items = null,
    children = null
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState({})
    const triggerRef = useRef(null)

    const updatePosition = () => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const menuWidth = 180
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        let placement = 'bottom'
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
            placement = 'top'
        }

        const left = Math.max(10, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 10))

        setDropdownStyle({
            position: 'fixed',
            top: placement === 'bottom' ? `${rect.bottom + 4}px` : 'auto',
            bottom: placement === 'top' ? `${window.innerHeight - rect.top + 4}px` : 'auto',
            left: `${left}px`,
            width: `${menuWidth}px`,
            zIndex: 999999
        })
    }

    useEffect(() => {
        if (isOpen) {
            updatePosition()
            window.addEventListener('resize', updatePosition)
            window.addEventListener('scroll', updatePosition, true)

            return () => {
                window.removeEventListener('resize', updatePosition)
                window.removeEventListener('scroll', updatePosition, true)
            }
        }
    }, [isOpen])

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target)) {
                const isDropdownClick = e.target.closest('.table-action-popover')
                if (!isDropdownClick) {
                    setIsOpen(false)
                }
            }
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false)
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    const toggleMenu = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen(prev => !prev)
    }

    // Parse button items
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
                isSuccess
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
                title="İşlemler"
            >
                <MoreVertical size={16} />
            </button>

            {isOpen && createPortal(
                <div
                    className="table-action-popover"
                    onClick={(e) => e.stopPropagation()}
                    style={dropdownStyle}
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
    )
}
