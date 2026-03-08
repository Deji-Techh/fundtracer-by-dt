/**
 * IntelLayout - Main application shell
 * Sidebar + Header + Content area
 */

import React, { useState, useEffect } from 'react';
import { CommandBar, SearchResult } from '../primitives';
import logoImg from '../../assets/logo.png';
import './IntelLayout.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  onClick?: () => void;
}

interface IntelLayoutProps {
  children: React.ReactNode;
  activeNav?: string;
  onNavChange?: (id: string) => void;
  navItems?: NavItem[];
  logo?: React.ReactNode;
  headerRight?: React.ReactNode;
  onSearch?: (query: string) => void;
  onSearchSelect?: (result: SearchResult) => void;
  searchResults?: SearchResult[];
  searchLoading?: boolean;
  showSearch?: boolean;
  className?: string;
}

export function IntelLayout({
  children,
  activeNav,
  onNavChange,
  navItems = [],
  logo,
  headerRight,
  onSearch,
  onSearchSelect,
  searchResults = [],
  searchLoading = false,
  showSearch = true,
  className = ''
}: IntelLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeNav]);

  return (
    <div className={`intel-layout ${sidebarCollapsed ? 'intel-layout--collapsed' : ''} ${className}`}>
      {/* Desktop Sidebar */}
      <aside className="intel-sidebar hide-mobile">
        <div className="intel-sidebar__header">
          {logo || (
            <div className="intel-sidebar__logo">
              <img src={logoImg} alt="FundTracer" className="intel-sidebar__logo-img" />
              {!sidebarCollapsed && <span className="intel-sidebar__logo-text">FUNDTRACER</span>}
            </div>
          )}
          <button 
            className="intel-sidebar__toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              {sidebarCollapsed ? (
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        </div>

        <nav className="intel-sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`intel-sidebar__nav-item ${activeNav === item.id ? 'intel-sidebar__nav-item--active' : ''}`}
              onClick={() => {
                onNavChange?.(item.id);
                item.onClick?.();
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="intel-sidebar__nav-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="intel-sidebar__nav-label">{item.label}</span>
                  {item.badge && (
                    <span className="intel-sidebar__nav-badge">{item.badge}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="intel-sidebar__footer">
          {!sidebarCollapsed && (
            <div className="intel-sidebar__branding">
              <span className="intel-sidebar__version">v2.0</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="intel-main">
        {/* Header */}
        <header className="intel-header">
          {/* Mobile menu button */}
          <button 
            className="intel-header__menu-btn mobile-only"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Mobile logo */}
          <div className="intel-header__logo mobile-only">
            <img src={logoImg} alt="FundTracer" className="intel-header__logo-img" />
            <span>FUNDTRACER</span>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="intel-header__search">
              <CommandBar
                onSearch={onSearch}
                onSelect={onSearchSelect}
                results={searchResults}
                loading={searchLoading}
              />
            </div>
          )}

          {/* Right side */}
          <div className="intel-header__right">
            {headerRight}
          </div>
        </header>

        {/* Content */}
        <main className="intel-content">
          {children}
        </main>
      </div>

      {/* Mobile navigation overlay */}
      {mobileNavOpen && (
        <>
          <div className="intel-mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} />
          <div className="intel-mobile-nav">
            <div className="intel-mobile-nav__header">
              <div className="intel-sidebar__logo">
                <img src={logoImg} alt="FundTracer" className="intel-sidebar__logo-img" />
                <span className="intel-sidebar__logo-text">FUNDTRACER</span>
              </div>
              <button 
                className="intel-mobile-nav__close"
                onClick={() => setMobileNavOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <nav className="intel-mobile-nav__items">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={`intel-mobile-nav__item ${activeNav === item.id ? 'intel-mobile-nav__item--active' : ''}`}
                  onClick={() => {
                    onNavChange?.(item.id);
                    item.onClick?.();
                    setMobileNavOpen(false);
                  }}
                >
                  <span className="intel-mobile-nav__icon">{item.icon}</span>
                  <span className="intel-mobile-nav__label">{item.label}</span>
                  {item.badge && (
                    <span className="intel-mobile-nav__badge">{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Mobile bottom navigation */}
      <nav className="intel-bottom-nav mobile-only">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            className={`intel-bottom-nav__item ${activeNav === item.id ? 'intel-bottom-nav__item--active' : ''}`}
            onClick={() => {
              onNavChange?.(item.id);
              item.onClick?.();
            }}
          >
            <span className="intel-bottom-nav__icon">{item.icon}</span>
            <span className="intel-bottom-nav__label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default IntelLayout;
