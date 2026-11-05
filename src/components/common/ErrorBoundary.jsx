import React from 'react';
import { BrandMark } from './BrandMark.jsx';
import { Button } from './Button.jsx';
import { copyText, formatErrorDetails, recordError } from '../../utils/errorLog.js';
import styles from './ErrorBoundary.module.css';

/**
 * Catches render errors in the subtree so a failure (e.g. WebGL in the 3D view)
 * shows a recovery screen instead of a blank page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: '', copied: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    recordError('error-boundary', error, { componentStack: info?.componentStack });
    this.setState({ componentStack: info?.componentStack || '' });
    if (import.meta.env?.DEV) {
      console.error('Unhandled render error:', error, info);
    }
  }

  copyDetails = async () => {
    const ok = await copyText(
      formatErrorDetails(this.state.error, { componentStack: this.state.componentStack })
    );
    this.setState({ copied: ok });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className={styles.screen}>
        <section className={styles.card}>
          <BrandMark size={36} />
          <p className={styles.eyebrow}>Room Designer Studio</p>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.text}>
            Your saved rooms are safe. Try again, or reload the page to carry on designing.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => this.setState({ error: null, copied: null })}>
              Try again
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
            <Button variant="ghost" onClick={this.copyDetails}>
              Copy error details
            </Button>
          </div>
          <p className={styles.hint} role="status">
            {this.state.copied === true && 'Copied. Paste it into your bug report.'}
            {this.state.copied === false && 'Could not copy. Select the page text instead.'}
          </p>
        </section>
      </div>
    );
  }
}
