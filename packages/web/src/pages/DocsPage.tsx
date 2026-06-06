/**
 * DocsPage - FundTracer Documentation
 * Sidebar uses React Router-aware active highlighting.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Command, Search, X } from 'lucide-react';
import './DocsPage.css';

interface DocsSection { id: string; title: string; }
interface DocsSearchResult {
  title: string;
  description: string;
  href: string;
  kind: 'Page' | 'Section';
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
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [currentSection, setCurrentSection] = useState(sections[0]?.id || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.title = `${title} | FundTracer Docs`;
  }, [title]);

  useEffect(() => {
    if (!searchOpen) return;
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditable =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable) {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setCurrentSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const searchResults = useMemo<DocsSearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentPath = pathname;

    const pageResults = docsNav.map(item => ({
      title: item.label,
      description: item.href === currentPath ? 'Open this page' : 'Navigate to docs page',
      href: item.href,
      kind: 'Page' as const,
    }));

    const sectionResults = sections.map(section => ({
      title: section.title,
      description: title,
      href: `${currentPath}#${section.id}`,
      kind: 'Section' as const,
    }));

    const allResults = [...pageResults, ...sectionResults];

    if (!query) {
      return allResults.slice(0, 8);
    }

    return allResults.filter(result => {
      const haystack = `${result.title} ${result.description} ${result.href}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 8);
  }, [pathname, sections, searchQuery, title]);

  const handleSearchSelect = (result: DocsSearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');

    const [path, hash] = result.href.split('#');
    if (path === pathname && hash) {
      scrollToSection(hash);
    } else {
      navigate(result.href);
    }

    if (hash && path !== pathname) {
      window.setTimeout(() => {
        const target = document.getElementById(hash);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  return (
    <div className="docs-xai-shell">
      <aside className={`docs-sidebar ${sidebarOpen ? 'docs-sidebar--open' : ''}`}>
          <a className="docs-xai-brand" href="/" aria-label="FundTracer home">
            <img src="/logo.png" alt="" />
          </a>
        <div className="docs-sidebar__header">Get Started</div>
        <nav className="docs-sidebar__nav">
          {docsNav.map(item => {
            const isActive = pathname === item.href;
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

      <div className="docs-page">
        <header className="docs-xai-toolbar">
          <span>Docs</span>
          <div>
            <button type="button" onClick={() => setSearchOpen(true)}>
              <Search size={14} />
              Search <kbd>Ctrl K</kbd>
            </button>
            <a href="/auth?mode=signup">API Console</a>
          </div>
        </header>

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

        <main className="docs-content">
          <section className="docs-xai-intro">
            <div className="docs-xai-intro__copy">
              <span className="docs-xai-status"><i /> Available</span>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
              <div className="docs-xai-intro__actions">
                <a href="/auth?mode=signup">Manage API keys</a>
                <a href="/api-docs">Get Started</a>
              </div>
            </div>
            <div className="docs-xai-snippet">
              <div>
                <span>TypeScript</span>
                <span>Python</span>
                <span>cURL</span>
              </div>
              <pre>{`import { FundTracer } from '@fundtracer/sdk';

const ft = new FundTracer({
  apiKey: process.env.FUNDTRACER_API_KEY,
});

const report = await ft.wallets.trace({
  address: '0x742d...5b2a',
  chain: 'ethereum',
  depth: 4,
  includeRooms: true,
});

console.log(report.entities);`}</pre>
            </div>
          </section>

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

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              className="docs-search-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
            >
              <motion.div
                className="docs-search-panel"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                onClick={event => event.stopPropagation()}
              >
                <div className="docs-search-panel__header">
                  <Search size={16} />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder="Search docs and sections"
                    aria-label="Search docs"
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                    <X size={16} />
                  </button>
                </div>
                <div className="docs-search-panel__meta">
                  <Command size={14} />
                  <span>Search pages, sections, and guides.</span>
                </div>
                <div className="docs-search-panel__results">
                  {searchResults.length > 0 ? (
                    searchResults.map(result => (
                      <button
                        key={result.href + result.title}
                        type="button"
                        className="docs-search-result"
                        onClick={() => handleSearchSelect(result)}
                      >
                        <span className="docs-search-result__kind">{result.kind}</span>
                        <span className="docs-search-result__title">{result.title}</span>
                        <span className="docs-search-result__desc">{result.description}</span>
                        <ArrowRight size={14} />
                      </button>
                    ))
                  ) : (
                    <div className="docs-search-empty">No matching docs found.</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DocsPage;
