import React, { createContext, useContext, useState, useCallback } from 'react'

const TabContext = createContext()

export const useTab = () => useContext(TabContext)

export const TabProvider = ({ children }) => {
    // Tab structure: { id, key (componentMap key), title, props }
    const [tabs, setTabs] = useState([])
    const [activeTabId, setActiveTabId] = useState(null)

    const openTab = useCallback((key, customTitle = null, props = {}, forceNew = false) => {
        setTabs(prev => {
            if (!forceNew) {
                // Check if a tab with this key and these specific props (like ID) already exists
                // For detail pages, we want unique tabs per ID
                const existingTab = prev.find(t => {
                    if (t.key !== key) return false
                    // If it's a detail page, match props.id or similar
                    if (key === 'vehicle-detail' || key === 'employee-detail' || key === 'work-details') {
                        // Check if params ID matches
                        return t.props?.id === props?.id
                    }
                    return true // For list pages, only one instance allowed usually
                })

                if (existingTab) {
                    setActiveTabId(existingTab.id)
                    return prev
                }
            }

            const newId = Date.now().toString()
            const newTab = {
                id: newId,
                key,
                title: customTitle, // Will fallback to componentMap title if null
                props
            }

            setActiveTabId(newId)
            return [...prev, newTab]
        })
    }, [])

    const replaceTab = useCallback((tabId, key, customTitle = null, props = {}) => {
        setTabs(prev => {
            return prev.map(t => {
                if (t.id !== tabId) return t
                return {
                    ...t,
                    key,
                    title: customTitle,
                    props
                }
            })
        })
    }, [])

    const closeTab = useCallback((tabId, e) => {
        if (e) e.stopPropagation()

        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId)

            // If we closed the active tab, modify active ID
            if (activeTabId === tabId) {
                // Open the one to the right, or left if right doesn't exist
                // Or simply the last one
                if (newTabs.length > 0) {
                    setActiveTabId(newTabs[newTabs.length - 1].id)
                } else {
                    setActiveTabId(null)
                }
            }

            return newTabs
        })
    }, [activeTabId])

    const closeAllTabs = useCallback(() => {
        setTabs([])
        setActiveTabId(null)
    }, [])

    const reorderTabs = useCallback((startIndex, endIndex) => {
        setTabs(prev => {
            const result = Array.from(prev)
            const [removed] = result.splice(startIndex, 1)
            result.splice(endIndex, 0, removed)
            return result
        })
    }, [])

    const value = {
        tabs,
        activeTabId,
        setActiveTabId,

        openTab,
        replaceTab,
        closeTab,
        closeAllTabs,
        reorderTabs
    }

    return (
        <TabContext.Provider value={value}>
            {children}
        </TabContext.Provider>
    )
}
