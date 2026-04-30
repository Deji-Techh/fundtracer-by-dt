/**
 * FaqPage - Frequently Asked Questions
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './FaqPage.css';
import { LANDING_NAV_ITEMS } from '../constants/navigation';

const navItems = LANDING_NAV_ITEMS.map(item => 
  item.href === '/faq' ? { ...item, active: true } : item
);

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
        a: 'Yes! FundTracer is completely free to use. Analyze unlimited wallets with no restrictions.',
      },
      {
        q: 'What is a wallet risk score?',
        a: 'The wallet risk score is a numerical rating from 0-100 that indicates how risky a wallet is. Scores are based on factors like: interaction with suspicious contracts, same-block transactions, common funding sources, wash trading patterns, and age of the wallet.',
      },
      {
        q: 'How does blockchain wallet analysis work?',
        a: 'FundTracer queries multiple blockchain data providers to fetch all transactions, token balances, and contract interactions for a wallet address. Our algorithms then analyze patterns to identify risk factors, funding sources, and suspicious behaviors.',
      },
    ],
  },
  {
    category: 'Supported Blockchains',
    badge: 'Chains',
    badgeVariant: 'success' as const,
    questions: [
      {
        q: 'What blockchains does FundTracer support?',
        a: 'We support Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC. Solana is available in beta mode.',
      },
      {
        q: 'Can I analyze Bitcoin wallets?',
        a: 'Currently FundTracer focuses on EVM-compatible chains (Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, BSC). Bitcoin support is on our roadmap.',
      },
      {
        q: 'Does FundTracer support Solana?',
        a: 'Yes! Solana support is available in beta mode for all users.',
      },
      {
        q: 'What is the difference between EVM chains?',
        a: 'EVM (Ethereum Virtual Machine) chains are blockchains that are compatible with Ethereum smart contracts. They include Polygon, Arbitrum, Optimism, Base, and BSC. Each has different transaction costs and ecosystems.',
      },
    ],
  },
  {
    category: 'Features',
    badge: 'Capabilities',
    badgeVariant: 'success' as const,
    questions: [
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
      {
        q: 'What is a funding tree?',
        a: 'The funding tree visualizes the complete flow of money from one wallet to others. You can trace where funds came from (funders) and where they went (destinations) in a tree-like structure.',
      },
      {
        q: 'Can I track NFT collections?',
        a: 'Yes! FundTracer shows NFT holdings for wallets, including collection names, images, and floor prices where available.',
      },
      {
        q: 'What is contract analytics?',
        a: 'Contract analytics lets you analyze any smart contract to see its functions, token standards, owner permissions, and interaction history. Useful for checking if a token is a honeypot or has suspicious code.',
      },
      {
        q: 'How do I check if a token is safe?',
        a: 'Use our /rugcheck command or the Contract Analysis feature to check if a token has suspicious patterns like: locked liquidity, hidden mint functions, or honeypot code.',
      },
    ],
  },
  {
    category: 'Integrations',
    badge: 'API',
    badgeVariant: 'info' as const,
    questions: [
      {
        q: 'Is there a Telegram bot?',
        a: 'Yes! Add @fundtracer_bot to your chats. Use commands like /scan <address> to analyze wallets, /add to watch wallets, /token for prices, and /rugcheck for token safety.',
      },
      {
        q: 'Is there a CLI tool?',
        a: 'Yes! Install with npm install -g fundtracer and use commands like fundtracer scan <address> --chain ethereum. See /cli for full documentation.',
      },
      {
        q: 'Is there a Chrome extension?',
        a: 'Yes! Install from https://fundtracer.xyz/ext-install. Right-click any Ethereum address to instantly analyze it.',
      },
    ],
  },
  {
    category: 'Telegram Bot',
    badge: 'Alerts',
    badgeVariant: 'warning' as const,
    questions: [
      {
        q: 'How do I use the Telegram bot?',
        a: 'Add @fundtracer_bot to Telegram. Common commands: /scan <address> - analyze wallet, /add - add to watchlist, /token <addr> - check price, /trending - top tokens, /help for all commands.',
      },
      {
        q: 'Can I get alerts for specific wallets?',
        a: 'Yes! Use /add to add wallets to your watchlist. You will receive real-time Telegram alerts when watched wallets make transactions.',
      },
      {
        q: 'Does the bot work in group chats?',
        a: 'Yes! Use /groupmode in any group chat to enable basic features for all members. Everyone can use /scan without linking their account.',
      },
      {
        q: 'What chains does the Telegram bot support?',
        a: 'The Telegram bot supports all same chains as the web app: Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC.',
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
    ],
  },
  {
    category: 'Troubleshooting',
    badge: 'Help',
    badgeVariant: 'error' as const,
    questions: [
      {
        q: 'Why is my wallet showing no transactions?',
        a: 'Make sure you selected the correct blockchain. Wallets on Ethereum wont show transactions on Polygon. Try selecting a different chain or check if the address is valid.',
      },
      {
        q: 'Why is the analysis taking so long?',
        a: 'Large wallets with thousands of transactions take longer to analyze. The first analysis is slower as we fetch data. Subsequent analyses are cached for faster results.',
      },
      {
        q: 'Why do I see "No data available"?',
        a: 'This can happen if: the wallet has no transactions on the selected chain, the contract address is wrong, or the blockchain is experiencing high load.',
      },
      {
        q: 'How do I fix "API rate limit" errors?',
        a: 'This means too many requests. Wait a few minutes or upgrade to a higher plan for higher rate limits.',
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
