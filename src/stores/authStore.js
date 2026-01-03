
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            login: (userData) => set({ user: userData, isAuthenticated: true }),
            logout: () => {
                localStorage.removeItem('active_company_id') // Clear related state manually if needed
                set({ user: null, isAuthenticated: false })
            }
        }),
        {
            name: 'auth-storage', // unique name
        }
    )
)
