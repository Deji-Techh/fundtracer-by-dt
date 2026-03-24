/**
 * FaqPage - Frequently Asked Questions
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './FaqPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq', active: true },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
];

const faqCategories = [
  {
    category: 'Getting Started',
    badge: 'Basics',
    badgeVariant: 'info' as const,
    questions: [
      {
        q: 'What is FundTracer?',
        a: 'FundTracer is a professional blockchain forensics and intelligence platform that allows you to analyze wallet addresses, detect Sybil patterns, compare multiple wallets, and trace funding sources across multiple blockchains.',
      },
      {
        q: 'How do I get started?',
        a: 'Simply click "Launch App" and start analyzing wallet addresses. No registration required for basic usage. Create an account to access advanced features and save your analysis history.',
      },
      {
        q: 'Is FundTracer free to use?',
        a: 'Yes! We offer a free tier with 7 analyses every 4 hours. Upgrade to Pro for 25 analyses every 4 hours, or Max for unlimited access and advanced features.',
      },
    ],
  },
  {
    category: 'Features',
    badge: 'Capabilities',
    badgeVariant: 'success' as const,
    questions: [
      {
        q: 'What blockchains are supported?',
        a: 'We support Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC. Pro and Max users get access to all chains, while free users are limited to Linea.',
      },
      {
        q: 'What is Sybil detection?',
        a: 'Sybil detection identifies coordinated bot networks and fake accounts by analyzing transaction patterns, funding sources, and behavioral similarities across multiple wallet addresses.',
      },
      {
        q: 'Can I compare multiple wallets?',
        a: 'Yes! Our Wallet Comparison feature allows you to analyze multiple addresses side-by-side to identify connections, shared transactions, and coordinated behaviors.',
      },
      {
        q: 'How accurate is the analysis?',
        a: 'Our analysis is powered by data from leading providers including Dune Analytics, Alchemy, and multiple block explorers, ensuring 99.9% accuracy and reliability.',
      },
    ],
  },
  {
    category: 'Data & Privacy',
    badge: 'Security',
    badgeVariant: 'warning' as const,
    questions: [
      {
        q: 'Is my data secure?',
        a: 'Absolutely. We use enterprise-grade encryption and never store private keys. All analysis is performed on public blockchain data only.',
      },
      {
        q: 'Do you store my analysis history?',
        a: "Only if you create an account. Guest users' data is not stored. Registered users can access their complete analysis history.",
      },
      {
        q: 'What data sources do you use?',
        a: 'We aggregate data from Dune Analytics, Alchemy, LineaScan, Etherscan, CoinGecko, DefiLlama, and other leading blockchain data providers.',
      },
    ],
  },
  {
    category: 'Pricing & Billing',
    badge: 'Payments',
    badgeVariant: 'default' as const,
    questions: [
      {
        q: 'Can I change my plan?',
        a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept USDT (Linea network) for Pro and Max subscriptions. Simply connect your wallet and pay with USDT.',
      },
      {
        q: 'Is there a refund policy?',
        a: 'Yes, we offer a 7-day money-back guarantee for all paid plans. No questions asked.',
      },
    ],
  },
];

export function FaqPage() {
  const navigate = useNavigate();

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="faq-page">
        {/* Hero Section */}
        <section className="faq-hero">
          <div className="faq-hero__grid"></div>
          <div className="faq-hero__content">
            <Badge variant="default" size="sm">FAQ</Badge>
            <h1 className="faq-hero__title">
              Frequently Asked
              <span className="faq-hero__title-accent">Questions</span>
            </h1>
            <p className="faq-hero__subtitle">
              Everything you need to know about FundTracer. 
              Can't find what you're looking for? Contact us.
            </p>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="faq-content">
          <div className="faq-content__container">
            {faqCategories.map((category, catIndex) => (
              <div key={catIndex} className="faq-category">
                <div className="faq-category__header">
                  <Badge variant={category.badgeVariant} size="sm">{category.badge}</Badge>
                  <h2 className="faq-category__title">{category.category}</h2>
                </div>
                <div className="faq-category__list">
                  {category.questions.map((item, qIndex) => (
                    <Panel key={qIndex} variant="bordered" className="faq-item">
                      <h3 className="faq-item__question">{item.q}</h3>
                      <p className="faq-item__answer">{item.a}</p>
                    </Panel>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="faq-cta">
          <div className="faq-cta__content">
            <h2 className="faq-cta__title">Still Have Questions?</h2>
            <p className="faq-cta__subtitle">
              We're here to help. Contact us at support@fundtracer.xyz
            </p>
            <button 
              className="faq-cta__button"
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

export default FaqPage;
