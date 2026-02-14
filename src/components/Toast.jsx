import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose()
        }, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />
            case 'error': return <AlertCircle size={20} />
            case 'info': return <Info size={20} />
            default: return <Info size={20} />
        }
    }

    const getColors = () => {
        switch (type) {
            case 'success': return 'bg-green-50 text-green-700 border-green-200'
            case 'error': return 'bg-red-50 text-red-700 border-red-200'
            default: return 'bg-blue-50 text-blue-700 border-blue-200'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${getColors()} min-w-[300px]`}
        >
            {getIcon()}
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X size={16} />
            </button>
        </motion.div>
    )
}
