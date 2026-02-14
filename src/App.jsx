import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { CompanyProvider, useCompany } from './context/CompanyContext'

import { useNotification } from './hooks/useNotification'
import ErrorBoundary from './components/ErrorBoundary'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

// Lazy-loaded pages (code splitting)
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
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

function PageLoader() {
    return (
        <div className="loading-screen" style={{ height: 'auto', padding: '60px' }}>
            <div className="loading-spinner"></div>
            <p>Yükleniyor...</p>
        </div>
    )
}

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Yükleniyor...</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    // Force password change if required
    if (user.mustChangePassword) {
        return <Navigate to="/change-password" replace />
    }

    return children
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
            <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ marginTop: '38px', height: 'calc(100vh - 38px)' }}>
                <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                <div className="main-content">
                    <Header />
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

function AppRoutes() {
    const { user } = useAuth()

    return (
        <>
            <TitleBar />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
                    <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
                    <Route path="/change-password" element={<ChangePassword />} />

                    <Route element={
                        <ProtectedRoute>
                            <CompanyProvider>
                                <MainLayout />
                            </CompanyProvider>
                        </ProtectedRoute>
                    }>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/companies" element={<Companies />} />
                        <Route path="/vehicles" element={<Vehicles />} />
                        <Route path="/vehicles/:id" element={<VehicleDetail />} />
                        <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/inspections" element={<Inspections />} />
                        <Route path="/periodic-inspections" element={<PeriodicInspections />} />
                        <Route path="/insurance" element={<Insurance />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/assignments" element={<Assignments />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/reports" element={<Reports />} />
                    </Route>

                    <Route path="/print" element={<PrintPage />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </>
    )
}

function App() {
    return (
        <ErrorBoundary>
            <AppRoutes />
        </ErrorBoundary>
    )
}

export default App
