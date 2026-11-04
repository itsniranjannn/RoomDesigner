import React from 'react';
import { stairGeometry, stairFootprint, TREAD_CM } from '../../engine/flat.js';
import styles from './FlatPlan.module.css';

function Flight({ flight }) {
  const { x, y, widthCm: w, lengthCm: len, dir, treads } = flight;
  const vertical = dir === 'up' || dir === 'down';
  const lines = [];
  for (let i = 1; i < treads; i++) {
    lines.push(
      vertical ? (
        <line
          key={i}
          x1={x}
          y1={y + i * TREAD_CM}
          x2={x + w}
          y2={y + i * TREAD_CM}
          className={styles.stairTread}
        />
      ) : (
        <line
          key={i}
          x1={x + i * TREAD_CM}
          y1={y}
          x2={x + i * TREAD_CM}
          y2={y + w}
          className={styles.stairTread}
        />
      )
    );
  }
  // Arrow shows the climbing direction
  let a = [0, 0];
  let b = [0, 0];
  if (dir === 'up') {
    a = [x + w / 2, y + len - 8];
    b = [x + w / 2, y + 8];
  }
  if (dir === 'down') {
    a = [x + w / 2, y + 8];
    b = [x + w / 2, y + len - 8];
  }
  if (dir === 'right') {
    a = [x + 8, y + w / 2];
    b = [x + len - 8, y + w / 2];
  }
  if (dir === 'left') {
    a = [x + len - 8, y + w / 2];
    b = [x + 8, y + w / 2];
  }
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={vertical ? w : len}
        height={vertical ? len : w}
        className={styles.stairFlight}
      />
      {lines}
      <line
        x1={a[0]}
        y1={a[1]}
        x2={b[0]}
        y2={b[1]}
        className={styles.stairArrow}
        markerEnd="url(#stair-arrow)"
      />
    </g>
  );
}

/** Plan symbol for a staircase: treads, landing and an arrow that points up. */
export function StairGlyph({
  stair,
  selected = false,
  ghost = false,
  preview = false,
  invalid = false,
}) {
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
          className={styles.stairOpening}
        />
      </g>
    );
  }

  return (
    <g
      opacity={preview ? 0.7 : 1}
      className={invalid ? styles.stairInvalid : undefined}
      pointerEvents={preview ? 'none' : undefined}
    >
      <g
        transform={`translate(${cx} ${cy}) rotate(${stair.rotationDeg || 0}) translate(${-g.localWidthCm / 2} ${-g.localDepthCm / 2})`}
      >
        {g.flights.map((f, i) => (
          <Flight key={i} flight={f} />
        ))}
        {g.landing && (
          <rect
            x={g.landing.x}
            y={g.landing.y}
            width={g.landing.widthCm}
            height={g.landing.depthCm}
            className={styles.stairLanding}
          />
        )}
      </g>
      {selected && (
        <rect
          x={stair.x}
          y={stair.y}
          width={fp.widthCm}
          height={fp.depthCm}
          className={styles.selectBox}
        />
      )}
    </g>
  );
}

export function StairDefs() {
  return (
    <defs>
      <marker id="stair-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" className={styles.stairArrowHead} />
      </marker>
    </defs>
  );
}
