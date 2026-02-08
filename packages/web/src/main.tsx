import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { linea, mainnet, arbitrum } from '@reown/appkit/networks'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import './index.css'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from environment variables
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  console.error('CRITICAL: VITE_WALLETCONNECT_PROJECT_ID environment variable is not set')
  console.error('Get a free project ID at: https://cloud.reown.com/')
  throw new Error('WalletConnect Project ID is required')
}

// 2. Create a metadata object
const metadata = {
  name: 'FundTracer',
  description: 'Trace with Precision. Scale with Confidence.',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://fundtracer.xyz',
  icons: ['https://fundtracer.xyz/logo.png']
}

// 3. Set the networks
const networks = [linea, mainnet, arbitrum]

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
})

// 5. Create modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: [],
    swaps: false,
    onramp: false
  },
  themeMode: 'dark'
})

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
    <ErrorBoundary>
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </ToastProvider>
            </QueryClientProvider>
        </WagmiProvider>
    </ErrorBoundary>,
)
