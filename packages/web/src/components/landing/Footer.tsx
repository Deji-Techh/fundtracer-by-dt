import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const footerLinks = {
  product: [
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'API', path: '/api' },
  ],
  company: [
    { label: 'About', path: '/about' },
    { label: 'Blog', path: '/blog' },
    { label: 'Careers', path: '/careers' },
    { label: 'Contact', path: '/contact' },
  ],
  legal: [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Cookie Policy', path: '/cookies' },
  ],
  social: [
    { label: 'Twitter', url: 'https://twitter.com/fundtracer' },
    { label: 'Discord', url: 'https://discord.gg/fundtracer' },
    { label: 'GitHub', url: 'https://github.com/fundtracer' },
  ],
};

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src="/logo.png" alt="FundTracer" className="footer-logo-img" />
              <span className="footer-logo-text">FundTracer</span>
            </Link>
            <p className="footer-tagline">
              Advanced blockchain forensics and wallet intelligence platform
            </p>
          </div>

          {/* Product Links */}
          <div className="footer-column">
            <h4 className="footer-column-title">Product</h4>
            <ul className="footer-links">
              {footerLinks.product.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="footer-column">
            <h4 className="footer-column-title">Company</h4>
            <ul className="footer-links">
              {footerLinks.company.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="footer-column">
            <h4 className="footer-column-title">Legal</h4>
            <ul className="footer-links">
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div className="footer-column">
            <h4 className="footer-column-title">Connect</h4>
            <ul className="footer-links">
              {footerLinks.social.map((link) => (
                <li key={link.label}>
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
        </div>
      </div>
    </footer>
  );
}
