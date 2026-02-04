import React from 'react';
import { CHAINS } from '../../lib/chains.js';

const TX_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'swap', label: 'Swap' },
  { value: 'claim', label: 'Claim' },
  { value: 'stake', label: 'Stake' },
  { value: 'approve', label: 'Approve' },
  { value: 'mint', label: 'Mint' },
  { value: 'burn', label: 'Burn' },
];

const TIME_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

export function TxFilterPanel({ filters, onFilterChange, chainTransactions, loadingChains }) {
  const chainOptions = Object.entries(CHAINS).map(([key, config]) => ({
    value: key,
    ...config,
  }));

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4 mb-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">Transaction Type</label>
          <select
            value={filters.type || 'all'}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {TX_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">Chain</label>
          <select
            value={filters.chain || 'all'}
            onChange={(e) => handleFilterChange('chain', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Chains</option>
            {chainOptions.map(chain => (
              <option key={chain.id} value={chain.id}>{chain.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">Time Range</label>
          <select
            value={filters.timeRange || 'all'}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            {TIME_FILTERS.map(filter => (
              <option key={filter.value} value={filter.value}>{filter.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {loadingChains.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading: {loadingChains.map(c => CHAINS[c]?.name || c).join(', ')}
        </div>
      )}
    </div>
  );
}

export default TxFilterPanel;
