/**
 * AboutPage - Company information page
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './AboutPage.css';

const navItems = [
  { label: 'About', href: '/about', active: true },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
];

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="about-page">
        {/* Hero Section */}
        <section className="about-hero">
          <div className="about-hero__grid"></div>
          <div className="about-hero__content">
            <Badge variant="default" size="sm">About FundTracer</Badge>
            <h1 className="about-hero__title">
              Building the Future of
              <span className="about-hero__title-accent">Blockchain Intelligence</span>
            </h1>
            <p className="about-hero__subtitle">
              FundTracer empowers researchers, investors, and compliance teams with 
              professional-grade tools to analyze blockchain data with unprecedented clarity.
            </p>
            <div className="about-hero__stats">
              <div className="about-stat">
                <span className="about-stat__number">10K+</span>
                <span className="about-stat__label">Wallets Analyzed</span>
              </div>
              <div className="about-stat">
                <span className="about-stat__number">7+</span>
                <span className="about-stat__label">Blockchains</span>
              </div>
              <div className="about-stat">
                <span className="about-stat__number">99.9%</span>
                <span className="about-stat__label">Accuracy</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="about-section">
          <div className="about-section__container">
            <div className="about-mission">
              <div className="about-mission__content">
                <Badge variant="success" size="sm">Our Mission</Badge>
                <h2 className="about-section__title">Transparency Through Technology</h2>
                <p className="about-section__text">
                  We believe that transparency is the foundation of trust in the blockchain ecosystem. 
                  Our mission is to provide accessible, powerful tools that help users understand 
                  complex transaction patterns, identify potential risks, and make informed decisions.
                </p>
                <p className="about-section__text">
                  From individual researchers to enterprise compliance teams, FundTracer serves 
                  a diverse community united by the need for reliable blockchain intelligence.
                </p>
              </div>
              <div className="about-mission__cards">
                <Panel variant="bordered" className="about-mission__card">
                  <div className="about-mission__icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3>Trace with Precision</h3>
                  <p>Advanced algorithms for accurate blockchain analysis across multiple chains</p>
                </Panel>
                <Panel variant="bordered" className="about-mission__card">
                  <div className="about-mission__icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3>Scale with Confidence</h3>
                  <p>Enterprise-grade infrastructure built to handle any workload</p>
                </Panel>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="about-section about-section--alt">
          <div className="about-section__container">
            <div className="about-values__header">
              <Badge variant="warning" size="sm">Our Values</Badge>
              <h2 className="about-section__title">The Principles That Guide Us</h2>
              <p className="about-section__subtitle">Everything we build is driven by these core values</p>
            </div>
            <div className="about-values__grid">
              {[
                {
                  title: 'Transparency',
                  description: 'We believe in open, verifiable data that anyone can audit and trust.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )
                },
                {
                  title: 'Precision',
                  description: 'Accuracy is paramount. Our tools deliver reliable results you can depend on.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="2" fill="currentColor"/>
                    </svg>
                  )
                },
                {
                  title: 'Innovation',
                  description: 'Constantly evolving our technology to stay ahead of the curve.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9.663 17H14.336M12 3V4M18.364 5.636L17.657 6.343M21 12H20M4 12H3M6.343 6.343L5.636 5.636M12 18C8.686 18 6 15.314 6 12C6 8.686 8.686 6 12 6C15.314 6 18 8.686 18 12C18 15.314 15.314 18 12 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )
                },
                {
                  title: 'Security',
                  description: 'Enterprise-grade security protecting your data and privacy at all times.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )
                }
              ].map((value, index) => (
                <Panel key={index} variant="bordered" className="about-value">
                  <div className="about-value__number">0{index + 1}</div>
                  <div className="about-value__icon">{value.icon}</div>
                  <h3 className="about-value__title">{value.title}</h3>
                  <p className="about-value__desc">{value.description}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="about-section">
          <div className="about-section__container">
            <div className="about-team__header">
              <Badge variant="info" size="sm">Our Team</Badge>
              <h2 className="about-section__title">Built by Experts</h2>
              <p className="about-section__subtitle">A team passionate about blockchain technology</p>
            </div>
            <div className="about-team__grid">
              <a href="https://x.com/hayodejiii" target="_blank" rel="noopener noreferrer" className="about-team__card-link">
                <Panel variant="bordered" className="about-team__card">
                  <div className="about-team__avatar">H</div>
                  <h3 className="about-team__name">Hayodeji</h3>
                  <p className="about-team__role">Founder & Lead Developer</p>
                  <p className="about-team__bio">
                    Blockchain enthusiast with expertise in forensic analysis and Web3 development.
                  </p>
                </Panel>
              </a>
              <a href="https://x.com/haiconempire_01" target="_blank" rel="noopener noreferrer" className="about-team__card-link">
                <Panel variant="bordered" className="about-team__card">
                  <div className="about-team__avatar">H</div>
                  <h3 className="about-team__name">Haicon</h3>
                  <p className="about-team__role">Lead Marketer</p>
                  <p className="about-team__bio">
                    Marketing strategist driving growth and community engagement.
                  </p>
                </Panel>
              </a>
              <a href="https://x.com/devabraham123" target="_blank" rel="noopener noreferrer" className="about-team__card-link">
                <Panel variant="bordered" className="about-team__card">
                  <div className="about-team__avatar">DA</div>
                  <h3 className="about-team__name">Dev Abraham</h3>
                  <p className="about-team__role">Lead Designer</p>
                  <p className="about-team__bio">
                    Creative designer crafting beautiful user experiences.
                  </p>
                </Panel>
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="about-cta">
          <div className="about-cta__content">
            <h2 className="about-cta__title">Ready to Get Started?</h2>
            <p className="about-cta__subtitle">
              Join thousands of users analyzing blockchain data with FundTracer
            </p>
            <button 
              className="about-cta__button"
              onClick={() => navigate('/app')}
            >
              Launch Application
            </button>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}

export default AboutPage;
