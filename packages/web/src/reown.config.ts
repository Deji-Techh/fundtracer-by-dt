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
    url: 'https://fundtracer.xyz',
    icons: ['https://fundtracer.xyz/logo.png']
}

// Create the AppKit instance with all wallets enabled
export const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: networks,
    metadata,
    projectId,
    features: {
        analytics: false, // Disable analytics
        email: false, // Disable email login
        socials: [], // Disable social logins
        swaps: false, // Disable swaps
        onramp: false // Disable onramp
    },
    // Featured wallets (optional - these will be shown first)
    featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        'fd20dc426fb3757dcd601aa3d3e22c1d75da47e7d7d3e2c22991af53e40b2b96', // Coinbase Wallet
        '1ae92b26df02f0abca6304df07debccd18262fdf5b82e68cf95e447c964f8a3e', // Rainbow
        'ecc4036f814402b60c5884054e3235483151a522e3b9cbebee31947a31d6c5d4'  // Zerion
    ],
    // All wallets for extended list
    includeWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        'fd20dc426fb3757dcd601aa3d3e22c1d75da47e7d7d3e2c22991af53e40b2b96', // Coinbase
        '1ae92b26df02f0abca6304df07debccd18262fdf5b82e68cf95e447c964f8a3e', // Rainbow
        'ecc4036f814402b60c5884054e3235483151a522e3b9cbebee31947a31d6c5d4', // Zerion
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
        '225affb176778569276e484e1b92637ad061b01e13a048b35a9d280c3b58970f', // Safe
        '971e56f359f9e1b1f6a0a1e7e6b5e5c7e0a5e6b7e8e9e0e1e2e3e4e5e6e7e8e9', // OKX
        '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f110c585e9', // Rabby
        '20459438007b75f4f4acb98bf29aa3b800550309646d375bd5be4f78ff3c8f6c', // imToken
        'c03dfee351b6fcc421b4494d33d813925c8d6e13d1d830b4b2e987ad3e30b1e0'  // Uniswap Wallet
    ],
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#22c55e',
        '--w3m-border-radius-master': '8px'
    },
    // Enable all features by default
    defaultNetwork: linea
})
