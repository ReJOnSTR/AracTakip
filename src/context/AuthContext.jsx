import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services'

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
            const result = await authService.login({ email, password })
            if (result.success) {
                setUser(result.user)
                localStorage.setItem('aractakip_user', JSON.stringify(result.user))
                sessionStorage.setItem('aractakip_session_active', 'true')
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
            const result = await authService.register({ username, email, password })
            if (result.success) {
                setUser(result.user)
                localStorage.setItem('aractakip_user', JSON.stringify(result.user))
                sessionStorage.setItem('aractakip_session_active', 'true')
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
        localStorage.removeItem('aractakip_locked')
        sessionStorage.removeItem('aractakip_session_active')
    }

    const updateProfile = async (data) => {
        try {
            const result = await authService.updateProfile({ userId: user.id, ...data })
            if (result.success) {
                const updatedUser = { ...user, ...result.user }
                setUser(updatedUser)
                localStorage.setItem('aractakip_user', JSON.stringify(updatedUser))
                return { success: true }
            }
            return { success: false, error: result.error }
        } catch (error) {
            console.error('Update profile error:', error)
            return { success: false, error: 'Bağlantı hatası: ' + error.message }
        }
    }

    const isAdmin = user?.role === 'admin' || user?.role === 'user' || !user?.role
    const isManager = user?.role === 'manager' || isAdmin
    const isPersonnel = user?.role === 'personnel'

    const hasPermission = (moduleName, action = 'can_read') => {
        if (isAdmin) return true;
        if (!user || !user.permissions) return false;
        const perm = user.permissions.find(p => p.module === moduleName);
        if (!perm) return false;
        return !!perm[action];
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            login, 
            register, 
            logout, 
            updateProfile,
            isAdmin,
            isManager,
            isPersonnel,
            hasPermission
        }}>
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
