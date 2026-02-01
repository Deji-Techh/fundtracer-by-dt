import React from 'react';
import { formatNumber, formatAddress } from '../../utils/formatters';

interface TokenDetailsProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    contractAddress?: string;
    thumb?: string;
    large?: string;
  };
  marketData?: {
    market_cap?: number;
    total_volume?: number;
    circulating_supply?: number;
    current_price?: number;
    high_24h?: number;
    low_24h?: number;
    price_change_24h?: number;
    price_change_percentage_24h?: number;
  };
  loading?: boolean;
}

export const TokenDetails: React.FC<TokenDetailsProps> = ({ 
  token, 
  marketData, 
  loading 
}) => {
  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e5e5', padding: '24px' }}>
        <div className="skeleton" style={{ height: '80px', width: '80px', borderRadius: '50%', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '16px', width: '40%', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <div className="skeleton" style={{ height: '60px' }} />
          <div className="skeleton" style={{ height: '60px' }} />
          <div className="skeleton" style={{ height: '60px' }} />
          <div className="skeleton" style={{ height: '60px' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e5e5', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        {token.large ? (
          <img 
            src={token.large} 
            alt={token.symbol}
            style={{ width: '64px', height: '64px', borderRadius: '50%' }}
          />
        ) : token.thumb ? (
          <img 
            src={token.thumb} 
            alt={token.symbol}
            style={{ width: '64px', height: '64px', borderRadius: '50%' }}
          />
        ) : (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 600,
            color: '#6b7280',
          }}>
            {token.symbol?.charAt(0)}
          </div>
        )}
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '1.5rem' }}>
            {token.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              padding: '4px 8px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#6b7280',
            }}>
              {token.symbol}
            </span>
            {token.contractAddress && (
              <span style={{ fontSize: '0.875rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                {formatAddress(token.contractAddress)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Market Data */}
      {marketData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <DataCard 
            label="Market Cap" 
            value={marketData.market_cap ? `$${formatNumber(marketData.market_cap)}` : '-'} 
          />
          <DataCard 
            label="24h Volume" 
            value={marketData.total_volume ? `$${formatNumber(marketData.total_volume)}` : '-'} 
          />
          <DataCard 
            label="Circulating Supply" 
            value={marketData.circulating_supply ? formatNumber(marketData.circulating_supply) : '-'} 
          />
          <DataCard 
            label="24h High" 
            value={marketData.high_24h ? `$${marketData.high_24h.toFixed(4)}` : '-'} 
          />
          <DataCard 
            label="24h Low" 
            value={marketData.low_24h ? `$${marketData.low_24h.toFixed(4)}` : '-'} 
          />
          <DataCard 
            label="Price Change 24h" 
            value={marketData.price_change_percentage_24h !== undefined 
              ? `${marketData.price_change_percentage_24h >= 0 ? '+' : ''}${marketData.price_change_percentage_24h.toFixed(2)}%`
              : '-'}
            color={marketData.price_change_percentage_24h !== undefined 
              ? marketData.price_change_percentage_24h >= 0 ? '#16a34a' : '#dc2626'
              : undefined}
          />
        </div>
      )}

      {/* Links */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {token.contractAddress && (
          <a
            href={`https://lineascan.build/address/${token.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              textDecoration: 'none',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            View on LineaScan
          </a>
        )}
        <a
          href={`https://www.coingecko.com/en/coins/${token.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            textDecoration: 'none',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
        >
          View on CoinGecko
        </a>
      </div>
    </div>
  );
};

const DataCard: React.FC<{ label: string; value: string; color?: string }> = ({ 
  label, 
  value, 
  color 
}) => (
  <div style={{
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  }}>
    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: '1rem', fontWeight: 600, color: color || '#111827' }}>
      {value}
    </div>
  </div>
);

export default TokenDetails;
