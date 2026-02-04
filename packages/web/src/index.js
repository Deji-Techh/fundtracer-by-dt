// Export components
export { PriceChart } from './components/PriceChart.jsx';
export { LiveTradesPanel } from './components/LiveTradesPanel.jsx';
export { TrendingPoolsWidget } from './components/TrendingPoolsWidget.jsx';

// Export hooks
export {
  usePoolChartData,
  useLiveTrades,
  useTrendingPools,
  usePrefetchPoolData
} from './hooks/usePoolChartData.js';

// Export utilities
export { fetchWithRetry, safeFetch, fetchWithCache, geckoTerminal, dexScreener } from './lib/apiClient.js';
export { CHAINS, DEFAULT_CHAIN, getChainConfig, getEnabledChains } from './lib/chains.js';
export { cache } from './lib/cache.js';
