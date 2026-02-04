import React, { useMemo } from 'react';

const TX_TYPE_LABELS = {
  transfer: 'Transfer',
  swap: 'Swap',
  claim: 'Claim',
  stake: 'Stake',
  unstake: 'Unstake',
  approve: 'Approve',
  mint: 'Mint',
  burn: 'Burn',
  unknown: 'Transaction',
};

const TX_TYPE_COLORS = {
  transfer: '#3b82f6',
  swap: '#8b5cf6',
  claim: '#10b981',
  stake: '#f59e0b',
  unstake: '#f97316',
  approve: '#6366f1',
  mint: '#14b8a6',
  burn: '#ef4444',
  unknown: '#6b7280',
};

function getExplorerUrl(chainId, txHash) {
  const explorers = {
    ethereum: 'https://etherscan.io/tx',
    arbitrum: 'https://arbiscan.io/tx',
    linea: 'https://lineascan.build/tx',
    base: 'https://basescan.org/tx',
    optimism: 'https://optimistic.etherscan.io/tx',
    polygon: 'https://polygonscan.com/tx',
    bsc: 'https://bscscan.com/tx',
  };
  return `${explorers[chainId] || explorers.ethereum}/${txHash}`;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

function formatValue(value, decimals = 18) {
  if (!value) return '0';
  const num = parseFloat(value) / Math.pow(10, decimals);
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(num < 0.01 ? 6 : 4);
}

export function TxRow({ tx, isExternal = false }) {
  const txType = useMemo(() => {
    const type = tx.type?.toLowerCase() || 'unknown';
    return TX_TYPE_LABELS[type] || TX_TYPE_LABELS.unknown;
  }, [tx.type]);

  const txColor = useMemo(() => {
    const type = tx.type?.toLowerCase() || 'unknown';
    return TX_TYPE_COLORS[type] || TX_TYPE_COLORS.unknown;
  }, [tx.type]);

  const explorerUrl = useMemo(() => {
    return getExplorerUrl(tx.chainId, tx.hash);
  }, [tx.chainId, tx.hash]);

  const shortHash = useMemo(() => {
    return `${tx.hash?.substring(0, 6)}...${tx.hash?.substring(tx.hash.length - 4)}`;
  }, [tx.hash]);

  const isSelf = useMemo(() => {
    return tx.from?.toLowerCase() === tx.to?.toLowerCase();
  }, [tx.from, tx.to]);

  return (
    <div className="flex items-start gap-4 p-4 border-b border-[#1a1a1a] hover:bg-[#0f0f0f] transition-colors">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
        style={{ backgroundColor: txColor }}
      >
        {txType.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-white">{txType}</span>
          {tx.status !== 'confirmed' && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              tx.status === 'pending'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {tx.status}
            </span>
          )}
          {isSelf && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              Self
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: tx.chainColor || '#2a2a2a',
              opacity: 0.5,
            }}
          >
            {tx.chainName || tx.chainId}
          </span>
          <span>{formatTimestamp(tx.timestamp)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">From:</span>
          <code className="text-gray-300">
            {tx.from?.substring(0, 6)}...{tx.from?.substring(tx.from.length - 4)}
          </code>
          <span className="text-gray-500">→</span>
          <code className="text-gray-300">
            {tx.to?.substring(0, 6)}...{tx.to?.substring(tx.to.length - 4)}
          </code>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="font-medium text-white">
          {formatValue(tx.value)}
          <span className="text-gray-400 ml-1">ETH</span>
        </div>
        {tx.gasFee && (
          <div className="text-xs text-gray-500">
            Gas: {formatValue(tx.gasFee)} ETH
          </div>
        )}
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {shortHash} ↗
        </a>
      </div>
    </div>
  );
}

export default TxRow;
