import React, { useEffect, useState } from 'react';
import { useHistory } from '../../hooks/useHistory';
import { LoadingState } from '../common/LoadingState';
import { formatAddress, formatDate, formatNumber } from '../../utils/formatters';

interface TransactionHistoryProps {
  walletAddress?: string;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ walletAddress }) => {
  const { data, loading, loadingMore, error, hasMore, fetchHistory, loadMore } = useHistory(
    walletAddress || null, 
    'linea'
  );
  
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchHistory(filterType !== 'all' ? { type: filterType } : undefined);
  }, [walletAddress, filterType]);

  if (!walletAddress) {
    return (
      <div className="card">
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
          Please connect a wallet to view transaction history
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState type="table" />;
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ padding: '24px', color: '#dc2626' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'send': return '↗️';
      case 'receive': return '↙️';
      case 'swap': return '🔄';
      case 'approve': return '✓';
      default: return '•';
    }
  };

  const getStatusColor = (status: string) => {
    return status.toLowerCase() === 'success' ? '#16a34a' : '#dc2626';
  };

  return (
    <div>
      {/* Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
        {['all', 'send', 'receive', 'swap'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #e5e5e5',
              backgroundColor: filterType === type ? '#2563eb' : '#ffffff',
              color: filterType === type ? '#ffffff' : '#6b7280',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          padding: '16px 24px', 
          borderBottom: '1px solid #f3f4f6',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          <div style={{ flex: 1 }}>Type</div>
          <div style={{ flex: 2 }}>From/To</div>
          <div style={{ flex: 1, textAlign: 'right' }}>Amount</div>
          <div style={{ flex: 1, textAlign: 'right' }}>Status</div>
          <div style={{ flex: 1, textAlign: 'right' }}>Time</div>
        </div>

        {/* Rows */}
        {data.map((tx, index) => (
          <div 
            key={tx.hash}
            style={{ 
              display: 'flex', 
              padding: '16px 24px', 
              borderBottom: index < data.length - 1 ? '1px solid #f3f4f6' : 'none',
              alignItems: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{getTransactionIcon(tx.type)}</span>
              <span style={{ textTransform: 'capitalize' }}>{tx.type}</span>
            </div>
            
            <div style={{ flex: 2, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              <div>{formatAddress(tx.from)} → {formatAddress(tx.to)}</div>
            </div>
            
            <div style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace' }}>
              {formatNumber(parseFloat(tx.amount) / 1e18, 6)} ETH
            </div>
            
            <div style={{ 
              flex: 1, 
              textAlign: 'right',
              color: getStatusColor(tx.status),
              fontWeight: 600,
            }}>
              {tx.status}
            </div>
            
            <div style={{ flex: 1, textAlign: 'right', fontSize: '0.875rem', color: '#9ca3af' }}>
              {formatDate(tx.timestamp)}
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
            No transactions found
          </div>
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
