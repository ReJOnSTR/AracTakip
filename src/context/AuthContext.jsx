import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services'
import { supabase } from '../services/supabase'

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
                if (result.require2FA) {
                    return {
                        success: true,
                        require2FA: true,
                        userId: result.userId,
                        username: result.username,
                        email: result.email
                    }
                }

                setUser(result.user)
                localStorage.setItem('aractakip_user', JSON.stringify(result.user))
                sessionStorage.setItem('aractakip_session_active', 'true')
                
                // Keep Supabase Auth session synced on client
                if (result.user?.email) {
                    supabase.auth.signInWithPassword({ email: result.user.email, password }).catch(() => {});
                }
                return { success: true }
            }
            return { success: false, error: result.error }
        } catch (error) {
            console.error('Login error:', error)
            return { success: false, error: 'Bağlantı hatası: ' + error.message }
        }
    }

    const verify2FALogin = async (userId, tokenOrBackupCode) => {
        try {
            let result;
            if (window.electronAPI?.verifyMfaLogin) {
                result = await window.electronAPI.verifyMfaLogin(userId, tokenOrBackupCode);
            } else if (authService?.verifyMfaLogin) {
                result = await authService.verifyMfaLogin({ userId, token: tokenOrBackupCode });
            } else {
                result = await fetch('/api/rpc/verifyMfaLogin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ args: [userId, tokenOrBackupCode] })
                }).then(r => r.json());
            }

            if (result && result.success && result.user) {
                setUser(result.user)
                localStorage.setItem('aractakip_user', JSON.stringify(result.user))
                sessionStorage.setItem('aractakip_session_active', 'true')
                return { success: true, backupCodeUsed: result.backupCodeUsed, remainingBackupCodes: result.remainingBackupCodes }
            }
            return { success: false, error: result?.error || 'Geçersiz 2FA güvenlik kodu' }
        } catch (error) {
            console.error('verify2FALogin error:', error)
            return { success: false, error: 'Doğrulama hatası: ' + error.message }
        }
    }

    const register = async (username, email, password, companyName) => {
        try {
            localStorage.removeItem('aractakip_company')
            const result = await authService.register({ username, email, password, companyName })
            if (result.success) {
                setUser(result.user)
                localStorage.setItem('aractakip_user', JSON.stringify(result.user))
                sessionStorage.setItem('aractakip_session_active', 'true')

                // Register in Supabase Auth on client
                supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username, company_name: companyName } }
                }).catch(() => {});

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
        supabase.auth.signOut().catch(() => {});
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

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'company_admin' || user?.role === 'company_owner' || user?.role === 'user' || user?.username === 'admin' || !user?.role
    const isManager = user?.role === 'manager' || isAdmin
    const isPersonnel = user?.role === 'personnel' || user?.role === 'employee'

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
            verify2FALogin,
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
