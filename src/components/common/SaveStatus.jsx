import React from 'react';
import styles from './SaveStatus.module.css';

/** Quiet "Saved" note beside the title. */
export function SaveStatus({ saving = false }) {
  return (
    <span className={styles.save} role="status" title={saving ? 'Saving your changes' : 'All changes saved on this device'}>
      <span className={`${styles.dot} ${saving ? styles.busy : ''}`} aria-hidden="true" />
      <span className={styles.text}>{saving ? 'Saving' : 'Saved'}</span>
    </span>
  );
}
