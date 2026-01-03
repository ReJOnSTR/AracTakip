import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check for stored user on mount
        const storedUser = localStorage.getItem('aractakip_user')
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser))
            } catch (e) {
                localStorage.removeItem('aractakip_user')
            }
        }
        setLoading(false)
    }, [])

    const login = async (email, password) => {
        try {
            if (!window.electronAPI) {
                return { success: false, error: 'Bu uygulama Electron içinde çalıştırılmalıdır. Normal tarayıcıda açmayın.' }
            }
            const result = await window.electronAPI.login({ email, password })
            if (result.success) {
                setUser(result.user)
                localStorage.setItem('aractakip_user', JSON.stringify(result.user))
                return { success: true }
            }
            return { success: false, error: result.error }
        } catch (error) {
            console.error('Login error:', error)
            return { success: false, error: 'Bağlantı hatası: ' + error.message }
        }
    }

    const register = async (username, email, password) => {
        try {
            if (!window.electronAPI) {
                return { success: false, error: 'Bu uygulama Electron içinde çalıştırılmalıdır. Normal tarayıcıda açmayın.' }
            }
            const result = await window.electronAPI.register({ username, email, password })
            if (result.success) {
                setUser(result.user)
                localStorage.setItem('aractakip_user', JSON.stringify(result.user))
                return { success: true }
            }
            return { success: false, error: result.error }
        } catch (error) {
            console.error('Register error:', error)
            return { success: false, error: 'Bağlantı hatası: ' + error.message }
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('aractakip_user')
        localStorage.removeItem('aractakip_company')
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
