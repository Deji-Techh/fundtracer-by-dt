import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ArrowUpRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import TokenChart from './TokenChart';
import { useIsMobile } from '../../hooks/useIsMobile';

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
  const isMobile = useIsMobile();

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
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: isMobile ? '16px 16px 0 0' : 16,
          border: '1px solid var(--color-border)',
          maxWidth: isMobile ? '100%' : 900,
          width: '100%',
          maxHeight: isMobile ? '90vh' : '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '16px' : '24px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, flex: 1, minWidth: 0 }}>
            {token.thumb ? (
              <img 
                src={token.thumb}
                alt={token.name}
                style={{ 
                  width: isMobile ? 40 : 56, 
                  height: isMobile ? 40 : 56, 
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: isMobile ? 40 : 56,
                height: isMobile ? 40 : 56,
                borderRadius: '50%',
                background: 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '1rem' : '1.25rem',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {token.symbol.slice(0, 2)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h2 style={{ 
                fontSize: isMobile ? '1.25rem' : '1.75rem', 
                fontWeight: 700, 
                color: 'var(--color-text-primary)',
                margin: 0,
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {token.name}
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                color: 'var(--color-text-secondary)',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: 600 }}>
                  {token.symbol}
                </span>
                <span>•</span>
                <span style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem' }}>{token.chainId}</span>
                {token.dexId && (
                  <>
                    <span>•</span>
                    <span style={{ fontSize: isMobile ? '0.8125rem' : '0.875rem' }}>{token.dexId}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              padding: 10,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.color = 'var(--color-text-primary)';
              (e.target as HTMLButtonElement).style.background = 'var(--color-border)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
              (e.target as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={28} strokeWidth={1.5} />
          </button>
        </div>

        {/* Price Section */}
        <div style={{ padding: isMobile ? '16px' : '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: isMobile ? 'flex-start' : 'baseline', 
            gap: isMobile ? 8 : 16,
            marginBottom: isMobile ? 20 : 32,
            flexWrap: 'wrap',
          }}>
            <span style={{ 
              fontSize: isMobile ? '1.75rem' : '2.5rem', 
              fontWeight: 700, 
              color: 'var(--color-text-primary)' 
            }}>
              {formatPrice(token.price)}
            </span>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: token.change24h >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
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
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? 10 : 16,
            marginBottom: isMobile ? 20 : 32,
          }}>
            {token.marketCap !== undefined && (
              <div style={{
                background: 'var(--color-bg)',
                padding: isMobile ? '14px' : '20px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}>
                  Market Cap
                </div>
                <div style={{ 
                  fontSize: isMobile ? '1.125rem' : '1.375rem', 
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}>
                  {formatLargeNumber(token.marketCap)}
                </div>
              </div>
            )}

            {token.fdv !== undefined && (
              <div style={{
                background: 'var(--color-bg)',
                padding: isMobile ? '14px' : '20px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}>
                  FDV
                </div>
                <div style={{ 
                  fontSize: isMobile ? '1.125rem' : '1.375rem', 
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}>
                  {formatLargeNumber(token.fdv)}
                </div>
              </div>
            )}

            {token.volume24h !== undefined && (
              <div style={{
                background: 'var(--color-bg)',
                padding: isMobile ? '14px' : '20px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}>
                  Volume (24h)
                </div>
                <div style={{ 
                  fontSize: isMobile ? '1.125rem' : '1.375rem', 
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}>
                  {formatLargeNumber(token.volume24h)}
                </div>
              </div>
            )}

            {token.liquidity !== undefined && (
              <div style={{
                background: 'var(--color-bg)',
                padding: isMobile ? '14px' : '20px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ 
                  fontSize: isMobile ? '0.75rem' : '0.875rem', 
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}>
                  Liquidity
                </div>
                <div style={{ 
                  fontSize: isMobile ? '1.125rem' : '1.375rem', 
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
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
              color: 'var(--color-text-primary)',
              marginBottom: 16,
            }}>
              Price Chart
            </h3>
            <TokenChart 
              chainId={token.chainId}
              tokenAddress={token.tokenAddress}
              height={isMobile ? 250 : 400}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDetailModal;
