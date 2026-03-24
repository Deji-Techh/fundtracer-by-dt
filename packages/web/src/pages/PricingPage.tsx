/**
 * PricingPage - Pricing tiers and comparison
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './PricingPage.css';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing', active: true },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
];

const tiers = [
  {
    name: 'Free',
    price: '$0',
    originalPrice: '',
    period: 'forever',
    description: 'Perfect for getting started - now with unlimited access!',
    badge: null,
    features: [
      'Unlimited analyses',
      'Full wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      '2 API keys',
      'Priority support',
    ],
    cta: 'Get Started',
    popular: false,
    isFree: true,
  },
  {
    name: 'Pro',
    price: '$15',
    originalPrice: '$15',
    period: '/month',
    description: 'Most popular for researchers',
    badge: 'Most Popular',
    features: [
      'Unlimited analyses',
      'Advanced wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Unlimited API keys',
      'Priority support',
      'Sybil detection',
    ],
    cta: 'Get Started',
    popular: true,
    isFree: true,
  },
  {
    name: 'Max',
    price: '$25',
    originalPrice: '$25',
    period: '/month',
    description: 'For unlimited power users',
    badge: null,
    features: [
      'Unlimited analyses',
      'Full historical data',
      'All chains + future',
      'Unlimited API keys',
      'Custom branding',
      'Dedicated support',
      'Advanced analytics',
    ],
    cta: 'Go Unlimited',
    popular: false,
    isFree: true,
  },
];

const comparisonData = [
  { feature: 'Analyses', free: 'Unlimited', pro: 'Unlimited', max: 'Unlimited' },
  { feature: 'Transaction History', free: 'Full', pro: 'Full', max: 'Full History' },
  { feature: 'Supported Chains', free: '7+', pro: '7+', max: 'All + Future' },
  { feature: 'Export Formats', free: 'CSV, JSON', pro: 'CSV, JSON', max: 'All Formats' },
  { feature: 'Sybil Detection', free: '-', pro: '\u2713', max: '\u2713' },
  { feature: 'API Keys', free: '2', pro: 'Unlimited', max: 'Unlimited' },
  { feature: 'Support', free: 'Priority', pro: 'Priority', max: 'Dedicated' },
];

const faqs = [
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes, you can change your plan at any time. Changes take effect immediately.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards, PayPal, and crypto via Lemon Squeezy.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all paid plans come with a 7-day free trial. No credit card required.',
  },
  {
    question: 'What happens if I exceed my limit?',
    answer: "You'll need to wait for the next 4-hour window or upgrade for immediate access.",
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tier: string) => {
    if (tier === 'free') {
      navigate(isAuthenticated ? '/app-evm' : '/auth?mode=signup');
      return;
    }

    // For now, all tiers are free - just navigate to app
    navigate(isAuthenticated ? '/app-evm' : '/auth?mode=signup');
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="pricing-page">
        {/* Hero Section */}
        <section className="pricing-hero">
          <div className="pricing-hero__grid"></div>
          <div className="pricing-hero__content">
            <Badge variant="default" size="sm">Pricing</Badge>
            <h1 className="pricing-hero__title">
              Simple,
              <span className="pricing-hero__title-accent">Transparent Pricing</span>
            </h1>
            <p className="pricing-hero__subtitle">
              Choose the plan that fits your needs. Upgrade anytime.
            </p>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="pricing-tiers">
          <div className="pricing-tiers__container">
            {tiers.map((tier, index) => (
              <Panel 
                key={tier.name} 
                variant="bordered" 
                className={`pricing-tier ${tier.popular ? 'pricing-tier--popular' : ''}`}
              >
                {tier.badge && (
                  <Badge variant="success" size="sm" className="pricing-tier__badge">
                    {tier.badge}
                  </Badge>
                )}
                <div className="pricing-tier__header">
                  <h3 className="pricing-tier__name">{tier.name}</h3>
                  <div className="pricing-tier__price">
                    {tier.isFree ? (
                      <>
                        <span className="pricing-tier__original-price">{tier.originalPrice}</span>
                        <span className="pricing-tier__amount pricing-tier__amount--free">FREE</span>
                        <Badge variant="success" size="xs" className="pricing-tier__free-badge">FREE</Badge>
                      </>
                    ) : (
                      <>
                        <span className="pricing-tier__amount">{tier.price}</span>
                        <span className="pricing-tier__period">{tier.period}</span>
                      </>
                    )}
                  </div>
                  <p className="pricing-tier__description">{tier.description}</p>
                </div>
                <ul className="pricing-tier__features">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="pricing-tier__feature">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="pricing-tier__check">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  className={`pricing-tier__cta ${tier.popular ? 'pricing-tier__cta--primary' : ''} ${loadingTier === tier.name.toLowerCase() ? 'pricing-tier__cta--loading' : ''}`}
                  onClick={() => handleCheckout(tier.name.toLowerCase())}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === tier.name.toLowerCase() ? 'Loading...' : tier.cta}
                </button>
              </Panel>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="pricing-comparison">
          <div className="pricing-comparison__container">
            <div className="pricing-comparison__header">
              <Badge variant="info" size="sm">Compare</Badge>
              <h2 className="pricing-comparison__title">Compare Plans</h2>
            </div>
            <Panel variant="bordered" className="pricing-comparison__table">
              <div className="pricing-comparison__row pricing-comparison__row--header">
                <span className="pricing-comparison__cell pricing-comparison__cell--feature">Feature</span>
                <span className="pricing-comparison__cell">Free</span>
                <span className="pricing-comparison__cell">Pro</span>
                <span className="pricing-comparison__cell">Max</span>
              </div>
              {comparisonData.map((row, index) => (
                <div key={index} className="pricing-comparison__row">
                  <span className="pricing-comparison__cell pricing-comparison__cell--feature">
                    {row.feature}
                  </span>
                  <span className="pricing-comparison__cell">{row.free}</span>
                  <span className="pricing-comparison__cell">{row.pro}</span>
                  <span className="pricing-comparison__cell">{row.max}</span>
                </div>
              ))}
            </Panel>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="pricing-faq">
          <div className="pricing-faq__container">
            <div className="pricing-faq__header">
              <Badge variant="warning" size="sm">FAQ</Badge>
              <h2 className="pricing-faq__title">Common Questions</h2>
            </div>
            <div className="pricing-faq__grid">
              {faqs.map((faq, index) => (
                <Panel key={index} variant="bordered" className="pricing-faq__item">
                  <h3 className="pricing-faq__question">{faq.question}</h3>
                  <p className="pricing-faq__answer">{faq.answer}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="pricing-cta">
          <div className="pricing-cta__content">
            <h2 className="pricing-cta__title">Still Have Questions?</h2>
            <p className="pricing-cta__subtitle">
              Contact us at fundtracerbydt@gmail.com
            </p>
            <button
              className="pricing-cta__button"
              onClick={() => handleCheckout('free')}
            >
              Start Free
            </button>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}

export default PricingPage;
