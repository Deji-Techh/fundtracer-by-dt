import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPolymarketTrending,
  getPolymarketSpikes,
  getPolymarketMovers,
  getPolymarketMarkets,
  PolymarketMarket,
  VolumeSpike,
  PriceMover,
} from '../api';
import { useIsMobile } from '../hooks/useIsMobile';

type ViewMode = 'all' | 'trending' | 'spikes' | 'movers' | 'search';

const modeButtons = [
  { id: 'all', label: 'All', icon: GridIcon },
  { id: 'trending', label: 'Trending', icon: TrendingIcon },
  { id: 'spikes', label: 'Spikes', icon: SpikeIcon },
  { id: 'movers', label: 'Movers', icon: MoversIcon },
  { id: 'search', label: 'Search', icon: SearchIcon },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

// Simple inline SVG icons
function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

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
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [trendingMarkets, setTrendingMarkets] = useState<PolymarketMarket[]>([]);
  const [volumeSpikes, setVolumeSpikes] = useState<VolumeSpike[]>([]);
  const [priceMovers, setPriceMovers] = useState<PriceMover[]>([]);
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
        case 'all':
          const allRes = await getPolymarketMarkets({ limit: 50 });
          if (allRes.success) {
            setAllMarkets(allRes.data);
          }
          break;
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

  // Render market card - Grid Layout
  const renderMarketCard = (market: PolymarketMarket | undefined | null, extra?: React.ReactNode) => {
    if (!market) return null;
    
    const primaryPrice = market.outcomePrices?.[0] ? parseFloat(String(market.outcomePrices[0])) : 0;
    const isYesLikely = primaryPrice >= 0.5;
    
    return (
      <motion.div
        key={market.id}
        className="polymarket-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        onClick={() => setSelectedMarket(market)}
        style={{
          cursor: 'pointer',
        }}
      >
        {/* Card Header with outcome indicator */}
        <div className="polymarket-card__header" style={{
          borderLeft: `4px solid ${isYesLikely ? 'var(--color-success)' : 'var(--color-danger)'}`,
        }}>
          <div className="polymarket-card__icon">
            {market.image ? (
              <img src={market.image} alt="" />
            ) : (
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '1.1rem',
              }}>
                {market.question?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="polymarket-card__title-wrap">
            <h3 className="polymarket-card__title">{market.question}</h3>
          </div>
        </div>

        {/* Outcome Prices */}
        <div className="polymarket-card__outcomes">
          {market.outcomes?.slice(0, 2).map((outcome, i) => (
            <div key={i} className={`polymarket-card__outcome outcome-${outcome?.toLowerCase()}`}>
              <span className="outcome-label">{outcome}</span>
              <span className="outcome-price">
                {market.outcomePrices?.[i] ? formatPrice(market.outcomePrices[i]) : '-'}
              </span>
              <div className="outcome-bar">
                <div 
                  className="outcome-bar-fill" 
                  style={{ 
                    width: `${(parseFloat(String(market.outcomePrices?.[i] || '0')) * 100)}%`,
                    background: i === 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  }} 
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="polymarket-card__stats">
          <div className="stat-item">
            <span className="stat-label">24h Vol</span>
            <span className="stat-value">{formatCurrency(market.volume24hr)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Liquidity</span>
            <span className="stat-value">{formatCurrency(market.liquidity)}</span>
          </div>
          {market.endDate && (
            <div className="stat-item">
              <span className="stat-label">Ends</span>
              <span className="stat-value">{new Date(market.endDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Extra content (spike ratio, price change) */}
        {extra && <div className="polymarket-card__extra">{extra}</div>}

        {/* Tags */}
        {market.tags && market.tags.length > 0 && (
          <div className="polymarket-card__tags">
            {market.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // Render market detail slide-out panel
  const renderSlideOutPanel = () => {
    if (!selectedMarket) return null;
    
    const primaryPrice = selectedMarket.outcomePrices?.[0] ? parseFloat(selectedMarket.outcomePrices[0]) : 0;
    const isYesLikely = primaryPrice >= 0.5;
    
    return (
      <>
        {/* Backdrop */}
        <motion.div
          className="slide-out-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedMarket(null)}
        />
        
        {/* Slide-out Panel */}
        <motion.div
          className="slide-out-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Panel Header */}
          <div className="slide-out-panel__header">
            <div className="slide-out-panel__title-wrap">
              <h2 className="slide-out-panel__title">{selectedMarket.question}</h2>
              {selectedMarket.slug && (
                <span className="slide-out-panel__slug">{selectedMarket.slug}</span>
              )}
            </div>
            <button
              className="slide-out-panel__close"
              onClick={() => setSelectedMarket(null)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Panel Content */}
          <div className="slide-out-panel__content">
            {/* Market Image */}
            {selectedMarket.image && (
              <div className="slide-out-panel__image">
                <img src={selectedMarket.image} alt="" />
              </div>
            )}

            {/* Description */}
            {selectedMarket.description && (
              <p className="slide-out-panel__description">{selectedMarket.description}</p>
            )}

            {/* Outcome Probabilities */}
            <div className="slide-out-panel__section">
              <h4 className="slide-out-panel__section-title">Outcome Probabilities</h4>
              <div className="outcomes-list">
                {selectedMarket.outcomes?.map((outcome, i) => {
                  const price = selectedMarket.outcomePrices?.[i] ? parseFloat(selectedMarket.outcomePrices[i]) : 0;
                  const isPrimary = i === 0;
                  return (
                    <div key={i} className={`outcome-row ${isPrimary ? 'outcome-row--primary' : ''}`}>
                      <div className="outcome-row__info">
                        <span className="outcome-row__label">{outcome}</span>
                        <span className={`outcome-row__price ${isPrimary ? 'positive' : 'negative'}`}>
                          {formatPrice(price)}
                        </span>
                      </div>
                      <div className="outcome-row__bar">
                        <div 
                          className="outcome-row__bar-fill"
                          style={{ 
                            width: `${price * 100}%`,
                            background: isPrimary ? 'var(--color-success)' : 'var(--color-danger)',
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="slide-out-panel__section">
              <h4 className="slide-out-panel__section-title">Market Stats</h4>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-card__label">24h Volume</span>
                  <span className="stat-card__value">{formatCurrency(selectedMarket.volume24hr)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card__label">Total Volume</span>
                  <span className="stat-card__value">{formatCurrency(selectedMarket.volume)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card__label">Liquidity</span>
                  <span className="stat-card__value">{formatCurrency(selectedMarket.liquidity)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card__label">End Date</span>
                  <span className="stat-card__value">
                    {selectedMarket.endDate ? new Date(selectedMarket.endDate).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {selectedMarket.tags && selectedMarket.tags.length > 0 && (
              <div className="slide-out-panel__section">
                <div className="tags-list">
                  {selectedMarket.tags.map((tag, i) => (
                    <span key={i} className="tag-pill">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              className="trade-button"
              onClick={() => openOnPolymarket(selectedMarket.slug)}
            >
              <span>Trade on Polymarket</span>
              <ExternalLinkIcon />
            </button>
          </div>
        </motion.div>
      </>
    );
  };

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
        <p>Explore prediction markets, volume spikes, and price movers on Polymarket</p>
      </motion.div>

      {/* Tab Bar - Improved UI */}
      <motion.div
        className="polymarket-tabs"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {modeButtons.map((mode, index) => (
          <motion.button
            key={mode.id}
            className={`polymarket-tab ${viewMode === mode.id ? 'active' : ''}`}
            onClick={() => setViewMode(mode.id as ViewMode)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="polymarket-tab__icon"><mode.icon /></span>
            <span className="polymarket-tab__label">{mode.label}</span>
            {viewMode === mode.id && (
              <motion.div 
                className="polymarket-tab__indicator"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
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

{/* Content - Grid Layout */}
      {!loading && !error && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ marginTop: 16 }}
        >
          {/* Trending Markets */}
          {viewMode === 'trending' && trendingMarkets.length > 0 && (
            <>
              <div className="section-title">
                Top Markets by 24h Volume
              </div>
              <motion.div className="markets-grid">
                {trendingMarkets.map(market => renderMarketCard(market))}
              </motion.div>
            </>
          )}

          {/* Volume Spikes */}
          {viewMode === 'spikes' && volumeSpikes.length > 0 && (
            <>
              <div className="section-title">
                Unusual Volume Activity
              </div>
              <motion.div className="markets-grid">
                {volumeSpikes
                  .filter(spike => spike?.market)
                  .map(spike => renderMarketCard(spike.market, (
                    <div className="spike-badge">
                      <span className="spike-value">{safeToFixed(spike.spikeRatio)}x</span>
                      <span className="spike-label">above avg</span>
                    </div>
                  )))}
              </motion.div>
            </>
          )}

          {/* Price Movers */}
          {viewMode === 'movers' && priceMovers.length > 0 && (
            <>
              <div className="section-title">
                Biggest Price Movements
              </div>
              <motion.div className="markets-grid">
                {priceMovers
                  .filter(mover => mover?.market)
                  .map(mover => renderMarketCard(mover.market, (
                    <div className="mover-badge">
                      <span className={`mover-value ${(mover.priceChange ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                        {formatPercent(mover.priceChange)}
                      </span>
                      <span className="mover-range">
                        {formatPrice(mover.previousPrice)} → {formatPrice(mover.currentPrice)}
                      </span>
                    </div>
                  )))}
              </motion.div>
            </>
          )}

          {/* All Markets */}
          {viewMode === 'all' && allMarkets.length > 0 && (
            <>
              <div className="section-title">
                All Markets ({allMarkets.length})
              </div>
              <motion.div className="markets-grid">
                {allMarkets.map(market => renderMarketCard(market))}
              </motion.div>
            </>
          )}

          {/* Search Results */}
          {viewMode === 'search' && searchResults.length > 0 && (
            <>
              <div className="section-title">
                Search Results ({searchResults.length})
              </div>
              <motion.div className="markets-grid">
                {searchResults.map(market => renderMarketCard(market))}
              </motion.div>
            </>
          )}

          {/* Empty States */}
          {viewMode === 'all' && allMarkets.length === 0 && !loading && (
            <EmptyState message="No markets found" />
          )}
          {viewMode === 'trending' && trendingMarkets.length === 0 && !loading && (
            <EmptyState message="No trending markets found" />
          )}
          {viewMode === 'spikes' && volumeSpikes.length === 0 && !loading && (
            <EmptyState message="No volume spikes detected" />
          )}
          {viewMode === 'movers' && priceMovers.length === 0 && !loading && (
            <EmptyState message="No significant price movements" />
          )}
{viewMode === 'search' && searchQuery && searchResults.length === 0 && !loading && (
            <EmptyState message={`No markets found for "${searchQuery}"`} />
          )}
        </motion.div>
      )}

      {/* Slide-out Panel */}
      <AnimatePresence>
        {selectedMarket && renderSlideOutPanel()}
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
