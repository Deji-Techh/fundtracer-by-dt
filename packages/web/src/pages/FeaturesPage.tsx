/**
 * FeaturesPage - Product features showcase
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './FeaturesPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features', active: true },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

const mainFeatures = [
  {
    id: 'wallet-analysis',
    badge: 'Core Feature',
    badgeVariant: 'success' as const,
    title: 'Wallet Analysis',
    description: 'Deep dive into any wallet address across multiple chains. Understand transaction patterns, funding sources, and behavioral characteristics.',
    capabilities: [
      'Complete transaction timeline',
      'Portfolio composition analysis',
      'Funding source tracing',
      'Risk scoring algorithm',
      'Behavioral pattern detection',
    ],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M22 10H18C16.8954 10 16 10.8954 16 12C16 13.1046 16.8954 14 18 14H22" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 6V4C6 2.89543 6.89543 2 8 2H16C17.1046 2 18 2.89543 18 4V6" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    id: 'contract-analytics',
    badge: 'Advanced',
    badgeVariant: 'warning' as const,
    title: 'Contract Analytics',
    description: 'Analyze smart contracts and their interactions. Identify token distributions, holder patterns, and contract behaviors.',
    capabilities: [
      'Contract creation analysis',
      'Holder distribution mapping',
      'Interaction pattern tracking',
      'Security vulnerability checks',
      'Token transfer monitoring',
    ],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 13H16M8 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'wallet-comparison',
    badge: 'Pro Feature',
    badgeVariant: 'info' as const,
    title: 'Wallet Comparison',
    description: 'Compare multiple wallets side-by-side to identify connections, shared interactions, and coordinated behaviors.',
    capabilities: [
      'Side-by-side transaction view',
      'Shared interaction detection',
      'Similarity scoring',
      'Connection visualization',
      'Coordinated behavior flags',
    ],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="2"/>
        <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="2"/>
        <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
        <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M9 6H15M6 9V15M18 9V15M9 18H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'sybil-detection',
    badge: 'Intelligence',
    badgeVariant: 'danger' as const,
    title: 'Sybil Detection',
    description: 'Identify coordinated bot networks and fake accounts using advanced pattern recognition and clustering algorithms.',
    capabilities: [
      'Same-block transaction detection',
      'Funding clustering analysis',
      'Pattern recognition algorithms',
      'Network graph visualization',
      'Confidence scoring',
    ],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
];

const additionalFeatures = [
  {
    title: 'Real-time Data',
    description: 'Live blockchain data from 7+ networks with instant updates.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Export & Reports',
    description: 'Download analysis in CSV, JSON, or PDF formats.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 3V15M12 15L7 10M12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Historical Data',
    description: 'Access complete transaction history going back years.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Wallet Monitoring',
    description: 'Track wallets and get alerts on activity.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Multi-Chain',
    description: 'Support for ETH, Linea, Arbitrum, Base, Polygon & more.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Risk Scoring',
    description: 'Automated risk assessment for any wallet address.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="features-page">
        {/* Hero Section */}
        <section className="features-hero">
          <div className="features-hero__grid"></div>
          <div className="features-hero__content">
            <Badge variant="default" size="sm">Features</Badge>
            <h1 className="features-hero__title">
              Professional-Grade
              <span className="features-hero__title-accent">Blockchain Intelligence</span>
            </h1>
            <p className="features-hero__subtitle">
              Everything you need to analyze wallets, detect patterns, and uncover 
              hidden connections across multiple blockchains.
            </p>
          </div>
        </section>

        {/* Main Features Section */}
        <section className="features-main">
          <div className="features-main__container">
            {mainFeatures.map((feature, index) => (
              <Panel key={feature.id} variant="bordered" className="features-card">
                <div className="features-card__header">
                  <div className="features-card__icon">{feature.icon}</div>
                  <Badge variant={feature.badgeVariant} size="sm">{feature.badge}</Badge>
                </div>
                <h2 className="features-card__title">{feature.title}</h2>
                <p className="features-card__description">{feature.description}</p>
                <ul className="features-card__list">
                  {feature.capabilities.map((capability, i) => (
                    <li key={i} className="features-card__item">
                      <span className="features-card__bullet"></span>
                      {capability}
                    </li>
                  ))}
                </ul>
                <div className="features-card__number">0{index + 1}</div>
              </Panel>
            ))}
          </div>
        </section>

        {/* Additional Features Section */}
        <section className="features-additional">
          <div className="features-additional__container">
            <div className="features-additional__header">
              <Badge variant="info" size="sm">More Capabilities</Badge>
              <h2 className="features-additional__title">Additional Features</h2>
              <p className="features-additional__subtitle">
                Beyond the core functionality, FundTracer offers a comprehensive suite of tools
              </p>
            </div>
            <div className="features-additional__grid">
              {additionalFeatures.map((feature, index) => (
                <Panel key={index} variant="bordered" className="features-mini">
                  <div className="features-mini__icon">{feature.icon}</div>
                  <h3 className="features-mini__title">{feature.title}</h3>
                  <p className="features-mini__desc">{feature.description}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="features-cta">
          <div className="features-cta__content">
            <h2 className="features-cta__title">Ready to Explore?</h2>
            <p className="features-cta__subtitle">
              Start analyzing blockchain data with professional-grade tools
            </p>
            <button 
              className="features-cta__button"
              onClick={() => navigate('/app')}
            >
              Launch Application
            </button>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}

export default FeaturesPage;
