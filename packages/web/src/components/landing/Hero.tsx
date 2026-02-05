import React from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import './Hero.css';

interface HeroProps {
  onLaunchApp?: () => void;
}

export function Hero({ onLaunchApp }: HeroProps) {
  return (
    <section className="hero">
      {/* Background Effect */}
      <div className="hero-bg">
        <div className="hero-gradient"></div>
        <div className="hero-grid"></div>
      </div>

      <div className="hero-content">
        {/* Badge */}
        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          Now supporting 7+ blockchains
        </div>

        {/* Headline */}
        <h1 className="hero-title">
          Advanced Blockchain
          <br />
          <span className="hero-title-highlight">Forensics & Intelligence</span>
        </h1>

        {/* Subheadline */}
        <p className="hero-subtitle">
          Analyze wallets, detect Sybil patterns, and trace funding sources across Ethereum, 
          Linea, Arbitrum, and more. Professional-grade tools for researchers, investors, 
          and compliance teams.
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta">
          <button onClick={onLaunchApp} className="btn btn-primary btn-lg">
            Launch App
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
          </button>
          <Link to="/how-it-works" className="btn btn-secondary btn-lg">
            <HugeiconsIcon icon={PlayIcon} size={20} strokeWidth={2} />
            View Demo
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="hero-trust">
          <div className="trust-item">
            <span className="trust-number">7+</span>
            <span className="trust-label">Blockchains</span>
          </div>
          <div className="trust-divider"></div>
          <div className="trust-item">
            <span className="trust-number">10K+</span>
            <span className="trust-label">Wallets Analyzed</span>
          </div>
          <div className="trust-divider"></div>
          <div className="trust-item">
            <span className="trust-number">Real-time</span>
            <span className="trust-label">Data</span>
          </div>
          <div className="trust-divider"></div>
          <div className="trust-item">
            <span className="trust-number">Enterprise</span>
            <span className="trust-label">Security</span>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="hero-scroll">
        <div className="scroll-mouse">
          <div className="scroll-wheel"></div>
        </div>
        <span>Scroll to explore</span>
      </div>
    </section>
  );
}
