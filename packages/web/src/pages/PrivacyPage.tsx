import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './TermsPage.css';

export function PrivacyPage() {
  return (
    <div className="legal-page">
      {/* Navigation */}
      <motion.nav 
        className="legal-nav"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/" className="legal-nav-logo">
          <img src="/logo.png" alt="FundTracer" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
          <span>FundTracer</span>
        </Link>
        <Link to="/" className="legal-nav-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </Link>
      </motion.nav>

      {/* Hero */}
      <motion.section 
        className="legal-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="legal-hero-badge">
          <span className="legal-badge-dot"></span>
          Legal
        </div>
        <h1 className="legal-hero-title">Privacy Policy</h1>
        <p className="legal-hero-subtitle">Last updated: March 14, 2026</p>
      </motion.section>

      {/* Content */}
      <motion.section 
        className="legal-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="legal-section">
          <div className="legal-section-number">01</div>
          <div className="legal-section-body">
            <h2>Information We Collect</h2>
            <p>
              We collect minimal information to provide our services:
            </p>
            <ul>
              <li><strong>Account Information:</strong> Email address and wallet connection (if you create an account)</li>
              <li><strong>Usage Data:</strong> Analysis queries and feature usage (anonymized)</li>
              <li><strong>Payment Information:</strong> Processed securely through our payment providers</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">02</div>
          <div className="legal-section-body">
            <h2>How We Use Your Information</h2>
            <p>
              We use your information solely to:
            </p>
            <ul>
              <li>Provide and improve our blockchain analysis services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send important service updates (not marketing)</li>
              <li>Ensure platform security and prevent abuse</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">03</div>
          <div className="legal-section-body">
            <h2>Data Security</h2>
            <p>
              We implement industry-standard security measures:
            </p>
            <ul>
              <li>Enterprise-grade encryption for data in transit and at rest</li>
              <li>We never store private keys or wallet passwords</li>
              <li>Regular security audits and updates</li>
              <li>Limited employee access to user data</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">04</div>
          <div className="legal-section-body">
            <h2>Third-Party Services</h2>
            <p>
              We use trusted third-party services for:
            </p>
            <ul>
              <li>Payment processing (Stripe, cryptocurrency providers)</li>
              <li>Blockchain data (Alchemy, Dune Analytics, block explorers)</li>
              <li>Authentication (Firebase, Reown AppKit)</li>
              <li>Analytics (anonymous usage data only)</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">05</div>
          <div className="legal-section-body">
            <h2>Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access your personal data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your analysis history</li>
              <li>Opt-out of non-essential communications</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">06</div>
          <div className="legal-section-body">
            <h2>Blockchain Data</h2>
            <p>
              Please note that all blockchain transactions are public by design. Our analysis 
              tools work with this public data. We do not have access to private wallet 
              information unless you explicitly connect your wallet for specific features.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">07</div>
          <div className="legal-section-body">
            <h2>Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify users of 
              any significant changes via email or platform notification.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">08</div>
          <div className="legal-section-body">
            <h2>Contact Us</h2>
            <p>
              For privacy-related questions or requests, please contact us at{' '}
              <a href="mailto:fundtracerbydt@gmail.com">fundtracerbydt@gmail.com</a>
            </p>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="legal-footer">
        <div className="legal-footer-links">
          <Link to="/terms">Terms of Service</Link>
          <span className="legal-footer-divider">•</span>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
        <p className="legal-footer-copy">© 2026 FundTracer. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default PrivacyPage;
