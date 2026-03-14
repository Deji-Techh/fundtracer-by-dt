// ============================================================
// FundTracer by DT - Chain Configuration
// ============================================================

import { ChainConfig, ChainId } from './types.js';

export const CHAINS: Record<ChainId, ChainConfig> = {
    ethereum: {
        id: 'ethereum',
        chainId: 1,
        name: 'Ethereum',
        symbol: 'ETH',
        explorer: 'https://etherscan.io',
        apiUrl: 'https://api.etherscan.io/v2/api',
        enabled: true,
    },
    linea: {
        id: 'linea',
        chainId: 59144,
        name: 'Linea',
        symbol: 'ETH',
        explorer: 'https://lineascan.build',
        apiUrl: 'https://api.etherscan.io/v2/api',
        enabled: true,
    },
    arbitrum: {
        id: 'arbitrum',
        chainId: 42161,
        name: 'Arbitrum One',
        symbol: 'ETH',
        explorer: 'https://arbiscan.io',
        apiUrl: 'https://api.etherscan.io/v2/api',
        enabled: true,
    },
    base: {
        id: 'base',
        chainId: 8453,
        name: 'Base',
        symbol: 'ETH',
        explorer: 'https://basescan.org',
        apiUrl: 'https://api.etherscan.io/v2/api',
        enabled: true,
    },
    optimism: {
        id: 'optimism',
        chainId: 10,
        name: 'Optimism',
        symbol: 'ETH',
        explorer: 'https://optimistic.etherscan.io',
        apiUrl: 'https://api.etherscan.io/v2/api',
        enabled: true,
    },
    polygon: {
        id: 'polygon',
        chainId: 137,
        name: 'Polygon',
        symbol: 'MATIC',
        explorer: 'https://polygonscan.com',
        apiUrl: 'https://api.etherscan.io/v2/api',
        enabled: true,
    },
    bsc: {
        id: 'bsc',
        chainId: 56,
        name: 'BNB Chain',
        symbol: 'BNB',
        explorer: 'https://bscscan.com',
        apiUrl: 'https://api.bscscan.com/api',
        enabled: true,
    },
};

export const getEnabledChains = (): ChainConfig[] =>
    Object.values(CHAINS).filter(c => c.enabled);

export const getChainConfig = (chainId: ChainId): ChainConfig =>
    CHAINS[chainId];
