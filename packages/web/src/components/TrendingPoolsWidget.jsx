import React from 'react';

function formatNumber(num, decimals = 2) {
  if (!num) return '0';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
  return `$${num.toFixed(decimals)}`;
}

export function TrendingPoolsWidget({ pools, onPoolSelect, selectedPool, isLoading, error }) {
  if (error) {
    return (
      <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4">
        <h3 className="text-white font-semibold mb-4">Trending Pools</h3>
        <div className="text-center py-4 text-red-400 text-sm">
          Failed to load trending pools
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold">Trending Pools</h3>
        {isLoading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading && !pools ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#1a1a1a] rounded-lg animate-pulse" />
          ))
        ) : pools?.length > 0 ? (
          pools.map((pool) => (
            <button
              key={pool.address}
              onClick={() => onPoolSelect?.(pool.address)}
              className={`p-4 rounded-lg border text-left transition-all ${
                selectedPool === pool.address
                  ? 'bg-blue-500/10 border-blue-500/50'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#2a2a2a]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {pool.logoUrl && (
                  <img
                    src={pool.logoUrl}
                    alt={pool.symbol}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                <span className="font-medium text-white text-sm">{pool.symbol}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    pool.priceChange24h >= 0
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {pool.priceChange24h >= 0 ? '+' : ''}
                  {pool.priceChange24h.toFixed(2)}%
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Price</span>
                  <span className="text-white">${pool.price.toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>24h Vol</span>
                  <span className="text-white">{formatNumber(pool.volume24h)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Liquidity</span>
                  <span className="text-white">{formatNumber(pool.liquidity)}</span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500 text-sm">
            No pools available
          </div>
        )}
      </div>
    </div>
  );
}
