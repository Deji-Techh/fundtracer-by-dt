import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import './PricingPage.css';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '7 analyses per 4 hours',
      'Basic wallet analysis',
      '3-day transaction history',
      'Linea chain only',
      'Community support',
    ],
    popular: false,
    cta: 'Get Started'
  },
  {
    name: 'Pro',
    price: '$5',
    period: '/month',
    description: 'Most popular for researchers',
    features: [
      '25 analyses per 4 hours',
      'Advanced wallet analysis',
      '30-day transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Priority support',
      'Sybil detection',
    ],
    popular: true,
    cta: 'Upgrade to Pro'
  },
  {
    name: 'Max',
    price: '$10',
    period: '/month',
    description: 'For unlimited power users',
    features: [
      'Unlimited analyses',
      'Full historical data',
      'All chains + future',
      'API access',
      'Custom branding',
      'Dedicated support',
      'Advanced analytics',
    ],
    popular: false,
    cta: 'Go Unlimited'
  },
];

const faqs = [
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes, you can change your plan at any time. Changes take effect immediately.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, crypto payments, and PayPal.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all paid plans come with a 7-day free trial. No credit card required.'
  },
  {
    question: 'What happens if I exceed my analysis limit?',
    answer: 'You\'ll need to wait for the next 4-hour window or upgrade to a higher plan for immediate access.'
  },
];

export function PricingPage() {
  return (
    <div className="pricing-page">
      {/* Hero */}
      <section className="pricing-hero">
        <span className="pricing-label">Pricing</span>
        <h1 className="pricing-title">Simple, Transparent Pricing</h1>
        <p className="pricing-subtitle">
          Choose the plan that fits your needs. All plans include core features.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pricing-tiers">
        <div className="pricing-grid">
          {tiers.map((tier, index) => (
            <div 
              key={index} 
              className={`pricing-card ${tier.popular ? 'pricing-card-popular' : ''}`}
            >
              {tier.popular && (
                <div className="pricing-popular-badge">Most Popular</div>
              )}
              
              <div className="pricing-card-header">
                <h3 className="pricing-tier-name">{tier.name}</h3>
                <div className="pricing-tier-price">
                  <span className="pricing-price">{tier.price}</span>
                  <span className="pricing-period">{tier.period}</span>
                </div>
                <p className="pricing-tier-description">{tier.description}</p>
              </div>

              <ul className="pricing-features">
                {tier.features.map((feature, i) => (
                  <li key={i} className="pricing-feature">
                    <HugeiconsIcon 
                      icon={CheckmarkCircle02Icon} 
                      size={18} 
                      className="pricing-check-icon"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button className={`pricing-cta ${tier.popular ? 'pricing-cta-primary' : ''}`}>
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Features Comparison */}
      <section className="pricing-comparison">
        <h2 className="pricing-section-title">Compare Plans</h2>
        <div className="pricing-comparison-table">
          <div className="pricing-comparison-header">
            <span>Feature</span>
            <span>Free</span>
            <span>Pro</span>
            <span>Max</span>
          </div>
          {[
            ['Analyses per 4 hours', '7', '25', 'Unlimited'],
            ['Transaction History', '3 days', '30 days', 'Full History'],
            ['Supported Chains', '1', '7+', 'All + Future'],
            ['Export Formats', '-', 'CSV, JSON', 'All Formats'],
            ['API Access', '-', '-', '✓'],
            ['Support', 'Community', 'Priority', 'Dedicated'],
          ].map((row, index) => (
            <div key={index} className="pricing-comparison-row">
              <span className="pricing-feature-name">{row[0]}</span>
              <span className={row[1] === '✓' ? 'pricing-check' : ''}>{row[1]}</span>
              <span className={row[2] === '✓' ? 'pricing-check' : ''}>{row[2]}</span>
              <span className={row[3] === '✓' ? 'pricing-check' : ''}>{row[3]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pricing-faq">
        <h2 className="pricing-section-title">Frequently Asked Questions</h2>
        <div className="pricing-faq-grid">
          {faqs.map((faq, index) => (
            <div key={index} className="pricing-faq-item">
              <h3 className="pricing-faq-question">{faq.question}</h3>
              <p className="pricing-faq-answer">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pricing-bottom-cta">
        <h2>Still have questions?</h2>
        <p>Contact us at fundtracerbydt@gmail.com</p>
      </section>
    </div>
  );
}
