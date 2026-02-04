import React, { useState, useMemo } from 'react';
import { TokenRow } from './TokenRow.jsx';
import { MiniPriceChart } from './MiniPriceChart.jsx';

function LoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-[#1a1a1a]">
          <td className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2a2a2a] rounded-full animate-pulse" />
              <div>
                <div className="h-4 bg-[#2a2a2a] rounded w-16 animate-pulse mb-1" />
                <div className="h-3 bg-[#2a2a2a] rounded w-12 animate-pulse" />
              </div>
            </div>
          </td>
          <td className="py-4 px-4">
            <div className="h-4 bg-[#2a2a2a] rounded w-20 animate-pulse" />
          </td>
          <td className="py-4 px-4">
            <div className="h-4 bg-[#2a2a2a] rounded w-24 animate-pulse" />
          </td>
          <td className="py-4 px-4">
            <div className="w-16 h-8 bg-[#2a2a2a] rounded animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function TokenHoldingsTable({ tokens, isLoading, onTokenClick }) {
  const [sortBy, setSortBy] = useState('value');
  const [sortOrder, setSortOrder] = useState('desc');

  const sortedTokens = useMemo(() => {
    if (!tokens || tokens.length === 0) return [];

    const sorted = [...tokens];

    sorted.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'value':
          aVal = (parseFloat(a.balance) / Math.pow(10, a.decimals || 18)) * (a.price || 0);
          bVal = (parseFloat(b.balance) / Math.pow(10, b.decimals || 18)) * (b.price || 0);
          break;
        case 'balance':
          aVal = parseFloat(a.balance) / Math.pow(10, a.decimals || 18);
          bVal = parseFloat(b.balance) / Math.pow(10, b.decimals || 18);
          break;
        case 'name':
          return sortOrder === 'asc'
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        case 'chain':
          return sortOrder === 'asc'
            ? a.chainName.localeCompare(b.chainName)
            : b.chainName.localeCompare(a.chainName);
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [tokens, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return (
      <span className="ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th
                className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('name')}
              >
                Asset <SortIcon field="name" />
              </th>
              <th
                className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('balance')}
              >
                Balance <SortIcon field="balance" />
              </th>
              <th
                className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('value')}
              >
                Value <SortIcon field="value" />
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                7d Chart
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {isLoading ? (
              <LoadingSkeleton />
            ) : sortedTokens.length > 0 ? (
              sortedTokens.map((token, index) => (
                <TokenRow
                  key={`${token.chainId}-${token.address}-${index}`}
                  token={token}
                  onClick={onTokenClick}
                />
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-500">
                  No holdings found. Connect a wallet to view your tokens.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {tokens && tokens.length > 0 && (
        <div className="px-4 py-3 border-t border-[#1a1a1a] text-xs text-gray-500">
          Showing {sortedTokens.length} of {tokens.length} tokens
        </div>
      )}
    </div>
  );
}

export default TokenHoldingsTable;
