import React, { useState } from 'react';
import './ScreenshotShowcase.css';

const screenshots = [
  {
    id: 1,
    title: 'Wallet Analysis Dashboard',
    description: 'Comprehensive view of wallet activity, holdings, and transaction history',
    image: '/dashboard.png',
  },
  {
    id: 2,
    title: 'Transaction Timeline',
    description: 'Visual timeline of all transactions with filtering and search',
    image: '/timeline.png',
  },
  {
    id: 3,
    title: 'Sybil Detection Network',
    description: 'Network graph showing connected wallets and bot patterns',
    image: '/sybil-network.png',
  },
  {
    id: 4,
    title: 'Multi-Wallet Comparison',
    description: 'Side-by-side comparison of multiple wallets',
    image: '/comparison.png',
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
              {/* Screenshot image */}
              <div className="screenshot-image-container">
                <img 
                  src={screenshots[activeIndex].image} 
                  alt={screenshots[activeIndex].title}
                  className="screenshot-image"
                />
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
