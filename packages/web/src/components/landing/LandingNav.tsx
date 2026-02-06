import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import './LandingNav.css';

interface LandingNavProps {
  onLaunchApp?: () => void;
}

export function LandingNav({ onLaunchApp }: LandingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/about', label: 'About' },
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/faq', label: 'FAQ' },
  ];

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="landing-nav">
      <div className="landing-nav-container">
        {/* Logo */}
        <a href="/" className="landing-logo">
          <img src="/logo.png" alt="FundTracer" className="landing-logo-img" />
          <span className="landing-logo-text">FundTracer</span>
        </a>

        {/* Desktop Navigation */}
        <div className="landing-nav-links desktop-only">
          {navLinks.map((link) => (
            <a 
              key={link.href} 
              href={link.href}
              className="landing-nav-link"
              onClick={handleLinkClick}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <button 
          onClick={onLaunchApp}
          className="landing-nav-cta desktop-only"
        >
          Launch App
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
        </button>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-btn mobile-only"
          aria-label="Toggle menu"
        >
          <HugeiconsIcon 
            icon={mobileMenuOpen ? Cancel01Icon : Menu01Icon} 
            size={24} 
            strokeWidth={2} 
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-content">
          {navLinks.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              className="mobile-menu-link"
              onClick={handleLinkClick}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {link.label}
            </a>
          ))}
          <button 
            onClick={() => {
              setMobileMenuOpen(false);
              onLaunchApp?.();
            }}
            className="mobile-menu-cta"
          >
            Launch App
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </nav>
  );
}
