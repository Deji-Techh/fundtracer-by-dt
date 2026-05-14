/**
 * DocsPage - FundTracer Documentation
 * Uses LandingLayout for consistent Intel navbar.
 * Sidebar uses React Router-aware active highlighting.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

interface DocsSection { id: string; title: string; }

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
  const location = useLocation();
  const [currentSection, setCurrentSection] = useState(sections[0]?.id || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} | FundTracer Docs`;
  }, [title]);

  // Scrollspy — highlight current section based on scroll position
  useEffect(() => {
    if (sections.length === 0) return;
    const handleScroll = () => {
      const offsets = sections.map(s => {
        const el = document.getElementById(s.id);
        return el ? { id: s.id, top: el.getBoundingClientRect().top } : { id: s.id, top: Infinity };
      });
      const visible = offsets.filter(o => o.top < 120);
      if (visible.length > 0) {
        setCurrentSection(visible[visible.length - 1].id);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    setCurrentSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="docs-page">
        {/* Mobile sidebar toggle */}
        <button
          className="docs-mobile-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={sidebarOpen ? 'M18 6L6 18M6 6l12 12' : 'M3 12h18M3 6h18M3 18h18'} />
          </svg>
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>

        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="docs-sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside className={`docs-sidebar ${sidebarOpen ? 'docs-sidebar--open' : ''}`}>
          <div className="docs-sidebar__header">Documentation</div>
          <nav className="docs-sidebar__nav">
            {docsNav.map(item => {
              const isActive = location.pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`docs-sidebar__link ${isActive ? 'docs-sidebar__link--active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {isActive && (
                    <motion.span
                      className="docs-sidebar__indicator"
                      layoutId="sidebar-indicator"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  {item.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="docs-content">
          <nav className="docs-breadcrumb">
            <a href="/">Home</a>
            <span className="docs-breadcrumb__sep">/</span>
            <a href="/docs/getting-started">Docs</a>
            <span className="docs-breadcrumb__sep">/</span>
            <span className="docs-breadcrumb__current">{title}</span>
          </nav>

          <h1 className="docs-title">{title}</h1>
          {description && <p className="docs-description">{description}</p>}

          {sections.length > 0 && (
            <div className="docs-toc">
              <span className="docs-toc__label">On this page</span>
              <div className="docs-toc__links">
                {sections.map(s => (
                  <button
                    key={s.id}
                    className={`docs-toc__link ${currentSection === s.id ? 'docs-toc__link--active' : ''}`}
                    onClick={() => scrollToSection(s.id)}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="docs-body">{children}</div>
        </main>
      </div>
    </LandingLayout>
  );
}

export default DocsPage;
