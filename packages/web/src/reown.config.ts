import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { linea, mainnet, arbitrum } from '@reown/appkit/networks'

// Get projectId from environment or use default
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '50d2e6a49b5c231708de8e982bf538d5'

// Set the networks
const networks = [linea, mainnet, arbitrum]

// Create metadata object safely (handles SSR and build time)
const getMetadata = () => {
    // During build/SSR, window is not available
    if (typeof window === 'undefined') {
        return {
            name: 'FundTracer',
            description: 'Trace with Precision. Scale with Confidence.',
            url: 'https://fundtracer.xyz',
            icons: ['https://fundtracer.xyz/logo.png']
        }
    }
    
    // In browser, use dynamic URLs
    return {
        name: 'FundTracer',
        description: 'Trace with Precision. Scale with Confidence.',
        url: window.location.origin,
        icons: [`${window.location.origin}/logo.png`]
    }
}

// AppKit instance - created at module load time for production builds
let appKitInstance: ReturnType<typeof createAppKit> | null = null

// Initialize AppKit - creates the store synchronously
export function initializeAppKit() {
    // Return existing instance if already created
    if (appKitInstance) {
        return appKitInstance
    }
    
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
        console.warn('[AppKit] Cannot initialize in non-browser environment')
        return null
    }
    
    try {
        appKitInstance = createAppKit({
            adapters: [new EthersAdapter()],
            networks: networks,
            metadata: getMetadata(),
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
        
        console.log('[AppKit] Initialized successfully')
        return appKitInstance
    } catch (error) {
        console.error('[AppKit] Failed to initialize:', error)
        return null
    }
}

// Export the instance getter (for hooks that need it)
export const appKit = appKitInstance

// Check if AppKit is initialized
export const isAppKitInitialized = () => !!appKitInstance
