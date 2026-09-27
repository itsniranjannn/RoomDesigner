import React from 'react';
import { Button } from './Button.jsx';
import { BrandMark } from './BrandMark.jsx';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env?.DEV) {
      console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--color-linen, #F7F3EC)',
            color: 'var(--color-ink, #1C1A17)',
            fontFamily: 'var(--font-sans, "Space Grotesk", sans-serif)',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <BrandMark size={48} />
          <h1
            style={{
              fontFamily: 'var(--font-serif, "Fraunces", serif)',
              fontSize: '28px',
              fontWeight: 600,
              margin: '8px 0 0 0',
              color: 'var(--color-ink, #1C1A17)',
            }}
          >
            Drafting Session Interrupted
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-ink-muted, #78736B)',
              maxWidth: '460px',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            An unexpected error occurred while rendering the architectural workspace. Your saved sheets in local storage remain intact.
          </p>
          <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
            <Button variant="primary" onClick={this.handleReload}>
              Reload Studio
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
