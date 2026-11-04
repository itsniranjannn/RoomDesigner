import React from 'react';
import { BrandMark } from './BrandMark.jsx';
import { Button } from './Button.jsx';
import styles from './ErrorBoundary.module.css';

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
      <div role="alert" className={styles.screen}>
        <section className={styles.card}>
          <BrandMark size={36} />
          <p className={styles.eyebrow}>Room Designer Studio</p>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.text}>Your saved rooms are safe. Reload the page to carry on designing.</p>
          <Button variant="primary" onClick={() => window.location.reload()}>Reload page</Button>
        </section>
      </div>
    );
  }
}
