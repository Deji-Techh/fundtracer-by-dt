import React from 'react';
import { motion } from 'framer-motion';
import './ChromeExtensionPromo.css';

export function ChromeExtensionPromo() {
  return (
    <section className="extension-promo">
      <div className="extension-promo-bg" />
      
      <div className="extension-promo-container">
        <motion.div 
          className="extension-promo-content"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="extension-promo-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 13v3"/>
            </svg>
          </div>
          
          <h2 className="extension-promo-title">
            Take FundTracer <span>Everywhere</span>
          </h2>
          
          <p className="extension-promo-description">
            Analyze any wallet instantly from your browser. No need to open the website - 
            just click the extension and enter an address. Available right in Chrome.
          </p>

          <div className="extension-promo-features">
            <div className="promo-feature">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Instant Wallet Analysis</span>
            </div>
            <div className="promo-feature">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Sybil Detection</span>
            </div>
            <div className="promo-feature">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Funding Trace</span>
            </div>
            <div className="promo-feature">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Pro Features Sync</span>
            </div>
          </div>

          <motion.a
            href="/ext-install"
            className="extension-promo-btn"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
              <line x1="12" y1="12" x2="12" y2="18"/>
            </svg>
            Install Extension Free
          </motion.a>

          <p className="extension-promo-note">
            Works on Chrome • Takes 30 seconds to install
          </p>
        </motion.div>

        <motion.div 
          className="extension-promo-preview"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="preview-mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div className="mockup-content">
              <div className="mockup-wallet">
                <span className="mockup-label">Connected</span>
                <span className="mockup-address">0x742d...9A3B</span>
              </div>
              <div className="mockup-input">
                <input type="text" placeholder="Enter wallet address..." readOnly />
                <button>Analyze</button>
              </div>
              <div className="mockup-results">
                <div className="mockup-result-row">
                  <span>Risk Level</span>
                  <span className="mockup-risk">LOW</span>
                </div>
                <div className="mockup-result-row">
                  <span>Sybil Score</span>
                  <span>12%</span>
                </div>
                <div className="mockup-result-row">
                  <span>Transactions</span>
                  <span>1,234</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default ChromeExtensionPromo;
