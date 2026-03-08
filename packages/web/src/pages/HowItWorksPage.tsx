/**
 * HowItWorksPage - Step-by-step guide
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './HowItWorksPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'How It Works', href: '/how-it-works', active: true },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

const steps = [
  {
    number: '01',
    title: 'Enter Wallet Address',
    description: 'Simply paste any wallet address you want to analyze. We support addresses from Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC.',
    badge: 'Input',
    badgeVariant: 'info' as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M6 6V4C6 2.89543 6.89543 2 8 2H16C17.1046 2 18 2.89543 18 4V6" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Select Analysis Type',
    description: 'Choose from Wallet Analysis, Contract Analytics, Wallet Comparison, or Sybil Detection. Each mode provides specialized insights for different use cases.',
    badge: 'Configure',
    badgeVariant: 'warning' as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M19.4 15C19.8 14.1 20 13.1 20 12C20 10.9 19.8 9.9 19.4 9L22 7V17L19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.6 15C4.2 14.1 4 13.1 4 12C4 10.9 4.2 9.9 4.6 9L2 7V17L4.6 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Choose Blockchain',
    description: 'Select which blockchain network to analyze. Free users can analyze Linea, while Pro and Max users have access to all 7+ supported networks.',
    badge: 'Network',
    badgeVariant: 'success' as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Get Results',
    description: 'Receive comprehensive analysis within seconds. View transaction timelines, funding trees, risk scores, and detailed behavioral patterns.',
    badge: 'Output',
    badgeVariant: 'default' as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const useCases = [
  {
    title: 'For Researchers',
    description: 'Academic and independent researchers use FundTracer to study blockchain ecosystems, analyze token flows, and identify market patterns.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'For Investors',
    description: 'Investors leverage our tools for due diligence, tracking whale wallets, and identifying potential investment opportunities or risks.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2V22M17 5H9.5C8.12 5 7 6.12 7 7.5C7 8.88 8.12 10 9.5 10H14.5C15.88 10 17 11.12 17 12.5C17 13.88 15.88 15 14.5 15H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'For Compliance Teams',
    description: 'Compliance professionals use FundTracer to detect suspicious activities, ensure regulatory compliance, and investigate potential fraud.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'For Developers',
    description: 'Web3 developers integrate our insights to build better dApps, analyze user behavior, and improve their protocols.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M16 18L22 12L16 6M8 6L2 12L8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
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
