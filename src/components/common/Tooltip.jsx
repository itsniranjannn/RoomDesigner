import React from 'react';
import styles from './Tooltip.module.css';

/** Small label that appears on hover or keyboard focus. The wrapped control keeps its own aria-label. */
export function Tooltip({ label, side = 'right', children }) {
  return (
    <span className={styles.wrap}>
      {children}
      <span className={`${styles.tip} ${styles[side] || styles.right}`} aria-hidden="true">
        {label}
      </span>
    </span>
  );
}
