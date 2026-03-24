import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ContactModal } from '../ContactModal';
import './Footer.css';

export function Footer() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ['start end', 'end end'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [50, 0]);

  const footerLinks = {
    product: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Telegram Bot', href: 'https://fundtracer.xyz/telegram' },
    ],
    resources: [
      { label: 'API Documentation', href: '/api/docs' },
      { label: 'CLI', href: '/cli' },
      { label: 'GitHub', url: 'https://github.com/Deji-Tech' },
    ],
    company: [
      { label: 'About', href: '/about' },
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
      <motion.footer 
        ref={footerRef}
        className="landing-footer-v2"
        style={{ opacity }}
      >
        <div className="footer-container-v2">
          <motion.div 
            className="footer-grid-v2"
            style={{ y }}
          >
            <motion.div 
              className="footer-brand-v2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <a href="/" className="footer-logo-v2" data-cursor="pointer">
                <motion.img 
                  src="/logo.png" 
                  alt="FundTracer" 
                  className="footer-logo-img-v2"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                />
                <span className="footer-logo-text-v2">FundTracer</span>
              </a>
              <p className="footer-tagline-v2">
                Trace with precision, scale with confidence
              </p>
              <motion.div 
                className="footer-social-icons"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <motion.a
                  href="https://twitter.com/fundtracer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  whileHover={{ scale: 1.1, y: -2 }}
                  data-cursor="pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </motion.a>
                <motion.a
                  href="https://github.com/Deji-Tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  whileHover={{ scale: 1.1, y: -2 }}
                  data-cursor="pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </motion.a>
              </motion.div>
            </motion.div>

            {[
              { title: 'Product', links: footerLinks.product },
              { title: 'Resources', links: footerLinks.resources },
              { title: 'Company', links: footerLinks.company },
              { title: 'Legal', links: footerLinks.legal },
              { title: 'Connect', links: footerLinks.social },
            ].map((column, columnIndex) => (
              <motion.div
                key={column.title}
                className="footer-column-v2"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + columnIndex * 0.1 }}
              >
                <h4 className="footer-column-title-v2">{column.title}</h4>
                <ul className="footer-links-v2">
                  {column.links.map((link, linkIndex) => (
                    <motion.li
                      key={link.label}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.2 + linkIndex * 0.05 }}
                    >
                      <a
                        href={'href' in link ? link.href : 'url' in link ? link.url : '#'}
                        className="footer-link-v2"
                        onClick={(e) => handleLinkClick(e, link)}
                        target={'url' in link ? '_blank' : undefined}
                        rel={'url' in link ? 'noopener noreferrer' : undefined}
                        data-cursor="pointer"
                      >
                        {link.label}
                        <motion.span
                          className="link-underline"
                          initial={{ scaleX: 0 }}
                          whileHover={{ scaleX: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="footer-bottom-v2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <motion.div
              className="footer-divider"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            />
            <div className="footer-bottom-content">
              <p className="footer-copyright-v2">
                © {new Date().getFullYear()} FundTracer by DT. All rights reserved.
              </p>
              <p className="footer-email-v2">
                support@fundtracer.xyz
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="footer-gradient-orb"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.footer>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </>
  );
}
