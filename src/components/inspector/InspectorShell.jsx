import React from 'react';
import { ArrowLeft, PanelRightClose } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { IconButton } from '../common/Section.jsx';
import styles from './Inspector.module.css';

/** Frame shared by the room, piece and group views: header, scrolling body and an optional pinned footer. */
export function InspectorShell({ label, title, subtitle, onClose, onBack, backLabel, footer, children }) {
  return (
    <aside className={styles.panel} aria-label={label} onClick={(e) => e.stopPropagation()}>
      <header className={styles.header}>
        <div className={styles.headingBlock}>
          {onBack && (
            <Button variant="ghost" size="small" icon={<ArrowLeft size={14} />} onClick={onBack} className={styles.back}>
              {backLabel}
            </Button>
          )}
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {onClose && (
          <IconButton label="Hide details panel" onClick={onClose}>
            <PanelRightClose size={18} />
          </IconButton>
        )}
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </aside>
  );
}
