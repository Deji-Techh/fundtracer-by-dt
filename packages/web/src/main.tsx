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

// 0. Setup queryClient with optimized configuration
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

// 3. Set the networks (explicitly typed to satisfy AppKit requirements)
const networks: [typeof linea, typeof mainnet, typeof arbitrum] = [linea, mainnet, arbitrum]

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
