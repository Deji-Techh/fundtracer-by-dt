import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './PolymarketSection.css';

export function PolymarketSection() {
  const navigate = useNavigate();

  const marketCards = [
    {
      question: 'Will Bitcoin hit $150K by end of 2026?',
      yesPrice: 68,
      volume: '$4.2M',
      color: '#10b981'
    },
    {
      question: 'Will ETH flip BTC market cap in 2026?',
      yesPrice: 24,
      volume: '$1.8M',
      color: '#8b5cf6'
    },
    {
      question: 'Will Solana surpass $500 in 2026?',
      yesPrice: 45,
      volume: '$2.1M',
      color: '#f59e0b'
    }
  ];

  return (
    <section className="polymarket-section">
      <div className="polymarket-container">
        <motion.div 
          className="polymarket-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="polymarket-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M18 17V9"/>
              <path d="M13 17V5"/>
              <path d="M8 17v-3"/>
            </svg>
            Prediction Markets
          </div>
          <h2>Trade the Future with Polymarket</h2>
          <p>Access prediction markets directly through FundTracer. Trade on real-world events, track volume spikes, and follow top traders.</p>
        </motion.div>

        <motion.div 
          className="polymarket-cards"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {marketCards.map((market, i) => (
            <div key={i} className="market-card">
              <div className="market-question">{market.question}</div>
              <div className="market-details">
                <div className="market-price" style={{ color: market.color }}>
                  <span className="yes-label">Yes</span>
                  <span className="price">{market.yesPrice}%</span>
                </div>
                <div className="market-volume">{market.volume}</div>
              </div>
              <div className="market-bar">
                <div 
                  className="market-bar-fill" 
                  style={{ width: `${market.yesPrice}%`, background: market.color }}
                />
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div 
          className="polymarket-cta"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button 
            className="cta-button cta-web"
            onClick={() => navigate('/app-evm?tab=polymarket')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Use on Web
          </button>
          <a 
            href="https://t.me/FundTracerBot"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button cta-telegram"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Use on Telegram
          </a>
        </motion.div>

        <motion.div 
          className="polymarket-features"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="feature-text">
              <h4>Volume Spikes</h4>
              <p>Detect unusual trading activity</p>
            </div>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            </div>
            <div className="feature-text">
              <h4>Top Traders</h4>
              <p>Follow winning strategies</p>
            </div>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="feature-text">
              <h4>AI Analysis</h4>
              <p>Get insights on any market</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
