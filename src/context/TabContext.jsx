import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getRouteInfo } from '../config/navigation'

const TabContext = createContext()

export function TabProvider({ children }) {
    // Tabs: [{ id: '1', path: '/vehicles', label: 'Araçlar', icon: Icon }]
    const [tabs, setTabs] = useState([])
    const [activeTabId, setActiveTabId] = useState(null)
    const location = useLocation()
    const navigate = useNavigate()

    // Initialize first tab or sync on load
    useEffect(() => {
        if (tabs.length === 0) {
            const initialPath = location.pathname
            const routeInfo = getRouteInfo(initialPath)
            const newTab = {
                id: crypto.randomUUID(),
                path: initialPath,
                label: routeInfo.label,
                icon: routeInfo.icon
            }
            setTabs([newTab])
            setActiveTabId(newTab.id)
        }
    }, []) // Run once on mount

    // Update active tab when location changes (if triggered by browser back/forward or manual URL entry)
    useEffect(() => {
        if (!activeTabId) return

        setTabs(prev => {
            return prev.map(tab => {
                if (tab.id === activeTabId && tab.path !== location.pathname) {
                    const routeInfo = getRouteInfo(location.pathname)
                    return { ...tab, path: location.pathname, label: routeInfo.label, icon: routeInfo.icon }
                }
                return tab
            })
        })
    }, [location.pathname, activeTabId])


    const openNewTab = useCallback((path) => {
        const routeInfo = getRouteInfo(path)
        const newTab = {
            id: crypto.randomUUID(),
            path,
            label: routeInfo.label,
            icon: routeInfo.icon
        }
        setTabs(prev => [...prev, newTab])
        setActiveTabId(newTab.id)
        navigate(path)
    }, [navigate])

    const activateTab = useCallback((tabId) => {
        const tab = tabs.find(t => t.id === tabId)
        if (tab) {
            setActiveTabId(tabId)
            navigate(tab.path)
        }
    }, [tabs, navigate])

    const updateTabsOrder = useCallback((newTabs) => {
        setTabs(newTabs)
    }, [])

    const updateTabInfo = useCallback((path, info) => {
        setTabs(prev => prev.map(t => {
            if (t.path === path) {
                return { ...t, ...info }
            }
            return t
        }))
    }, [])

    const closeTab = useCallback((tabId, e) => {
        if (e) e.stopPropagation()

        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== tabId)

            // If we closed the active tab, we need to find a new one
            if (activeTabId === tabId) {
                const closeIndex = prev.findIndex(t => t.id === tabId)
                // Try to go to the left, or the right if left doesn't exist
                const nextTab = newTabs[closeIndex - 1] || newTabs[closeIndex]

                if (nextTab) {
                    setActiveTabId(nextTab.id)
                    navigate(nextTab.path)
                } else {
                    // Closed the last tab? Go to dashboard or empty state
                    // For now let's enforce at least one tab or redirect to home if empty logic desired
                    navigate('/')
                    // Depending on requirement, we might just leave clean slate or auto-create home tab
                }
            }

            return newTabs
        })
    }, [activeTabId, navigate])

    const closeOtherTabs = useCallback((tabId) => {
        setTabs(prev => prev.filter(t => t.id === tabId))
        setActiveTabId(tabId)
    }, [])

    const closeAll = useCallback(() => {
        const routeInfo = getRouteInfo('/')
        const homeTab = {
            id: crypto.randomUUID(),
            path: '/',
            label: routeInfo.label,
            icon: routeInfo.icon
        }
        setTabs([homeTab])
        setActiveTabId(homeTab.id)
        navigate('/')
    }, [navigate])

    return (
        <TabContext.Provider value={{
            tabs,
            activeTabId,
            openNewTab,
            activateTab,
            closeTab,
            closeOtherTabs,
            closeAll,
            updateTabsOrder,
            updateTabInfo
        }}>
            {children}
        </TabContext.Provider>
    )
}

export function useTabs() {
    return useContext(TabContext)
}
