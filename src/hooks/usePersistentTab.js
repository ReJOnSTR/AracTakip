import { useState, useEffect } from 'react'

export function usePersistentTab(key, defaultValue = 'all') {
    const [tab, setTab] = useState(() => {
        try {
            return localStorage.getItem(`tab_${key}`) || defaultValue
        } catch (e) {
            return defaultValue
        }
    })

    useEffect(() => {
        try {
            localStorage.setItem(`tab_${key}`, tab)
        } catch (e) { }
    }, [key, tab])

    return [tab, setTab]
}
