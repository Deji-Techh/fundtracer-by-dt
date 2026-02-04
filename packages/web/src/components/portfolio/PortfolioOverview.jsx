import React, { useMemo } from 'react';
import { CHAINS } from '../../lib/chains.js';

function SkeletonCard() {
  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-[#2a2a2a] rounded-full" />
        <div className="h-4 bg-[#2a2a2a] rounded w-20" />
      </div>
      <div className="h-6 bg-[#2a2a2a] rounded w-32 mb-2" />
      <div className="h-3 bg-[#2a2a2a] rounded w-24" />
    </div>
  );
}

export function PortfolioOverview({ totalValue, chainBreakdown, isLoading }) {
  const sortedChains = useMemo(() => {
    return Object.entries(chainBreakdown || {})
      .map(([chainId, value]) => ({
        chainId,
        value,
        ...CHAINS[chainId],
      }))
      .sort((a, b) => b.value - a.value);
  }, [chainBreakdown]);

  const formatUSD = (value) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const totalPortfolioValue = useMemo(() => {
    return Object.values(chainBreakdown || {}).reduce((sum, val) => sum + val, 0);
  }, [chainBreakdown]);

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="h-8 bg-[#2a2a2a] rounded w-48 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Portfolio Overview</h2>
        <div className="text-2xl font-bold text-white">
          {formatUSD(totalPortfolioValue || totalValue || 0)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {sortedChains.length > 0 ? (
          sortedChains.map(({ chainId, value, name, color }) => (
            <div
              key={chainId}
              className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4 hover:border-[#2a2a2a] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color || '#627eea' }}
                />
                <span className="text-gray-400 text-sm">{name || chainId}</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {formatUSD(value)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {((value / (totalPortfolioValue || 1)) * 100).toFixed(1)}% of portfolio
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            Connect a wallet to view your portfolio
          </div>
        )}
      </div>
    </div>
  );
}

export default PortfolioOverview;
