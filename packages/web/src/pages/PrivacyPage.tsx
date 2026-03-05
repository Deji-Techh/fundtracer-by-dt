import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPage.css';

export function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="privacy-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
      
      <section className="privacy-hero">
        <span className="privacy-label">Legal</span>
        <h1 className="privacy-title">Privacy Policy</h1>
        <p className="privacy-subtitle">Last updated: February 6, 2026</p>
      </section>

      <section className="privacy-content">
        <div className="privacy-section">
          <h2>1. Information We Collect</h2>
          <p>
            We collect minimal information to provide our services:
          </p>
          <ul>
            <li><strong>Account Information:</strong> Email address and wallet connection (if you create an account)</li>
            <li><strong>Usage Data:</strong> Analysis queries and feature usage (anonymized)</li>
            <li><strong>Payment Information:</strong> Processed securely through our payment providers</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h2>2. How We Use Your Information</h2>
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

        <div className="privacy-section">
          <h2>3. Data Security</h2>
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

        <div className="privacy-section">
          <h2>4. Third-Party Services</h2>
          <p>
            We use trusted third-party services for:
          </p>
          <ul>
            <li>Payment processing (Stripe, cryptocurrency providers)</li>
            <li>Blockchain data (Alchemy, Dune Analytics, block explorers)</li>
            <li>Authentication (Reown AppKit)</li>
            <li>Analytics (anonymous usage data only)</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h2>5. Your Rights</h2>
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

        <div className="privacy-section">
          <h2>6. Blockchain Data</h2>
          <p>
            Please note that all blockchain transactions are public by design. Our analysis 
            tools work with this public data. We do not have access to private wallet 
            information unless you explicitly connect your wallet for specific features.
          </p>
        </div>

        <div className="privacy-section">
          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify users of 
            any significant changes via email or platform notification.
          </p>
        </div>

        <div className="privacy-section">
          <h2>8. Contact Us</h2>
          <p>
            For privacy-related questions or requests, please contact us at fundtracerbydt@gmail.com
          </p>
        </div>
      </section>

      <footer className="page-footer">
        <a href="/terms">Terms of Service</a>
        <span>•</span>
        <a href="/privacy">Privacy Policy</a>
      </footer>
    </div>
  );
}
