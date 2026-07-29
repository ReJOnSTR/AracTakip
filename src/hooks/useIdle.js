import { useState, useEffect, useRef, useCallback } from 'react'

export function useIdle(timeout = 300000) { // Default 5 minutes
    const [isIdle, setIsIdle] = useState(false)
    const lastActivityRef = useRef(Date.now())
    const timerRef = useRef(null)

    const resetIdle = useCallback(() => {
        lastActivityRef.current = Date.now()
        setIsIdle(false)
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(() => {
            setIsIdle(true)
        }, timeout)
    }, [timeout])

    useEffect(() => {
        const checkActivity = () => {
            const now = Date.now()
            if (now - lastActivityRef.current >= timeout) {
                setIsIdle(true)
            } else {
                resetIdle()
            }
        }

        const handleUserActivity = () => {
            resetIdle()
        }

        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') {
                checkActivity()
            }
        }

        const events = [
            'keydown',
            'pointerdown',
            'mousedown',
            'mousemove',
            'touchstart',
            'touchmove',
            'scroll',
            'wheel',
            'click'
        ]

        events.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }))
        window.addEventListener('focus', handleVisibilityOrFocus)
        document.addEventListener('visibilitychange', handleVisibilityOrFocus)

        resetIdle()

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
            events.forEach(event => window.removeEventListener(event, handleUserActivity))
            window.removeEventListener('focus', handleVisibilityOrFocus)
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
        }
    }, [timeout, resetIdle])

    return { isIdle, resetIdle }
}

