import React, { useState, useEffect } from 'react';
import { PriceChart } from '../components/PriceChart.jsx';
import { LiveTradesPanel } from '../components/LiveTradesPanel.jsx';
import { TrendingPoolsWidget } from '../components/TrendingPoolsWidget.jsx';
import { usePoolChartData, useLiveTrades, useTrendingPools } from '../hooks/usePoolChartData.js';
import { CHAINS, DEFAULT_CHAIN, getChainConfig } from '../lib/chains.js';
import { dexScreener } from '../lib/apiClient.js';

const CHAIN_OPTIONS = Object.entries(CHAINS).map(([key, config]) => ({
  id: key,
  ...config
}));

function SearchBar({ onSearch, isSearching }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoadingSuggestions(true);
        try {
          const results = await dexScreener.search(query);
          if (results?.pairs) {
            setSuggestions(results.pairs.slice(0, 5));
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (pair) => {
    setQuery(`${pair.baseToken?.symbol || ''}-${pair.quoteToken?.symbol || ''}`);
    onSearch(pair.pairAddress, pair.chainId);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pools or paste address..."
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          Search
        </button>
      </form>

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50">
          {isLoadingSuggestions ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Searching...
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((pair) => (
              <button
                key={pair.pairAddress}
                onClick={() => handleSuggestionClick(pair)}
                className="w-full px-4 py-3 text-left hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a] last:border-0"
              >
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">
                    {pair.baseToken?.symbol || pair.baseToken?.name || 'Unknown'} / {pair.quoteToken?.symbol || pair.quoteToken?.name || 'Unknown'}
                  </span>
                  <span className="text-gray-500 text-sm">{pair.chainId}</span>
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  ${parseFloat(pair.priceUsd || 0).toFixed(6)} • Vol: ${(pair.volume?.h24 || 0).toLocaleString()}
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChainSelector({ selectedChain, onChainChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CHAIN_OPTIONS.map((chain) => (
        <button
          key={chain.id}
          onClick={() => onChainChange(chain.id)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            selectedChain === chain.id
              ? 'bg-blue-500 text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
          }`}
          style={{
            borderColor: selectedChain === chain.id ? chain.color : undefined,
            borderWidth: selectedChain === chain.id ? '2px' : '0'
          }}
        >
          {chain.name}
        </button>
      ))}
    </div>
  );
}

function StatsCard({ title, value, change, icon }) {
  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-gray-500 text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {change !== undefined && (
        <div className={`text-sm mt-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const [selectedChain, setSelectedChain] = useState(DEFAULT_CHAIN);
  const [poolAddress, setPoolAddress] = useState('');
  const [poolName, setPoolName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [timeframe, setTimeframe] = useState({ interval: 'hour', aggregate: '1' });

  // Fetch data
  const { data: chartData, isLoading: chartLoading, error: chartError } = usePoolChartData(
    selectedChain,
    poolAddress,
    timeframe.interval
  );

  const { data: trades, isLoading: tradesLoading, error: tradesError } = useLiveTrades(
    selectedChain,
    poolAddress
  );

  const { data: pools, isLoading: poolsLoading, error: poolsError } = useTrendingPools(
    selectedChain
  );

  // Select first pool on mount
  useEffect(() => {
    if (pools && pools.length > 0 && !poolAddress) {
      setPoolAddress(pools[0].address);
      setPoolName(pools[0].symbol);
    }
  }, [pools, poolAddress]);

  const handlePoolSelect = (address) => {
    const pool = pools?.find(p => p.address === address);
    setPoolAddress(address);
    setPoolName(pool?.symbol || '');
  };

  const handleSearch = async (query, chainId = null) => {
    setIsSearching(true);
    
    if (chainId) {
      setSelectedChain(chainId);
    }

    // Check if query is an address (starts with 0x)
    if (query.startsWith('0x') && query.length === 42) {
      setPoolAddress(query);
      setPoolName('Custom Pool');
    } else {
      // Try to find pool by symbol
      const results = await dexScreener.search(query);
      if (results?.pairs?.[0]) {
        const pair = results.pairs[0];
        setPoolAddress(pair.pairAddress);
        setPoolName(`${pair.baseToken?.symbol || '???'} / ${pair.quoteToken?.symbol || '???'}`);
        
        // Try to match chain
        const chainMatch = Object.entries(CHAINS).find(([key, config]) => 
          config.dex === pair.chainId
        );
        if (chainMatch) {
          setSelectedChain(chainMatch[0]);
        }
      }
    }
    
    setIsSearching(false);
  };

  const selectedPoolData = pools?.find(p => p.address === poolAddress);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            FundTracer DeFi Dashboard
          </h1>
          <p className="text-gray-500">
            Real-time multi-chain DEX analytics. No wallet connection required.
          </p>
        </div>

        {/* Stats Row */}
        {selectedPoolData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Price"
              value={`$${selectedPoolData.price.toFixed(6)}`}
              change={selectedPoolData.priceChange24h}
              icon="💰"
            />
            <StatsCard
              title="24h Volume"
              value={`$${(selectedPoolData.volume24h / 1e6).toFixed(2)}M`}
              icon="📊"
            />
            <StatsCard
              title="Liquidity"
              value={`$${(selectedPoolData.liquidity / 1e6).toFixed(2)}M`}
              icon="💧"
            />
            <StatsCard
              title="24h Change"
              value={`${selectedPoolData.priceChange24h >= 0 ? '+' : ''}${selectedPoolData.priceChange24h.toFixed(2)}%`}
              icon="📈"
            />
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} isSearching={isSearching} />
        </div>

        {/* Chain Selector */}
        <div className="mb-6">
          <ChainSelector
            selectedChain={selectedChain}
            onChainChange={setSelectedChain}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Chart Section */}
          <div className="lg:col-span-2">
            <PriceChart
              data={chartData}
              poolName={poolName}
              isLoading={chartLoading}
              error={chartError}
              onTimeframeChange={setTimeframe}
            />
          </div>

          {/* Live Trades Panel */}
          <div className="lg:col-span-1">
            <LiveTradesPanel
              trades={trades}
              isLoading={tradesLoading}
              error={tradesError}
            />
          </div>
        </div>

        {/* Trending Pools Widget */}
        <TrendingPoolsWidget
          pools={pools}
          selectedPool={poolAddress}
          onPoolSelect={handlePoolSelect}
          isLoading={poolsLoading}
          error={poolsError}
        />

        {/* Educational Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-6">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-white font-semibold mb-2">How to Search</h3>
            <p className="text-gray-500 text-sm">
              Paste any pool address to view real-time charts and trades. Works across all supported chains.
            </p>
          </div>
          
          <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-white font-semibold mb-2">Live Data</h3>
            <p className="text-gray-500 text-sm">
              Charts update every 15 seconds. Trade feed refreshes every 10 seconds. No refresh needed.
            </p>
          </div>
          
          <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-6">
            <div className="text-3xl mb-3">🌐</div>
            <h3 className="text-white font-semibold mb-2">Multi-Chain</h3>
            <p className="text-gray-500 text-sm">
              Supported: Ethereum, Linea, Arbitrum, Base, BSC, Optimism, Polygon. More coming soon.
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-[#1a1a1a] text-center text-gray-500 text-sm">
          <p>
            Data provided by GeckoTerminal & DexScreener APIs. 
            Charts powered by Lightweight Charts.
          </p>
        </div>
      </div>
    </div>
  );
}
