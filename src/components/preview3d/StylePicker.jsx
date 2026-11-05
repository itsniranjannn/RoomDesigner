import React from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Popover } from '../common/Popover.jsx';
import { Button } from '../common/Button.jsx';
import { STYLE_PRESETS } from '../../data/stylePresets.js';
import { getFloor, getWall } from './materials.js';
import styles from './StylePicker.module.css';

/** A small picture of a style: the walls and floor with a sofa, table, rug, curtain and an accent. */
export function StyleThumb({ style }) {
  const p = style.palette;
  const wall = getWall(style.wall)?.swatch || '#F2EDE4';
  const floor = getFloor(style.floor)?.swatch || '#E5DDCF';
  return (
    <svg className={styles.thumb} viewBox="0 0 72 48" aria-hidden="true" focusable="false">
      <rect width="72" height="48" fill={wall} />
      <rect y="30" width="72" height="18" fill={floor} />
      <rect y="29" width="72" height="1.6" fill="rgba(0,0,0,0.18)" />
      {/* curtain and window */}
      <rect
        x="6"
        y="6"
        width="14"
        height="19"
        fill="#DCEAF2"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.6"
      />
      <rect
        x="3.5"
        y="4.5"
        width="5"
        height="25"
        fill={p.curtain}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.5"
      />
      <rect
        x="17.5"
        y="4.5"
        width="5"
        height="25"
        fill={p.curtain}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.5"
      />
      {/* rug */}
      <rect x="22" y="35" width="34" height="9" rx="1" fill={p.rug.color} />
      <rect x="24" y="36.5" width="30" height="6" fill="none" stroke={p.rug.sub} strokeWidth="1" />
      <rect x="31" y="38" width="16" height="3" fill={p.rug.accent} opacity="0.85" />
      {/* sofa */}
      <rect x="28" y="22" width="30" height="10" rx="2.5" fill={p.seating} />
      <rect
        x="26"
        y="25"
        width="5"
        height="9"
        rx="2"
        fill={p.seating}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.5"
      />
      <rect
        x="55"
        y="25"
        width="5"
        height="9"
        rx="2"
        fill={p.seating}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.5"
      />
      <rect x="33" y="23.5" width="8" height="6" rx="2" fill={p.accent} />
      {/* side table and plant or lamp */}
      <rect x="62" y="28" width="7" height="6" fill={p.wood} />
      <circle cx="65.5" cy="24.5" r="3.4" fill={p.accent} />
    </svg>
  );
}

/**
 * The style cards: a radio group of small pictures with names. `current` is the style id in use (or null).
 */
export function StyleGrid({ current, onPick, disabled = false }) {
  return (
    <div className={styles.grid} role="radiogroup" aria-label="Room style">
      {STYLE_PRESETS.map((s) => {
        const on = current === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            className={`${styles.card} ${on ? styles.on : ''}`}
            onClick={() => onPick(s.id)}
            title={s.note}
          >
            <StyleThumb style={s} />
            <span className={styles.name}>{s.label}</span>
            <span className={styles.chips} aria-hidden="true">
              {[s.palette.seating, s.palette.wood, s.palette.accent, s.palette.rug.color].map(
                (c, i) => (
                  <span key={i} className={styles.chip} style={{ background: c }} />
                )
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Reset button and a line about the chosen style, then the cards. */
export function StylePanel({ current, hasStyle, onPick, onReset, scope, note }) {
  const style = STYLE_PRESETS.find((s) => s.id === current);
  return (
    <div className={styles.panel}>
      {scope}
      <div className={styles.head}>
        <p className={styles.note}>
          {style
            ? `${style.label}: ${style.note}.`
            : 'Sets the floor, walls and the colours of recolourable furniture. Lamps, glass, appliances and pictures keep theirs.'}
        </p>
        <Button
          variant="secondary"
          size="small"
          icon={<RotateCcw size={14} aria-hidden="true" />}
          onClick={onReset}
          disabled={!hasStyle}
          title={
            hasStyle
              ? 'Put the floor, walls and furniture colours back as they were'
              : 'No style applied'
          }
        >
          Reset to original
        </Button>
      </div>
      <StyleGrid current={current} onPick={onPick} />
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

/** The "Style" button of a 3D bar: opens the style cards in a popover. */
export function StyleButton({ buttonClassName = '', textClassName = '', size, ...panelProps }) {
  return (
    <Popover
      role="dialog"
      label="Room style"
      align="end"
      direction="up"
      renderTrigger={(props) => (
        <Button
          variant="secondary"
          icon={<Sparkles size={16} aria-hidden="true" />}
          aria-label="Style"
          title="Apply a style: floor, walls and furniture colours"
          className={buttonClassName}
          size={size}
          {...props}
        >
          <span className={textClassName}>Style</span>
        </Button>
      )}
    >
      <StylePanel {...panelProps} />
    </Popover>
  );
}
