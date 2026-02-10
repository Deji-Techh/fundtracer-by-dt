import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initializeAppKit } from './reown.config'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import './index.css'

// CRITICAL: Initialize AppKit BEFORE creating React root
// This ensures the store is ready before any hooks are called
// This setup was proven to work for mobile wallet connections
initializeAppKit()

// Setup queryClient with optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Wait between retries (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for crypto prices)
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect (we have other mechanisms)
      refetchOnReconnect: false,
      // Show errors in console but don't crash UI
      throwOnError: false,
    },
    mutations: {
      // Retry mutations once (they might fail due to network issues)
      retry: 1,
      retryDelay: 1000,
    },
  },
})

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
    <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </ErrorBoundary>,
)
