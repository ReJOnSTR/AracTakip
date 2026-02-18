import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { companyService, dashboardService } from '../services'

const CompanyContext = createContext(null)

export function CompanyProvider({ children }) {
    const { user } = useAuth()
    const [companies, setCompanies] = useState([])
    const [currentCompany, setCurrentCompany] = useState(null)
    const [loading, setLoading] = useState(true)
    const [upcomingEvents, setUpcomingEvents] = useState([])

    useEffect(() => {
        if (currentCompany) {
            loadUpcomingEvents()
        } else {
            setUpcomingEvents([])
        }
    }, [currentCompany])

    // Auto-refresh: window focus (başka sayfadan dönünce) + 60 saniyelik polling
    useEffect(() => {
        if (!currentCompany) return

        const handleFocus = () => loadUpcomingEvents()
        window.addEventListener('focus', handleFocus)

        const interval = setInterval(() => loadUpcomingEvents(), 60_000)

        return () => {
            window.removeEventListener('focus', handleFocus)
            clearInterval(interval)
        }
    }, [currentCompany])

    const loadUpcomingEvents = async () => {
        if (!currentCompany) return
        try {
            const result = await dashboardService.getUpcomingEvents(currentCompany.id)
            if (result.success) {
                setUpcomingEvents(result.data)
            }
        } catch (error) {
            console.error('Failed to load upcoming events:', error)
        }
    }

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
            const result = await companyService.getAll(user.id)
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
            const result = await companyService.create({
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
            const result = await companyService.update(data)
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
            const result = await companyService.delete(id)
            if (result.success) {
                const freshResult = await companyService.getAll(user.id)
                if (freshResult.success) {
                    setCompanies(freshResult.data)
                    if (currentCompany?.id === id) {
                        const nextCompany = freshResult.data.length > 0 ? freshResult.data[0] : null
                        setCurrentCompany(nextCompany)
                        if (nextCompany) {
                            localStorage.setItem('aractakip_company', nextCompany.id)
                        } else {
                            localStorage.removeItem('aractakip_company')
                        }
                    }
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
            refreshCompanies: loadCompanies,
            upcomingEvents,
            loadUpcomingEvents
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
