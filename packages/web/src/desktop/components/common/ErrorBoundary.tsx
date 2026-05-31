import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: 'var(--bg)', color: 'var(--fg)',
          fontFamily: 'var(--font-sans)', gap: 16, padding: 32, textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Something went wrong</div>
          <p style={{ fontSize: 12, color: 'var(--fg-secondary)', maxWidth: 360 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: '8px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--card-border)',
              background: 'var(--fg)', color: 'var(--bg)', fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--font-sans)', cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
