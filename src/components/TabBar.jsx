import React from 'react'
import { useTab } from '../context/TabContext'
import { X, Plus } from 'lucide-react'
import { componentMap } from '../utils/componentMap'

export default function TabBar({ onNewTab }) {
    const { tabs, activeTabId, setActiveTabId, closeTab, reorderTabs } = useTab()
    const [dragOverIndex, setDragOverIndex] = React.useState(null)

    const handleDragStart = (e, index) => {
        e.dataTransfer.setData('sourceIndex', index.toString())
        e.dataTransfer.effectAllowed = 'move'
        // Optional: set ghost image transparent or custom
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        if (dragOverIndex !== index) {
            setDragOverIndex(index)
        }
    }

    const handleDrop = (e, targetIndex) => {
        e.preventDefault()
        setDragOverIndex(null)
        const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10)
        if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
            reorderTabs(sourceIndex, targetIndex)
        }
    }

    if (tabs.length === 0) return null

    return (
        <div className="tab-bar-container" style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '4px 4px 0 4px',
            gap: '4px',
            overflowX: 'auto',
            height: '40px'
        }}>
            {tabs.map((tab, index) => {
                const isActive = tab.id === activeTabId
                const title = tab.title || componentMap[tab.key]?.title || 'Sekme'
                const isDragOver = dragOverIndex === index

                return (
                    <div
                        key={tab.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`tab-item ${isActive ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: '120px',
                            maxWidth: '200px',
                            height: '36px',
                            padding: '0 12px',
                            fontSize: '13px',
                            fontWeight: 400,
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--bg-primary)' : (isDragOver ? 'rgba(20, 184, 166, 0.1)' : 'transparent'),
                            borderTopLeftRadius: '8px',
                            borderTopRightRadius: '8px',
                            borderTop: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                            borderLeft: isDragOver ? '2px solid var(--accent-primary)' : (isActive ? '1px solid var(--border-color)' : '1px solid transparent'),
                            borderRight: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                            borderBottom: isActive ? 'none' : '1px solid transparent',
                            cursor: 'pointer',
                            userSelect: 'none',
                            position: 'relative',
                            top: isActive ? '1px' : '0' // Overlap bottom border
                        }}
                    >
                        <span style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1
                        }}>
                            {title}
                        </span>
                        <button
                            onClick={(e) => closeTab(tab.id, e)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '2px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                                e.currentTarget.style.color = 'var(--error)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = 'var(--text-secondary)'
                            }}
                        >
                            <X size={13} />
                        </button>
                    </div>
                )
            })}

            <button
                onClick={onNewTab}
                title="Yeni Sekme"
                style={{
                    width: '28px',
                    height: '28px',
                    minWidth: '28px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                }}
            >
                <Plus size={16} />
            </button>
        </div>
    )
}
