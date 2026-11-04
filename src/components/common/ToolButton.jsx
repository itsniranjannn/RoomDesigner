import React from 'react';
import { IconButton } from './Section.jsx';
import { Tooltip } from './Tooltip.jsx';
import styles from './ToolButton.module.css';

/** Floating strip of tools: a small paper card that holds ToolButtons. */
export function ToolGroup({ children, vertical = true, className = '', ...props }) {
  return (
    <div className={`${styles.group} ${vertical ? '' : styles.horizontal} ${className}`} role="group" {...props}>
      {children}
    </div>
  );
}

/** Icon button with a tooltip that shows its name and keyboard shortcut. */
export function ToolButton({ label, shortcut, active, side = 'right', children, ...props }) {
  const tip = shortcut ? (
    <>
      {label}
      <kbd className={styles.kbd}>{shortcut}</kbd>
    </>
  ) : (
    label
  );
  return (
    <Tooltip label={tip} side={side}>
      {/* The tooltip already names the tool, so the browser's own title bubble is skipped */}
      <IconButton label={shortcut ? `${label} (${shortcut})` : label} active={active} title={undefined} {...props}>
        {children}
      </IconButton>
    </Tooltip>
  );
}
