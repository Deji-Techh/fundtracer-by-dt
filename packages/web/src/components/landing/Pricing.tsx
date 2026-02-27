import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import './Pricing.css';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      '7 analyses per 4 hours',
      'Basic wallet analysis',
      '3-day transaction history',
      'Linea chain only',
    ],
    popular: false,
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
    ],
    popular: true,
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
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="pricing-section">
      <div className="pricing-container">
        <div className="pricing-header">
          <span className="pricing-label">Pricing</span>
          <h2 className="pricing-title">Simple, transparent pricing</h2>
          <p className="pricing-subtitle">Choose the plan that fits your needs</p>
        </div>

        <div className="pricing-grid">
          {tiers.map((tier, index) => (
            <div 
              key={index}
              className={`pricing-card ${tier.popular ? 'pricing-card-popular' : ''}`}
            >
              {tier.popular && (
                <div className="pricing-popular-badge">Most Popular</div>
              )}
              
              <h3 className="pricing-tier-name">{tier.name}</h3>
              <div className="pricing-tier-price">
                <span className="pricing-price">{tier.price}</span>
                <span className="pricing-period">{tier.period}</span>
              </div>
              <p className="pricing-tier-description">{tier.description}</p>

              <ul className="pricing-features">
                {tier.features.map((feature, i) => (
                  <li key={i} className="pricing-feature">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="pricing-check-icon" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => window.location.href = '/evm'}
                className={`pricing-cta ${tier.popular ? 'pricing-cta-primary' : ''}`}
              >
                {tier.popular ? 'Upgrade to Pro' : tier.name === 'Max' ? 'Go Unlimited' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
