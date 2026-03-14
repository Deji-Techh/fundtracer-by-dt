import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './TermsPage.css';

export function TermsPage() {
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
        <h1 className="legal-hero-title">Terms of Service</h1>
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
            <h2>Acceptance of Terms</h2>
            <p>
              By accessing and using FundTracer, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">02</div>
          <div className="legal-section-body">
            <h2>Description of Service</h2>
            <p>
              FundTracer provides blockchain analysis tools including wallet analysis, contract analytics, 
              wallet comparison, and Sybil detection. We aggregate public blockchain data from various 
              sources to provide insights and analytics.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">03</div>
          <div className="legal-section-body">
            <h2>User Accounts</h2>
            <p>
              Some features require creating an account. You are responsible for maintaining the 
              confidentiality of your account credentials and for all activities that occur under 
              your account.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">04</div>
          <div className="legal-section-body">
            <h2>Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with other users' access to the service</li>
              <li>Use automated means to access the service without permission</li>
              <li>Reverse engineer or decompile any part of the service</li>
            </ul>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">05</div>
          <div className="legal-section-body">
            <h2>Subscription and Payments</h2>
            <p>
              All FundTracer services are currently provided free of charge. We reserve the right to 
              introduce paid features in the future. Any changes to pricing will be communicated in advance.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">06</div>
          <div className="legal-section-body">
            <h2>Limitation of Liability</h2>
            <p>
              FundTracer provides analysis based on public blockchain data. We do not guarantee 
              the accuracy of third-party data sources. Use our insights at your own risk.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">07</div>
          <div className="legal-section-body">
            <h2>Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service 
              after changes constitutes acceptance of the new terms.
            </p>
          </div>
        </div>

        <div className="legal-section">
          <div className="legal-section-number">08</div>
          <div className="legal-section-body">
            <h2>Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us at{' '}
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

export default TermsPage;
