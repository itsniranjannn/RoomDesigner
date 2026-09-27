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
export function GridOverlay({ roomWidthCm, roomDepthCm, viewBoxMinX = -45, viewBoxMinY = -45, viewBoxWidth, viewBoxHeight }) {
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
  const plateW = (viewBoxWidth || (roomWidthCm + 90)) - 20;
  const plateH = (viewBoxHeight || (roomDepthCm + 90)) - 20;

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

      {/* Sheet Corner Framing Registration Marks */}
      <g stroke="#9C8E7D" strokeWidth="1" opacity="0.65">
        {/* Top-Left */}
        <path d={`M ${plateX + 8} ${plateY + 22} L ${plateX + 8} ${plateY + 8} L ${plateX + 22} ${plateY + 8}`} fill="none" />
        {/* Top-Right */}
        <path d={`M ${plateX + plateW - 22} ${plateY + 8} L ${plateX + plateW - 8} ${plateY + 8} L ${plateX + plateW - 8} ${plateY + 22}`} fill="none" />
        {/* Bottom-Left */}
        <path d={`M ${plateX + 8} ${plateY + plateH - 22} L ${plateX + 8} ${plateY + plateH - 8} L ${plateX + 22} ${plateY + plateH - 8}`} fill="none" />
        {/* Bottom-Right */}
        <path d={`M ${plateX + plateW - 22} ${plateY + plateH - 8} L ${plateX + plateW - 8} ${plateY + plateH - 8} L ${plateX + plateW - 8} ${plateY + plateH - 22}`} fill="none" />
      </g>

      {/* Plate Alignment Crosshairs */}
      <g stroke="#C4B9A8" strokeWidth="0.8" opacity="0.75">
        {/* Top edge center crosshair */}
        <line x1={roomWidthCm / 2} y1={plateY + 4} x2={roomWidthCm / 2} y2={plateY + 16} />
        {/* Bottom edge center crosshair */}
        <line x1={roomWidthCm / 2} y1={plateY + plateH - 16} x2={roomWidthCm / 2} y2={plateY + plateH - 4} />
        {/* Left edge center crosshair */}
        <line x1={plateX + 4} y1={roomDepthCm / 2} x2={plateX + 16} y2={roomDepthCm / 2} />
        {/* Right edge center crosshair */}
        <line x1={plateX + plateW - 16} y1={roomDepthCm / 2} x2={plateX + plateW - 4} y2={roomDepthCm / 2} />
      </g>

      {/* Plate Titleblock Classification Header (Top Right of drawing board) */}
      <text
        x={plateX + plateW - 14}
        y={plateY + 18}
        fill="#7A7062"
        fontSize="7.5"
        fontFamily="var(--font-mono)"
        fontWeight="600"
        letterSpacing="0.12em"
        textAnchor="end"
      >
        FOLIO // TOP-DOWN ORTHOGRAPHIC 2D
      </text>

      {/* Plate Scale Tag (Bottom Right of drawing board) */}
      <text
        x={plateX + plateW - 14}
        y={plateY + plateH - 12}
        fill="#A67C43"
        fontSize="7.5"
        fontFamily="var(--font-mono)"
        fontWeight="600"
        letterSpacing="0.1em"
        textAnchor="end"
      >
        SCALE 1:50 // CALIBRATED CM
      </text>

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
