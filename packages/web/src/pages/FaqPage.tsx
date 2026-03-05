import React from 'react';
import { useNavigate } from 'react-router-dom';
import './FaqPage.css';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is FundTracer?',
        a: 'FundTracer is a professional blockchain forensics and intelligence platform that allows you to analyze wallet addresses, detect Sybil patterns, compare multiple wallets, and trace funding sources across multiple blockchains.'
      },
      {
        q: 'How do I get started?',
        a: 'Simply click "Launch App" and start analyzing wallet addresses. No registration required for basic usage. Create an account to access advanced features and save your analysis history.'
      },
      {
        q: 'Is FundTracer free to use?',
        a: 'Yes! We offer a free tier with 7 analyses every 4 hours. Upgrade to Pro for 25 analyses every 4 hours, or Max for unlimited access and advanced features.'
      }
    ]
  },
  {
    category: 'Features',
    questions: [
      {
        q: 'What blockchains are supported?',
        a: 'We support Ethereum, Linea, Arbitrum, Base, Polygon, Optimism, and BSC. Pro and Max users get access to all chains, while free users are limited to Linea.'
      },
      {
        q: 'What is Sybil detection?',
        a: 'Sybil detection identifies coordinated bot networks and fake accounts by analyzing transaction patterns, funding sources, and behavioral similarities across multiple wallet addresses.'
      },
      {
        q: 'Can I compare multiple wallets?',
        a: 'Yes! Our Wallet Comparison feature allows you to analyze multiple addresses side-by-side to identify connections, shared transactions, and coordinated behaviors.'
      },
      {
        q: 'How accurate is the analysis?',
        a: 'Our analysis is powered by data from leading providers including Dune Analytics, Alchemy, and multiple block explorers, ensuring 99.9% accuracy and reliability.'
      }
    ]
  },
  {
    category: 'Data & Privacy',
    questions: [
      {
        q: 'Is my data secure?',
        a: 'Absolutely. We use enterprise-grade encryption and never store private keys. All analysis is performed on public blockchain data only.'
      },
      {
        q: 'Do you store my analysis history?',
        a: 'Only if you create an account. Guest users\' data is not stored. Registered users can access their complete analysis history.'
      },
      {
        q: 'What data sources do you use?',
        a: 'We aggregate data from Dune Analytics, Alchemy, LineaScan, Etherscan, CoinGecko, DefiLlama, and other leading blockchain data providers.'
      }
    ]
  },
  {
    category: 'Pricing & Billing',
    questions: [
      {
        q: 'Can I change my plan?',
        a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.'
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept USDT (Linea network) for Pro and Max subscriptions. Simply connect your wallet and pay with USDT.'
      },
      {
        q: 'Is there a refund policy?',
        a: 'Yes, we offer a 7-day money-back guarantee for all paid plans. No questions asked.'
      }
    ]
  }
];

export function FaqPage() {
  const navigate = useNavigate();
  
  return (
    <div className="faq-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      
      <section className="faq-hero">
        <span className="faq-label">FAQ</span>
        <h1 className="faq-title">Frequently Asked Questions</h1>
        <p className="faq-subtitle">
          Everything you need to know about FundTracer
        </p>
      </section>

      <section className="faq-content">
        {faqs.map((category, catIndex) => (
          <div key={catIndex} className="faq-category">
            <h2 className="faq-category-title">{category.category}</h2>
            <div className="faq-list">
              {category.questions.map((item, qIndex) => (
                <div key={qIndex} className="faq-item">
                  <h3 className="faq-question">{item.q}</h3>
                  <p className="faq-answer">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="faq-cta">
        <h2>Still have questions?</h2>
        <p>We're here to help. Contact us at fundtracerbydt@gmail.com</p>
      </section>

      <footer className="page-footer">
        <a href="/terms">Terms of Service</a>
        <span>•</span>
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </div>
  );
}
