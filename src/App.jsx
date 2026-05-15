import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import { TabProvider } from './context/TabContext' // Import TabProvider

import { useNotification } from './hooks/useNotification'
import ErrorBoundary from './components/ErrorBoundary'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import TabBar from './components/TabBar' // Import TabBar
import TopProgressBar from './components/TopProgressBar'
import BottomNav from './components/BottomNav'
import MobileHeader from './components/MobileHeader'
import CommandPalette from './components/CommandPalette'
import LockScreen from './components/LockScreen'
import { useIdle } from './hooks/useIdle'

// Lazy-loaded pages (code splitting)
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MainPortal = lazy(() => import('./pages/MainPortal'))
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'))
const Finance = lazy(() => import('./pages/Finance'))
const Checks = lazy(() => import('./pages/Checks'))
const Companies = lazy(() => import('./pages/Companies'))
const Vehicles = lazy(() => import('./pages/Vehicles'))
const VehicleDetail = lazy(() => import('./pages/VehicleDetail'))
const Maintenance = lazy(() => import('./pages/Maintenance'))
const Inspections = lazy(() => import('./pages/Inspections'))
const PeriodicInspections = lazy(() => import('./pages/PeriodicInspections'))
const Insurance = lazy(() => import('./pages/Insurance'))
const Assignments = lazy(() => import('./pages/Assignments'))
const Settings = lazy(() => import('./pages/Settings'))
const Reports = lazy(() => import('./pages/Reports'))
const EmployeeReports = lazy(() => import('./pages/EmployeeReports'))
const PrintPage = lazy(() => import('./pages/PrintPage'))
const Services = lazy(() => import('./pages/Services'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const MealTickets = lazy(() => import('./pages/MealTickets'))
const MealTicketReport = lazy(() => import('./pages/MealTicketReport'))
const MealTicketSettings = lazy(() => import('./pages/MealTicketSettings'))
const Employees = lazy(() => import('./pages/Employees'))
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'))
const PersonelDashboard = lazy(() => import('./pages/PersonelDashboard'))
const PayrollDashboard = lazy(() => import('./pages/PayrollDashboard'))
const Leaves = lazy(() => import('./pages/Leaves'))
const Overtimes = lazy(() => import('./pages/Overtimes'))
const Works = lazy(() => import('./pages/Works'))
const WorkDetails = lazy(() => import('./pages/WorkDetails'))
const WorkPdfReport = lazy(() => import('./pages/WorkPdfReport'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'))
const ModuleSettings = lazy(() => import('./pages/ModuleSettings'))
const Profile = lazy(() => import('./pages/Profile'))
const PrintDocument = lazy(() => import('./pages/PrintDocument'))

// Suspense fallback — invisible placeholder (TopProgressBar handles the visual)
function PageLoader() {
    return null
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    return (
        <>
            <TopProgressBar loading={loading} />
            {!loading && !user && <Navigate to="/login" replace />}
            {!loading && user?.mustChangePassword && <Navigate to="/change-password" replace />}
            {!loading && user && !user.mustChangePassword && children}
        </>
    )
}

function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebarCollapsed') === 'true'
    })

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const newState = !prev
            localStorage.setItem('sidebarCollapsed', newState)
            return newState
        })
    }

    return (
        <>
            <CommandPalette />
            <MobileHeader />
            <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                <div className="main-content">
                    <TabBar />
                    <div className="page-content">
                        <ErrorBoundary>
                            <Suspense fallback={<PageLoader />}>
                                <Outlet />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                    <BottomNav />
                </div>
            </div>
        </>
    )
}

import { useDataListener } from './hooks/useDataListener'

function AppRoutes() {
    useDataListener() // Global real-time data listener
    const { user } = useAuth()
    const location = useLocation()
    const isPrintRoute = location.pathname === '/print' || location.pathname === '/print-document' || location.pathname.startsWith('/work-report')

    return (
        <>
            {!isPrintRoute && <TitleBar />}
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
                    <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
                    <Route path="/change-password" element={<ChangePassword />} />

                    <Route element={
                        <ProtectedRoute>
                            <CompanyProvider>
                                <TabProvider>
                                    <MainLayout />
                                </TabProvider>
                            </CompanyProvider>
                        </ProtectedRoute>
                    }>
                        <Route path="/" element={<Navigate to="/portal" replace />} />
                        <Route path="/portal" element={<MainPortal />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/finance-dashboard" element={<FinanceDashboard />} />
                        <Route path="/finance" element={<Finance />} />
                        <Route path="/checks" element={<Checks />} />
                        <Route path="/meal-tickets" element={<MealTickets />} />
                        <Route path="/meal-ticket-report" element={<MealTicketReport />} />
                        <Route path="/meal-ticket-settings" element={<MealTicketSettings />} />
                        <Route path="/companies" element={<Companies />} />
                        <Route path="/vehicles" element={<Vehicles />} />
                        <Route path="/vehicles/:id" element={<VehicleDetail />} />
                        <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/inspections" element={<Inspections />} />
                        <Route path="/periodic-inspections" element={<PeriodicInspections />} />
                        <Route path="/insurance" element={<Insurance />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/assignments" element={<Assignments />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/employees/:id" element={<EmployeeDetail />} />
                        <Route path="/leaves" element={<Leaves />} />
                        <Route path="/personel-dashboard" element={<PersonelDashboard />} />
                        <Route path="/payroll" element={<PayrollDashboard />} />
                        <Route path="/overtimes" element={<Overtimes />} />
                        <Route path="/works" element={<Works />} />
                        <Route path="/works/:id" element={<WorkDetails />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/customers/:id" element={<CustomerDetail />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/module-settings/:module" element={<ModuleSettings />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/employee-reports" element={<EmployeeReports />} />
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route path="/print" element={<PrintPage />} />
                    <Route path="/print-document" element={<PrintDocument />} />
                    <Route path="/work-report/:id" element={<WorkPdfReport />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes >
            </Suspense >
        </>
    )
}

function App() {
    const location = useLocation()
    const isPrintRoute = location.pathname === '/print' || location.pathname === '/print-document' || location.pathname.startsWith('/work-report')

    const [lockSettings, setLockSettings] = useState(() => {
        return JSON.parse(localStorage.getItem('aractakip_lock_settings') || '{"enabled":false,"timeout":5,"useCustomPassword":false,"customPassword":""}')
    })

    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === 'aractakip_lock_settings') {
                setLockSettings(JSON.parse(e.newValue || '{}'))
            }
        }
        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [])
    
    const isIdle = useIdle(lockSettings.enabled ? lockSettings.timeout * 60000 : 999999999) 
    
    const [isLocked, setIsLocked] = useState(() => {
        const settings = JSON.parse(localStorage.getItem('aractakip_lock_settings') || '{"enabled":false}')
        if (!settings.enabled) return false
        return localStorage.getItem('aractakip_locked') === 'true'
    })

    useEffect(() => {
        // Detect platform for CSS adjustments
        const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.startsWith('Win')
        if (isWindows) {
            document.body.setAttribute('data-platform', 'win32')
        } else if (navigator.userAgent.includes('Mac')) {
            document.body.setAttribute('data-platform', 'darwin')
        }
    }, [])

    useEffect(() => {
        if (isPrintRoute) return

        // Startup security check
        const isFreshStart = !sessionStorage.getItem('aractakip_session_active')
        const storedUser = localStorage.getItem('aractakip_user')
        
        if (storedUser && lockSettings.enabled && isFreshStart) {
            setIsLocked(true)
            localStorage.setItem('aractakip_locked', 'true')
        }

        // Mark session as active so subsequent refreshes don't lock unless idle
        if (storedUser) {
            sessionStorage.setItem('aractakip_session_active', 'true')
        }
    }, [lockSettings.enabled, isPrintRoute])

    const { user } = useAuth()

    useEffect(() => {
        if (isPrintRoute) return

        if (isIdle && user && lockSettings.enabled) {
            setIsLocked(true)
            localStorage.setItem('aractakip_locked', 'true')
        }
    }, [isIdle, user, lockSettings.enabled, isPrintRoute])

    useEffect(() => {
        if (!lockSettings.enabled && isLocked) {
            handleUnlock()
        }
    }, [lockSettings.enabled, isLocked])

    const handleUnlock = () => {
        setIsLocked(false)
        localStorage.removeItem('aractakip_locked')
    }

    return (
        <ErrorBoundary>
            <LockScreen isLocked={!isPrintRoute && isLocked && !!user && lockSettings.enabled} onUnlock={handleUnlock} />
            <AppRoutes />
        </ErrorBoundary>
    )
}

export default App
