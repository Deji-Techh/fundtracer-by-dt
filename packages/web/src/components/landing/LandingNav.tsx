import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Menu01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import './LandingNav.css';

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <motion.nav
      className={`landing-nav-v2 ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="landing-nav-container-v2">
        <motion.a
          href="/"
          className="landing-logo-v2"
          whileHover={{ scale: 1.02 }}
          data-cursor="pointer"
        >
          <motion.img
            src="/logo.png"
            alt="FundTracer"
            className="landing-logo-img-v2"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.4 }}
          />
          <span className="landing-logo-text-v2">FundTracer</span>
        </motion.a>

        <div className="landing-nav-links-v2 desktop-only">
          {navLinks.map((link, index) => (
            <motion.a
              key={link.href}
              href={link.href}
              className="landing-nav-link-v2"
              onClick={handleLinkClick}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
              data-cursor="pointer"
            >
              {link.label}
              <motion.span
                className="nav-link-underline"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.2 }}
              />
            </motion.a>
          ))}
        </div>

        <motion.button
          onClick={() => window.location.href = '/evm'}
          className="landing-nav-cta-v2 desktop-only"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          data-cursor="pointer"
          data-cursor-text="Launch"
        >
          <span>Launch App</span>
          <motion.span
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </motion.span>
        </motion.button>

        <motion.button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-btn-v2 mobile-only"
          aria-label="Toggle menu"
          whileTap={{ scale: 0.95 }}
          data-cursor="pointer"
        >
          <AnimatePresence mode="wait">
            {mobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={2} />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <HugeiconsIcon icon={Menu01Icon} size={24} strokeWidth={2} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-menu-v2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mobile-menu-content-v2">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="mobile-menu-link-v2"
                  onClick={handleLinkClick}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  data-cursor="pointer"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.button
                onClick={() => {
                  handleLinkClick();
                  window.location.href = '/evm';
                }}
                className="mobile-menu-cta-v2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                data-cursor="pointer"
              >
                Launch App
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
