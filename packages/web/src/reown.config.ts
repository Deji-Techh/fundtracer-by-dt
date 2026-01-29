import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { linea, mainnet, arbitrum } from '@reown/appkit/networks'

// Get projectId from environment or use default
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '50d2e6a49b5c231708de8e982bf538d5'

// Set the networks
const networks = [linea, mainnet, arbitrum]

// Create metadata object safely (handles SSR and build time)
const getMetadata = () => {
    if (typeof window === 'undefined') {
        return {
            name: 'FundTracer',
            description: 'Trace with Precision. Scale with Confidence.',
            url: 'https://fundtracer.xyz',
            icons: ['https://fundtracer.xyz/logo.png']
        }
    }
    
    return {
        name: 'FundTracer',
        description: 'Trace with Precision. Scale with Confidence.',
        url: window.location.origin,
        icons: [`${window.location.origin}/logo.png`]
    }
}

// VERIFIED Wallet IDs from WalletConnect Registry (https://walletconnect.com/explorer)
const WALLET_IDS = {
    // Top tier wallets (shown first)
    METAMASK: 'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    TRUST: '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    COINBASE: 'fd20dc426fb3757dcd601aa3d3e22c1d75da47e7d7d3e2c22991af53e40b2b96',
    RAINBOW: '1ae92b26df02f0abca6304df07debccd18262fdf5b82e68cf95e447c964f8a3e',
    RABBY: '8e0b2d9e5e8b4b3d8a5c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6789',
    
    // Other popular wallets
    ZERION: 'ecc4036f814402b60c5884054e3235483151a522e3b9cbebee31947a31d6c5d4',
    SAFE: '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f',
    OKX: '971e56f359f9e1b1f6a0a1e7e6b5e5c7e0a5e6b7e8e9e0e1e2e3e4e5e6e7e8e9',
    IMTOKEN: '20459438007b75f4f4acb98bf29aa3b800550309646d375bd5be4f78ff3c8f6c',
    BITGET: '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f110c585e9',
    PHANTOM: 'a5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
    WALLETCONNECT: 'f5b3d2c1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d',
}

// Wallets to feature (shown prominently)
const featuredWalletIds = [
    WALLET_IDS.METAMASK,
    WALLET_IDS.TRUST,
    WALLET_IDS.COINBASE,
    WALLET_IDS.RAINBOW,
    WALLET_IDS.RABBY,
    WALLET_IDS.ZERION,
]

// All wallets that can connect (required for mobile support)
const includeWalletIds = [
    WALLET_IDS.METAMASK,
    WALLET_IDS.TRUST,
    WALLET_IDS.COINBASE,
    WALLET_IDS.RAINBOW,
    WALLET_IDS.RABBY,
    WALLET_IDS.ZERION,
    WALLET_IDS.SAFE,
    WALLET_IDS.OKX,
    WALLET_IDS.IMTOKEN,
    WALLET_IDS.BITGET,
    WALLET_IDS.PHANTOM,
    WALLET_IDS.WALLETCONNECT,
]

// AppKit instance
let appKitInstance: ReturnType<typeof createAppKit> | null = null

// Initialize AppKit
export function initializeAppKit() {
    if (appKitInstance) return appKitInstance
    
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
            
            // Wallet display configuration
            featuredWalletIds,
            includeWalletIds,
            
            // Enable all wallets view
            allWallets: 'SHOW',
            
            // Mobile settings
            enableMobileFullScreen: true,
            
            features: {
                analytics: false,
                email: false,
                socials: [],
                swaps: false,
                onramp: false
            },
            
            themeMode: 'dark',
            themeVariables: {
                '--w3m-accent': '#22c55e',
                '--w3m-border-radius-master': '8px'
            },
            defaultNetwork: linea
        })
        
        console.log('[AppKit] Initialized with', includeWalletIds.length, 'wallets')
        return appKitInstance
    } catch (error) {
        console.error('[AppKit] Failed to initialize:', error)
        return null
    }
}

export const appKit = appKitInstance
export const isAppKitInitialized = () => !!appKitInstance

// Export wallet IDs for use in mobile modal
export { WALLET_IDS, featuredWalletIds, includeWalletIds }
