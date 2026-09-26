import React from 'react';

export function BrandMark({ size = 28, className = '', title = 'Room Studio Brand Mark' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g transform="translate(24, 24)">
        <circle r="22" stroke="var(--color-taupe, #c8b9a6)" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
        <polygon
          points="0,-20 20,0 0,20 -20,0"
          fill="var(--color-clay, #8b4a3e)"
          fillOpacity="0.15"
          stroke="var(--color-clay, #8b4a3e)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points="0,-20 20,0 0,20 -20,0"
          transform="rotate(45)"
          fill="var(--color-clay, #8b4a3e)"
          fillOpacity="0.25"
          stroke="var(--color-clay, #8b4a3e)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points="0,-11 11,0 0,11 -11,0"
          stroke="var(--color-ink, #231f20)"
          strokeWidth="1"
          fill="none"
          opacity="0.75"
        />
        <line x1="-16" y1="0" x2="16" y2="0" stroke="var(--color-ink, #231f20)" strokeWidth="0.75" opacity="0.5" />
        <line x1="0" y1="-16" x2="0" y2="16" stroke="var(--color-ink, #231f20)" strokeWidth="0.75" opacity="0.5" />
        <circle r="3.5" fill="var(--color-brass, #b8860b)" stroke="var(--color-ink, #231f20)" strokeWidth="1" />
        <circle r="1.2" fill="#ffffff" />
      </g>
    </svg>
  );
}

export default BrandMark;
