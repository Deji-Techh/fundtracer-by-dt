/**
 * PolymarketView - Prediction markets using new design system
 * Wraps existing PolymarketPage with design system integration
 */

import React from 'react';
import { Panel } from '../primitives';
import './PolymarketView.css';

// Lazy load the heavy component
const PolymarketPage = React.lazy(() => import('../../components/PolymarketPage'));

export function PolymarketView() {
  return (
    <div className="polymarket-view">
      {/* Header */}
      <div className="page-head">
        <h1 className="page-title">Polymarket</h1>
        <p className="page-desc">
          Track prediction markets, trending events, and price movements in real-time
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Active Markets</div>
          <div className="stat-val">50+</div>
        </div>
        <div className="stat">
          <div className="stat-label">Volume (24h)</div>
          <div className="stat-val">$2.5M</div>
        </div>
        <div className="stat">
          <div className="stat-label">Trending</div>
          <div className="stat-val">12</div>
        </div>
        <div className="stat">
          <div className="stat-label">Categories</div>
          <div className="stat-val">8</div>
        </div>
      </div>

      {/* Content */}
      <div className="polymarket-view__content">
        <React.Suspense fallback={<PolymarketSkeleton />}>
          <PolymarketPage />
        </React.Suspense>
      </div>
    </div>
  );
}

// Skeleton loading state - Updated for grid layout
function PolymarketSkeleton() {
  return (
    <div className="polymarket-skeleton">
      {/* Mode tabs skeleton */}
      <div className="polymarket-skeleton__tabs">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="polymarket-skeleton__tab skeleton" />
        ))}
      </div>

      {/* Section title skeleton */}
      <div className="section-title">
        <div className="skeleton" style={{ width: '180px', height: 14 }} />
      </div>

      {/* Cards skeleton - Grid */}
      <div className="markets-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="polymarket-card skeleton-card">
            {/* Card header */}
            <div className="skeleton-card__header">
              <div className="skeleton skeleton-card__icon" />
              <div className="skeleton skeleton-card__title" />
            </div>
            {/* Outcomes */}
            <div className="skeleton-card__outcomes">
              <div className="skeleton skeleton-card__outcome" />
              <div className="skeleton skeleton-card__outcome" />
            </div>
            {/* Stats */}
            <div className="skeleton-card__stats">
              <div className="skeleton skeleton-card__stat" />
              <div className="skeleton skeleton-card__stat" />
              <div className="skeleton skeleton-card__stat" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PolymarketView;
