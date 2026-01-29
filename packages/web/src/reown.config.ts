import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { linea, mainnet, arbitrum } from '@reown/appkit/networks'

// Get projectId from environment or use default
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '50d2e6a49b5c231708de8e982bf538d5'

// Set the networks
const networks = [linea, mainnet, arbitrum]

// Create metadata object
const metadata = {
    name: 'FundTracer',
    description: 'Trace with Precision. Scale with Confidence.',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://fundtracer.xyz',
    icons: typeof window !== 'undefined' ? [`${window.location.origin}/logo.png`] : ['https://fundtracer.xyz/logo.png']
}

// Create the AppKit instance - this must be called before any hooks are used
export const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: networks,
    metadata,
    projectId,
    features: {
        analytics: false,
        email: false,
        socials: [],
        swaps: false,
        onramp: false
    },
    featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
        'fd20dc426fb3757dcd601aa3d3e22c1d75da47e7d7d3e2c22991af53e40b2b96',
        '1ae92b26df02f0abca6304df07debccd18262fdf5b82e68cf95e447c964f8a3e',
        'ecc4036f814402b60c5884054e3235483151a522e3b9cbebee31947a31d6c5d4'
    ],
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#22c55e',
        '--w3m-border-radius-master': '8px'
    },
    defaultNetwork: linea
})

// Export a flag to check if AppKit is initialized
export const isAppKitInitialized = !!appKit
