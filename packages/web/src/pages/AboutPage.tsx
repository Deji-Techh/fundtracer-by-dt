import React from 'react';
import './AboutPage.css';

export function AboutPage() {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <span className="about-label">About Us</span>
          <h1 className="about-title">
            Building the Future of
            <span className="about-title-accent"> Blockchain Intelligence</span>
          </h1>
          <p className="about-subtitle">
            FundTracer empowers researchers, investors, and compliance teams with 
            professional-grade tools to analyze blockchain data with unprecedented clarity.
          </p>
        </div>
        <div className="about-hero-stats">
          <div className="about-stat">
            <span className="about-stat-number">10K+</span>
            <span className="about-stat-label">Wallets Analyzed</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-number">7+</span>
            <span className="about-stat-label">Blockchains</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-number">99.9%</span>
            <span className="about-stat-label">Accuracy</span>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-mission">
        <div className="about-mission-grid">
          <div className="about-mission-content">
            <h2 className="about-section-title">Our Mission</h2>
            <p className="about-text">
              We believe that transparency is the foundation of trust in the blockchain ecosystem. 
              Our mission is to provide accessible, powerful tools that help users understand 
              complex transaction patterns, identify potential risks, and make informed decisions.
            </p>
            <p className="about-text">
              From individual researchers to enterprise compliance teams, FundTracer serves 
              a diverse community united by the need for reliable blockchain intelligence.
            </p>
          </div>
          <div className="about-mission-visual">
            <div className="about-mission-card">
              <div className="about-mission-icon">◆</div>
              <h3>Trace with Precision</h3>
              <p>Advanced algorithms for accurate blockchain analysis</p>
            </div>
            <div className="about-mission-card">
              <div className="about-mission-icon">◆</div>
              <h3>Scale with Confidence</h3>
              <p>Enterprise-grade infrastructure for any workload</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values">
        <div className="about-values-header">
          <h2 className="about-section-title">Our Values</h2>
          <p className="about-section-subtitle">The principles that guide everything we do</p>
        </div>
        <div className="about-values-grid">
          {[
            {
              title: 'Transparency',
              description: 'We believe in open, verifiable data that anyone can audit and trust.'
            },
            {
              title: 'Precision',
              description: 'Accuracy is paramount. Our tools deliver reliable results you can depend on.'
            },
            {
              title: 'Innovation',
              description: 'Constantly evolving our technology to stay ahead of the curve.'
            },
            {
              title: 'Security',
              description: 'Enterprise-grade security protecting your data and privacy.'
            }
          ].map((value, index) => (
            <div key={index} className="about-value-card">
              <div className="about-value-number">0{index + 1}</div>
              <h3 className="about-value-title">{value.title}</h3>
              <p className="about-value-description">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section className="about-team">
        <div className="about-team-header">
          <h2 className="about-section-title">Built by Experts</h2>
          <p className="about-section-subtitle">A team passionate about blockchain technology</p>
        </div>
        <div className="about-team-grid">
          <div className="about-team-card">
            <div className="about-team-avatar">DT</div>
            <h3 className="about-team-name">Deji Tech</h3>
            <p className="about-team-role">Founder & Lead Developer</p>
            <p className="about-team-bio">
              Blockchain enthusiast with expertise in forensic analysis and Web3 development.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="about-cta-content">
          <h2 className="about-cta-title">Ready to Get Started?</h2>
          <p className="about-cta-subtitle">
            Join thousands of users analyzing blockchain data with FundTracer
          </p>
          <button className="about-cta-button">
            Launch Application
          </button>
        </div>
      </section>
    </div>
  );
}
