/**
 * PortfolioView - Portfolio dashboard using new design system
 * Wraps existing PortfolioAnalytics with design system integration
 */

import React from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { Panel } from '../primitives';
import './PortfolioView.css';

// Lazy load the heavy component
const PortfolioAnalytics = React.lazy(() => 
  import('../../components/PortfolioAnalytics').then(m => ({ default: m.PortfolioAnalytics }))
);

export function PortfolioView() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const handleConnectWallet = () => {
    if (!isConnected) {
      open();
    }
  };

  return (
    <div className="portfolio-view">
      {/* Header */}
      <div className="portfolio-view__header">
        <h1 className="portfolio-view__title">Portfolio</h1>
        <p className="portfolio-view__subtitle">
          Track your assets, analyze holdings, and manage your portfolio across Linea
        </p>
      </div>

      {/* Connect Wallet Prompt */}
      {!isConnected && (
        <Panel className="portfolio-view__connect">
          <div className="portfolio-view__connect-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--intel-cyan)" strokeWidth="1.5">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
              <circle cx="17" cy="15" r="2"/>
            </svg>
            <h3>Connect Your Wallet</h3>
            <p>Connect your wallet to view your portfolio, track assets, and manage holdings</p>
            <button className="portfolio-view__connect-btn" onClick={handleConnectWallet}>
              Connect Wallet
            </button>
          </div>
        </Panel>
      )}

      {/* Portfolio Content */}
      {isConnected && address && (
        <div className="portfolio-view__content">
          <React.Suspense fallback={<PortfolioSkeleton />}>
            <PortfolioAnalytics walletAddress={address} />
          </React.Suspense>
        </div>
      )}
    </div>
  );
}

// Skeleton loading state
function PortfolioSkeleton() {
  return (
    <div className="portfolio-skeleton">
      {/* Header skeleton */}
      <div className="portfolio-skeleton__header">
        <div className="portfolio-skeleton__icon skeleton" />
        <div className="portfolio-skeleton__title-group">
          <div className="portfolio-skeleton__title skeleton" />
          <div className="portfolio-skeleton__subtitle skeleton" />
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="portfolio-skeleton__metrics">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="portfolio-skeleton__metric">
            <div className="portfolio-skeleton__metric-label skeleton" />
            <div className="portfolio-skeleton__metric-value skeleton" />
            <div className="portfolio-skeleton__metric-change skeleton" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="portfolio-skeleton__content">
        <div className="portfolio-skeleton__chart">
          <div className="portfolio-skeleton__chart-circle skeleton" />
        </div>
        <div className="portfolio-skeleton__table">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="portfolio-skeleton__row">
              <div className="portfolio-skeleton__row-icon skeleton" />
              <div className="portfolio-skeleton__row-name skeleton" />
              <div className="portfolio-skeleton__row-value skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PortfolioView;
