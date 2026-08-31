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
import PersonnelHeader from './components/PersonnelHeader'
import TopProgressBar from './components/TopProgressBar'
import CommandPalette from './components/CommandPalette'
import LockScreen from './components/LockScreen'
import { useIdle } from './hooks/useIdle'

// Resilient lazy import helper that automatically reloads the page once if a stale chunk 404s after a new deployment
const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageAlreadyRefreshed = JSON.parse(
            window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
        );
        try {
            const component = await componentImport();
            window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
            return component;
        } catch (error) {
            const msg = error?.message || '';
            if (!pageAlreadyRefreshed && (msg.includes('dynamically imported module') || msg.includes('Failed to fetch') || error.name === 'ChunkLoadError')) {
                window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
                window.location.reload();
                return new Promise(() => {});
            }
            throw error;
        }
    });

// Lazy-loaded pages with chunk error auto-retry
const Login = lazyWithRetry(() => import('./pages/Login'))
const Register = lazyWithRetry(() => import('./pages/Register'))
const ResetPassword = lazyWithRetry(() => import('./pages/ResetPassword'))
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'))
const MainPortal = lazyWithRetry(() => import('./pages/MainPortal'))
const FinanceDashboard = lazyWithRetry(() => import('./pages/FinanceDashboard'))
const Finance = lazyWithRetry(() => import('./pages/Finance'))
const Checks = lazyWithRetry(() => import('./pages/Checks'))
const Companies = lazyWithRetry(() => import('./pages/Companies'))
const Vehicles = lazyWithRetry(() => import('./pages/Vehicles'))
const VehicleDetail = lazyWithRetry(() => import('./pages/VehicleDetail'))
const ArventoTracking = lazyWithRetry(() => import('./pages/ArventoTracking'))
const Maintenance = lazyWithRetry(() => import('./pages/Maintenance'))
const Inspections = lazyWithRetry(() => import('./pages/Inspections'))
const PeriodicInspections = lazyWithRetry(() => import('./pages/PeriodicInspections'))
const Insurance = lazyWithRetry(() => import('./pages/Insurance'))
const Assignments = lazyWithRetry(() => import('./pages/Assignments'))
const Settings = lazyWithRetry(() => import('./pages/Settings'))
const Reports = lazyWithRetry(() => import('./pages/Reports'))
const EmployeeReports = lazyWithRetry(() => import('./pages/EmployeeReports'))
const PrintPage = lazyWithRetry(() => import('./pages/PrintPage'))
const Services = lazyWithRetry(() => import('./pages/Services'))
const ChangePassword = lazyWithRetry(() => import('./pages/ChangePassword'))
const MealTickets = lazyWithRetry(() => import('./pages/MealTickets'))
const MealTicketReport = lazyWithRetry(() => import('./pages/MealTicketReport'))
const MealTicketSettings = lazyWithRetry(() => import('./pages/MealTicketSettings'))
const Employees = lazyWithRetry(() => import('./pages/Employees'))
const EmployeeDetail = lazyWithRetry(() => import('./pages/EmployeeDetail'))
const PersonelDashboard = lazyWithRetry(() => import('./pages/PersonelDashboard'))
const PayrollDashboard = lazyWithRetry(() => import('./pages/PayrollDashboard'))
const Leaves = lazyWithRetry(() => import('./pages/Leaves'))
const Overtimes = lazyWithRetry(() => import('./pages/Overtimes'))
const Works = lazyWithRetry(() => import('./pages/Works'))
const WorkDetails = lazyWithRetry(() => import('./pages/WorkDetails'))
const WorkPdfReport = lazyWithRetry(() => import('./pages/WorkPdfReport'))
const Customers = lazyWithRetry(() => import('./pages/Customers'))
const CustomerDetail = lazyWithRetry(() => import('./pages/CustomerDetail'))
const ModuleSettings = lazyWithRetry(() => import('./pages/ModuleSettings'))
const Profile = lazyWithRetry(() => import('./pages/Profile'))
const PrintDocument = lazyWithRetry(() => import('./pages/PrintDocument'))
const PersonnelDashboardPortal = lazyWithRetry(() => import('./components/personnel/PersonnelDashboard'))
const ApprovalCenter = lazyWithRetry(() => import('./components/personnel/ApprovalCenter'))
const PlatformAdmin = lazyWithRetry(() => import('./pages/PlatformAdmin'))

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

function AdminRoute({ children }) {
    const { isAdmin, loading } = useAuth()

    if (loading) return null
    if (!isAdmin) return <Navigate to="/portal" replace />
    return children
}

function SuperAdminRoute({ children }) {
    const { user, loading } = useAuth()
    const isSuperAdmin = user?.role === 'superadmin'

    if (loading) return null
    if (!isSuperAdmin) return <Navigate to="/dashboard" replace />
    return children
}

import BroadcastBanner from './components/BroadcastBanner'
import ImpersonationBanner from './components/ImpersonationBanner'

function MainLayout() {
    const { user } = useAuth()
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
            <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                <div className="main-content">
                    <ImpersonationBanner />
                    <TabBar />
                    <BroadcastBanner />
                    <div className="page-content">
                        <ErrorBoundary>
                            <Suspense fallback={<PageLoader />}>
                                <Outlet />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
        </>
    )
}

function MainLayoutWrapper() {
    return (
        <TabProvider>
            <MainLayout />
        </TabProvider>
    )
}

import { useDataListener } from './hooks/useDataListener'

function AppRoutes() {
    useDataListener() // Global real-time data listener
    const { user } = useAuth()
    const location = useLocation()
    const isPrintRoute = location.pathname === '/print' || location.pathname === '/print-document' || location.pathname.startsWith('/work-report')

    const urlParams = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''))
    const isImpersonating = !!(urlParams.get('impersonate_company_id') || sessionStorage.getItem('aractakip_impersonate_company_id'))
    const isStandaloneSuperAdmin = user?.role === 'superadmin' && !isImpersonating

    return (
        <>
            {!isPrintRoute && <TitleBar />}
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
                    <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/change-password" element={<ChangePassword />} />

                    <Route element={
                        <ProtectedRoute>
                            <CompanyProvider>
                                <MainLayoutWrapper />
                            </CompanyProvider>
                        </ProtectedRoute>
                    }>
                        <Route path="/" element={
                            isStandaloneSuperAdmin
                                ? <Navigate to="/platform/users" replace />
                                : (user?.role === 'personnel' ? <Navigate to="/personnel-profile" replace /> : <Navigate to="/portal" replace />)
                        } />
                        <Route path="/portal" element={
                            user?.role === 'personnel' 
                                ? <Navigate to="/personnel-profile" replace /> 
                                : (isStandaloneSuperAdmin ? <Navigate to="/platform/users" replace /> : <MainPortal />)
                        } />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/finance-dashboard" element={<FinanceDashboard />} />
                        <Route path="/finance" element={<Finance />} />
                        <Route path="/checks" element={<Checks />} />
                        <Route path="/meal-tickets" element={<MealTickets />} />
                        <Route path="/meal-ticket-report" element={<MealTicketReport />} />
                        <Route path="/meal-ticket-settings" element={<MealTicketSettings />} />
                        <Route path="/companies" element={<AdminRoute><Companies /></AdminRoute>} />
                        <Route path="/vehicles" element={<Vehicles />} />
                        <Route path="/vehicles/:id" element={<VehicleDetail />} />
                        <Route path="/arvento-tracking" element={<ArventoTracking />} />
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
                        <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
                        <Route path="/module-settings/:module" element={<AdminRoute><ModuleSettings /></AdminRoute>} />
                        <Route path="/platform-admin" element={<Navigate to="/platform/users" replace />} />
                        <Route path="/platform" element={<Navigate to="/platform/users" replace />} />
                        <Route path="/platform/users" element={<SuperAdminRoute><PlatformAdmin section="users" /></SuperAdminRoute>} />
                        <Route path="/platform/companies" element={<SuperAdminRoute><PlatformAdmin section="companies" /></SuperAdminRoute>} />
                        <Route path="/platform/announcements" element={<SuperAdminRoute><PlatformAdmin section="announcements" /></SuperAdminRoute>} />
                        <Route path="/platform/email-templates" element={<SuperAdminRoute><PlatformAdmin section="email-templates" /></SuperAdminRoute>} />
                        <Route path="/platform/audit" element={<SuperAdminRoute><PlatformAdmin section="audit" /></SuperAdminRoute>} />
                        <Route path="/platform/health" element={<SuperAdminRoute><PlatformAdmin section="health" /></SuperAdminRoute>} />
                        <Route path="/platform/logs" element={<SuperAdminRoute><PlatformAdmin section="logs" /></SuperAdminRoute>} />
                        <Route path="/platform/backups" element={<SuperAdminRoute><PlatformAdmin section="backups" /></SuperAdminRoute>} />
                        <Route path="/approvals" element={<ApprovalCenter />} />
                        <Route path="/personnel-portal" element={<Navigate to="/personnel-profile" replace />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/employee-reports" element={<EmployeeReports />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/personnel-profile" element={<EmployeeDetail />} />
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
        try {
            return JSON.parse(localStorage.getItem('aractakip_lock_settings') || '{"enabled":false,"timeout":5,"useCustomPassword":false,"customPassword":""}')
        } catch {
            return { enabled: false, timeout: 5, useCustomPassword: false, customPassword: "" }
        }
    })

    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === 'aractakip_lock_settings') {
                try {
                    setLockSettings(JSON.parse(e.newValue || '{}'))
                } catch (err) {
                    console.error('Lock settings storage parse error:', err)
                }
            }
        }
        const handleCustomEvent = (e) => {
            if (e.detail) {
                setLockSettings(e.detail)
            } else {
                try {
                    setLockSettings(JSON.parse(localStorage.getItem('aractakip_lock_settings') || '{}'))
                } catch (err) {
                    console.error('Lock settings custom event parse error:', err)
                }
            }
        }

        window.addEventListener('storage', handleStorage)
        window.addEventListener('aractakip_lock_settings_changed', handleCustomEvent)
        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('aractakip_lock_settings_changed', handleCustomEvent)
        }
    }, [])
    
    const { isIdle, resetIdle } = useIdle(lockSettings.enabled ? lockSettings.timeout * 60000 : 999999999) 
    
    const [isLocked, setIsLocked] = useState(() => {
        try {
            const settings = JSON.parse(localStorage.getItem('aractakip_lock_settings') || '{"enabled":false}')
            if (!settings.enabled) return false
            return localStorage.getItem('aractakip_locked') === 'true'
        } catch {
            return false
        }
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

    const handleUnlock = () => {
        setIsLocked(false)
        localStorage.removeItem('aractakip_locked')
        resetIdle()
    }

    useEffect(() => {
        if (!lockSettings.enabled && isLocked) {
            handleUnlock()
        }
    }, [lockSettings.enabled, isLocked])

    return (
        <ErrorBoundary>
            <LockScreen isLocked={!isPrintRoute && isLocked && !!user && lockSettings.enabled} onUnlock={handleUnlock} />
            <AppRoutes />
        </ErrorBoundary>
    )
}

export default App
