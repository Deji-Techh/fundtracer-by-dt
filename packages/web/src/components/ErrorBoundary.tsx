import React from 'react';
import { SkeletonCard, SkeletonAnalysis, SkeletonTable } from './Skeleton';

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
