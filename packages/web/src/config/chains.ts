// Chain configuration for GeckoTerminal API
export const CHAIN_CONFIG = {
  linea: {
    id: 'linea',
    name: 'Linea',
    displayName: 'Linea',
    color: '#61dfff',
    icon: '/chains/linea.svg',
    explorerUrl: 'https://lineascan.build',
    enabled: true,
    priority: 1,
  },
  ethereum: {
    id: 'eth',
    name: 'Ethereum',
    displayName: 'Ethereum',
    color: '#627eea',
    icon: '/chains/ethereum.svg',
    explorerUrl: 'https://etherscan.io',
    enabled: true,
    priority: 2,
  },
  base: {
    id: 'base',
    name: 'Base',
    displayName: 'Base',
    color: '#0052ff',
    icon: '/chains/base.svg',
    explorerUrl: 'https://basescan.org',
    enabled: true,
    priority: 3,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    displayName: 'Arbitrum',
    color: '#28a0f0',
    icon: '/chains/arbitrum.svg',
    explorerUrl: 'https://arbiscan.io',
    enabled: true,
    priority: 4,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    displayName: 'Optimism',
    color: '#ff0420',
    icon: '/chains/optimism.svg',
    explorerUrl: 'https://optimistic.etherscan.io',
    enabled: true,
    priority: 5,
  },
  bsc: {
    id: 'bsc',
    name: 'BSC',
    displayName: 'BSC',
    color: '#f0b90b',
    icon: '/chains/bsc.svg',
    explorerUrl: 'https://bscscan.com',
    enabled: true,
    priority: 6,
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    displayName: 'Solana',
    color: '#9945FF',
    icon: '/chains/solana.svg',
    explorerUrl: 'https://solscan.io',
    enabled: true,
    priority: 7,
  },
  sui: {
    id: 'sui',
    name: 'Sui',
    displayName: 'Sui',
    color: '#6f6feb',
    icon: '/chains/sui.svg',
    explorerUrl: 'https://suiys.com',
    explorer: 'https://suiys.com',
    enabled: true,
    priority: 8,
  },
};

export type ChainKey = keyof typeof CHAIN_CONFIG;

export const DEFAULT_CHAIN: ChainKey = 'linea';

export const getChainConfig = (chainKey: ChainKey) => CHAIN_CONFIG[chainKey];

export const getChainTokenSymbol = (chainKey: string): string => {
  const tokenSymbols: Record<string, string> = {
    ethereum: 'ETH',
    linea: 'ETH',
    arbitrum: 'ETH',
    base: 'ETH',
    optimism: 'ETH',
    bsc: 'BNB',
    solana: 'SOL',
    sui: 'SUI',
  };
  return tokenSymbols[chainKey] || 'ETH';
};

export const getEnabledChains = () => 
  Object.entries(CHAIN_CONFIG)
    .filter(([_, config]) => config.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([key]) => key as ChainKey);

// GeckoTerminal API helpers - using backend proxy routes
export const getTrendingPoolsUrl = (network: string) => {
  return `/api/geckoterminal/trending-pools/${network}`;
};

export const getPoolOHLCVUrl = (network: string, poolAddress: string, timeframe: string = 'hour') => {
  return `/api/geckoterminal/ohlcv/${network}/${poolAddress}?timeframe=${timeframe}`;
};

export const getPoolTradesUrl = (network: string, poolAddress: string) => {
  return `/api/geckoterminal/trades/${network}/${poolAddress}`;
};
