import React from 'react';
import { SERVICE_KINDS } from '../../engine/planning.js';

/**
 * Plan symbols for service points, drawn in centimetres in a local frame:
 *   - wall points: the wall is the line y = 0 and +y points into the room,
 *   - floor and ceiling points are centred on (0, 0).
 * The same drawing is used on the editor plan, in the palette and on the exported sheet.
 */

const COLORS = {
  electrical: '#8A5A00',
  water: '#1F6FA8',
  drain: '#3C5A6B',
  gas: '#B8461B',
  radiator: '#A33A3A',
  ac: '#25707A',
};

const TINTS = {
  electrical: '#FBEFD2',
  water: '#D7E9F6',
  drain: '#DCE5EA',
  gas: '#F8DDD0',
  radiator: '#F3D9D9',
  ac: '#D5ECEE',
};

export function serviceTone(kind) {
  const group = SERVICE_KINDS[kind]?.group;
  const key = group === 'electrical' ? 'electrical' : kind === 'water' ? 'water' : kind;
  return { ink: COLORS[key] || '#333', tint: TINTS[key] || '#EEE' };
}

/** The drawing for one kind, without any placement transform. */
export function ServiceGlyph({ kind, ink: inkOverride, tint: tintOverride, strokeScale = 1 }) {
  const tone = serviceTone(kind);
  const ink = inkOverride || tone.ink;
  const tint = tintOverride || tone.tint;
  const sw = 1.5 * strokeScale;
  const line = {
    stroke: ink,
    strokeWidth: sw,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };
  const wallLine = (half) => (
    <line x1={-half} y1="0" x2={half} y2="0" stroke={ink} strokeWidth={sw * 1.6} strokeLinecap="round" />
  );

  switch (kind) {
    case 'socket':
      return (
        <g>
          <path d="M -8 0 a 8 8 0 0 0 16 0 z" fill={tint} {...line} />
          <line x1="-3" y1="2" x2="-3" y2="5.2" {...line} />
          <line x1="3" y1="2" x2="3" y2="5.2" {...line} />
          {wallLine(10)}
        </g>
      );
    case 'switch':
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2="3" {...line} />
          <circle cx="0" cy="5" r="3.2" fill={ink} stroke={ink} strokeWidth={sw * 0.5} />
          <line x1="1.5" y1="7.5" x2="7" y2="12.5" {...line} />
          <line x1="4.8" y1="12.2" x2="9" y2="9.2" {...line} />
          {wallLine(8)}
        </g>
      );
    case 'light':
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2="3" {...line} />
          <circle cx="0" cy="9" r="6" fill={tint} {...line} />
          <line x1="-4.2" y1="4.8" x2="4.2" y2="13.2" {...line} />
          <line x1="4.2" y1="4.8" x2="-4.2" y2="13.2" {...line} />
          {wallLine(9)}
        </g>
      );
    case 'ceiling':
      return (
        <g>
          <circle cx="0" cy="0" r="11" fill={tint} fillOpacity="0.7" {...line} strokeDasharray="4 2.5" />
          <line x1="-7" y1="-7" x2="7" y2="7" {...line} />
          <line x1="7" y1="-7" x2="-7" y2="7" {...line} />
          <circle cx="0" cy="0" r="2" fill={ink} stroke="none" />
        </g>
      );
    case 'data':
      return (
        <g>
          <rect x="-10" y="1" width="20" height="12" rx="2" fill={tint} {...line} />
          <text
            x="0"
            y="9.9"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fontFamily="var(--font-sans, sans-serif)"
            fill={ink}
            stroke="none"
          >
            TV
          </text>
          {wallLine(12)}
        </g>
      );
    case 'water':
      return (
        <g>
          <path
            d="M 0 2.5 C 4.5 7.5 6 9.5 6 11 A 6 6 0 0 1 -6 11 C -6 9.5 -4.5 7.5 0 2.5 Z"
            fill={ink}
            fillOpacity="0.85"
            {...line}
          />
          <path d="M -2.6 11.6 a 2.8 2.8 0 0 0 2.2 2" stroke="#fff" strokeWidth={sw * 0.8} fill="none" strokeLinecap="round" />
          {wallLine(9)}
        </g>
      );
    case 'drain':
      return (
        <g>
          <rect x="-9" y="-9" width="18" height="18" rx="2" fill={tint} {...line} />
          <line x1="-5" y1="-4" x2="5" y2="-4" {...line} />
          <line x1="-5" y1="0" x2="5" y2="0" {...line} />
          <line x1="-5" y1="4" x2="5" y2="4" {...line} />
        </g>
      );
    case 'gas':
      return (
        <g>
          <polygon points="0,0.5 8,8.5 0,16.5 -8,8.5" fill={tint} {...line} />
          <text
            x="0"
            y="11.7"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="700"
            fontFamily="var(--font-sans, sans-serif)"
            fill={ink}
            stroke="none"
          >
            G
          </text>
          {wallLine(9)}
        </g>
      );
    case 'radiator': {
      const fins = [];
      for (let x = -31; x <= 31; x += 6.2) {
        fins.push(<line key={x} x1={x} y1="1.5" x2={x} y2="8.5" {...line} strokeWidth={sw * 0.8} />);
      }
      return (
        <g>
          <rect x="-35" y="0" width="70" height="10" rx="2" fill={tint} {...line} />
          {fins}
        </g>
      );
    }
    case 'ac':
      return (
        <g>
          <rect x="-40" y="0" width="80" height="15" rx="4" fill={tint} {...line} />
          <line x1="-34" y1="11" x2="34" y2="11" {...line} strokeWidth={sw * 0.8} />
          <text
            x="0"
            y="8.6"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="700"
            fontFamily="var(--font-sans, sans-serif)"
            fill={ink}
            stroke="none"
          >
            AC
          </text>
          <path d="M -18 18 l 0 3 M 0 18 l 0 4 M 18 18 l 0 3" {...line} strokeWidth={sw * 0.8} />
        </g>
      );
    default:
      return <circle r="6" fill={tint} {...line} />;
  }
}

/** Bounds of a glyph in its local frame, for hit areas, selection rings and palette previews. */
export function glyphBox(kind) {
  const def = SERVICE_KINDS[kind];
  if (!def) return { x: -8, y: -8, w: 16, h: 16 };
  const { w, d } = def.size;
  if (def.mount === 'wall') return { x: -w / 2 - 2, y: -2, w: w + 4, h: d + 10 };
  return { x: -w / 2 - 2, y: -d / 2 - 2, w: w + 4, h: d + 4 };
}

/** A service point placed on the plan at x, y with its rotation. */
export function PlacedService({ kind, x, y, rotationDeg = 0, ...glyphProps }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotationDeg})`}>
      <ServiceGlyph kind={kind} {...glyphProps} />
    </g>
  );
}

/** Small standalone icon of a kind, for palettes and keys. `size` is in pixels. */
export function ServiceIcon({ kind, size = 28 }) {
  const box = glyphBox(kind);
  const pad = 3;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  const scale = Math.max(w, h);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${box.x - pad - (scale - w) / 2} ${box.y - pad - (scale - h) / 2} ${scale} ${scale}`}
      aria-hidden="true"
      focusable="false"
    >
      <ServiceGlyph kind={kind} strokeScale={Math.max(1, scale / 34)} />
    </svg>
  );
}
