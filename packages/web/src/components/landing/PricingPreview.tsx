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
      '7 analyses per day',
      'Basic wallet analysis',
      '3-day transaction history',
      'Linea chain only',
    ],
    cta: 'Get Started',
    popular: false,
    color: '#6b7280',
  },
  {
    name: 'Pro',
    price: '$5',
    period: '/month',
    description: 'Most popular for researchers',
    features: [
      '25 analyses per day',
      'Advanced wallet analysis',
      '30-day transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    color: '#3b82f6',
  },
  {
    name: 'Max',
    price: '$10',
    period: '/month',
    description: 'Unlimited power users',
    features: [
      'Unlimited analyses',
      'Full historical data',
      'All chains + future',
      'API access',
      'Custom branding',
      'Dedicated support',
    ],
    cta: 'Go Unlimited',
    popular: false,
    color: '#8b5cf6',
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

              <Link 
                to="/pricing" 
                className={`btn ${tier.popular ? 'btn-primary' : 'btn-secondary'} tier-cta`}
              >
                {tier.cta}
              </Link>
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
