import React, { useEffect, useRef } from 'react';
import './ApiProvidersShowcase.css';

const providers = [
  { name: 'Dune Analytics', category: 'Data Analytics' },
  { name: 'Alchemy', category: 'Blockchain Infrastructure' },
  { name: 'LineaScan', category: 'Block Explorer' },
  { name: 'Etherscan', category: 'Block Explorer' },
  { name: 'CoinGecko', category: 'Market Data' },
  { name: 'DefiLlama', category: 'DeFi Analytics' },
  { name: 'Moralis', category: 'Web3 APIs' },
  { name: 'The Graph', category: 'Indexing Protocol' },
  { name: 'Infura', category: 'Node Infrastructure' },
  { name: 'QuickNode', category: 'Node Infrastructure' },
  { name: 'Nansen', category: 'Analytics' },
  { name: 'Arkham', category: 'Intelligence' },
];

export function ApiProvidersShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPos = 0;
    const speed = 0.5;

    const animate = () => {
      scrollPos += speed;
      if (scrollPos >= scrollContainer.scrollWidth / 2) {
        scrollPos = 0;
      }
      scrollContainer.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <section className="api-showcase">
      <div className="api-showcase-container">
        {/* Header */}
        <div className="api-showcase-header">
          <span className="api-showcase-label">Data Sources</span>
          <h2 className="api-showcase-title">Powered by Industry Leaders</h2>
          <p className="api-showcase-subtitle">
            We aggregate data from the most reliable sources in blockchain
          </p>
        </div>

        {/* Scrolling Marquee */}
        <div className="api-marquee-wrapper">
          <div className="api-marquee-gradient api-marquee-gradient-left" />
          <div className="api-marquee-gradient api-marquee-gradient-right" />
          
          <div ref={scrollRef} className="api-marquee">
            <div className="api-marquee-content">
              {/* First set */}
              {providers.map((provider, index) => (
                <div key={`a-${index}`} className="api-provider-card">
                  <div className="api-provider-glow" />
                  <div className="api-provider-content">
                    <div className="api-provider-icon">
                      {provider.name.charAt(0)}
                    </div>
                    <div className="api-provider-info">
                      <h3 className="api-provider-name">{provider.name}</h3>
                      <span className="api-provider-category">{provider.category}</span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {providers.map((provider, index) => (
                <div key={`b-${index}`} className="api-provider-card">
                  <div className="api-provider-glow" />
                  <div className="api-provider-content">
                    <div className="api-provider-icon">
                      {provider.name.charAt(0)}
                    </div>
                    <div className="api-provider-info">
                      <h3 className="api-provider-name">{provider.name}</h3>
                      <span className="api-provider-category">{provider.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="api-stats">
          <div className="api-stat">
            <span className="api-stat-number">12+</span>
            <span className="api-stat-label">Data Providers</span>
          </div>
          <div className="api-stat-divider" />
          <div className="api-stat">
            <span className="api-stat-number">99.9%</span>
            <span className="api-stat-label">Uptime</span>
          </div>
          <div className="api-stat-divider" />
          <div className="api-stat">
            <span className="api-stat-number">&lt;100ms</span>
            <span className="api-stat-label">Response Time</span>
          </div>
        </div>
      </div>
    </section>
  );
}
