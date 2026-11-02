import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './HeroPlan.module.css';

// Room outline in plan units, with margin around it
const ROOM_W = 520;
const ROOM_H = 400;
const PAD_X = 60;
const PAD_Y = 50;
const VIEW_W = ROOM_W + PAD_X * 2;
const VIEW_H = ROOM_H + PAD_Y * 2;

/** Decorative floor plan of a small bedroom, drawn in with a single stroke animation. */
export function HeroPlan() {
  const reduced = useReducedMotion();
  const x = (n) => PAD_X + n;
  const y = (n) => PAD_Y + n;

  const wall = {
    initial: reduced ? false : { pathLength: 0 },
    animate: { pathLength: 1, transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } },
  };

  const doorX = x(70);
  const doorY = y(ROOM_H);
  const doorW = 90;

  return (
    <div className={styles.plan} aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="heroGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-taupe)" strokeWidth="0.5" opacity="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#heroGrid)" />

        <motion.rect
          x={x(0)}
          y={y(0)}
          width={ROOM_W}
          height={ROOM_H}
          fill="#FAF7F0"
          stroke="var(--color-ink)"
          strokeWidth="3.2"
          strokeLinejoin="miter"
          {...wall}
        />

        {/* Soft ornamental rings in the centre of the floor */}
        <g transform={`translate(${x(ROOM_W / 2)} ${y(ROOM_H / 2)})`} fill="none" stroke="var(--color-brass)" opacity="0.5">
          <circle r="120" strokeWidth="1" strokeDasharray="4 5" />
          <circle r="84" strokeWidth="1" />
          <rect x="-60" y="-60" width="120" height="120" strokeWidth="1" transform="rotate(45)" />
        </g>

        {/* Window on the top wall */}
        <line x1={x(190)} y1={y(0)} x2={x(330)} y2={y(0)} stroke="#FAF7F0" strokeWidth="5" />
        <line x1={x(190)} y1={y(0)} x2={x(330)} y2={y(0)} stroke="var(--color-maroon)" strokeWidth="2.4" />

        {/* Door on the bottom wall with its swing */}
        <line x1={doorX} y1={doorY} x2={doorX + doorW} y2={doorY} stroke="#FAF7F0" strokeWidth="5" />
        <path
          d={`M ${doorX} ${doorY} A ${doorW} ${doorW} 0 0 1 ${doorX + doorW} ${doorY - doorW}`}
          fill="none"
          stroke="var(--color-ink-muted)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />
        <line x1={doorX} y1={doorY} x2={doorX} y2={doorY - doorW} stroke="var(--color-ink)" strokeWidth="2" />

        {/* Rug */}
        <rect x={x(220)} y={y(215)} width="135" height="150" rx="3" fill="rgba(139, 38, 53, 0.07)" stroke="var(--color-maroon)" strokeWidth="1.4" strokeDasharray="5 3" />

        {/* Bed and nightstand */}
        <g stroke="var(--color-ink)" strokeWidth="1.5">
          <rect x={x(45)} y={y(40)} width="160" height="200" rx="3" fill="#F0EDE6" />
          <rect x={x(55)} y={y(50)} width="60" height="35" rx="3" fill="#F8F5EE" stroke="var(--color-ink-muted)" strokeWidth="1" />
          <rect x={x(135)} y={y(50)} width="60" height="35" rx="3" fill="#F8F5EE" stroke="var(--color-ink-muted)" strokeWidth="1" />
          <rect x={x(215)} y={y(40)} width="45" height="45" fill="#F1EEE7" />
          {/* Desk and chair */}
          <rect x={x(365)} y={y(175)} width="140" height="70" rx="3" fill="#F1EEE7" />
          <circle cx={x(442)} cy={y(272)} r="18" fill="none" />
        </g>
      </svg>
    </div>
  );
}
