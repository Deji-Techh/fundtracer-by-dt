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
    priority: 1, // Top priority
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
  polygon: {
    id: 'polygon_pos',
    name: 'Polygon',
    displayName: 'Polygon',
    color: '#8247e5',
    icon: '/chains/polygon.svg',
    explorerUrl: 'https://polygonscan.com',
    enabled: true,
    priority: 4,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    displayName: 'Arbitrum',
    color: '#28a0f0',
    icon: '/chains/arbitrum.svg',
    explorerUrl: 'https://arbiscan.io',
    enabled: true,
    priority: 5,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    displayName: 'Optimism',
    color: '#ff0420',
    icon: '/chains/optimism.svg',
    explorerUrl: 'https://optimistic.etherscan.io',
    enabled: true,
    priority: 6,
  },
  bsc: {
    id: 'bsc',
    name: 'BSC',
    displayName: 'BSC',
    color: '#f0b90b',
    icon: '/chains/bsc.svg',
    explorerUrl: 'https://bscscan.com',
    enabled: true,
    priority: 7,
  },
};

export type ChainKey = keyof typeof CHAIN_CONFIG;

export const DEFAULT_CHAIN: ChainKey = 'linea';

export const getChainConfig = (chainKey: ChainKey) => CHAIN_CONFIG[chainKey];

export const getEnabledChains = () => 
  Object.entries(CHAIN_CONFIG)
    .filter(([_, config]) => config.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([key]) => key as ChainKey);

// Cloudflare Worker Proxy Configuration
export const PROXY_URL = 'https://calm-rain-20f2.aladeabdulmaleeq1.workers.dev';

// GeckoTerminal API helpers with proxy support
export const GECKOTERMINAL_BASE_URL = 'https://api.geckoterminal.com/api/v2';

// Helper function to create proxied URLs
export const createProxiedUrl = (targetUrl: string): string => {
  return `${PROXY_URL}/?url=${encodeURIComponent(targetUrl)}`;
};

export const getTrendingPoolsUrl = (network: string) => {
  const targetUrl = `${GECKOTERMINAL_BASE_URL}/networks/${network}/trending_pools`;
  return createProxiedUrl(targetUrl);
};

export const getPoolOHLCVUrl = (network: string, poolAddress: string, timeframe: string = 'hour') => {
  const targetUrl = `${GECKOTERMINAL_BASE_URL}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}`;
  return createProxiedUrl(targetUrl);
};

export const getPoolTradesUrl = (network: string, poolAddress: string) => {
  const targetUrl = `${GECKOTERMINAL_BASE_URL}/networks/${network}/pools/${poolAddress}/trades`;
  return createProxiedUrl(targetUrl);
};
