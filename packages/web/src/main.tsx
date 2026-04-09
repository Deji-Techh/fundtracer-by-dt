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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: false,
      throwOnError: false,
    },
    mutations: {
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
                                    <NotificationProvider>
                                        <App />
                                    </NotificationProvider>
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