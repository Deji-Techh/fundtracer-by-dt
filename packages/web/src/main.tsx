import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import './index.css'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || ''

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
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <ToastProvider>
                        {PRIVY_APP_ID ? (
                            <PrivyProvider
                                appId={PRIVY_APP_ID}
                                config={{
                                    appearance: {
                                        theme: 'dark',
                                        accentColor: '#22d3ee',
                                    },
                                    embeddedWallets: {
                                        createOnLogin: 'users-without-wallets',
                                    },
                                }}
                            >
                                <AuthProvider>
                                    <App />
                                </AuthProvider>
                            </PrivyProvider>
                        ) : (
                            <AuthProvider>
                                <NotificationProvider>
                                    <App />
                                </NotificationProvider>
                            </AuthProvider>
                        )}
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </ErrorBoundary>,
)
