import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './TelegramAlerts.css';

const chatMessages = [
  {
    type: 'user',
    text: 'Is this wallet suspicious? 0x742d...3f9e',
  },
  {
    type: 'ai',
    text: 'This wallet has a LOW risk score (12/100). It received funds from a known exchange and has no interaction with flagged contracts.',
    delay: 800,
    isRisk: true,
    riskLevel: 'low',
  },
];

export function TelegramAlerts() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [showTyping, setShowTyping] = useState(true);

  useEffect(() => {
    const showNextMessage = () => {
      if (visibleMessages < chatMessages.length) {
        setVisibleMessages(prev => prev + 1);
      } else {
        setShowTyping(false);
      }
    };

    if (visibleMessages === 0) {
      setTimeout(showNextMessage, 500);
    } else if (visibleMessages < chatMessages.length) {
      const msg = chatMessages[visibleMessages];
      setTimeout(showNextMessage, msg.delay || 1500);
    }

    if (visibleMessages >= chatMessages.length) {
      setShowTyping(false);
    }
  }, [visibleMessages]);

  return (
    <section className="telegram-section">
      <div className="telegram-container">
        <motion.div 
          className="telegram-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="telegram-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Telegram Alerts
          </div>
          <h2>Chat with Your Wallet Alerts</h2>
          <p>Get real-time notifications and ask questions about any wallet directly in Telegram. AI-powered insights at your fingertips.</p>
        </motion.div>

        <motion.div 
          className="chat-container"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="chat-header">
            <div className="chat-avatar">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div className="chat-info">
              <h3>FundTracer Bot</h3>
              <span>Online</span>
            </div>
          </div>

          <div className="chat-messages">
            {chatMessages.slice(0, visibleMessages).map((msg, index) => (
              <motion.div 
                key={index}
                className={`chat-message ${msg.type}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="message-avatar">
                  {msg.type === 'user' ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0z"/>
                    </svg>
                  )}
                </div>
                <div className="message-bubble">
                  {msg.text}
                  {msg.isRisk && (
                    <span className={`risk-badge ${msg.riskLevel}`}>
                      {msg.riskLevel === 'low' ? '✅ LOW RISK' : msg.riskLevel === 'medium' ? '⚠️ MEDIUM' : '❌ HIGH'}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            {showTyping && (
              <motion.div 
                className="chat-message ai"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="message-avatar">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0z"/>
                  </svg>
                </div>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        <div className="telegram-features">
          <motion.div 
            className="telegram-feature"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="feature-icon">💬</div>
            <h3>Ask Anything</h3>
            <p>Chat naturally with AI about any wallet. Get instant insights on transactions, contracts, and risks.</p>
          </motion.div>

          <motion.div 
            className="telegram-feature"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="feature-icon">🔔</div>
            <h3>Real-Time Alerts</h3>
            <p>Instant notifications when watched wallets move. Choose realtime, 20min, 30min, or hourly digests.</p>
          </motion.div>

          <motion.div 
            className="telegram-feature"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="feature-icon">📊</div>
            <h3>Scan History</h3>
            <p>Track all your wallet scans. Ask the bot to show your recent activity and analysis.</p>
          </motion.div>
        </div>

        <motion.div 
          className="telegram-cta"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <a href="/telegram" className="telegram-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Connect Telegram Bot
          </a>
          <span className="cta-note">Free for all users • No setup required</span>
        </motion.div>
      </div>
    </section>
  );
}

export default TelegramAlerts;
