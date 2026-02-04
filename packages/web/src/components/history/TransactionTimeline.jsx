import React, { useState, useMemo, useEffect } from 'react';
import { TxRow } from './TxRow.jsx';
import { TxFilterPanel } from './TxFilterPanel.jsx';

function LoadingSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-4">
          <div className="w-10 h-10 rounded-full bg-[#2a2a2a] animate-pulse" />
          <div className="flex-1">
            <div className="h-5 bg-[#2a2a2a] rounded w-24 mb-2 animate-pulse" />
            <div className="h-4 bg-[#2a2a2a] rounded w-48 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TransactionTimeline({
  transactions,
  isLoading,
  onRefresh,
  totalCount,
}) {
  const [filters, setFilters] = useState({
    type: 'all',
    chain: 'all',
    timeRange: 'all',
    status: 'all',
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    let filtered = [...transactions];

    if (filters.type !== 'all') {
      filtered = filtered.filter(
        tx => tx.type?.toLowerCase() === filters.type
      );
    }

    if (filters.chain !== 'all') {
      filtered = filtered.filter(tx => tx.chainId === filters.chain);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    if (filters.timeRange !== 'all') {
      const now = Date.now();
      const limits = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      const limit = limits[filters.timeRange];
      if (limit) {
        filtered = filtered.filter(
          tx => (now - tx.timestamp * 1000) <= limit
        );
      }
    }

    return filtered;
  }, [transactions, filters]);

  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.timestamp * 1000).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  if (!transactions && isLoading) {
    return (
      <div>
        <div className="h-8 bg-[#2a2a2a] rounded w-48 mb-4 animate-pulse" />
        <LoadingSkeleton count={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Transaction History</h2>
        <div className="flex items-center gap-4">
          {totalCount !== undefined && (
            <span className="text-sm text-gray-400">
              {filteredTransactions.length} of {totalCount} transactions
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <TxFilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
      />

      {isLoading && filteredTransactions.length === 0 ? (
        <LoadingSkeleton count={3} />
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-lg mb-2">No transactions found</p>
          <p className="text-sm">
            {transactions?.length === 0
              ? 'Connect a wallet to view your transaction history'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <h3 className="text-sm text-gray-500 mb-3 sticky top-0 bg-[#0a0a0a] py-2">
                {date}
              </h3>
              <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] overflow-hidden">
                {txs.map((tx, index) => (
                  <TxRow
                    key={`${tx.chainId}-${tx.hash}-${index}`}
                    tx={tx}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TransactionTimeline;
