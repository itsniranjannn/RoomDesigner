import React from 'react';

/**
 * GridOverlay.jsx
 * Renders an architectural drafting measurement grid.
 * Minor lines every 10cm, major lines every 50cm, with subtle cm dimension labels.
 */
export function GridOverlay({ roomWidthCm, roomDepthCm }) {
  const minorStep = 10;
  const majorStep = 50;

  // Generate minor grid pattern
  const minorVLines = [];
  for (let x = minorStep; x < roomWidthCm; x += minorStep) {
    if (x % majorStep !== 0) {
      minorVLines.push(x);
    }
  }

  const minorHLines = [];
  for (let y = minorStep; y < roomDepthCm; y += minorStep) {
    if (y % majorStep !== 0) {
      minorHLines.push(y);
    }
  }

  // Generate major grid lines
  const majorVLines = [];
  for (let x = majorStep; x < roomWidthCm; x += majorStep) {
    majorVLines.push(x);
  }

  const majorHLines = [];
  for (let y = majorStep; y < roomDepthCm; y += majorStep) {
    majorHLines.push(y);
  }

  return (
    <g className="grid-overlay" pointerEvents="none">
      {/* Minor grid lines (faint taupe) */}
      {minorVLines.map((x) => (
        <line
          key={`m-v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={roomDepthCm}
          stroke="var(--color-taupe-light)"
          strokeWidth="0.4"
          opacity="0.3"
        />
      ))}

      {minorHLines.map((y) => (
        <line
          key={`m-h-${y}`}
          x1={0}
          y1={y}
          x2={roomWidthCm}
          y2={y}
          stroke="var(--color-taupe-light)"
          strokeWidth="0.4"
          opacity="0.3"
        />
      ))}

      {/* Major grid lines (subtle dashed taupe) */}
      {majorVLines.map((x) => (
        <line
          key={`maj-v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={roomDepthCm}
          stroke="var(--color-taupe)"
          strokeWidth="0.5"
          strokeDasharray="3 3"
          opacity="0.5"
        />
      ))}

      {majorHLines.map((y) => (
        <line
          key={`maj-h-${y}`}
          x1={0}
          y1={y}
          x2={roomWidthCm}
          y2={y}
          stroke="var(--color-taupe)"
          strokeWidth="0.5"
          strokeDasharray="3 3"
          opacity="0.5"
        />
      ))}

      {/* Subdued dimension tick labels along major intervals */}
      {majorVLines.map((x) => (
        <text
          key={`lbl-v-${x}`}
          x={x + 2}
          y={12}
          fill="var(--color-ink-muted)"
          fontSize="8"
          fontFamily="var(--font-sans)"
          opacity="0.6"
        >
          {x / 100}m
        </text>
      ))}

      {majorHLines.map((y) => (
        <text
          key={`lbl-h-${y}`}
          x={4}
          y={y - 2}
          fill="var(--color-ink-muted)"
          fontSize="8"
          fontFamily="var(--font-sans)"
          opacity="0.6"
        >
          {y / 100}m
        </text>
      ))}
    </g>
  );
}
