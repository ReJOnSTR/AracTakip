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
const Works = lazy(() => import('./pages/Works'))
const WorkDetails = lazy(() => import('./pages/WorkDetails'))
const WorkPdfReport = lazy(() => import('./pages/WorkPdfReport'))
const Customers = lazy(() => import('./pages/Customers'))
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'))
const ModuleSettings = lazy(() => import('./pages/ModuleSettings'))
const Profile = lazy(() => import('./pages/Profile'))

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
    useNotification() // Activate notification system
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
    const isPrintRoute = location.pathname === '/print' || location.pathname.startsWith('/work-report')

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
                        <Route path="/personel-dashboard" element={<PersonelDashboard />} />
                        <Route path="/payroll" element={<PayrollDashboard />} />
                        <Route path="/works" element={<Works />} />
                        <Route path="/works/:id" element={<WorkDetails />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/customers/:id" element={<CustomerDetail />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/module-settings/:module" element={<ModuleSettings />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route path="/print" element={<PrintPage />} />
                    <Route path="/work-report/:id" element={<WorkPdfReport />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes >
            </Suspense >
        </>
    )
}

function App() {
    useEffect(() => {
        // Detect platform for CSS adjustments (Windows title bar overlay)
        const isWindows = navigator.userAgent.includes('Windows') || navigator.platform.startsWith('Win')
        if (isWindows) {
            document.body.setAttribute('data-platform', 'win32')
        } else if (navigator.userAgent.includes('Mac')) {
            document.body.setAttribute('data-platform', 'darwin')
        }
    }, [])

    return (
        <ErrorBoundary>
            <AppRoutes />
        </ErrorBoundary>
    )
}

export default App
