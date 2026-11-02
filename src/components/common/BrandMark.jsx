import React from 'react';

/** Studio mark: a room outline with a door gap and a brass centre point. */
export function BrandMark({ size = 28, className = '', title = 'Room Designer Studio' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--color-maroon)" />
      <path
        d="M9 23V10h14v13H17"
        stroke="var(--color-paper)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16.5" r="2.2" fill="var(--color-brass)" />
    </svg>
  );
}
