import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Section.module.css';

/** Titled block for side panels. Collapsible so long panels stay short. */
export function Section({ title, defaultOpen = true, action, children, collapsible = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        {collapsible ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={isOpen}
          >
            <span className={styles.title}>{title}</span>
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <h3 className={styles.title}>{title}</h3>
        )}
        {action && <div className={styles.action}>{action}</div>}
      </header>
      {isOpen && <div className={styles.body}>{children}</div>}
    </section>
  );
}

/** Square icon-only button with a tooltip. */
export function IconButton({
  label,
  active,
  quiet = false,
  danger = false,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${active ? (quiet ? styles.iconBtnQuiet : styles.iconBtnOn) : ''} ${danger ? styles.iconBtnDanger : ''} ${className}`}
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      {...props}
    >
      {children}
    </button>
  );
}
