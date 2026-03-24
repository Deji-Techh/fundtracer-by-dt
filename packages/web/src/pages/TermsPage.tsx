/**
 * TermsPage - Terms of Service
 * Matches About/FAQ page style with LandingLayout
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './TermsPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
];

export function TermsPage() {
  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="legal-page">
        {/* Hero Section */}
        <section className="about-hero">
          <div className="about-hero__grid"></div>
          <div className="about-hero__content">
            <Badge variant="default" size="sm">Legal</Badge>
            <h1 className="about-hero__title">
              Terms of
              <span className="about-hero__title-accent">Service</span>
            </h1>
            <p className="about-hero__subtitle">
              Last updated: March 14, 2026
            </p>
          </div>
        </section>

        {/* Content Sections */}
        <section className="about-section">
          <div className="about-section__container">
            <Panel variant="bordered" className="legal-panel">
              <h2>Acceptance of Terms</h2>
              <p>
                By accessing and using FundTracer, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Description of Service</h2>
              <p>
                FundTracer provides blockchain analysis tools including wallet analysis, contract analytics, 
                wallet comparison, and Sybil detection. We aggregate public blockchain data from various 
                sources to provide insights and analytics.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>User Accounts</h2>
              <p>
                Some features require creating an account. You are responsible for maintaining the 
                confidentiality of your account credentials and for all activities that occur under 
                your account.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the service for any illegal purposes</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with other users' access to the service</li>
                <li>Use automated means to access the service without permission</li>
                <li>Reverse engineer or decompile any part of the service</li>
              </ul>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Subscription and Payments</h2>
              <p>
                All FundTracer services are currently provided free of charge. We reserve the right to 
                introduce paid features in the future. Any changes to pricing will be communicated in advance.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Limitation of Liability</h2>
              <p>
                FundTracer provides analysis based on public blockchain data. We do not guarantee 
                the accuracy of third-party data sources. Use our insights at your own risk.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service 
                after changes constitutes acceptance of the new terms.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Contact</h2>
              <p>
                For questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:support@fundtracer.xyz">support@fundtracer.xyz</a>
              </p>
            </Panel>
          </div>
        </section>

        {/* CTA Section */}
        <section className="legal-cta">
          <h3>Questions?</h3>
          <p>Get in touch with our team</p>
          <Link to="/faq" className="legal-cta-btn">
            Visit FAQ
          </Link>
        </section>
      </div>
    </LandingLayout>
  );
}

export default TermsPage;
