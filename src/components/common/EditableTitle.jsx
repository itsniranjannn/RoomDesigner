import React, { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import styles from './EditableTitle.module.css';

/** Page title that is also its own rename box. Commits on blur or Enter, Escape restores. */
export function EditableTitle({ value, onCommit, label, maxLength = 60 }) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  const [editing, setEditing] = useState(false);
  const fieldRef = useRef(null);
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
    <span className={styles.wrap}>
      <input
        ref={fieldRef}
        type="text"
        className={styles.title}
        aria-label={label}
        title="Click to rename"
        value={draft}
        maxLength={maxLength}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(value);
            e.currentTarget.blur();
          }
        }}
      />
      {/*
       * On a phone the field takes the whole bar while it is being typed into, which hides the
       * view switch and Share underneath it. This is the way out, on screen and under the thumb:
       * without it the only ways to finish were to guess at the plan behind the bar or to find Go
       * on the on-screen keyboard. `onPointerDown` rather than a click, because the blur that
       * commits the name arrives first and would take the button away before a click landed.
       */}
      {editing && (
        <button
          type="button"
          className={styles.done}
          aria-label="Finish renaming"
          title="Done"
          onPointerDown={(e) => {
            e.preventDefault();
            fieldRef.current?.blur();
          }}
        >
          <Check size={16} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
