import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChartErrorBoundary] Chart error:', error);
    console.error('[ChartErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          background: '#0f0f0f',
          borderRadius: 8,
          border: '1px solid #1a1a1a',
          gap: 12,
        }}>
          <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
            Chart failed to load
          </span>
          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
            {this.state.error?.message || 'Unknown error'}
          </span>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #2a2a2a',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
