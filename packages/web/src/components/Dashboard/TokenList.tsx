import React from 'react';
import { formatNumber } from '../../utils/formatters';

interface Token {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  price: number;
  value: number;
  logoUrl?: string;
  change24h?: number;
}

interface TokenListProps {
  tokens: Token[];
  totalValue: number;
  loading?: boolean;
}

export const TokenList: React.FC<TokenListProps> = ({ tokens, totalValue, loading }) => {
  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #f3f4f6', gap: '16px', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: '16px', width: '120px', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '14px', width: '80px' }} />
            </div>
            <div className="skeleton" style={{ height: '16px', width: '100px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div style={{ 
        padding: '48px 24px', 
        textAlign: 'center', 
        color: '#9ca3af',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e5e5',
      }}>
        No tokens found in this wallet
      </div>
    );
  }

  // Sort by value descending
  const sortedTokens = [...tokens].sort((a, b) => b.value - a.value);

  return (
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
        <div style={{ flex: 2 }}>Token</div>
        <div style={{ flex: 1, textAlign: 'right' }}>Balance</div>
        <div style={{ flex: 1, textAlign: 'right' }}>Price</div>
        <div style={{ flex: 1, textAlign: 'right' }}>Value</div>
        <div style={{ flex: 1, textAlign: 'right' }}>24h</div>
      </div>

      {/* Token Rows */}
      {sortedTokens.map((token, index) => {
        const formattedBalance = (parseFloat(token.balance) / Math.pow(10, token.decimals || 18)).toFixed(4);
        const changeColor = (token.change24h || 0) >= 0 ? '#16a34a' : '#dc2626';
        const changeSymbol = (token.change24h || 0) >= 0 ? '+' : '';

        return (
          <div 
            key={token.address || index}
            style={{ 
              display: 'flex', 
              padding: '16px 24px', 
              borderBottom: index < sortedTokens.length - 1 ? '1px solid #f3f4f6' : 'none',
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
            {/* Token Info */}
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
              {token.logoUrl ? (
                <img 
                  src={token.logoUrl} 
                  alt={token.symbol}
                  style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                />
              ) : (
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280',
                }}>
                  {token.symbol?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, color: '#111827' }}>{token.symbol}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{token.name}</div>
              </div>
            </div>

            {/* Balance */}
            <div style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace' }}>
              {formatNumber(parseFloat(formattedBalance))}
            </div>

            {/* Price */}
            <div style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace' }}>
              ${token.price > 0 ? formatNumber(token.price, 4) : '-'}
            </div>

            {/* Value */}
            <div style={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>
              ${token.value > 0 ? formatNumber(token.value) : '-'}
            </div>

            {/* 24h Change */}
            <div style={{ 
              flex: 1, 
              textAlign: 'right', 
              color: changeColor,
              fontFamily: 'monospace',
            }}>
              {token.change24h !== undefined 
                ? `${changeSymbol}${token.change24h.toFixed(2)}%` 
                : '-'}
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div style={{ 
        display: 'flex', 
        padding: '16px 24px', 
        borderTop: '2px solid #e5e7eb',
        fontWeight: 700,
        fontSize: '1rem',
      }}>
        <div style={{ flex: 2 }}>Total</div>
        <div style={{ flex: 4 }}></div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          ${formatNumber(totalValue)}
        </div>
        <div style={{ flex: 1 }}></div>
      </div>
    </div>
  );
};

export default TokenList;
