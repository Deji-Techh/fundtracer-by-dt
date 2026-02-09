import React, { useEffect, useState } from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, BarChart3, DollarSign, Droplets, Activity } from 'lucide-react';
import { getDEXScreenerTokenPairs } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';

interface TokenData {
  id: string;
  name: string;
  symbol: string;
  thumb?: string;
  chainId: string;
  tokenAddress: string;
  priceUsd?: string;
  priceChange?: number;
}

interface PairDetail {
  pairAddress: string;
  baseToken: { name: string; symbol: string; address: string };
  quoteToken: { name: string; symbol: string; address: string };
  priceUsd: string;
  priceNative: string;
  priceChange: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  txns: { h24?: { buys: number; sells: number } };
  url?: string;
  dexId?: string;
  chainId?: string;
  info?: { imageUrl?: string };
}

interface TokenDetailModalProps {
  token: TokenData;
  isOpen: boolean;
  onClose: () => void;
}

// Simple sparkline chart using SVG
function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 280;
  const height = 80;
  const padding = 4;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatNumber(num: number | undefined | null, decimals = 2): string {
  if (num === undefined || num === null) return '--';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
  return `$${num.toFixed(decimals)}`;
}

function formatPrice(price: string | undefined): string {
  if (!price) return '--';
  const num = parseFloat(price);
  if (num >= 1) return `$${num.toFixed(2)}`;
  if (num >= 0.01) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(8)}`;
}

function ChangeIndicator({ value, label }: { value?: number; label: string }) {
  if (value === undefined || value === null) return null;
  const isPositive = value >= 0;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '8px 12px',
      background: isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
      borderRadius: 8,
      flex: 1,
      minWidth: 60,
    }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: '0.8125rem',
        fontWeight: 700,
        color: isPositive ? '#10b981' : '#ef4444',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  );
}

export function TokenDetailModal({ token, isOpen, onClose }: TokenDetailModalProps) {
  const isMobile = useIsMobile();
  const [detail, setDetail] = useState<PairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen || !token.chainId || !token.tokenAddress) return;

    let cancelled = false;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await getDEXScreenerTokenPairs(token.chainId, token.tokenAddress);
        if (cancelled) return;

        const pairs = response?.pairs || response || [];
        const pairsArr = Array.isArray(pairs) ? pairs : [pairs];
        if (pairsArr.length > 0) {
          const pair = pairsArr[0];
          setDetail({
            pairAddress: pair.pairAddress || '',
            baseToken: pair.baseToken || { name: token.name, symbol: token.symbol, address: token.tokenAddress },
            quoteToken: pair.quoteToken || { name: '', symbol: '', address: '' },
            priceUsd: pair.priceUsd || token.priceUsd || '0',
            priceNative: pair.priceNative || '0',
            priceChange: pair.priceChange || {},
            volume: pair.volume || {},
            liquidity: pair.liquidity || {},
            fdv: pair.fdv,
            marketCap: pair.marketCap,
            txns: pair.txns || {},
            url: pair.url,
            dexId: pair.dexId,
            chainId: pair.chainId || token.chainId,
            info: pair.info,
          });

          // Generate synthetic chart data from price changes
          const h24 = pair.priceChange?.h24 || 0;
          const h6 = pair.priceChange?.h6 || 0;
          const h1 = pair.priceChange?.h1 || 0;
          const m5 = pair.priceChange?.m5 || 0;
          const price = parseFloat(pair.priceUsd || token.priceUsd || '1');
          
          // Build approximate price points from change data
          const p24 = price / (1 + h24 / 100);
          const p6 = price / (1 + h6 / 100) * (1 + h24 / 100) / (1 + h24 / 100) || p24 * (1 + (h24 - h6) / 100 * 0.75);
          const p1 = price / (1 + h1 / 100);
          const pm5 = price / (1 + m5 / 100);

          // Interpolate a simple curve
          const points = [p24];
          const mid1 = p24 + (p6 - p24) * 0.33;
          const mid2 = p24 + (p6 - p24) * 0.66;
          points.push(mid1, mid2, p6);
          const mid3 = p6 + (p1 - p6) * 0.33;
          const mid4 = p6 + (p1 - p6) * 0.66;
          points.push(mid3, mid4, p1);
          const mid5 = p1 + (pm5 - p1) * 0.5;
          points.push(mid5, pm5, price);
          setChartData(points.filter(p => !isNaN(p) && isFinite(p)));
        }
      } catch (err) {
        console.error('[TokenDetailModal] Fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetails();
    return () => { cancelled = true; };
  }, [isOpen, token.chainId, token.tokenAddress]);

  if (!isOpen) return null;

  const h24Change = detail?.priceChange?.h24 ?? token.priceChange ?? 0;
  const isPositive = h24Change >= 0;
  const chartColor = isPositive ? '#10b981' : '#ef4444';
  const txns24 = detail?.txns?.h24;
  const dexScreenerUrl = detail?.url || `https://dexscreener.com/${token.chainId}/${token.tokenAddress}`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? 'calc(100vw - 24px)' : 440,
        maxHeight: isMobile ? 'calc(100vh - 48px)' : '85vh',
        overflowY: 'auto',
        background: 'var(--color-bg-elevated, #1a1a1a)',
        border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
        borderRadius: 16,
        zIndex: 2001,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(token.thumb || detail?.info?.imageUrl) && (
              <img
                src={detail?.info?.imageUrl || token.thumb}
                alt={token.name}
                style={{ width: 32, height: 32, borderRadius: '50%' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div>
              <div style={{ color: 'var(--color-text-primary)', fontWeight: 700, fontSize: '1rem' }}>
                {token.name}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                {token.symbol?.toUpperCase()} {detail?.dexId ? `• ${detail.dexId}` : ''} • {(token.chainId || '').replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="loading-spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading token data...</span>
          </div>
        ) : (
          <div style={{ padding: '16px 20px' }}>
            {/* Price */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {formatPrice(detail?.priceUsd || token.priceUsd)}
              </div>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isPositive ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 4,
              }}>
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isPositive ? '+' : ''}{h24Change.toFixed(2)}% (24h)
              </div>
            </div>

            {/* Chart */}
            {chartData.length >= 2 && (
              <div style={{
                marginBottom: 16,
                padding: 12,
                background: 'var(--color-bg, #0a0a0a)',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
              }}>
                <MiniChart data={chartData} color={chartColor} />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  fontSize: '0.625rem',
                  color: 'var(--color-text-muted)',
                }}>
                  <span>24h ago</span>
                  <span>Now</span>
                </div>
              </div>
            )}

            {/* Price Changes */}
            <div style={{
              display: 'flex',
              gap: 6,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}>
              <ChangeIndicator value={detail?.priceChange?.m5} label="5m" />
              <ChangeIndicator value={detail?.priceChange?.h1} label="1h" />
              <ChangeIndicator value={detail?.priceChange?.h6} label="6h" />
              <ChangeIndicator value={detail?.priceChange?.h24} label="24h" />
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 16,
            }}>
              <StatItem
                icon={<DollarSign size={14} />}
                label="Market Cap"
                value={formatNumber(detail?.marketCap || detail?.fdv)}
              />
              <StatItem
                icon={<BarChart3 size={14} />}
                label="24h Volume"
                value={formatNumber(detail?.volume?.h24)}
              />
              <StatItem
                icon={<Droplets size={14} />}
                label="Liquidity"
                value={formatNumber(detail?.liquidity?.usd)}
              />
              <StatItem
                icon={<Activity size={14} />}
                label="24h Txns"
                value={txns24 ? `${(txns24.buys + txns24.sells).toLocaleString()}` : '--'}
              />
            </div>

            {/* Buy/Sell ratio */}
            {txns24 && (txns24.buys > 0 || txns24.sells > 0) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Buy / Sell (24h)
                </div>
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(txns24.buys / (txns24.buys + txns24.sells)) * 100}%`,
                    background: '#10b981',
                    borderRadius: '3px 0 0 3px',
                  }} />
                  <div style={{
                    flex: 1,
                    background: '#ef4444',
                    borderRadius: '0 3px 3px 0',
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 4,
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                }}>
                  <span style={{ color: '#10b981' }}>{txns24.buys.toLocaleString()} buys</span>
                  <span style={{ color: '#ef4444' }}>{txns24.sells.toLocaleString()} sells</span>
                </div>
              </div>
            )}

            {/* View on DexScreener */}
            <a
              href={dexScreenerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '12px 16px',
                background: 'var(--color-bg, #0a0a0a)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              View on DexScreener
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--color-bg, #0a0a0a)',
      borderRadius: 10,
      border: '1px solid var(--color-border)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        color: 'var(--color-text-muted)',
        fontSize: '0.6875rem',
        fontWeight: 500,
      }}>
        {icon}
        {label}
      </div>
      <div style={{
        color: 'var(--color-text-primary)',
        fontSize: '0.9375rem',
        fontWeight: 700,
      }}>
        {value}
      </div>
    </div>
  );
}

export default TokenDetailModal;
