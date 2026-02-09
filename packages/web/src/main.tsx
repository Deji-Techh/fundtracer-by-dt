import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { 
  linea, 
  mainnet, 
  arbitrum, 
  polygon, 
  optimism, 
  base,
  type AppKitNetwork 
} from '@reown/appkit/networks'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
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
// IMPORTANT: Use hardcoded URL for mobile wallet connection consistency
const metadata = {
  name: 'FundTracer',
  description: 'Trace with Precision. Scale with Confidence.',
  url: 'https://fundtracer.xyz',
  icons: ['https://fundtracer.xyz/logo.png']
}

// 3. Set the networks with explicit RPC URLs for mobile compatibility
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  linea,
  mainnet,
  arbitrum,
  polygon,
  optimism,
  base
]

// Explicit RPC URLs for each network (helps mobile wallets)
const rpcUrls = {
  59144: 'https://rpc.linea.build', // Linea
  1: 'https://eth.llamarpc.com', // Ethereum
  42161: 'https://arb1.arbitrum.io/rpc', // Arbitrum
  137: 'https://polygon.llamarpc.com', // Polygon
  10: 'https://mainnet.optimism.io', // Optimism
  8453: 'https://mainnet.base.org', // Base
}

// 4. Create Wagmi Adapter with explicit transports
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
})

// 5. Create modal with mobile-optimized config
const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  // Use new WalletConnect relay URL (not the old .org domain)
  relayUrl: 'wss://relay.walletconnect.com',
  features: {
    analytics: false,
    email: false,
    socials: [],
    swaps: false,
    onramp: false
  },
  // Featured wallets shown first in the modal (MetaMask, Trust, Coinbase, Rainbow)
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e18e93c30de2ce23c4', // Coinbase Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
  ],
  themeMode: 'dark',
  // Allow all wallets but prioritize popular mobile ones
  allWallets: 'SHOW',
  // Allow chains not in our network list (helps mobile wallets on wrong chain)
  allowUnsupportedChain: true,
  // Enable injected wallets (MetaMask, Trust in-app browser, etc.)
  enableInjected: true,
  // Enable WalletConnect protocol for mobile deep-linking
  enableWalletConnect: true,
  // Enable Coinbase SDK
  enableCoinbase: true,
  // Mobile-specific settings
  mobileWalletName: 'FundTracer',
})

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
    <ErrorBoundary>
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <ToastProvider>
                        <AuthProvider>
                            <App />
                        </AuthProvider>
                    </ToastProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </WagmiProvider>
    </ErrorBoundary>,
)
