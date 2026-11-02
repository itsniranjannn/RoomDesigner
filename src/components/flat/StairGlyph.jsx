import React from 'react';
import { stairGeometry, stairFootprint, TREAD_CM } from '../../engine/flat.js';

function Flight({ flight }) {
  const { x, y, widthCm: w, lengthCm: len, dir, treads } = flight;
  const vertical = dir === 'up' || dir === 'down';
  const lines = [];
  for (let i = 1; i < treads; i++) {
    lines.push(vertical
      ? <line key={i} x1={x} y1={y + i * TREAD_CM} x2={x + w} y2={y + i * TREAD_CM} stroke="#5C544E" strokeWidth="1" />
      : <line key={i} x1={x + i * TREAD_CM} y1={y} x2={x + i * TREAD_CM} y2={y + w} stroke="#5C544E" strokeWidth="1" />);
  }
  // Arrow shows the climbing direction
  let a = [0, 0];
  let b = [0, 0];
  if (dir === 'up') { a = [x + w / 2, y + len - 8]; b = [x + w / 2, y + 8]; }
  if (dir === 'down') { a = [x + w / 2, y + 8]; b = [x + w / 2, y + len - 8]; }
  if (dir === 'right') { a = [x + 8, y + w / 2]; b = [x + len - 8, y + w / 2]; }
  return (
    <g>
      <rect
        x={x}
        y={vertical ? y : y}
        width={vertical ? w : len}
        height={vertical ? len : w}
        fill="#F6F2EA"
        stroke="#1A1615"
        strokeWidth="1.5"
      />
      {lines}
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#8B2635" strokeWidth="2" markerEnd="url(#stair-arrow)" />
    </g>
  );
}

/** Plan symbol for a staircase: treads, landing and an arrow that points up. */
export function StairGlyph({ stair, selected = false, ghost = false }) {
  const g = stairGeometry(stair);
  const fp = stairFootprint(stair);
  const cx = stair.x + fp.widthCm / 2;
  const cy = stair.y + fp.depthCm / 2;

  if (ghost) {
    // Opening in the floor above the staircase
    return (
      <g pointerEvents="none" aria-hidden="true">
        <rect
          x={stair.x}
          y={stair.y}
          width={fp.widthCm}
          height={fp.depthCm}
          fill="rgba(34,72,94,0.08)"
          stroke="#22485E"
          strokeDasharray="8 5"
          strokeWidth="2"
        />
        <text x={cx} y={cy} textAnchor="middle" fontSize="18" fill="#22485E" fontFamily="var(--font-mono, monospace)">
          STAIR OPENING
        </text>
      </g>
    );
  }

  return (
    <g>
      <g transform={`translate(${cx} ${cy}) rotate(${stair.rotationDeg || 0}) translate(${-g.localWidthCm / 2} ${-g.localDepthCm / 2})`}>
        {g.flights.map((f, i) => <Flight key={i} flight={f} />)}
        {g.landing && (
          <rect
            x={g.landing.x}
            y={g.landing.y}
            width={g.landing.widthCm}
            height={g.landing.depthCm}
            fill="#EDE6D9"
            stroke="#1A1615"
            strokeWidth="1.5"
          />
        )}
      </g>
      <rect
        x={stair.x}
        y={stair.y}
        width={fp.widthCm}
        height={fp.depthCm}
        fill="none"
        stroke={selected ? '#22485E' : 'transparent'}
        strokeWidth="4"
        strokeDasharray={selected ? '10 6' : undefined}
      />
      <text
        x={cx}
        y={stair.y - 8}
        textAnchor="middle"
        fontSize="16"
        fill="#1A1615"
        fontFamily="var(--font-mono, monospace)"
        pointerEvents="none"
      >
        UP · {g.steps} steps
      </text>
    </g>
  );
}

export function StairDefs() {
  return (
    <defs>
      <marker id="stair-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#8B2635" />
      </marker>
    </defs>
  );
}
