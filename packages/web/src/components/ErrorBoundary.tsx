import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ============================================
// ERROR BOUNDARY - Catches React errors
// ============================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Report error in production
    if (import.meta.env.PROD) {
      console.error('[Production Error]', {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleReload = () => window.location.reload();
  private handleGoHome = () => window.location.href = '/';
  private handleReset = () => this.setState({ hasError: false, error: null, errorInfo: null });

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          padding: '24px'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px',
            color: '#fff'
          }}>
            <div style={{ marginBottom: '24px', color: '#f87171' }}>
              <AlertTriangle size={64} />
            </div>
            
            <h1 style={{ marginBottom: '16px', fontSize: '28px' }}>Something went wrong</h1>
            <p style={{ color: '#9ca3af', marginBottom: '32px' }}>
              We apologize for the inconvenience. An unexpected error has occurred.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div style={{ 
                background: '#1a1a1a', 
                padding: '16px', 
                borderRadius: '8px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <details>
                  <summary style={{ color: '#f87171', cursor: 'pointer' }}>
                    Error Details (Development Only)
                  </summary>
                  <pre style={{ 
                    color: '#9ca3af', 
                    fontSize: '12px',
                    marginTop: '16px',
                    overflow: 'auto'
                  }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={this.handleReload} style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <RefreshCw size={18} />
                Reload Page
              </button>
              
              <button onClick={this.handleGoHome} style={{
                padding: '12px 24px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Home size={18} />
                Go Home
              </button>
              
              <button onClick={this.handleReset} style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#9ca3af',
                border: '1px solid #333',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                Try Again
              </button>
            </div>

            <p style={{ marginTop: '32px', color: '#6b7280', fontSize: '14px' }}>
              If this problem persists, please contact support at{' '}
              <a href="mailto:support@fundtracer.xyz" style={{ color: '#60a5fa' }}>
                support@fundtracer.xyz
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
