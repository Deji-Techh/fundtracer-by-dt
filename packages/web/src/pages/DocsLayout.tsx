/**
 * DocsLayout - Documentation page layout with sidebar navigation
 * Uses theme-aware styling with data-theme support
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, 
  ChevronRight, 
  Home, 
  Menu, 
  X,
  Wallet,
  Search,
  GitCompare,
  Shield,
  Network,
  FileText,
  Code,
  Terminal,
} from 'lucide-react';
import { LandingNav } from '../components/landing/LandingNav';
import './DocsLayout.css';

interface DocsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

interface DocsLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  activeSection?: string;
  sections: DocsSection[];
}

const navItems = [
  { href: '/docs/getting-started', label: 'Getting Started', icon: <Home size={18} /> },
  { href: '/docs/ethereum-wallet-tracker', label: 'Ethereum Wallet Tracker', icon: <Wallet size={18} /> },
  { href: '/docs/solana-wallet-tracker', label: 'Solana Wallet Tracker', icon: <Wallet size={18} /> },
  { href: '/docs/multi-chain-wallet-tracker', label: 'Multi-Chain Tracker', icon: <Network size={18} /> },
  { href: '/docs/contract-analytics', label: 'Contract Analytics', icon: <Search size={18} /> },
  { href: '/docs/sybil-detection', label: 'Sybil Detection', icon: <Shield size={18} /> },
  { href: '/docs/funding-tree-analysis', label: 'Funding Tree', icon: <GitCompare size={18} /> },
  { href: '/docs/wallet-risk-score', label: 'Wallet Risk Score', icon: <Shield size={18} /> },
  { href: '/docs/api-reference', label: 'API Reference', icon: <Code size={18} /> },
  { href: '/docs/cli-guide', label: 'CLI Guide', icon: <Terminal size={18} /> },
];

export function DocsLayout({ 
  children, 
  title, 
  description,
  activeSection,
  sections 
}: DocsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection || sections[0]?.id || '');

  useEffect(() => {
    document.title = `${title} | FundTracer Docs`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && description) {
      metaDesc.setAttribute('content', description);
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `https://www.fundtracer.xyz/docs/${title.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }, [title, description]);

  const scrollToSection = (sectionId: string) => {
    setCurrentSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setSidebarOpen(false);
  };

  return (
    <div className="docs-layout">
      <LandingNav />
      <header className="docs-xai-topbar">
        <div className="docs-xai-topbar__center">Docs</div>
        <div className="docs-xai-topbar__actions">
          <button type="button" className="docs-xai-search" aria-label="Search documentation">
            <Search size={16} />
            <span>Search</span>
            <kbd>Ctrl K</kbd>
          </button>
          <a className="docs-xai-console" href="/auth?mode=signup">API Console</a>
        </div>
      </header>
      <button 
        className="docs-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Close docs navigation' : 'Open docs navigation'}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className="docs-layout__container">
        {/* Sidebar */}
        <aside className={`docs-sidebar ${sidebarOpen ? 'docs-sidebar--open' : ''}`}>
          <div className="docs-sidebar__header">
            <Book size={20} />
            <span>Documentation</span>
          </div>
          
          <nav className="docs-sidebar__nav">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`docs-sidebar__link ${window.location.pathname === item.href ? 'docs-sidebar__link--active' : ''}`}
                onClick={(e) => {
                  if (item.href.startsWith('/docs/')) {
                    e.preventDefault();
                    window.location.href = item.href;
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="docs-overlay mobile-only" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="docs-main">
          {/* Breadcrumb */}
          <nav className="docs-breadcrumb">
            <a href="/">Home</a>
            <ChevronRight size={14} />
            <a href="/docs/getting-started">Docs</a>
            <ChevronRight size={14} />
            <span>{title}</span>
          </nav>

          <section className="docs-xai-hero-card">
            <div className="docs-xai-hero-card__copy">
              <span className="docs-xai-pill"><i /> Available</span>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
              <div className="docs-xai-hero-card__actions">
                <a href="/auth?mode=signup">Manage API keys</a>
                <a href="/docs/api-reference">API Reference</a>
              </div>
            </div>
            <div className="docs-xai-code">
              <div className="docs-xai-code__tabs">
                <span>TypeScript</span>
                <span>cURL</span>
                <span>CLI</span>
              </div>
              <pre>{`import { FundTracer } from '@fundtracer/sdk';

const ft = new FundTracer({
  apiKey: process.env.FUNDTRACER_API_KEY,
});

const caseFile = await ft.wallets.trace({
  address: '0x742d...5b2a',
  chain: 'ethereum',
  depth: 4,
});

console.log(caseFile.entities);`}</pre>
            </div>
          </section>

          {/* Sections nav (sticky) */}
          {sections.length > 0 && (
            <div className="docs-sections-nav hide-mobile">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`docs-section-btn ${currentSection === section.id ? 'docs-section-btn--active' : ''}`}
                  onClick={() => scrollToSection(section.id)}
                >
                  {section.icon}
                  <span>{section.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="docs-content">
            {children}
          </div>

          {/* JSON-LD Schema */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TechArticle",
              "headline": title,
              "description": description,
              "url": `https://www.fundtracer.xyz/docs/${title.toLowerCase().replace(/\s+/g, '-')}`,
              "publisher": {
                "@type": "Organization",
                "name": "FundTracer by DT"
              },
              "about": {
                "@type": "Thing",
                "name": title
              }
            })
          }} />
        </main>
      </div>
    </div>
  );
}

export default DocsLayout;
