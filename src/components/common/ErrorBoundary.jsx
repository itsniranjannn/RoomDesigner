import React from 'react';

/**
 * Catches render errors in the subtree so a failure (e.g. WebGL in the 3D view)
 * shows a recovery screen instead of a blank page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env?.DEV) {
      console.error('Unhandled render error:', error, info);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
          background: '#F6F2EA',
          color: '#1A1615',
        }}
      >
        <h1 style={{ margin: 0 }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: 420 }}>
          Your saved rooms are safe. Reload the studio to continue drafting.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 18px',
            background: '#8B2635',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reload studio
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
