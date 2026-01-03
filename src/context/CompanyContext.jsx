import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const CompanyContext = createContext(null)

export function CompanyProvider({ children }) {
    const { user } = useAuth()
    const [companies, setCompanies] = useState([])
    const [currentCompany, setCurrentCompany] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            loadCompanies()
        } else {
            setCompanies([])
            setCurrentCompany(null)
            setLoading(false)
        }
    }, [user])

    const loadCompanies = async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.getCompanies(user.id)
            if (result.success) {
                setCompanies(result.data)

                // Restore last selected company or select first
                const storedCompanyId = localStorage.getItem('aractakip_company')
                const storedCompany = result.data.find(c => c.id === parseInt(storedCompanyId))

                if (storedCompany) {
                    setCurrentCompany(storedCompany)
                } else if (result.data.length > 0) {
                    setCurrentCompany(result.data[0])
                    localStorage.setItem('aractakip_company', result.data[0].id)
                }
            }
        } catch (error) {
            console.error('Failed to load companies:', error)
        }
        setLoading(false)
    }

    const selectCompany = (company) => {
        setCurrentCompany(company)
        localStorage.setItem('aractakip_company', company.id)
    }

    const createCompany = async (data) => {
        try {
            const result = await window.electronAPI.createCompany({
                userId: user.id,
                name: data.name,
                taxNumber: data.taxNumber,
                address: data.address,
                phone: data.phone
            })

            if (result.success) {
                await loadCompanies()
                return { success: true, id: result.id }
            }
            return { success: false, error: result.error }
        } catch (error) {
            return { success: false, error: 'İşlem başarısız' }
        }
    }

    const updateCompany = async (data) => {
        try {
            const result = await window.electronAPI.updateCompany(data)
            if (result.success) {
                await loadCompanies()
                return { success: true }
            }
            return { success: false, error: result.error }
        } catch (error) {
            return { success: false, error: 'İşlem başarısız' }
        }
    }

    const deleteCompany = async (id) => {
        try {
            const result = await window.electronAPI.deleteCompany(id)
            if (result.success) {
                await loadCompanies()
                if (currentCompany?.id === id) {
                    setCurrentCompany(companies.find(c => c.id !== id) || null)
                }
                return { success: true }
            }
            return { success: false, error: result.error }
        } catch (error) {
            return { success: false, error: 'İşlem başarısız' }
        }
    }

    return (
        <CompanyContext.Provider value={{
            companies,
            currentCompany,
            loading,
            selectCompany,
            createCompany,
            updateCompany,
            deleteCompany,
            refreshCompanies: loadCompanies
        }}>
            {children}
        </CompanyContext.Provider>
    )
}

export function useCompany() {
    const context = useContext(CompanyContext)
    if (!context) {
        throw new Error('useCompany must be used within CompanyProvider')
    }
    return context
}
