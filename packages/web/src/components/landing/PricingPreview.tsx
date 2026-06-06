import React from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import './PricingPreview.css';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      '50 analyses / day',
      'Full wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      '2 API keys',
    ],
    cta: 'Get Started',
    popular: false,
    color: '#6b7280',
    comingSoon: false,
  },
  {
    name: 'Pro',
    price: '$15',
    period: '/month',
    description: 'Most popular for researchers',
    features: [
      '300 analyses / day',
      'Advanced wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Unlimited API keys',
      'Sybil detection',
    ],
    cta: 'Coming Soon',
    popular: true,
    color: '#3b82f6',
    comingSoon: true,
  },
  {
    name: 'Max',
    price: '$25',
    period: '/month',
    description: 'Unlimited power users',
    features: [
      'Unlimited analyses',
      'Full historical data',
      'All chains (7+)',
      'API access',
      'Custom branding',
      'Dedicated support',
    ],
    cta: 'Coming Soon',
    popular: false,
    color: '#8b5cf6',
    comingSoon: true,
  },
];

export function PricingPreview() {
  return (
    <section className="pricing-section">
      <div className="pricing-container">
        {/* Header */}
        <div className="pricing-header">
          <span className="pricing-label">Pricing</span>
          <h2 className="pricing-title">Simple, transparent pricing</h2>
          <p className="pricing-subtitle">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {tiers.map((tier, index) => (
            <div 
              key={index}
              className={`pricing-card ${tier.popular ? 'popular' : ''}`}
              style={{ '--tier-color': tier.color } as React.CSSProperties}
            >
              {tier.popular && (
                <div className="popular-badge">Most Popular</div>
              )}
              
              <div className="pricing-card-header">
                <h3 className="tier-name">{tier.name}</h3>
                <div className="tier-price">
                  <span className="price-amount">{tier.price}</span>
                  <span className="price-period">{tier.period}</span>
                </div>
                <p className="tier-description">{tier.description}</p>
              </div>

              <ul className="tier-features">
                {tier.features.map((feature, i) => (
                  <li key={i} className="tier-feature">
                    <HugeiconsIcon 
                      icon={CheckmarkCircle02Icon} 
                      size={18} 
                      strokeWidth={2}
                      style={{ color: tier.color }}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.comingSoon ? (
                <div className="tier-cta-wrapper">
                  <button className="btn btn-secondary tier-cta tier-cta-disabled" disabled>
                    Coming Soon
                  </button>
                  <span className="tier-coming-soon-label">Coming Soon</span>
                </div>
              ) : (
                <Link
                  to="/pricing"
                  className={`btn ${tier.popular ? 'btn-primary' : 'btn-secondary'} tier-cta`}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Compare Link */}
        <div className="pricing-compare">
          <Link to="/pricing" className="compare-link">
            Compare all features
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}
