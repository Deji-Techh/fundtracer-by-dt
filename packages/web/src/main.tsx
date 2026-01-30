import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { config } from './config/rainbow'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
    <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
                appInfo={{
                    appName: 'FundTracer',
                    learnMoreUrl: 'https://fundtracer.xyz',
                }}
                theme={{
                    accentColor: '#22c55e',
                    accentColorForeground: '#ffffff',
                    borderRadius: 'large',
                    fontStack: 'system',
                    overlayBlur: 'small',
                }}
            >
                <ToastProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </ToastProvider>
            </RainbowKitProvider>
        </QueryClientProvider>
    </WagmiProvider>,
)
