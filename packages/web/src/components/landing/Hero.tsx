import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import './Hero.css';

interface HeroProps {
  onLaunchApp?: () => void;
}

export function Hero({ onLaunchApp }: HeroProps) {
  return (
    <section className="hero-section">
      {/* Animated Background */}
      <div className="hero-background">
        <div className="hero-gradient" />
        <div className="hero-grid" />
        <div className="hero-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`
            }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="hero-content">
        {/* Badge */}
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Now supporting 7+ blockchains
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          Advanced Blockchain
          <br />
          <span className="hero-title-gradient">
            Forensics & Intelligence
          </span>
        </h1>

        {/* Glassy Tagline Container */}
        <div className="tagline-container">
          <div className="tagline-glow" />
          <div className="tagline-content">
            <span className="tagline-icon">◆</span>
            <p className="tagline-text">
              Trace with precision, scale with confidence
            </p>
            <span className="tagline-icon">◆</span>
          </div>
          <div className="tagline-shine" />
        </div>

        {/* Description */}
        <p className="hero-description">
          Analyze wallets, detect Sybil patterns, and trace funding sources across Ethereum, 
          Linea, Arbitrum, and more. Professional-grade tools for researchers, investors, 
          and compliance teams.
        </p>

        {/* CTA Buttons */}
        <div className="hero-buttons">
          <button 
            onClick={onLaunchApp}
            className="hero-btn hero-btn-primary"
          >
            Launch App
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
          </button>
          <button 
            onClick={onLaunchApp}
            className="hero-btn hero-btn-secondary"
          >
            <HugeiconsIcon icon={PlayIcon} size={20} strokeWidth={2} />
            View Demo
          </button>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          {[
            { number: '7+', label: 'Blockchains' },
            { number: '10K+', label: 'Wallets Analyzed' },
            { number: 'Real-time', label: 'Data' },
            { number: 'Enterprise', label: 'Security' },
          ].map((stat, index) => (
            <div key={index} className="hero-stat">
              <div className="hero-stat-number">{stat.number}</div>
              <div className="hero-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
