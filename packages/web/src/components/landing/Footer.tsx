import React, { useState } from 'react';
import { ContactModal } from '../ContactModal';
import './Footer.css';

interface FooterProps {
  onLaunchApp?: () => void;
}

export function Footer({ onLaunchApp }: FooterProps) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const footerLinks = {
    product: [
      { label: 'Features', href: '#features', onClick: onLaunchApp },
      { label: 'Pricing', href: '#pricing', onClick: onLaunchApp },
      { label: 'How It Works', href: '#how-it-works', onClick: onLaunchApp },
    ],
    company: [
      { label: 'About', href: '#about', onClick: onLaunchApp },
      { label: 'Contact', onClick: () => setIsContactModalOpen(true) },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
    social: [
      { label: 'Twitter', url: 'https://twitter.com/fundtracer' },
      { label: 'GitHub', url: 'https://github.com/Deji-Tech' },
    ],
  };

  const handleLinkClick = (e: React.MouseEvent, link: any) => {
    if (link.onClick) {
      e.preventDefault();
      link.onClick();
    }
  };

  return (
    <>
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Brand Column */}
            <div className="footer-brand">
              <a href="/" className="footer-logo">
                <img src="/logo.png" alt="FundTracer" className="footer-logo-img" />
                <span className="footer-logo-text">FundTracer</span>
              </a>
              <p className="footer-tagline">
                Trace with precision, scale with confidence
              </p>
            </div>

            {/* Product Links */}
            <div className="footer-column">
              <h4 className="footer-column-title">Product</h4>
              <ul className="footer-links">
                {footerLinks.product.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href || '#'} 
                      className="footer-link"
                      onClick={(e) => handleLinkClick(e, link)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div className="footer-column">
              <h4 className="footer-column-title">Company</h4>
              <ul className="footer-links">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href || '#'} 
                      className="footer-link"
                      onClick={(e) => handleLinkClick(e, link)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div className="footer-column">
              <h4 className="footer-column-title">Legal</h4>
              <ul className="footer-links">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="footer-link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Links */}
            <div className="footer-column">
              <h4 className="footer-column-title">Connect</h4>
              <ul className="footer-links">
                {footerLinks.social.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.url} 
                      className="footer-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="footer-bottom">
            <p className="footer-copyright">
              © {new Date().getFullYear()} FundTracer by DT. All rights reserved.
            </p>
            <p className="footer-email">
              Contact: fundtracerbydt@gmail.com
            </p>
          </div>
        </div>
      </footer>

      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </>
  );
}
