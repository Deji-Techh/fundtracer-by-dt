/**
 * HowItWorksPage - Step-by-step guide
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Code2,
  DollarSign,
  Layers,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge } from '../design-system/primitives/Badge';
import { Panel } from '../design-system/primitives/Panel';
import './HowItWorksPage.css';
import './PublicPageShell.css';
import { LANDING_NAV_ITEMS } from '../constants/navigation';

const navItems = LANDING_NAV_ITEMS.map(item => 
  item.href === '/how-it-works' ? { ...item, active: true } : item
);

const steps = [
  {
    number: '01',
    title: 'Enter Wallet Address',
    description: 'Simply paste any wallet address you want to analyze. We support addresses from Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC.',
    badge: 'Input',
    badgeVariant: 'info' as const,
    icon: <Wallet size={24} strokeWidth={1.8} />,
  },
  {
    number: '02',
    title: 'Select Analysis Type',
    description: 'Choose from Wallet Analysis, Contract Analytics, Wallet Comparison, or Sybil Detection. Each mode provides specialized insights for different use cases.',
    badge: 'Configure',
    badgeVariant: 'warning' as const,
    icon: <SlidersHorizontal size={24} strokeWidth={1.8} />,
  },
  {
    number: '03',
    title: 'Choose Blockchain',
    description: 'Select which blockchain network to analyze. Free users can analyze Linea, while Pro and Max users have access to all 7+ supported networks.',
    badge: 'Network',
    badgeVariant: 'success' as const,
    icon: <Layers size={24} strokeWidth={1.8} />,
  },
  {
    number: '04',
    title: 'Get Results',
    description: 'Receive comprehensive analysis within seconds. View transaction timelines, funding trees, risk scores, and detailed behavioral patterns.',
    badge: 'Output',
    badgeVariant: 'default' as const,
    icon: <Activity size={24} strokeWidth={1.8} />,
  },
];

const useCases = [
  {
    title: 'For Researchers',
    description: 'Academic and independent researchers use FundTracer to study blockchain ecosystems, analyze token flows, and identify market patterns.',
    icon: <Search size={24} strokeWidth={1.8} />,
  },
  {
    title: 'For Investors',
    description: 'Investors leverage our tools for due diligence, tracking whale wallets, and identifying potential investment opportunities or risks.',
    icon: <DollarSign size={24} strokeWidth={1.8} />,
  },
  {
    title: 'For Compliance Teams',
    description: 'Compliance professionals use FundTracer to detect suspicious activities, ensure regulatory compliance, and investigate potential fraud.',
    icon: <ShieldCheck size={24} strokeWidth={1.8} />,
  },
  {
    title: 'For Developers',
    description: 'Web3 developers integrate our insights to build better dApps, analyze user behavior, and improve their protocols.',
    icon: <Code2 size={24} strokeWidth={1.8} />,
  },
];

export function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="how-page">
        {/* Hero Section */}
        <section className="how-hero">
          <div className="how-hero__grid"></div>
          <div className="how-hero__content">
            <Badge variant="default" size="sm">How It Works</Badge>
            <h1 className="how-hero__title">
              Simple,
              <span className="how-hero__title-accent">Powerful Analysis</span>
            </h1>
            <p className="how-hero__subtitle">
              Get started in minutes with our intuitive platform. 
              Analyze any wallet across multiple blockchains with just a few clicks.
            </p>
          </div>
        </section>

        {/* Steps Section */}
        <section className="how-steps">
          <div className="how-steps__container">
            {steps.map((step, index) => (
              <div key={step.number} className="how-step">
                <div className="how-step__number">{step.number}</div>
                <Panel variant="bordered" className="how-step__content">
                  <div className="how-step__header">
                    <div className="how-step__icon">{step.icon}</div>
                    <Badge variant={step.badgeVariant} size="sm">{step.badge}</Badge>
                  </div>
                  <h3 className="how-step__title">{step.title}</h3>
                  <p className="how-step__description">{step.description}</p>
                </Panel>
                {index < steps.length - 1 && <div className="how-step__connector"></div>}
              </div>
            ))}
          </div>
        </section>

        {/* Video Section */}
        <section className="how-video">
          <div className="how-video__container">
            <div className="how-video__header">
              <Badge variant="info" size="sm">Demo</Badge>
              <h2 className="how-video__title">See It In Action</h2>
            </div>
            <Panel variant="bordered" className="how-video__player-wrapper">
              <video 
                src="/videos/demo.mp4" 
                controls 
                playsInline
                className="how-video__player"
              >
                Your browser does not support the video tag.
              </video>
            </Panel>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="how-usecases">
          <div className="how-usecases__container">
            <div className="how-usecases__header">
              <Badge variant="success" size="sm">Use Cases</Badge>
              <h2 className="how-usecases__title">Who Uses FundTracer?</h2>
              <p className="how-usecases__subtitle">
                Our platform serves a diverse community of blockchain professionals
              </p>
            </div>
            <div className="how-usecases__grid">
              {useCases.map((useCase, index) => (
                <Panel key={index} variant="bordered" className="how-usecase">
                  <div className="how-usecase__icon">{useCase.icon}</div>
                  <h3 className="how-usecase__title">{useCase.title}</h3>
                  <p className="how-usecase__desc">{useCase.description}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="how-cta">
          <div className="how-cta__content">
            <h2 className="how-cta__title">Ready to Start Analyzing?</h2>
            <p className="how-cta__subtitle">
              Join thousands of users uncovering blockchain insights with FundTracer
            </p>
            <button 
              className="how-cta__button"
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

export default HowItWorksPage;
