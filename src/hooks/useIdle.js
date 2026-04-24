import { useState, useEffect } from 'react'

export function useIdle(timeout = 300000) { // Default 5 minutes
    const [isIdle, setIsIdle] = useState(false)

    useEffect(() => {
        let timer

        const resetTimer = () => {
            setIsIdle(false)
            clearTimeout(timer)
            timer = setTimeout(() => {
                setIsIdle(true)
            }, timeout)
        }

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
        events.forEach(event => window.addEventListener(event, resetTimer))

        resetTimer()

        return () => {
            clearTimeout(timer)
            events.forEach(event => window.removeEventListener(event, resetTimer))
        }
    }, [timeout])

    return isIdle
}
