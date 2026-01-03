
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCompanyStore = create(
    persist(
        (set) => ({
            currentCompany: null,
            setCompany: (company) => set({ currentCompany: company }),
            clearCompany: () => set({ currentCompany: null })
        }),
        {
            name: 'company-storage',
        }
    )
)
