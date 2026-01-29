import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initializeAppKit } from './reown.config'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

// CRITICAL: Initialize AppKit BEFORE creating React root
// This ensures the store is ready before any hooks are called
initializeAppKit()

const queryClient = new QueryClient()

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <App />
        </AuthProvider>
    </QueryClientProvider>,
)
