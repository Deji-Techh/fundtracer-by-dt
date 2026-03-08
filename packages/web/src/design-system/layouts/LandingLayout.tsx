/**
 * LandingLayout - Minimal layout for landing/public pages
 * No sidebar, just header and content
 */

import React, { useState, useEffect } from 'react';
import { CommandBar, SearchResult } from '../primitives';
import logoImg from '../../assets/logo.png';
import './LandingLayout.css';

interface LandingLayoutProps {
  children: React.ReactNode;
  logo?: React.ReactNode;
  navItems?: { label: string; href: string; active?: boolean }[];
  headerRight?: React.ReactNode;
  onSearch?: (query: string) => void;
  onSearchSelect?: (result: SearchResult) => void;
  searchResults?: SearchResult[];
  searchLoading?: boolean;
  showSearch?: boolean;
  transparent?: boolean;
  className?: string;
}

export function LandingLayout({
  children,
  logo,
  navItems = [],
  headerRight,
  onSearch,
  onSearchSelect,
  searchResults = [],
  searchLoading = false,
  showSearch = true,
  transparent = false,
  className = ''
}: LandingLayoutProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`landing-layout ${className}`}>
      {/* Header */}
      <header className={`landing-header ${scrolled ? 'landing-header--scrolled' : ''} ${transparent && !scrolled ? 'landing-header--transparent' : ''}`}>
        <div className="landing-header__container">
          {/* Logo */}
          <a href="/" className="landing-header__logo">
            {logo || (
              <>
                <img src={logoImg} alt="FundTracer" className="landing-header__logo-img" />
                <span className="landing-header__logo-text">FUNDTRACER</span>
              </>
            )}
          </a>

          {/* Desktop nav */}
          <nav className="landing-header__nav hide-mobile">
            {navItems.map((item, i) => (
              <a 
                key={i} 
                href={item.href}
                className={`landing-header__nav-link ${item.active ? 'landing-header__nav-link--active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Search */}
          {showSearch && (
            <div className="landing-header__search hide-mobile">
              <CommandBar
                placeholder="Search..."
                onSearch={onSearch}
                onSelect={onSearchSelect}
                results={searchResults}
                loading={searchLoading}
              />
            </div>
          )}

          {/* Right side */}
          <div className="landing-header__right">
            {headerRight}
            
            {/* Mobile menu button */}
            <button 
              className="landing-header__menu-btn mobile-only"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {mobileMenuOpen ? (
                  <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                ) : (
                  <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <nav className="landing-mobile-menu__nav">
              {navItems.map((item, i) => (
                <a 
                  key={i} 
                  href={item.href}
                  className={`landing-mobile-menu__link ${item.active ? 'landing-mobile-menu__link--active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="landing-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__container">
          {/* Brand */}
          <div className="landing-footer__brand-section">
            <div className="landing-footer__brand">
              <img src={logoImg} alt="FundTracer" className="landing-footer__logo-img" />
              <span>FUNDTRACER</span>
            </div>
            <p className="landing-footer__tagline">
              Blockchain intelligence platform for investigating on-chain activity.
            </p>
          </div>

          {/* Product Links */}
          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">Product</h4>
            <div className="landing-footer__column-links">
              <a href="/features">Features</a>
              <a href="/pricing">Pricing</a>
              <a href="/how-it-works">How It Works</a>
              <a href="/api">API</a>
            </div>
          </div>

          {/* Resources Links */}
          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">Resources</h4>
            <div className="landing-footer__column-links">
              <a href="/about">About</a>
              <a href="/faq">FAQ</a>
              <a href="/ext-install">Browser Extension</a>
              <a href="/telegram">Telegram Bot</a>
            </div>
          </div>

          {/* Legal Links */}
          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">Legal</h4>
            <div className="landing-footer__column-links">
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
            </div>
          </div>

          {/* Social Links */}
          <div className="landing-footer__column">
            <h4 className="landing-footer__column-title">Connect</h4>
            <div className="landing-footer__column-links">
              <a href="https://twitter.com/fundtracer" target="_blank" rel="noopener">Twitter</a>
              <a href="https://t.me/fundtracer" target="_blank" rel="noopener">Telegram</a>
              <a href="https://github.com/fundtracer" target="_blank" rel="noopener">GitHub</a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="landing-footer__bottom">
          <div className="landing-footer__copy">
            © {new Date().getFullYear()} FundTracer. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingLayout;
