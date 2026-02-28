import React from 'react';
import { motion } from 'framer-motion';
import './ApiProvidersShowcase.css';

const providers = [
  { name: 'Dune', category: 'Analytics', icon: '🔍' },
  { name: 'Alchemy', category: 'Infrastructure', icon: '⚡' },
  { name: 'Etherscan', category: 'Explorer', icon: '🔗' },
  { name: 'CoinGecko', category: 'Market Data', icon: '📊' },
  { name: 'DefiLlama', category: 'DeFi', icon: '🦙' },
  { name: 'The Graph', category: 'Indexing', icon: '📈' },
  { name: 'QuickNode', category: 'Nodes', icon: '🚀' },
  { name: 'Solana', category: 'Blockchain', icon: '☀️' },
];

export function ApiProvidersShowcase() {
  return (
    <section className="ios-api-showcase">
      <div className="ios-api-bg" />
      
      <div className="ios-api-container">
        <motion.div 
          className="ios-api-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="ios-api-label">Trusted By</span>
          <h2 className="ios-api-title">Built on Industry-Leading Infrastructure</h2>
          <p className="ios-api-subtitle">We integrate with the most reliable data providers in crypto</p>
        </motion.div>

        <div className="ios-api-grid">
          {providers.map((provider, index) => (
            <motion.div
              key={provider.name}
              className="ios-api-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -4 }}
            >
              <div className="ios-api-card-icon">{provider.icon}</div>
              <div className="ios-api-card-content">
                <h3 className="ios-api-card-name">{provider.name}</h3>
                <span className="ios-api-card-category">{provider.category}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          className="ios-api-stats"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="ios-api-stat">
            <span className="ios-api-stat-value">8+</span>
            <span className="ios-api-stat-label">Data Sources</span>
          </div>
          <div className="ios-api-stat-divider" />
          <div className="ios-api-stat">
            <span className="ios-api-stat-value">10+</span>
            <span className="ios-api-stat-label">Chains</span>
          </div>
          <div className="ios-api-stat-divider" />
          <div className="ios-api-stat">
            <span className="ios-api-stat-value">99.9%</span>
            <span className="ios-api-stat-label">Uptime</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default ApiProvidersShowcase;
