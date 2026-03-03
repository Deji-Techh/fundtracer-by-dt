import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './InstallPage.css';

export function InstallPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('node build.js');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="install-page">
      <div className="install-container">
        <motion.div 
          className="install-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="install-logo">
            <img src="/logo.png" alt="FundTracer" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
            <span>FundTracer</span>
          </div>
          <h1>Install Chrome Extension</h1>
          <p>Add FundTracer to your browser for quick wallet analysis, anywhere, anytime.</p>
        </motion.div>

        <motion.div 
          className="install-steps"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="install-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Open Chrome Extensions</h3>
              <p>Open a new tab and go to:</p>
              <a 
                href="chrome://extensions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="chrome-link"
              >
                chrome://extensions →
              </a>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Enable Developer Mode</h3>
              <p>Find the "Developer mode" toggle in the top right corner and turn it ON.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Download Extension</h3>
              <p>Download the extension file:</p>
              <a 
                href="/downloads/fundtracer-extension.zip" 
                className="download-btn"
                download
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download .zip
              </a>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Extract & Load</h3>
              <p>Extract the downloaded .zip file, then drag the extracted folder onto the Chrome extensions page.</p>
            </div>
          </div>

          <div className="install-step">
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>Pin to Toolbar</h3>
              <p>Click the puzzle piece icon in Chrome and pin FundTracer for easy access!</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="install-help"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h4>Need Help?</h4>
          <p>Having trouble? Contact us and we'll help you out.</p>
          <a href="mailto:support@fundtracer.xyz" className="support-btn">
            Contact Support
          </a>
        </motion.div>

        <footer className="install-footer">
          <p>© 2026 FundTracer. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default InstallPage;
