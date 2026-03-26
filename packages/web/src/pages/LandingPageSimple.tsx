import React from 'react';

interface LandingPageProps {
  onLaunchApp?: () => void;
}

export function LandingPage({ onLaunchApp }: LandingPageProps) {
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a',
      padding: '40px',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '3rem', marginBottom: '20px' }}>
        FundTracer
      </h1>
      <p style={{ color: '#9ca3af', fontSize: '1.2rem', marginBottom: '40px' }}>
        Advanced Blockchain Forensics & Intelligence
      </p>
      <button 
        onClick={onLaunchApp}
        style={{
          padding: '16px 32px',
          fontSize: '1.1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Launch App
      </button>
    </div>
  );
}

export default LandingPage;
