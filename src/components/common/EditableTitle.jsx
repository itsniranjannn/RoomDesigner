import React, { useState } from 'react';
import styles from './EditableTitle.module.css';

/** Page title that is also its own rename box. Commits on blur or Enter, Escape restores. */
export function EditableTitle({ value, onCommit, label, maxLength = 60 }) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onCommit(next);
    else setDraft(value);
  };

  return (
    <input
      type="text"
      className={styles.title}
      aria-label={label}
      title="Click to rename"
      value={draft}
      maxLength={maxLength}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
