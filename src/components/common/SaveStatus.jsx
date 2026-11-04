import React from 'react';
import styles from './SaveStatus.module.css';

const STATES = {
  saved: { label: 'Saved', title: 'All changes saved on this device', dot: '' },
  saving: { label: 'Saving', title: 'Saving your changes', dot: styles.busy },
  error: {
    label: 'Not saved',
    title: 'Changes could not be saved on this device',
    dot: styles.failed,
  },
};

/** Quiet "Saved" note beside the title. */
export function SaveStatus({ status = 'saved' }) {
  const state = STATES[status] || STATES.saved;
  return (
    <span className={styles.save} role="status" title={state.title}>
      <span className={`${styles.dot} ${state.dot}`} aria-hidden="true" />
      <span className={styles.text}>{state.label}</span>
    </span>
  );
}
