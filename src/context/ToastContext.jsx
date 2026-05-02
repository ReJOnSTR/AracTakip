import { createContext, useContext, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const stableToast = useRef({
        success: () => {},
        error: () => {},
        info: () => {},
        warning: () => {},
        showToast: () => {},
    }).current

    useEffect(() => {
        window.showToast = stableToast.showToast;
        window.toast = stableToast;
    }, [])

    return (
        <ToastContext.Provider value={stableToast}>
            {children}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}
