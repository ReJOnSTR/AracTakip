import './services/apiBridge'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter as Router } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CompanyProvider } from './context/CompanyContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes
            refetchOnWindowFocus: false, // Electron app usually doesn't need this aggressive check
        },
    },
})

// Ensure inputs never lose active typing / first-responder ability in Electron / Web
if (typeof window !== 'undefined') {
    const ensureInputActive = (target) => {
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
            if (window.electronAPI && typeof window.electronAPI.focusWindow === 'function') {
                window.electronAPI.focusWindow();
            }
        }
    };

    document.addEventListener('pointerdown', (e) => ensureInputActive(e.target), { capture: true, passive: true });
    document.addEventListener('focusin', (e) => ensureInputActive(e.target), { capture: true, passive: true });
    
    window.addEventListener('focus', () => {
        if (window.electronAPI && typeof window.electronAPI.focusWindow === 'function') {
            window.electronAPI.focusWindow();
        }
    });

    // Auto-recover from stale Vite deployment chunks (404 dynamic import errors after a new release)
    window.addEventListener('vite:preloadError', (event) => {
        console.warn('[Vite Preload] New version deployed or chunk failed to load. Auto-refreshing...', event);
        window.location.reload();
    });

    window.addEventListener('error', (event) => {
        const msg = event?.message || '';
        if (msg.includes('error loading dynamically imported module') || msg.includes('Failed to fetch dynamically imported module')) {
            console.warn('[Dynamic Import] Stale module detected, reloading page to fetch latest version...', msg);
            const lastReload = sessionStorage.getItem('last_chunk_reload');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
                sessionStorage.setItem('last_chunk_reload', String(now));
                window.location.reload();
            }
        }
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ThemeProvider>
                    <ToastProvider>
                        <AuthProvider>
                            <CompanyProvider>
                                <App />
                            </CompanyProvider>
                        </AuthProvider>
                    </ToastProvider>
                </ThemeProvider>
            </Router>
        </QueryClientProvider>
    </React.StrictMode>,
)
