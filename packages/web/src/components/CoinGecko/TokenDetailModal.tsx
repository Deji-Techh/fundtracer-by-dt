import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ArrowUpRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import TokenChart from './TokenChart';

interface TokenDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    volume24h?: number;
    marketCap?: number;
    fdv?: number;
    thumb?: string;
    chainId: string;
    tokenAddress: string;
    dexId?: string;
    liquidity?: number;
  } | null;
}

const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  token 
}) => {
  if (!isOpen || !token) return null;

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    return `$${price.toFixed(6)}`;
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#1a1a1a',
          borderRadius: 16,
          border: '1px solid #2a2a2a',
          maxWidth: 900,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid #2a2a2a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {token.thumb ? (
              <img 
                src={token.thumb}
                alt={token.name}
                style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#2a2a2a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 700,
              }}>
                {token.symbol.slice(0, 2)}
              </div>
            )}
            <div>
              <h2 style={{ 
                fontSize: '1.75rem', 
                fontWeight: 700, 
                color: '#fff',
                margin: 0,
                marginBottom: 4,
              }}>
                {token.name}
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                color: '#9ca3af',
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {token.symbol}
                </span>
                <span>•</span>
                <span style={{ fontSize: '0.875rem' }}>{token.chainId}</span>
                {token.dexId && (
                  <>
                    <span>•</span>
                    <span style={{ fontSize: '0.875rem' }}>{token.dexId}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              padding: 12,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.color = '#fff';
              (e.target as HTMLButtonElement).style.background = '#2a2a2a';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.color = '#9ca3af';
              (e.target as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={28} strokeWidth={1.5} />
          </button>
        </div>

        {/* Price Section */}
        <div style={{ padding: '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'baseline', 
            gap: 16,
            marginBottom: 32,
          }}>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              color: '#fff' 
            }}>
              {formatPrice(token.price)}
            </span>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: token.change24h >= 0 ? '#10b981' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <HugeiconsIcon 
                icon={token.change24h >= 0 ? ArrowUpRight01Icon : ArrowDown01Icon}
                size={20}
                strokeWidth={2}
              />
              {formatChange(token.change24h)}
            </span>
          </div>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            {token.marketCap !== undefined && (
              <div style={{
                background: '#0a0a0a',
                padding: '20px',
                borderRadius: 12,
                border: '1px solid #2a2a2a',
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  marginBottom: 8,
                }}>
                  Market Cap
                </div>
                <div style={{ 
                  fontSize: '1.375rem', 
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {formatLargeNumber(token.marketCap)}
                </div>
              </div>
            )}

            {token.fdv !== undefined && (
              <div style={{
                background: '#0a0a0a',
                padding: '20px',
                borderRadius: 12,
                border: '1px solid #2a2a2a',
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  marginBottom: 8,
                }}>
                  FDV
                </div>
                <div style={{ 
                  fontSize: '1.375rem', 
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {formatLargeNumber(token.fdv)}
                </div>
              </div>
            )}

            {token.volume24h !== undefined && (
              <div style={{
                background: '#0a0a0a',
                padding: '20px',
                borderRadius: 12,
                border: '1px solid #2a2a2a',
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  marginBottom: 8,
                }}>
                  Volume (24h)
                </div>
                <div style={{ 
                  fontSize: '1.375rem', 
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {formatLargeNumber(token.volume24h)}
                </div>
              </div>
            )}

            {token.liquidity !== undefined && (
              <div style={{
                background: '#0a0a0a',
                padding: '20px',
                borderRadius: 12,
                border: '1px solid #2a2a2a',
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  marginBottom: 8,
                }}>
                  Liquidity
                </div>
                <div style={{ 
                  fontSize: '1.375rem', 
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  {formatLargeNumber(token.liquidity)}
                </div>
              </div>
            )}
          </div>

          {/* Chart */}
          <div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 16,
            }}>
              Price Chart
            </h3>
            <TokenChart 
              chainId={token.chainId}
              tokenAddress={token.tokenAddress}
              height={400}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDetailModal;
