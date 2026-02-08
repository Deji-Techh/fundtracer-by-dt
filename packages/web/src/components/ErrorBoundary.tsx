import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { SkeletonCard, SkeletonText } from './Skeleton';

// ============================================
// ERROR BOUNDARY - Catches React errors
// ============================================

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface BoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  public state: BoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Report to console in production
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
        <div className="error-boundary" style={{
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

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="error-fallback" role="alert">
      <div className="error-icon">⚠️</div>
      <h2>Something went wrong</h2>
      <p className="error-message">
        {error.message || 'An unexpected error occurred'}
      </p>
      <div className="error-actions">
        <button className="error-btn primary" onClick={resetErrorBoundary}>
          Try again
        </button>
        <button
          className="error-btn secondary"
          onClick={() => window.location.reload()}
        >
          Refresh page
        </button>
      </div>
    </div>
  );
};

// Empty state component
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🔍',
  title,
  description,
  action,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <button className="empty-state-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

// Retry button for failed operations
interface RetryButtonProps {
  onRetry: () => void;
  error?: string;
  className?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  error,
  className = '',
}) => {
  return (
    <div className={`retry-container ${className}`}>
      {error && <p className="retry-error">{error}</p>}
      <button className="retry-button" onClick={onRetry}>
        <span>↻</span> Retry
      </button>
    </div>
  );
};

// Data source badge
interface DataSourceBadgeProps {
  sources: string[];
  lastUpdated?: Date | string;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  sources,
  lastUpdated,
}) => {
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="data-source-badge">
      <span className="badge-label">Data from:</span>
      {sources.map((source) => (
        <span key={source} className="badge-source">
          {source}
        </span>
      ))}
      {lastUpdated && (
        <span className="badge-updated">Updated {formatTime(lastUpdated)}</span>
      )}
    </div>
  );
};

// Privacy badge
export const PrivacyBadge: React.FC = () => {
  return (
    <div className="privacy-badge" title="Your data is not stored on our servers">
      <span className="privacy-icon">🔒</span>
      <span className="privacy-text">Private & Secure</span>
    </div>
  );
};

// Help tooltip
interface HelpTooltipProps {
  content: string;
  children?: React.ReactNode;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ content, children }) => {
  const [show, setShow] = React.useState(false);

  return (
    <span
      className="help-tooltip-container"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || <span className="help-icon">?</span>}
      {show && <span className="help-tooltip">{content}</span>}
    </span>
  );
};

export { SkeletonCard, SkeletonAnalysis, SkeletonTable };
export default ErrorFallback;
