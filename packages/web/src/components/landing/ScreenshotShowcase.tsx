import React, { useState } from 'react';
import './ScreenshotShowcase.css';

const screenshots = [
  {
    id: 1,
    title: 'Wallet Analysis Dashboard',
    description: 'Comprehensive view of wallet activity, holdings, and transaction history',
    placeholder: 'Dashboard view with charts and metrics',
  },
  {
    id: 2,
    title: 'Transaction Timeline',
    description: 'Visual timeline of all transactions with filtering and search',
    placeholder: 'Timeline view with transaction details',
  },
  {
    id: 3,
    title: 'Sybil Detection Network',
    description: 'Network graph showing connected wallets and bot patterns',
    placeholder: 'Network graph visualization',
  },
  {
    id: 4,
    title: 'Multi-Wallet Comparison',
    description: 'Side-by-side comparison of multiple wallets',
    placeholder: 'Comparison view with data tables',
  },
];

export function ScreenshotShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="showcase-section">
      <div className="showcase-container">
        {/* Header */}
        <div className="showcase-header">
          <span className="showcase-label">Interface</span>
          <h2 className="showcase-title">Professional interface with real-time data</h2>
          <p className="showcase-subtitle">
            Clean, intuitive design that makes complex blockchain analysis simple
          </p>
        </div>

        {/* Screenshot Display */}
        <div className="showcase-display">
          <div className="showcase-browser">
            <div className="browser-header">
              <div className="browser-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="browser-address">fundtracer.xyz/app</div>
            </div>
            <div className="browser-content">
              {/* Placeholder for screenshot */}
              <div className="screenshot-placeholder">
                <div className="placeholder-icon">📊</div>
                <div className="placeholder-text">
                  <strong>{screenshots[activeIndex].title}</strong>
                  <span>{screenshots[activeIndex].placeholder}</span>
                </div>
                <div className="placeholder-hint">
                  Screenshot will be displayed here
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshot Navigation */}
        <div className="showcase-nav">
          {screenshots.map((shot, index) => (
            <button
              key={shot.id}
              className={`showcase-nav-item ${activeIndex === index ? 'active' : ''}`}
              onClick={() => setActiveIndex(index)}
            >
              <div className="nav-item-number">0{index + 1}</div>
              <div className="nav-item-content">
                <div className="nav-item-title">{shot.title}</div>
                <div className="nav-item-desc">{shot.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
