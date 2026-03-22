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
      <div className="view-watermark">
        <svg className="watermark-logo" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
          <circle cx="20" cy="20" r="8" fill="currentColor"/>
          <circle cx="12" cy="12" r="4" fill="currentColor"/>
          <circle cx="28" cy="12" r="4" fill="currentColor"/>
          <circle cx="12" cy="28" r="4" fill="currentColor"/>
          <circle cx="28" cy="28" r="4" fill="currentColor"/>
          <line x1="12" y1="12" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="28" y1="12" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="28" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="28" y1="28" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="watermark-text">FundTracer</span>
      </div>
      {/* Header */}
      <div className="polymarket-view__header">
        <h1 className="polymarket-view__title">Polymarket</h1>
        <p className="polymarket-view__subtitle">
          Track prediction markets, trending events, and price movements in real-time
        </p>
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

// Skeleton loading state
function PolymarketSkeleton() {
  return (
    <div className="polymarket-skeleton">
      {/* Mode tabs skeleton */}
      <div className="polymarket-skeleton__tabs">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="polymarket-skeleton__tab skeleton" />
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="polymarket-skeleton__grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="polymarket-skeleton__card">
            <div className="polymarket-skeleton__card-header">
              <div className="polymarket-skeleton__card-icon skeleton" />
              <div className="polymarket-skeleton__card-title skeleton" />
            </div>
            <div className="polymarket-skeleton__card-question skeleton" />
            <div className="polymarket-skeleton__card-meta">
              <div className="polymarket-skeleton__card-stat skeleton" />
              <div className="polymarket-skeleton__card-stat skeleton" />
            </div>
            <div className="polymarket-skeleton__card-bar skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PolymarketView;
