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
 *
 * With role="menu" the panel behaves as a menu rather than only claiming to be one: it is
 * one stop in the tab order, focus starts on the first item, the arrows and Home/End walk
 * the items, and Tab or Escape closes it and hands focus back to the trigger.
 */
export function Popover({
  renderTrigger,
  children,
  label,
  role = 'dialog',
  align = 'start',
  direction = 'down',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  const isMenu = role === 'menu';
  const items = useCallback(
    () => Array.from(panelRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []),
    []
  );
  const focusItem = useCallback(
    (index) => {
      const list = items();
      if (list.length === 0) return;
      const at = ((index % list.length) + list.length) % list.length;
      list.forEach((el, i) => {
        el.tabIndex = i === at ? 0 : -1;
      });
      list[at].focus();
    },
    [items]
  );

  useEffect(() => {
    if (!open || !isMenu) return;
    focusItem(0);
  }, [open, isMenu, focusItem]);

  const backToTrigger = () => {
    close();
    rootRef.current?.querySelector('[aria-haspopup]')?.focus();
  };

  const onPanelKeyDown = (e) => {
    if (!isMenu || items().length === 0) return;
    const at = items().indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Home') focusItem(0);
      else if (e.key === 'End') focusItem(items().length - 1);
      else focusItem(at + (e.key === 'ArrowDown' ? 1 : -1));
      return;
    }
    // A menu is left, not walked through: Tab closes it and gives the trigger the focus
    if (e.key === 'Tab') {
      e.preventDefault();
      backToTrigger();
    }
  };

  const triggerProps = {
    'aria-haspopup': isMenu ? 'menu' : 'dialog',
    'aria-expanded': open,
    onClick: () => setOpen((o) => !o),
  };

  return (
    <div className={`${styles.root} ${className}`} ref={rootRef}>
      {renderTrigger(triggerProps, open)}
      {open && (
        <div
          ref={panelRef}
          className={`${styles.panel} ${align === 'end' ? styles.end : ''} ${direction === 'up' ? styles.up : ''}`}
          role={role}
          aria-label={label}
          onKeyDown={onPanelKeyDown}
        >
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  danger = false,
  active = false,
  children,
  className = '',
  ...props
}) {
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
