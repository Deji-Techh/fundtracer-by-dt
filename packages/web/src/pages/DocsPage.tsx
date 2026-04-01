/**
 * DocsPage - FundTracer Documentation
 * Uses LandingLayout for consistent Intel navbar
 */

import React, { useState, useEffect } from 'react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge } from '../design-system/primitives';
import './DocsPage.css';

const navItems = [
  { label: 'Intel', href: '/' },
  { label: 'Blog', href: '/blog' },
  { label: 'Docs', href: '/docs/getting-started', active: true },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
  { label: 'About', href: '/about' },
];

interface DocsSection {
  id: string;
  title: string;
}

interface DocsPageProps {
  title: string;
  description?: string;
  sections?: DocsSection[];
  children: React.ReactNode;
}

const docsNav = [
  { href: '/docs/getting-started', label: 'Getting Started' },
  { href: '/docs/ethereum-wallet-tracker', label: 'Ethereum Wallet Tracker' },
  { href: '/docs/solana-wallet-tracker', label: 'Solana Wallet Tracker' },
  { href: '/docs/multi-chain-wallet-tracker', label: 'Multi-Chain Tracker' },
  { href: '/docs/contract-analytics', label: 'Contract Analytics' },
  { href: '/docs/sybil-detection', label: 'Sybil Detection' },
  { href: '/docs/funding-tree-analysis', label: 'Funding Tree' },
  { href: '/docs/wallet-risk-score', label: 'Wallet Risk Score' },
  { href: '/docs/api-reference', label: 'API Reference' },
  { href: '/docs/cli-guide', label: 'CLI Guide' },
];

export function DocsPage({ title, description, sections = [], children }: DocsPageProps) {
  const [currentSection, setCurrentSection] = useState(sections[0]?.id || '');

  useEffect(() => {
    document.title = `${title} | FundTracer Docs`;
  }, [title]);

  const scrollToSection = (sectionId: string) => {
    setCurrentSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="docs-page">
        <aside className="docs-sidebar">
          <div className="docs-sidebar__header">
            Documentation
          </div>
          <nav className="docs-sidebar__nav">
            {docsNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`docs-sidebar__link ${window.location.pathname === item.href ? 'docs-sidebar__link--active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="docs-content">
          <nav className="docs-breadcrumb">
            <a href="/">Home</a>
            <span>/</span>
            <a href="/docs/getting-started">Docs</a>
            <span>/</span>
            <span>{title}</span>
          </nav>

          <h1 className="docs-title">{title}</h1>
          {description && <p className="docs-description">{description}</p>}

          {sections.length > 0 && (
            <div className="docs-sections-nav">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`docs-section-btn ${currentSection === section.id ? 'docs-section-btn--active' : ''}`}
                  onClick={() => scrollToSection(section.id)}
                >
                  {section.title}
                </button>
              ))}
            </div>
          )}

          <div className="docs-body">
            {children}
          </div>
        </main>
      </div>
    </LandingLayout>
  );
}

export default DocsPage;
