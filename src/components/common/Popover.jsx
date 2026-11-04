import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Popover.module.css';

/** Closes a popover on outside press or Escape and hands focus back to its trigger. */
function useDismiss(rootRef, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
      rootRef.current?.querySelector('[aria-haspopup]')?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose, rootRef]);
}

/**
 * Trigger plus floating panel. `renderTrigger` receives props to spread on the trigger button.
 * `children` can be a function that receives { close }.
 */
export function Popover({ renderTrigger, children, label, role = 'dialog', align = 'start', direction = 'down', className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  const triggerProps = {
    'aria-haspopup': role === 'menu' ? 'menu' : 'dialog',
    'aria-expanded': open,
    onClick: () => setOpen((o) => !o),
  };

  return (
    <div className={`${styles.root} ${className}`} ref={rootRef}>
      {renderTrigger(triggerProps, open)}
      {open && (
        <div
          className={`${styles.panel} ${align === 'end' ? styles.end : ''} ${direction === 'up' ? styles.up : ''}`}
          role={role}
          aria-label={label}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, danger = false, active = false, children, className = '', ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`${styles.item} ${danger ? styles.danger : ''} ${active ? styles.itemActive : ''} ${className}`}
      {...props}
    >
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      <span className={styles.itemLabel}>{children}</span>
    </button>
  );
}

export function MenuLabel({ children }) {
  return <div className={styles.menuLabel}>{children}</div>;
}

export function MenuDivider() {
  return <div className={styles.divider} role="separator" />;
}
