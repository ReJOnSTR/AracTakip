import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import { ThemeProvider } from './context/ThemeContext'
import TitleBar from './components/TitleBar'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'
import Maintenance from './pages/Maintenance'
import Inspections from './pages/Inspections'
import Insurance from './pages/Insurance'
import Assignments from './pages/Assignments'
import Settings from './pages/Settings'
import Reports from './pages/Reports'

import PrintPage from './pages/PrintPage'
import Services from './pages/Services'

import Sidebar from './components/Sidebar'
import Header from './components/Header'

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

    return children
}

import { useNotification } from './hooks/useNotification'

function MainLayout({ children }) {
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
            <TitleBar />
            <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ marginTop: '38px', height: 'calc(100vh - 38px)' }}>
                <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
                <div className="main-content">
                    <Header />
                    <div className="page-content">
                        {children}
                    </div>
                </div>
            </div>
        </>
    )
}

function AppRoutes() {
    const { user } = useAuth()

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

            <Route path="/" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Dashboard />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/companies" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Companies />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/vehicles" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Vehicles />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/vehicles/:id" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <VehicleDetail />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/maintenance" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Maintenance />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/inspections" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Inspections />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/insurance" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Insurance />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/services" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Services />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/assignments" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Assignments />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/settings" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Settings />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/reports" element={
                <ProtectedRoute>
                    <CompanyProvider>
                        <MainLayout>
                            <Reports />
                        </MainLayout>
                    </CompanyProvider>
                </ProtectedRoute>
            } />

            <Route path="/print" element={<PrintPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function App() {
    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </ThemeProvider>
        </Router>
    )
}

export default App
