import React from 'react';
import './TermsPage.css';

export function TermsPage() {
  return (
    <div className="terms-page">
      <section className="terms-hero">
        <span className="terms-label">Legal</span>
        <h1 className="terms-title">Terms of Service</h1>
        <p className="terms-subtitle">Last updated: February 6, 2026</p>
      </section>

      <section className="terms-content">
        <div className="terms-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using FundTracer, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our services.
          </p>
        </div>

        <div className="terms-section">
          <h2>2. Description of Service</h2>
          <p>
            FundTracer provides blockchain analysis tools including wallet analysis, contract analytics, 
            wallet comparison, and Sybil detection. We aggregate public blockchain data from various 
            sources to provide insights and analytics.
          </p>
        </div>

        <div className="terms-section">
          <h2>3. User Accounts</h2>
          <p>
            Some features require creating an account. You are responsible for maintaining the 
            confidentiality of your account credentials and for all activities that occur under 
            your account.
          </p>
        </div>

        <div className="terms-section">
          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any illegal purposes</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with other users' access to the service</li>
            <li>Use automated means to access the service without permission</li>
            <li>Reverse engineer or decompile any part of the service</li>
          </ul>
        </div>

        <div className="terms-section">
          <h2>5. Subscription and Payments</h2>
          <p>
            Paid subscriptions are billed in advance on a monthly basis. You may cancel your 
            subscription at any time. Refunds are provided within 7 days of purchase if you are 
            not satisfied with the service.
          </p>
        </div>

        <div className="terms-section">
          <h2>6. Limitation of Liability</h2>
          <p>
            FundTracer provides analysis based on public blockchain data. We do not guarantee 
            the accuracy of third-party data sources. Use our insights at your own risk.
          </p>
        </div>

        <div className="terms-section">
          <h2>7. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service 
            after changes constitutes acceptance of the new terms.
          </p>
        </div>

        <div className="terms-section">
          <h2>8. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at fundtracerbydt@gmail.com
          </p>
        </div>
      </section>
    </div>
  );
}
