import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import './Pricing.css';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    originalPrice: '',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      'Unlimited analyses',
      'Full wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Priority support',
    ],
    popular: true,
  },
  {
    name: 'Pro',
    price: '$0',
    originalPrice: '$5',
    period: '/month',
    description: 'Most popular for researchers',
    features: [
      'Unlimited analyses',
      'Advanced wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Priority support',
    ],
    popular: false,
  },
  {
    name: 'Max',
    price: '$0',
    originalPrice: '$10',
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
          <p className="pricing-subtitle">All plans are currently <span className="pricing-free-badge">FREE</span> - No payment required!</p>
        </div>

        <div className="pricing-grid">
          {tiers.map((tier, index) => (
            <div 
              key={index}
              className={`pricing-card ${tier.popular ? 'pricing-card-popular' : ''}`}
            >
              {tier.popular && (
                <div className="pricing-popular-badge">Best Value</div>
              )}
              
              <h3 className="pricing-tier-name">{tier.name}</h3>
              <div className="pricing-tier-price">
                {tier.originalPrice && (
                  <span className="pricing-original-price">{tier.originalPrice}</span>
                )}
                <span className="pricing-price">{tier.price}</span>
                <span className="pricing-period">{tier.period}</span>
                <span className="pricing-free-label">FREE</span>
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
                onClick={() => window.location.href = '/app-evm'}
                className={`pricing-cta ${tier.popular ? 'pricing-cta-primary' : ''}`}
              >
                {tier.name === 'Max' ? 'Go Unlimited' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
