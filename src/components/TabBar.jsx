import React, { useState } from 'react'
import { X, GripVertical, Building2, ChevronDown, User, LogOut, Settings, Plus, ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTabs } from '../context/TabContext'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableTab({ tab, isActive, activateTab, closeTab }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: tab.id })

    const style = {
        transform: transform ? CSS.Transform.toString({
            ...transform,
            y: 0 // Prevent vertical dragging 
        }) : undefined,
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => activateTab(tab.id)}
            {...attributes}
            {...listeners}
        >
            {tab.icon && <tab.icon size={14} className="tab-icon" />}
            <span className="tab-label">{tab.label}</span>
            <button
                className="tab-close"
                onClick={(e) => closeTab(tab.id, e)}
            >
                <X size={12} />
            </button>
        </div>
    )
}

export default function TabBar() {
    const { tabs, activeTabId, activateTab, closeTab, updateTabsOrder, openNewTab } = useTabs()
    const { user, logout } = useAuth()
    const { companies, currentCompany, selectCompany } = useCompany()
    const navigate = useNavigate()
    const location = useLocation()
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
    const [showUserDropdown, setShowUserDropdown] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    )

    const handleDragEnd = (event) => {
        const { active, over } = event
        if (active.id !== over.id) {
            const oldIndex = tabs.findIndex((t) => t.id === active.id)
            const newIndex = tabs.findIndex((t) => t.id === over.id)
            updateTabsOrder(arrayMove(tabs, oldIndex, newIndex))
        }
    }

    const handleCompanySelect = (company) => {
        selectCompany(company)
        setShowCompanyDropdown(false)
    }

    if (!tabs || tabs.length === 0) return null

    return (
        <div className="tab-bar">
            {/* Left: Draggable Tabs */}
            <div className="tab-bar-left">
                {location.pathname !== '/portal' && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', marginBottom: '-1px' }}>
                        <button
                            className="tab-nav-btn"
                            onClick={() => navigate(-1)}
                            title="Geri Dön"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <button
                            className="tab-nav-btn forward-btn"
                            onClick={() => navigate(1)}
                            title="İleri Git"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <div className="tab-scroll-container">
                        <SortableContext
                            items={tabs.map(t => t.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {tabs.map(tab => (
                                <SortableTab
                                    key={tab.id}
                                    tab={tab}
                                    isActive={tab.id === activeTabId}
                                    activateTab={activateTab}
                                    closeTab={closeTab}
                                />
                            ))}
                        </SortableContext>
                        <button
                            className="tab-add-btn"
                            onClick={() => openNewTab('/portal', false, 'Ana Portal')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                marginLeft: '8px',
                                marginBottom: '4px',
                                flexShrink: 0
                            }}
                            title="Yeni Ana Portal Sekmesi Aç"
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </DndContext>
            </div>

            {/* Right: Header Actions */}
            <div className="tab-bar-right">
                <div className="header-right">
                    {/* Company Selector */}
                    <div className="company-selector">
                        <button
                            className="company-selector-btn"
                            onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                        >
                            <Building2 size={16} />
                            <span>{currentCompany?.name || 'Şirket Seçin'}</span>
                            <ChevronDown size={14} />
                        </button>

                        {showCompanyDropdown && (
                            <>
                                <div
                                    className="dropdown-backdrop"
                                    style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                                    onClick={() => setShowCompanyDropdown(false)}
                                />
                                <div className="company-dropdown">
                                    {companies.length === 0 ? (
                                        <div className="company-dropdown-item">
                                            <span style={{ color: 'var(--text-secondary)' }}>Henüz şirket eklenmemiş</span>
                                        </div>
                                    ) : (
                                        companies.map((company) => (
                                            <div
                                                key={company.id}
                                                className={`company-dropdown-item ${currentCompany?.id === company.id ? 'active' : ''}`}
                                                onClick={() => handleCompanySelect(company)}
                                            >
                                                <Building2 size={18} />
                                                <span>{company.name}</span>
                                            </div>
                                        ))
                                    )}
                                    <div
                                        className="company-dropdown-item management-action"
                                        onClick={() => { navigate('/companies'); setShowCompanyDropdown(false) }}
                                    >
                                        <Settings size={16} />
                                        <span>Şirket Yönetimi</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="user-menu">
                        <button
                            className="user-menu-btn"
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                        >
                            <div className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <ChevronDown size={14} />
                        </button>

                        {showUserDropdown && (
                            <>
                                <div
                                    className="dropdown-backdrop"
                                    style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                                    onClick={() => setShowUserDropdown(false)}
                                />
                                <div className="user-dropdown">
                                    <div className="user-dropdown-item" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <User size={16} />
                                        <div>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user?.email}</div>
                                        </div>
                                    </div>
                                    <div className="user-dropdown-item danger" onClick={logout}>
                                        <LogOut size={16} />
                                        <span>Çıkış Yap</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
