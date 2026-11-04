import React from 'react';

/**
 * GridOverlay.jsx
 * Architectural Drafting Plate & Measurement Grid.
 * - Sheet corner framing registration marks (L-ticks)
 * - Center-alignment plate crosshairs
 * - 10cm minor grid (hairline) & 50cm major grid (dashed)
 * - Monospaced architectural coordinate notations
 * - Titleblock plate classification tag
 */
export function GridOverlay({
  roomWidthCm,
  roomDepthCm,
  viewBoxMinX = -45,
  viewBoxMinY = -45,
  viewBoxWidth,
  viewBoxHeight,
}) {
  const minorStep = 10;
  const majorStep = 50;

  // Generate minor grid pattern (10cm intervals, skipping 50cm majors)
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

  // Generate major grid lines (50cm intervals)
  const majorVLines = [];
  for (let x = majorStep; x < roomWidthCm; x += majorStep) {
    majorVLines.push(x);
  }

  const majorHLines = [];
  for (let y = majorStep; y < roomDepthCm; y += majorStep) {
    majorHLines.push(y);
  }

  // Plate framing dimensions
  const plateX = viewBoxMinX + 10;
  const plateY = viewBoxMinY + 10;
  const plateW = (viewBoxWidth || roomWidthCm + 90) - 20;
  const plateH = (viewBoxHeight || roomDepthCm + 90) - 20;

  return (
    <g className="grid-overlay" pointerEvents="none">
      {/* Background Drawing Plate with subtle Lokta Paper fill */}
      <rect
        x={plateX}
        y={plateY}
        width={plateW}
        height={plateH}
        fill="#FAF8F3"
        stroke="#E2DACD"
        strokeWidth="1"
        rx="2"
      />

      {/* Minor grid lines (10cm hairline, crisp taupe-linen) */}
      {minorVLines.map((x) => (
        <line
          key={`m-v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={roomDepthCm}
          stroke="#E2DACD"
          strokeWidth="0.4"
          opacity="0.4"
        />
      ))}

      {minorHLines.map((y) => (
        <line
          key={`m-h-${y}`}
          x1={0}
          y1={y}
          x2={roomWidthCm}
          y2={y}
          stroke="#E2DACD"
          strokeWidth="0.4"
          opacity="0.4"
        />
      ))}

      {/* Major grid lines (50cm architectural dashed lines) */}
      {majorVLines.map((x) => (
        <line
          key={`maj-v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={roomDepthCm}
          stroke="#C4B9A8"
          strokeWidth="0.55"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      ))}

      {majorHLines.map((y) => (
        <line
          key={`maj-h-${y}`}
          x1={0}
          y1={y}
          x2={roomWidthCm}
          y2={y}
          stroke="#C4B9A8"
          strokeWidth="0.55"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      ))}

      {/* Monospaced Dimension Coordinates along Top Margins */}
      {majorVLines.map((x) => (
        <text
          key={`lbl-v-${x}`}
          x={x}
          y={-10}
          fill="#7A7062"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fontWeight="500"
          textAnchor="middle"
          opacity="0.75"
        >
          {(x / 100).toFixed(1)}m
        </text>
      ))}

      {/* Monospaced Dimension Coordinates along Left Margins */}
      {majorHLines.map((y) => (
        <text
          key={`lbl-h-${y}`}
          x={-10}
          y={y + 3}
          fill="#7A7062"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fontWeight="500"
          textAnchor="end"
          opacity="0.75"
        >
          {(y / 100).toFixed(1)}m
        </text>
      ))}
    </g>
  );
}
