import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, Info, X, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timersRef = useRef({})

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
        if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id])
            delete timersRef.current[id]
        }
    }, [])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++toastId
        setToasts(prev => [...prev, { id, message, type }])
        timersRef.current[id] = setTimeout(() => removeToast(id), duration)
        return id
    }, [removeToast])

    const toastApi = useRef({})

    useEffect(() => {
        toastApi.current.success = (msg, dur) => addToast(msg, 'success', dur)
        toastApi.current.error = (msg, dur) => addToast(msg, 'error', dur)
        toastApi.current.info = (msg, dur) => addToast(msg, 'info', dur)
        toastApi.current.warning = (msg, dur) => addToast(msg, 'warning', dur)
    }, [addToast])

    // Stable reference that delegates to latest addToast
    const stableToast = useRef({
        success: (msg, dur) => toastApi.current.success(msg, dur),
        error: (msg, dur) => toastApi.current.error(msg, dur),
        info: (msg, dur) => toastApi.current.info(msg, dur),
        warning: (msg, dur) => toastApi.current.warning(msg, dur),
    }).current

    return (
        <ToastContext.Provider value={stableToast}>
            {children}
            {createPortal(
                <div style={{
                    position: 'fixed',
                    top: '50px',
                    right: '20px',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    pointerEvents: 'none',
                }}>
                    {toasts.map((t) => (
                        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

const iconMap = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    info: <Info size={18} />,
    warning: <AlertTriangle size={18} />,
}

const colorMap = {
    success: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: '#10b981' },
    error: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' },
    info: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' },
}

function ToastItem({ toast, onClose }) {
    const colors = colorMap[toast.type] || colorMap.info

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                minWidth: '300px',
                maxWidth: '420px',
                background: 'var(--bg-secondary)',
                border: `1px solid ${colors.border}`,
                borderLeft: `3px solid ${colors.color}`,
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                animation: 'toastSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                pointerEvents: 'all',
                backdropFilter: 'blur(10px)',
            }}
        >
            <div style={{ color: colors.color, flexShrink: 0 }}>
                {iconMap[toast.type]}
            </div>
            <span style={{
                flex: 1,
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: '1.4',
            }}>
                {toast.message}
            </span>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    flexShrink: 0,
                    display: 'flex',
                    borderRadius: '4px',
                }}
            >
                <X size={14} />
            </button>
            <style>{`
                @keyframes toastSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}
