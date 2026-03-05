import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Wallet01Icon, 
  File02Icon, 
  GitCompareIcon, 
  Shield01Icon,
  ChartLineData01Icon,
  Download01Icon,
  Clock01Icon,
  Notification03Icon
} from '@hugeicons/core-free-icons';
import './FeaturesPage.css';

const features = [
  {
    icon: Wallet01Icon,
    title: 'Wallet Analysis',
    description: 'Deep dive into any wallet address across multiple chains',
    details: [
      'Complete transaction timeline',
      'Portfolio composition analysis',
      'Funding source tracing',
      'Risk scoring algorithm',
      'Behavioral pattern detection'
    ]
  },
  {
    icon: File02Icon,
    title: 'Contract Analytics',
    description: 'Analyze smart contracts and their interactions',
    details: [
      'Contract creation analysis',
      'Holder distribution mapping',
      'Interaction pattern tracking',
      'Security vulnerability checks',
      'Token transfer monitoring'
    ]
  },
  {
    icon: GitCompareIcon,
    title: 'Wallet Comparison',
    description: 'Compare multiple wallets side-by-side',
    details: [
      'Side-by-side transaction view',
      'Shared interaction detection',
      'Similarity scoring',
      'Connection visualization',
      'Coordinated behavior flags'
    ]
  },
  {
    icon: Shield01Icon,
    title: 'Sybil Detection',
    description: 'Identify coordinated bot networks',
    details: [
      'Same-block transaction detection',
      'Funding clustering analysis',
      'Pattern recognition algorithms',
      'Network graph visualization',
      'Confidence scoring'
    ]
  }
];

const additionalFeatures = [
  {
    icon: ChartLineData01Icon,
    title: 'Real-time Data',
    description: 'Live blockchain data from 7+ networks'
  },
  {
    icon: Download01Icon,
    title: 'Export & Reports',
    description: 'Download analysis in CSV, JSON, or PDF'
  },
  {
    icon: Clock01Icon,
    title: 'Historical Data',
    description: 'Access complete transaction history'
  },
  {
    icon: Notification03Icon,
    title: 'Monitoring',
    description: 'Track wallets and get alerts'
  }
];

export function FeaturesPage() {
  const navigate = useNavigate();
  return (
    <div className="features-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      
      <section className="features-hero">
        <span className="features-label">Features</span>
        <h1 className="features-title">Everything You Need</h1>
        <p className="features-subtitle">
          Professional-grade blockchain intelligence tools
        </p>
      </section>

      <section className="features-main">
        {features.map((feature, index) => (
          <div key={index} className="feature-detail-card">
            <div className="feature-detail-icon">
              <HugeiconsIcon icon={feature.icon} size={32} strokeWidth={1.5} />
            </div>
            <div className="feature-detail-content">
              <h2 className="feature-detail-title">{feature.title}</h2>
              <p className="feature-detail-description">{feature.description}</p>
              <ul className="feature-detail-list">
                {feature.details.map((detail, i) => (
                  <li key={i} className="feature-detail-item">
                    <span className="feature-detail-bullet">◆</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      <section className="features-additional">
        <h2 className="features-section-title">Additional Features</h2>
        <div className="features-additional-grid">
          {additionalFeatures.map((feature, index) => (
            <div key={index} className="feature-additional-card">
              <div className="feature-additional-icon">
                <HugeiconsIcon icon={feature.icon} size={24} strokeWidth={1.5} />
              </div>
              <h3 className="feature-additional-title">{feature.title}</h3>
              <p className="feature-additional-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="features-cta">
        <h2>Ready to explore?</h2>
        <button className="features-cta-button">Launch App</button>
      </section>

      <footer className="page-footer">
        <a href="/terms">Terms of Service</a>
        <span>•</span>
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </div>
  );
}
