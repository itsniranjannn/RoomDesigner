import React from 'react';
import styles from './EmptyState.module.css';

/**
 * The card shown in the middle of a canvas with nothing on it yet: an icon, a short title and one
 * line about what to do next. Used over a room with no furniture and over an empty floor of a flat.
 */
export function EmptyState({ icon, title, children }) {
  return (
    <div className={styles.card}>
      {icon}
      <p className={styles.title}>{title}</p>
      <p className={styles.text}>{children}</p>
    </div>
  );
}
