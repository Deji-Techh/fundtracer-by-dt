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
import App from './App'
import './index.css'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId from Reown Dashboard
const projectId = '4e674e1e78cf4aeccc58b6ba6e810c13'

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
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>
    </WagmiProvider>,
)
