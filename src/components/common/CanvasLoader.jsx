import React from 'react';
import styles from './CanvasLoader.module.css';

/** Placeholder shown inside the canvas card while the 3D chunk loads. */
export function CanvasLoader({ label }) {
  return (
    <div className={styles.loader} role="status">
      <svg className={styles.plan} viewBox="0 0 120 80" aria-hidden="true">
        <rect x="10" y="10" width="100" height="60" rx="3" />
        <path d="M10 40h34M70 40h40M44 10v30M70 40v30" />
      </svg>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
