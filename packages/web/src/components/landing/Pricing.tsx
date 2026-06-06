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
      '50 analyses / day',
      'Full wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Priority support',
    ],
    popular: true,
    comingSoon: false,
  },
  {
    name: 'Pro',
    price: '$15',
    originalPrice: '',
    period: '/month',
    description: 'For professional researchers',
    features: [
      '300 analyses / day',
      'Advanced wallet analysis',
      'Full transaction history',
      'All chains (7+)',
      'Export to CSV/JSON',
      'Priority support',
      'API access',
      'Sybil detection',
    ],
    popular: false,
    comingSoon: true,
  },
  {
    name: 'Max',
    price: '$25',
    originalPrice: '',
    period: '/month',
    description: 'For unlimited power users',
    features: [
      'Unlimited analyses',
      'Full historical data',
      'All chains (7+)',
      'API access',
      'Custom branding',
      'Dedicated support',
    ],
    popular: false,
    comingSoon: true,
  },
];

export function Pricing() {
  return (
    <section className="pricing-section">
      <div className="pricing-container">
        <div className="pricing-header">
          <span className="pricing-label">Pricing</span>
          <h2 className="pricing-title">Simple, transparent pricing</h2>
          <p className="pricing-subtitle">Choose the plan that fits your needs. Pro and Max coming soon.</p>
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
                {!tier.originalPrice && tier.price === '$0' && (
                  <span className="pricing-free-label">FREE</span>
                )}
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

              {tier.comingSoon ? (
                <div className="pricing-coming-soon-wrapper">
                  <button className="pricing-cta pricing-cta-disabled" disabled>
                    Coming Soon
                  </button>
                  <span className="pricing-coming-soon-label">Coming Soon</span>
                </div>
              ) : (
                <button
                  onClick={() => window.location.href = '/app-evm'}
                  className={`pricing-cta ${tier.popular ? 'pricing-cta-primary' : ''}`}
                >
                  {tier.name === 'Max' ? 'Go Unlimited' : 'Get Started'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
