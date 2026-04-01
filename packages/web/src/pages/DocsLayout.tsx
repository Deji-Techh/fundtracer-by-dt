/**
 * DocsLayout - Documentation page layout with sidebar navigation
 * Uses theme-aware styling with data-theme support
 */

import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';
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
      {/* Header */}
      <header className="docs-header">
        <div className="docs-header__container">
          <a href="/" className="docs-header__logo">
            <img src="/logo.png" alt="FundTracer" className="docs-header__logo-img" />
            <span className="docs-header__logo-text">FUNDTRACER</span>
          </a>

          <nav className="docs-header__nav hide-mobile">
            <a href="/" className="docs-header__nav-link">Intel</a>
            <a href="/features" className="docs-header__nav-link">Features</a>
            <a href="/pricing" className="docs-header__nav-link">Pricing</a>
            <a href="/how-it-works" className="docs-header__nav-link">How It Works</a>
            <a href="/faq" className="docs-header__nav-link">FAQ</a>
            <a href="/docs/getting-started" className="docs-header__nav-link docs-header__nav-link--active">Docs</a>
            <a href="/api-docs" className="docs-header__nav-link">API</a>
            <a href="/cli" className="docs-header__nav-link">CLI</a>
            <a href="/about" className="docs-header__nav-link">About</a>
          </nav>

          <div className="docs-header__right">
            <ThemeToggle size="sm" />
            <button 
              className="docs-header__menu-btn mobile-only"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

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

          {/* Page title */}
          <div className="docs-title-section">
            <h1 className="docs-title">{title}</h1>
            {description && <p className="docs-description">{description}</p>}
          </div>

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
        </main>
      </div>
    </div>
  );
}

export default DocsLayout;
