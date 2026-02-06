import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import './Pricing.css';

interface PricingProps {
  onLaunchApp?: () => void;
}

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
    popular: false,
    color: '#8b5cf6',
  },
];

export function Pricing({ onLaunchApp }: PricingProps) {
  return (
    <section style={{
      padding: '100px 24px',
      backgroundColor: '#0a0a0a'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '20px',
            color: '#10b981',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '16px'
          }}>
            Pricing
          </span>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '16px'
          }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#9ca3af' }}>
            Choose the plan that fits your needs
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          {tiers.map((tier, index) => (
            <div 
              key={index}
              style={{
                backgroundColor: '#1a1a1a',
                border: `1px solid ${tier.popular ? tier.color : '#2a2a2a'}`,
                borderRadius: '16px',
                padding: '32px',
                position: 'relative',
                transition: 'transform 0.2s'
              }}
            >
              {tier.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: tier.color,
                  color: '#ffffff',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  Most Popular
                </div>
              )}
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                {tier.name}
              </h3>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: '#ffffff' }}>{tier.price}</span>
                <span style={{ fontSize: '1rem', color: '#6b7280' }}>{tier.period}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '24px' }}>
                {tier.description}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                {tier.features.map((feature, i) => (
                  <li key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.875rem',
                    color: '#d1d5db',
                    marginBottom: '12px'
                  }}>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color={tier.color} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                onClick={onLaunchApp}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  backgroundColor: tier.popular ? tier.color : 'transparent',
                  color: tier.popular ? '#ffffff' : '#ffffff',
                  border: `1px solid ${tier.popular ? tier.color : '#3a3a3a'}`,
                  borderRadius: '8px',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
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
