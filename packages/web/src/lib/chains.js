// Chain mapping configuration for GeckoTerminal and DexScreener
export const CHAINS = {
  ethereum: { 
    gecko: 'ethereum', 
    dex: 'ethereum',
    name: 'Ethereum',
    color: '#627eea'
  },
  arbitrum: { 
    gecko: 'arbitrum', 
    dex: 'arbitrum',
    name: 'Arbitrum',
    color: '#28a0f0'
  },
  linea: { 
    gecko: 'linea', 
    dex: 'linea',
    name: 'Linea',
    color: '#61dfff'
  },
  base: { 
    gecko: 'base', 
    dex: 'base',
    name: 'Base',
    color: '#0052ff'
  },
  bsc: { 
    gecko: 'bsc', 
    dex: 'bsc',
    name: 'BSC',
    color: '#f0b90b'
  },
  optimism: { 
    gecko: 'optimism', 
    dex: 'optimism',
    name: 'Optimism',
    color: '#ff0420'
  },
  polygon: { 
    gecko: 'polygon_pos', 
    dex: 'polygon',
    name: 'Polygon',
    color: '#8247e5'
  }
};

export const DEFAULT_CHAIN = 'linea';

export const getChainConfig = (chainId) => CHAINS[chainId] || CHAINS[DEFAULT_CHAIN];

export const getEnabledChains = () => 
  Object.entries(CHAINS).map(([key, config]) => ({ id: key, ...config }));

// API endpoints
export const getGeckoTerminalOHLCVUrl = (network, poolAddress, timeframe = 'hour', aggregate = '1') => {
  return `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=100`;
};

export const getGeckoTerminalTradesUrl = (network, poolAddress, limit = 50) => {
  return `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}/trades?limit=${limit}`;
};

export const getGeckoTerminalTopPoolsUrl = (network) => {
  return `https://api.geckoterminal.com/api/v2/networks/${network}/top_pools`;
};

export const getDexScreenerPairUrl = (chain, pairAddress) => {
  return `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`;
};

export const getDexScreenerSearchUrl = (query) => {
  return `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
};
