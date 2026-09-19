import React from 'react';
import styles from './Button.module.css';

export function Button({
  children,
  variant = 'secondary', // 'primary' | 'secondary' | 'ghost' | 'danger'
  size = 'normal', // 'normal' | 'small'
  className = '',
  icon,
  ...props
}) {
  const classes = [
    styles.button,
    styles[variant] || styles.secondary,
    size === 'small' ? styles.small : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
}

