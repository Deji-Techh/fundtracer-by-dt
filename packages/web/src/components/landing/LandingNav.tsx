import React from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import './LandingNav.css';

interface LandingNavProps {
  onLaunchApp?: () => void;
}

export function LandingNav({ onLaunchApp }: LandingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { path: '/about', label: 'About' },
    { path: '/features', label: 'Features' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/how-it-works', label: 'How It Works' },
    { path: '/faq', label: 'FAQ' },
  ];

  return (
    <nav className="landing-nav">
      <div className="landing-nav-container">
        {/* Logo */}
        <Link to="/" className="landing-logo">
          <img src="/logo.png" alt="FundTracer" className="landing-logo-img" />
          <span className="landing-logo-text">FundTracer</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="landing-nav-links desktop-only">
          {navLinks.map((link) => (
            <Link key={link.path} to={link.path} className="landing-nav-link">
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA Button */}
        <div className="landing-nav-cta">
          <button onClick={onLaunchApp} className="btn btn-primary">
            Launch App
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-toggle mobile-only"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <HugeiconsIcon 
            icon={mobileMenuOpen ? Cancel01Icon : Menu01Icon} 
            size={24} 
            strokeWidth={2} 
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu mobile-only">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className="mobile-menu-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onLaunchApp?.();
            }}
            className="btn btn-primary mobile-menu-cta"
          >
            Launch App
          </button>
        </div>
      )}
    </nav>
  );
}
