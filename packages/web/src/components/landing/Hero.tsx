import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import './Hero.css';

interface HeroProps {
  onLaunchApp?: () => void;
}

export function Hero({ onLaunchApp }: HeroProps) {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '120px 24px 80px',
      backgroundColor: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
        opacity: 0.5
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        opacity: 0.5
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '900px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '20px',
          color: '#3b82f6',
          fontSize: '0.875rem',
          fontWeight: 500,
          marginBottom: '32px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#10b981',
            borderRadius: '50%'
          }} />
          Now supporting 7+ blockchains
        </div>

        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          lineHeight: 1.1,
          color: '#ffffff',
          marginBottom: '24px',
          letterSpacing: '-0.02em'
        }}>
          Advanced Blockchain
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Forensics & Intelligence
          </span>
        </h1>

        <p style={{
          fontSize: '1.25rem',
          color: '#9ca3af',
          lineHeight: 1.6,
          maxWidth: '600px',
          margin: '0 auto 40px'
        }}>
          Analyze wallets, detect Sybil patterns, and trace funding sources across Ethereum, 
          Linea, Arbitrum, and more. Professional-grade tools for researchers, investors, 
          and compliance teams.
        </p>

        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          marginBottom: '64px'
        }}>
          <button 
            onClick={onLaunchApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Launch App
            <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
          </button>
          <button 
            onClick={onLaunchApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              backgroundColor: 'transparent',
              color: '#ffffff',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <HugeiconsIcon icon={PlayIcon} size={20} strokeWidth={2} />
            View Demo
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          flexWrap: 'wrap'
        }}>
          {[
            { number: '7+', label: 'Blockchains' },
            { number: '10K+', label: 'Wallets Analyzed' },
            { number: 'Real-time', label: 'Data' },
            { number: 'Enterprise', label: 'Security' },
          ].map((stat, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>
                {stat.number}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
