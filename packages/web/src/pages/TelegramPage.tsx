import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './TelegramPage.css';

export function TelegramPage() {
  const [linkCode, setLinkCode] = useState('XXXXXX');
  const [isGenerating, setIsGenerating] = useState(false);
  const [connected, setConnected] = useState(false);

  const generateCode = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setLinkCode(code);
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <div className="telegram-page">
      <div className="telegram-page-container">
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <h1>Connect Telegram Bot</h1>
          <p>Get real-time wallet alerts directly on Telegram. Monitor whales, track wallets, and receive AI-powered insights on every transaction.</p>
        </motion.div>

        {!connected ? (
          <motion.div 
            className="setup-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Open Telegram</h3>
                <p>Search for <strong>@FundTracerBot</strong> or click the button below to open the bot.</p>
                <a href="https://t.me/FundTracerBot" target="_blank" rel="noopener noreferrer" className="open-bot-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Open @FundTracerBot
                </a>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Start the Bot</h3>
                <p>Send <strong>/start</strong> to the bot to begin setup.</p>
                <div className="command-box">
                  <code>/start</code>
                </div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Link Your Account</h3>
                <p>Click the button below to generate a link code, then send it to the bot.</p>
                <button 
                  className="generate-code-btn" 
                  onClick={generateCode}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Link Code'}
                </button>
                {linkCode && (
                  <div className="code-display">
                    <span className="code">{linkCode}</span>
                    <span className="code-note">Expires in 10 minutes</span>
                  </div>
                )}
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Send Code to Bot</h3>
                <p>Send the code to the bot on Telegram:</p>
                <div className="command-box">
                  <code>/link {linkCode}</code>
                </div>
              </div>
            </div>

            <div className="step-card connected-card">
              <div className="step-number success">✓</div>
              <div className="step-content">
                <h3>Connected!</h3>
                <p>Your Telegram is now linked. Use the bot to add wallets to your watchlist.</p>
                <button className="done-btn" onClick={() => setConnected(true)}>
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            className="connected-section"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="success-icon">✓</div>
            <h2>Telegram Connected!</h2>
            <p>Your Telegram is now linked to your FundTracer account.</p>

            <div className="bot-commands">
              <h3>Bot Commands</h3>
              <div className="commands-grid">
                <div className="command-item">
                  <code>/add</code>
                  <span>Add wallet to watchlist</span>
                </div>
                <div className="command-item">
                  <code>/list</code>
                  <span>View watched wallets</span>
                </div>
                <div className="command-item">
                  <code>/remove</code>
                  <span>Remove a wallet</span>
                </div>
                <div className="command-item">
                  <code>/frequency</code>
                  <span>Set alert frequency</span>
                </div>
                <div className="command-item">
                  <code>/status</code>
                  <span>View alert status</span>
                </div>
                <div className="command-item">
                  <code>/unlink</code>
                  <span>Disconnect Telegram</span>
                </div>
              </div>
            </div>

            <a href="https://t.me/FundTracerBot" target="_blank" rel="noopener noreferrer" className="open-bot-btn-large">
              Open Telegram Bot
            </a>
          </motion.div>
        )}

        <motion.div 
          className="features-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2>What's Included</h2>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-emoji">🔔</span>
              <div>
                <h4>Real-Time Alerts</h4>
                <p>Instant notifications when watched wallets move funds</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">🤖</span>
              <div>
                <h4>AI Analysis</h4>
                <p>Every alert includes smart insights on what's happening</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">📊</span>
              <div>
                <h4>Flexible Frequency</h4>
                <p>Real-time, 20min, 30min, or hourly digests</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">🔒</span>
              <div>
                <h4>Secure Linking</h4>
                <p>Account-linked for personalized alerts</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="plans-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2>Alert Limits by Plan</h2>
          <div className="plans-grid">
            <div className="plan-card">
              <div className="plan-name">Free</div>
              <div className="plan-wallets">10</div>
              <div className="plan-label">wallets</div>
            </div>
            <div className="plan-card featured">
              <div className="plan-badge">Popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-wallets">100</div>
              <div className="plan-label">wallets</div>
            </div>
            <div className="plan-card">
              <div className="plan-name">Max</div>
              <div className="plan-wallets">∞</div>
              <div className="plan-label">wallets</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default TelegramPage;
