import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, GitBranch, BarChart2, Check } from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import './CliPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli', active: true },
];

export function CliPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
    <div className="cli-page">
      <div className="cli-container">
        <motion.div 
          className="cli-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="cli-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 17l6-6-6-6M12 19h8"/>
            </svg>
            <span>FundTracer CLI</span>
          </div>
          <h1>Command-Line Blockchain Forensics</h1>
          <p>
            Analyze wallets, detect Sybil clusters, and trace fund flows directly from your terminal.
            Built for security researchers, traders, and developers.
          </p>
        </motion.div>

        <motion.div 
          className="cli-install"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2>Quick Install</h2>
          <div className="cli-code-block">
            <code>npm install -g fundtracer</code>
            <button 
              className="cli-copy-btn"
              onClick={() => handleCopy('npm install -g fundtracer')}
            >
              {copied ? <><Check size={14} /> Copied</> : 'Copy'}
            </button>
          </div>
        </motion.div>

        <motion.div 
          className="cli-features"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2>Features</h2>
          <div className="cli-features-grid">
            <div className="cli-feature">
              <div className="feature-icon"><Search size={24} /></div>
              <h3>Wallet Analysis</h3>
              <p>Trace funding sources, transaction history, and token holdings across multiple chains</p>
            </div>
            <div className="cli-feature">
              <div className="feature-icon"><Users size={24} /></div>
              <h3>Sybil Detection</h3>
              <p>Identify coordinated attack patterns and airdrop farmers with advanced clustering</p>
            </div>
            <div className="cli-feature">
              <div className="feature-icon"><GitBranch size={24} /></div>
              <h3>Funding Trees</h3>
              <p>Visualize where funds originate from with deep funding chain analysis</p>
            </div>
            <div className="cli-feature">
              <div className="feature-icon"><BarChart2 size={24} /></div>
              <h3>Multi-Chain</h3>
              <p>Support for Ethereum, Polygon, Arbitrum, Optimism, Base, and more</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="cli-usage"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2>Basic Usage</h2>
          
          <div className="cli-command-section">
            <h3>Analyze a Wallet</h3>
            <div className="cli-code-block">
              <code>fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71</code>
              <button 
                className="cli-copy-btn"
                onClick={() => handleCopy('fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71')}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="cli-command-section">
            <h3>Specify Chain</h3>
            <div className="cli-code-block">
              <code>fundtracer analyze 0x... --chain arbitrum</code>
              <button 
                className="cli-copy-btn"
                onClick={() => handleCopy('fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --chain arbitrum')}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="cli-command-section">
            <h3>Set Analysis Depth</h3>
            <div className="cli-code-block">
              <code>fundtracer analyze 0x... --depth 3</code>
              <button 
                className="cli-copy-btn"
                onClick={() => handleCopy('fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --depth 3')}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="cli-command-section">
            <h3>Output as JSON</h3>
            <div className="cli-code-block">
              <code>fundtracer analyze 0x... --output json</code>
              <button 
                className="cli-copy-btn"
                onClick={() => handleCopy('fundtracer analyze 0x742d35Cc6634C0532925a3b844Bc9e7595f8fC71 --output json')}
              >
                Copy
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="cli-config"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2>Configuration</h2>
          <p>Set your API key before using:</p>
          <div className="cli-code-block">
            <code>fundtracer config --set-key alchemy:YOUR_ALCHEMY_API_KEY</code>
            <button 
              className="cli-copy-btn"
              onClick={() => handleCopy('fundtracer config --set-key alchemy:YOUR_ALCHEMY_API_KEY')}
            >
              Copy
            </button>
          </div>
          <p className="cli-config-note">
            Get free API keys: <a href="https://dashboard.alchemy.com/" target="_blank" rel="noopener noreferrer">Alchemy</a>
          </p>
        </motion.div>

        <motion.div 
          className="cli-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h2>Need Help?</h2>
          <p>Join our Telegram bot for alerts and support</p>
          <a href="https://fundtracer.xyz/telegram" className="cli-telegram-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.05-.2-.06-.06-.15-.04-.21-.02-.12.02-1.96 1.25-5.54 3.81-.78.56-1.39.84-1.97.75-.58-.1-.9-.38-1.24-.69-.34-.32-.53-.53-.59-.53-.06 0-.21-.02-.31.15-.1.17-.34.53-.34.53s-.7.48-.81.58c-.11.1-.18.15-.2.17-.03.02-.1.02-.29-.02z"/>
            </svg>
            Try Telegram Bot
          </a>
        </motion.div>
      </div>
    </div>
    </LandingLayout>
  );
}

export default CliPage;
