/**
 * PrivacyPage - Privacy Policy
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

export function PrivacyPage() {
  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="legal-page">
        {/* Hero Section */}
        <section className="about-hero">
          <div className="about-hero__grid"></div>
          <div className="about-hero__content">
            <Badge variant="default" size="sm">Legal</Badge>
            <h1 className="about-hero__title">
              Privacy
              <span className="about-hero__title-accent">Policy</span>
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
              <h2>Information We Collect</h2>
              <p>
                We collect minimal information to provide our services:
              </p>
              <ul>
                <li><strong>Account Information:</strong> Email address and wallet connection (if you create an account)</li>
                <li><strong>Usage Data:</strong> Analysis queries and feature usage (anonymized)</li>
                <li><strong>Payment Information:</strong> Processed securely through our payment providers</li>
              </ul>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
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
            </Panel>

            <Panel variant="bordered" className="legal-panel">
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
            </Panel>

            <Panel variant="bordered" className="legal-panel">
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
            </Panel>

            <Panel variant="bordered" className="legal-panel">
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
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Blockchain Data</h2>
              <p>
                Please note that all blockchain transactions are public by design. Our analysis 
                tools work with this public data. We do not have access to private wallet 
                information unless you explicitly connect your wallet for specific features.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify users of 
                any significant changes via email or platform notification.
              </p>
            </Panel>

            <Panel variant="bordered" className="legal-panel">
              <h2>Contact Us</h2>
              <p>
                For privacy-related questions or requests, please contact us at{' '}
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

export default PrivacyPage;
