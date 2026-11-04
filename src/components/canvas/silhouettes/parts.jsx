/** Shared 2D plan-symbol parts: taps, knobs, handles, door swings. Coordinates in cm, plan view (front is +y). */

/** Drafting line colours: outline, secondary detail, hairline. */
export const LINE = '#4A4640';
export const DETAIL = 'rgba(40, 34, 28, 0.55)';
export const HAIR = 'rgba(40, 34, 28, 0.32)';
export const METAL = '#C5CBD0';
export const METAL_DARK = '#8E959B';

/** Clamp a computed dimension at zero so tiny or heavily resized pieces never get negative sizes. */
export function P(v) {
  return Math.max(0, v);
}

/** Keep detail marks at a legible size however the piece is resized. */
export function detailScale(widthCm, depthCm, base = 45, lo = 0.8, hi = 1.5) {
  return Math.min(hi, Math.max(lo, Math.min(widthCm, depthCm) / base));
}

/** Mixer tap seen from above: base ring, spout reaching towards +y and a side lever. */
export function TapPlan({ x = 0, y = 0, s = 1, double = false }) {
  return (
    <g
      name="tap"
      transform={`translate(${x} ${y}) scale(${s})`}
      stroke={METAL_DARK}
      strokeWidth="0.6"
    >
      <circle r="3.4" fill="#F1F3F4" />
      <rect x="-1.1" y="0" width="2.2" height="8" rx="1.1" fill={METAL} />
      <circle cy="8" r="1.4" fill={METAL} />
      {double ? (
        <>
          <circle cx="-7" cy="0" r="2.2" fill={METAL} />
          <circle cx="7" cy="0" r="2.2" fill={METAL} />
        </>
      ) : (
        <rect
          x="2"
          y="-2.4"
          width="7"
          height="2.4"
          rx="1.2"
          fill={METAL}
          transform="rotate(-12 2 -1)"
        />
      )}
    </g>
  );
}

/** Rotary knob / burner control (small circle with a pointer). */
export function KnobPlan({ x, y, r = 2.4 }) {
  return (
    <g name="knob" stroke={LINE} strokeWidth="0.5">
      <circle cx={x} cy={y} r={r} fill="#D9DDE0" />
      <line x1={x} y1={y} x2={x} y2={y - r} />
    </g>
  );
}

/** Door swing arc: hinge at (x, y), door of length r opening towards +y or -y. */
export function SwingArc({ x, y, r, openDown = true, flip = false }) {
  const dy = openDown ? r : -r;
  const dx = flip ? -r : r;
  const sweep = openDown !== flip ? 0 : 1;
  return (
    <g stroke={HAIR} strokeWidth="0.6" fill="none" strokeDasharray="3 2">
      <line x1={x} y1={y} x2={x} y2={y + dy} />
      <path d={`M ${x} ${y + dy} A ${r} ${r} 0 0 ${sweep} ${x + dx} ${y}`} />
    </g>
  );
}

/** Drawer / door handle as a short bar in plan. */
export function BarHandle({ x, y, length = 8, horizontal = true, color = '#C4A869' }) {
  return horizontal ? (
    <rect
      name="handle"
      x={x - length / 2}
      y={y - 0.9}
      width={length}
      height="1.8"
      rx="0.9"
      fill={color}
      stroke={LINE}
      strokeWidth="0.4"
    />
  ) : (
    <rect
      name="handle"
      x={x - 0.9}
      y={y - length / 2}
      width="1.8"
      height={length}
      rx="0.9"
      fill={color}
      stroke={LINE}
      strokeWidth="0.4"
    />
  );
}

/** Drain symbol: ring with a cross. */
export function DrainPlan({ x, y, r = 3 }) {
  return (
    <g name="drain" stroke={METAL_DARK} strokeWidth="0.6">
      <circle cx={x} cy={y} r={r} fill="#E4E7EA" />
      <line x1={x - r * 0.7} y1={y} x2={x + r * 0.7} y2={y} />
      <line x1={x} y1={y - r * 0.7} x2={x} y2={y + r * 0.7} />
    </g>
  );
}
