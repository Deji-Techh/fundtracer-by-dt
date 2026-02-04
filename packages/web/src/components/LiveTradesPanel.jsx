import React from 'react';

function formatTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatAddress(address) {
  if (!address) return '0x0000...0000';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(num, decimals = 2) {
  if (!num) return '0';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
  return `$${num.toFixed(decimals)}`;
}

export function LiveTradesPanel({ trades, isLoading, error }) {
  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white font-semibold">Live Trades</h3>
          <p className="text-gray-500 text-sm">Recent 50 transactions</p>
        </div>
        {isLoading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {error ? (
          <div className="text-center py-8 text-red-400 text-sm">
            Failed to load trades
          </div>
        ) : !trades || trades.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {isLoading ? 'Loading trades...' : 'No trades available'}
          </div>
        ) : (
          trades.slice(0, 50).map((trade, index) => (
            <div
              key={trade.id || index}
              className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    trade.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <div>
                  <p className="text-sm text-white">
                    <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {trade.type === 'buy' ? '🟢 Buy' : '🔴 Sell'}
                    </span>
                    <span className="text-gray-400 ml-2">
                      {formatNumber(trade.usdValue)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(trade.timestamp)} • {formatAddress(trade.fromAddress)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">
                  ${trade.price?.toFixed(6) || '0.000000'}
                </p>
                <p className="text-xs text-gray-500">
                  {trade.amount?.toFixed(4) || '0.0000'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
