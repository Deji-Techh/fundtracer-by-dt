import './polyfills';
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

// Initialize AppKit immediately before rendering
// This ensures the store is ready before any hooks are called
import { isAppKitInitialized } from './reown.config'

const queryClient = new QueryClient()

// Wrapper component to ensure AppKit is ready
function AppKitWrapper({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        // Small delay to ensure AppKit initialization is complete
        const timer = setTimeout(() => {
            setIsReady(true)
        }, 100)
        return () => clearTimeout(timer)
    }, [])

    if (!isReady) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0a0a0f',
                color: '#22c55e'
            }}>
                <div>
                    <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
                    <p>Initializing...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppKitWrapper>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </AppKitWrapper>
        </QueryClientProvider>
    </React.StrictMode>,
)
