import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPolymarketTrending,
  getPolymarketSpikes,
  getPolymarketMovers,
  getPolymarketLeaderboard,
  getPolymarketMarkets,
  getPolymarketMarket,
  PolymarketMarket,
  PolymarketTrader,
  VolumeSpike,
  PriceMover,
} from '../api';
import { useIsMobile } from '../hooks/useIsMobile';

type ViewMode = 'trending' | 'spikes' | 'movers' | 'leaderboard' | 'search';

const modeButtons = [
  { id: 'trending', label: 'Trending', icon: TrendingIcon },
  { id: 'spikes', label: 'Spikes', icon: SpikeIcon },
  { id: 'movers', label: 'Movers', icon: MoversIcon },
  { id: 'leaderboard', label: 'Leaders', icon: TrophyIcon },
  { id: 'search', label: 'Search', icon: SearchIcon },
];

// Simple inline SVG icons
function TrendingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 6l-9.5 9.5-5-5L1 18"/>
      <path d="M17 6h6v6"/>
    </svg>
  );
}

function SpikeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  );
}

function MoversIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

interface PolymarketPageProps {}

const PolymarketPage: React.FC<PolymarketPageProps> = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('trending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [trendingMarkets, setTrendingMarkets] = useState<PolymarketMarket[]>([]);
  const [volumeSpikes, setVolumeSpikes] = useState<VolumeSpike[]>([]);
  const [priceMovers, setPriceMovers] = useState<PriceMover[]>([]);
  const [leaderboard, setLeaderboard] = useState<PolymarketTrader[]>([]);
  const [searchResults, setSearchResults] = useState<PolymarketMarket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected market for detail view
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  
  const isMobile = useIsMobile();

  // Load data based on view mode
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (viewMode) {
        case 'trending':
          const trendingRes = await getPolymarketTrending(20);
          if (trendingRes.success) {
            setTrendingMarkets(trendingRes.data);
          }
          break;
        case 'spikes':
          const spikesRes = await getPolymarketSpikes(2.0, 10000);
          if (spikesRes.success) {
            setVolumeSpikes(spikesRes.data);
          }
          break;
        case 'movers':
          const moversRes = await getPolymarketMovers(0.05);
          if (moversRes.success) {
            setPriceMovers(moversRes.data);
          }
          break;
        case 'leaderboard':
          const leaderboardRes = await getPolymarketLeaderboard(20);
          if (leaderboardRes.success) {
            setLeaderboard(leaderboardRes.data);
          }
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'search') {
      loadData();
    }
  }, [viewMode, loadData]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await getPolymarketMarkets({ q: searchQuery, limit: 20 });
      if (res.success) {
        setSearchResults(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  // Format percentage
  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '-';
    const percent = value * 100;
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  // Format price as percentage
  const formatPrice = (price?: string | number) => {
    if (price === undefined || price === null) return '-';
    const p = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(p)) return '-';
    return `${(p * 100).toFixed(1)}%`;
  };

  // Safe toFixed
  const safeToFixed = (value: number | undefined | null, decimals: number = 1): string => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    return value.toFixed(decimals);
  };

  // Open market on Polymarket
  const openOnPolymarket = (slug: string) => {
    window.open(`https://polymarket.com/event/${slug}`, '_blank');
  };

  // Render market card
  const renderMarketCard = (market: PolymarketMarket | undefined | null, extra?: React.ReactNode) => {
    // Guard against undefined/null market
    if (!market) return null;
    
    return (
    <motion.div
      key={market.id}
      className="section-flat"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: isMobile ? 16 : 20,
        marginBottom: 12,
        cursor: 'pointer',
      }}
      whileHover={{ scale: 1.01 }}
      onClick={() => setSelectedMarket(market)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 8,
            lineHeight: 1.4,
          }}>
            {market.question}
          </h3>
          
          {/* Outcome prices */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {market.outcomes?.map((outcome, i) => (
              <div key={i} style={{
                padding: '6px 12px',
                background: 'var(--color-bg)',
                borderRadius: 6,
                fontSize: '0.875rem',
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{outcome}: </span>
                <span style={{
                  fontWeight: 600,
                  color: i === 0 ? 'var(--color-success)' : 'var(--color-danger)',
                }}>
                  {market.outcomePrices?.[i] ? formatPrice(market.outcomePrices[i]) : '-'}
                </span>
              </div>
            ))}
          </div>
          
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            <span>24h Vol: <strong style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(market.volume24hr)}</strong></span>
            <span>Liquidity: <strong style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(market.liquidity)}</strong></span>
            {market.endDate && (
              <span>Ends: <strong style={{ color: 'var(--color-text-primary)' }}>{new Date(market.endDate).toLocaleDateString()}</strong></span>
            )}
          </div>
          
          {/* Extra content (spike ratio, price change, etc) */}
          {extra}
        </div>
        
        {/* Image thumbnail */}
        {market.image && (
          <img
            src={market.image}
            alt=""
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
              objectFit: 'cover',
            }}
          />
        )}
      </div>
      
      {/* Tags */}
      {market.tags && market.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {market.tags.slice(0, 3).map((tag, i) => (
            <span key={i} style={{
              padding: '2px 8px',
              background: 'var(--color-bg-hover)',
              borderRadius: 4,
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
    );
  };

  // Render market detail modal
  const renderMarketDetail = () => {
    if (!selectedMarket) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
        onClick={() => setSelectedMarket(null)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          style={{
            background: 'var(--color-bg-elevated)',
            borderRadius: 16,
            maxWidth: 600,
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: 24,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', flex: 1, marginRight: 16 }}>
              {selectedMarket.question}
            </h2>
            <button
              onClick={() => setSelectedMarket(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                color: 'var(--color-text-muted)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          {/* Image */}
          {selectedMarket.image && (
            <img
              src={selectedMarket.image}
              alt=""
              style={{
                width: '100%',
                height: 200,
                objectFit: 'cover',
                borderRadius: 12,
                marginBottom: 20,
              }}
            />
          )}
          
          {/* Description */}
          {selectedMarket.description && (
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              marginBottom: 20,
            }}>
              {selectedMarket.description}
            </p>
          )}
          
          {/* Outcomes */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>
              Outcomes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedMarket.outcomes?.map((outcome, i) => {
                const price = selectedMarket.outcomePrices?.[i] ? parseFloat(selectedMarket.outcomePrices[i]) : 0;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'var(--color-bg)',
                    borderRadius: 8,
                  }}>
                    <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>{outcome}</span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '1.125rem',
                      color: i === 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {formatPrice(price)}
                    </span>
                    <div style={{
                      width: 100,
                      height: 6,
                      background: 'var(--color-border)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${price * 100}%`,
                        height: '100%',
                        background: i === 0 ? 'var(--color-success)' : 'var(--color-danger)',
                        borderRadius: 3,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 20,
          }}>
            <div style={{ padding: 16, background: 'var(--color-bg)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>24h Volume</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatCurrency(selectedMarket.volume24hr)}
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--color-bg)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Total Volume</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatCurrency(selectedMarket.volume)}
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--color-bg)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Liquidity</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatCurrency(selectedMarket.liquidity)}
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--color-bg)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>End Date</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {selectedMarket.endDate ? new Date(selectedMarket.endDate).toLocaleDateString() : '-'}
              </div>
            </div>
          </div>
          
          {/* Action button */}
          <button
            onClick={() => openOnPolymarket(selectedMarket.slug)}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            Trade on Polymarket
            <ExternalLinkIcon />
          </button>
        </motion.div>
      </motion.div>
    );
  };

  // Render trader card
  const renderTraderCard = (trader: PolymarketTrader, index: number) => (
    <motion.div
      key={trader.address}
      className="section-flat"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: isMobile ? 16 : 20,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Rank */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: index < 3 ? 'var(--color-accent)' : 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        color: index < 3 ? 'white' : 'var(--color-text-primary)',
        fontSize: '0.875rem',
      }}>
        #{trader.rank || index + 1}
      </div>
      
      {/* Address */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: 'var(--color-text-primary)',
          marginBottom: 4,
        }}>
          {trader.address.slice(0, 6)}...{trader.address.slice(-4)}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
          <span>{trader.positions || 0} positions</span>
          {trader.winRate !== undefined && (
            <span style={{ color: trader.winRate > 0.5 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {safeToFixed((trader.winRate || 0) * 100)}% win rate
            </span>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>
          {formatCurrency(trader.volume)}
        </div>
        {trader.profit !== undefined && (
          <div style={{
            fontSize: '0.875rem',
            color: trader.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
          }}>
            {trader.profit >= 0 ? '+' : ''}{formatCurrency(trader.profit)} profit
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      className="page-container page-animate-enter"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Page Header */}
      <motion.div
        className="page-header-flat"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1>Prediction Markets</h1>
        <p>Explore trending markets, volume spikes, and top traders on Polymarket</p>
      </motion.div>

      {/* Tab Bar */}
      <motion.div
        className="tab-bar-flat"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {modeButtons.map((mode, index) => (
          <motion.button
            key={mode.id}
            className={`tab-item ${viewMode === mode.id ? 'active' : ''}`}
            onClick={() => setViewMode(mode.id as ViewMode)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
            whileTap={{ scale: 0.98 }}
          >
            <mode.icon />
            <span>{mode.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Search Input */}
      {viewMode === 'search' && (
        <motion.div
          className="section-flat"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: isMobile ? 16 : 20 }}
        >
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-muted)',
            marginBottom: 10,
          }}>
            Search Markets
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by question or topic..."
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                fontSize: '1rem',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            <motion.button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '12px 24px',
                background: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                cursor: loading || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !searchQuery.trim() ? 0.5 : 1,
              }}
            >
              Search
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="section-flat"
            style={{
              padding: 20,
              border: '1px solid var(--color-danger)',
              marginTop: 16,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-danger)' }}>
              Error Loading Data
            </div>
            <div style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
            <button
              onClick={loadData}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                background: 'var(--color-bg-hover)',
                border: 'none',
                borderRadius: 6,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 40,
        }}>
          <div className="loading-spinner" />
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: 16 }}
        >
          {/* Trending Markets */}
          {viewMode === 'trending' && trendingMarkets.length > 0 && (
            <>
              <div style={{
                padding: isMobile ? '16px 16px 8px' : '16px 20px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
              }}>
                Top Markets by 24h Volume
              </div>
              {trendingMarkets.map(market => renderMarketCard(market))}
            </>
          )}

          {/* Volume Spikes */}
          {viewMode === 'spikes' && volumeSpikes.length > 0 && (
            <>
              <div style={{
                padding: isMobile ? '16px 16px 8px' : '16px 20px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
              }}>
                Unusual Volume Activity
              </div>
              {volumeSpikes
                .filter(spike => spike?.market)
                .map(spike => renderMarketCard(spike.market, (
                <div style={{
                  marginTop: 12,
                  padding: 10,
                  background: 'rgba(var(--accent-rgb), 0.1)',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                    {safeToFixed(spike.spikeRatio)}x
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}> above average volume</span>
                </div>
              )))}
            </>
          )}

          {/* Price Movers */}
          {viewMode === 'movers' && priceMovers.length > 0 && (
            <>
              <div style={{
                padding: isMobile ? '16px 16px 8px' : '16px 20px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
              }}>
                Biggest Price Movements
              </div>
              {priceMovers
                .filter(mover => mover?.market)
                .map(mover => renderMarketCard(mover.market, (
                <div style={{
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: '0.875rem',
                }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: (mover.priceChange ?? 0) >= 0 ? 'rgba(0, 200, 100, 0.1)' : 'rgba(255, 100, 100, 0.1)',
                    color: (mover.priceChange ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    fontWeight: 600,
                  }}>
                    {formatPercent(mover.priceChange)}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {formatPrice(mover.previousPrice)} &rarr; {formatPrice(mover.currentPrice)}
                  </span>
                </div>
              )))}
            </>
          )}

          {/* Leaderboard */}
          {viewMode === 'leaderboard' && leaderboard.length > 0 && (
            <>
              <div style={{
                padding: isMobile ? '16px 16px 8px' : '16px 20px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
              }}>
                Top Traders
              </div>
              {leaderboard.map((trader, i) => renderTraderCard(trader, i))}
            </>
          )}

          {/* Search Results */}
          {viewMode === 'search' && searchResults.length > 0 && (
            <>
              <div style={{
                padding: isMobile ? '16px 16px 8px' : '16px 20px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-muted)',
              }}>
                Search Results ({searchResults.length})
              </div>
              {searchResults.map(market => renderMarketCard(market))}
            </>
          )}

          {/* Empty States */}
          {viewMode === 'trending' && trendingMarkets.length === 0 && !loading && (
            <EmptyState message="No trending markets found" />
          )}
          {viewMode === 'spikes' && volumeSpikes.length === 0 && !loading && (
            <EmptyState message="No volume spikes detected" />
          )}
          {viewMode === 'movers' && priceMovers.length === 0 && !loading && (
            <EmptyState message="No significant price movements" />
          )}
          {viewMode === 'leaderboard' && leaderboard.length === 0 && !loading && (
            <EmptyState message="Leaderboard unavailable" />
          )}
          {viewMode === 'search' && searchQuery && searchResults.length === 0 && !loading && (
            <EmptyState message={`No markets found for "${searchQuery}"`} />
          )}
        </motion.div>
      )}

      {/* Market Detail Modal */}
      <AnimatePresence>
        {selectedMarket && renderMarketDetail()}
      </AnimatePresence>
    </motion.div>
  );
};

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: 60,
      textAlign: 'center',
      color: 'var(--color-text-muted)',
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16, opacity: 0.5 }}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <p>{message}</p>
    </div>
  );
}

export default PolymarketPage;
