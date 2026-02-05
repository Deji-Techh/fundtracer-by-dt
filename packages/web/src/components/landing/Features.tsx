import React from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wallet01Icon, File02Icon, GitCompareIcon, Shield01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import './Features.css';

const features = [
  {
    icon: Wallet01Icon,
    title: 'Wallet Analysis',
    description: 'Deep dive into any wallet address across multiple chains. View transaction history, funding sources, portfolio composition, and behavioral patterns.',
    features: ['Transaction timeline', 'Funding tree visualization', 'Token holdings', 'Risk scoring'],
    color: '#3b82f6',
  },
  {
    icon: File02Icon,
    title: 'Contract Analytics',
    description: 'Analyze smart contracts to understand their behavior, security, and interactions. Perfect for due diligence and research.',
    features: ['Contract creation analysis', 'Interaction patterns', 'Security checks', 'Holder distribution'],
    color: '#10b981',
  },
  {
    icon: GitCompareIcon,
    title: 'Wallet Comparison',
    description: 'Compare multiple wallets side-by-side to identify connections, similarities, and coordinated behaviors.',
    features: ['Side-by-side comparison', 'Shared interactions', 'Similarity scoring', 'Visual mapping'],
    color: '#f59e0b',
  },
  {
    icon: Shield01Icon,
    title: 'Sybil Detection',
    description: 'Identify coordinated bot networks and fake accounts using advanced algorithms and network analysis.',
    features: ['Same-block detection', 'Funding clustering', 'Pattern analysis', 'Network graphs'],
    color: '#8b5cf6',
  },
];

export function Features() {
  return (
    <section className="features-section">
      <div className="features-container">
        {/* Section Header */}
        <div className="features-header">
          <span className="features-label">Features</span>
          <h2 className="features-title">Everything you need for blockchain intelligence</h2>
          <p className="features-subtitle">
            Professional-grade tools designed for researchers, investors, and compliance teams
          </p>
        </div>

        {/* Features Grid */}
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="feature-card"
              style={{ '--feature-color': feature.color } as React.CSSProperties}
            >
              <div className="feature-icon-wrapper" style={{ background: `${feature.color}15` }}>
                <HugeiconsIcon 
                  icon={feature.icon} 
                  size={28} 
                  strokeWidth={1.5}
                  style={{ color: feature.color }}
                />
              </div>
              
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              
              <ul className="feature-list">
                {feature.features.map((item, i) => (
                  <li key={i} className="feature-list-item">
                    <span className="feature-bullet" style={{ background: feature.color }}></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="features-cta">
          <Link to="/features" className="btn btn-secondary">
            Explore All Features
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
