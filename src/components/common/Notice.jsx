import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import styles from './Notice.module.css';

const ICONS = { ok: CheckCircle2, error: AlertCircle, warn: AlertCircle, info: Info };

/** Inline status message. Errors are announced immediately, the rest politely. */
export function Notice({ kind = 'info', children, className = '' }) {
  const Icon = ICONS[kind] || Info;
  return (
    <p className={`${styles.notice} ${styles[kind] || ''} ${className}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden="true" className={styles.icon} />
      <span>{children}</span>
    </p>
  );
}
