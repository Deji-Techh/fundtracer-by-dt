/**
 * FeaturesPage - Product features showcase
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Bell,
  Clock,
  Download,
  FileText,
  GitCompare,
  Layers,
  Shield,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge } from '../design-system/primitives/Badge';
import { Panel } from '../design-system/primitives/Panel';
import './FeaturesPage.css';
import './PublicPageShell.css';

const navItems = [
  { label: 'Intel', href: '/' },
  { label: 'Blog', href: '/blog' },
  { label: 'Docs', href: '/docs/getting-started' },
  { label: 'Features', href: '/features', active: true },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'MCP', href: '/mcp' },
  { label: 'CLI', href: '/cli' },
  { label: 'About', href: '/about' },
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
    icon: <Wallet size={28} strokeWidth={1.8} />,
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
    icon: <FileText size={28} strokeWidth={1.8} />,
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
    icon: <GitCompare size={28} strokeWidth={1.8} />,
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
    icon: <Shield size={28} strokeWidth={1.8} />,
  },
];

const additionalFeatures = [
  {
    title: 'Real-time Data',
    description: 'Live blockchain data from 7+ networks with instant updates.',
    icon: <Activity size={20} strokeWidth={1.8} />,
  },
  {
    title: 'Export & Reports',
    description: 'Download analysis in CSV, JSON, or PDF formats.',
    icon: <Download size={20} strokeWidth={1.8} />,
  },
  {
    title: 'Historical Data',
    description: 'Access complete transaction history going back years.',
    icon: <Clock size={20} strokeWidth={1.8} />,
  },
  {
    title: 'Wallet Monitoring',
    description: 'Track wallets and get alerts on activity.',
    icon: <Bell size={20} strokeWidth={1.8} />,
  },
  {
    title: 'Multi-Chain',
    description: 'Support for ETH, Linea, Arbitrum, Base, Polygon & more.',
    icon: <Layers size={20} strokeWidth={1.8} />,
  },
  {
    title: 'Risk Scoring',
    description: 'Automated risk assessment for any wallet address.',
    icon: <ShieldCheck size={20} strokeWidth={1.8} />,
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
              Professional-Grade{' '}
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
