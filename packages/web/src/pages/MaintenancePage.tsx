import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './design-system/tokens.css';

const MaintenancePage: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--intel-bg-deep)',
      color: 'var(--intel-text-primary)',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .maintenance-icon {
          animation: float 3s ease-in-out infinite;
        }
        
        .pulse-dot {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .service-card {
          background: var(--intel-bg-surface);
          border: 1px solid var(--intel-border-subtle);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }
        
        .service-card:hover {
          border-color: var(--intel-cyan);
          transform: translateY(-2px);
        }
      `}</style>

      <div className="maintenance-icon" style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--intel-cyan-bg) 0%, rgba(0, 255, 136, 0.02) 100%)',
        border: '2px solid var(--intel-cyan)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
        position: 'relative',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--intel-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="pulse-dot" style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'var(--intel-yellow)',
        }} />
      </div>

      <h1 style={{
        fontSize: '48px',
        fontWeight: 700,
        marginBottom: '16px',
        background: 'linear-gradient(135deg, var(--intel-text-primary) 0%, var(--intel-cyan) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
      }}>
        Under Maintenance
      </h1>

      <p style={{
        fontSize: '18px',
        color: 'var(--intel-text-secondary)',
        marginBottom: '32px',
        maxWidth: '500px',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        We're performing scheduled maintenance to improve your experience. 
        We'll be back online shortly.
      </p>

      <div style={{
        background: 'var(--intel-bg-surface)',
        border: '1px solid var(--intel-border-default)',
        borderRadius: '12px',
        padding: '24px 48px',
        marginBottom: '48px',
      }}>
        <div style={{
          fontSize: '14px',
          color: 'var(--intel-text-muted)',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Estimated time remaining
        </div>
        <div style={{
          fontSize: '42px',
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--intel-cyan)',
          letterSpacing: '0.05em',
        }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        maxWidth: '700px',
        width: '100%',
      }}>
        <div className="service-card" style={{ textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--intel-cyan)" strokeWidth="2" style={{ marginBottom: '12px' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Telegram Bot</div>
          <div style={{ fontSize: '14px', color: 'var(--intel-text-secondary)' }}>Fully Operational</div>
        </div>

        <div className="service-card" style={{ textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--intel-cyan)" strokeWidth="2" style={{ marginBottom: '12px' }}>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>CLI Tools</div>
          <div style={{ fontSize: '14px', color: 'var(--intel-text-secondary)' }}>Fully Operational</div>
        </div>

        <div className="service-card" style={{ textAlign: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--intel-cyan)" strokeWidth="2" style={{ marginBottom: '12px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>API Services</div>
          <div style={{ fontSize: '14px', color: 'var(--intel-text-secondary)' }}>Fully Operational</div>
        </div>
      </div>

      <div style={{
        marginTop: '48px',
        padding: '16px 24px',
        background: 'var(--intel-bg-elevated)',
        borderRadius: '8px',
        border: '1px solid var(--intel-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ color: 'var(--intel-text-muted)' }}>Questions?</span>
        <a 
          href="https://t.me/fundtracer" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            color: 'var(--intel-cyan)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Contact us on Telegram →
        </a>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '24px',
        fontSize: '12px',
        color: 'var(--intel-text-muted)',
      }}>
        FundTracer © 2024 • Blockchain Intelligence Platform
      </div>
    </div>
  );
};

export default MaintenancePage;
