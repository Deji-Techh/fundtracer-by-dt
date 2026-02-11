import React from 'react';

export const PageLoading: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '40px',
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      border: '3px solid var(--color-border)',
      borderTopColor: 'var(--color-accent)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
    <p style={{
      marginTop: '16px',
      color: 'var(--color-text-secondary)',
      fontSize: '0.875rem',
    }}>
      Loading...
    </p>
  </div>
);

// Add keyframes for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
