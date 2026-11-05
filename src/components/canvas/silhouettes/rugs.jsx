/** 2D plan symbols: rugs. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { PatternPlan } from './PatternPlan.jsx';
import { usesPatternModel } from '../../preview3d/patterns.js';
export function RugSilhouette({ item, widthCm, depthCm, hw, hd, color, accentColor, subColor }) {
  if (usesPatternModel(item))
    return <PatternPlan item={item} widthCm={widthCm} depthCm={depthCm} />;
  const b1 = Math.min(18, widthCm * 0.08);
  const b2 = Math.min(28, widthCm * 0.12);
  const medallionR = Math.min(widthCm, depthCm) * 0.22;
  return (
    <g>
      {/* Main Outer Wool Field (Deep Crimson) */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color || '#8B1E1E'}
        stroke="#521010"
        strokeWidth="1.2"
      />

      {/* Traditional Outer Border (Navy Indigo) */}
      <rect
        x={-hw + b1}
        y={-hd + b1}
        width={widthCm - b1 * 2}
        height={depthCm - b1 * 2}
        rx={2}
        fill={accentColor || '#1B2A4A'}
        stroke={subColor || '#D4A359'}
        strokeWidth="1"
      />

      {/* Inner Field (Deep Wine Red) */}
      <rect
        x={-hw + b2}
        y={-hd + b2}
        width={widthCm - b2 * 2}
        height={depthCm - b2 * 2}
        rx={1}
        fill={color || '#8B1E1E'}
        stroke={subColor || '#D4A359'}
        strokeWidth="0.8"
        strokeDasharray="4 2"
      />

      {/* 4 Corner Geometric Floral Lotus Motifs */}
      {[
        [-hw + b2 + 12, -hd + b2 + 12],
        [hw - b2 - 12, -hd + b2 + 12],
        [-hw + b2 + 12, hd - b2 - 12],
        [hw - b2 - 12, hd - b2 - 12],
      ].map(([cx, cy], idx) => (
        <g key={idx}>
          <rect
            x={cx - 7}
            y={cy - 7}
            width={14}
            height={14}
            transform={`rotate(45 ${cx} ${cy})`}
            fill={subColor || '#D4A359'}
            stroke="#1B2A4A"
            strokeWidth="0.75"
          />
          <circle cx={cx} cy={cy} r={2.5} fill="#FAF6EE" />
        </g>
      ))}

      {/* Central Nepali Mandala / Medallion (Center Sun & Lotus) */}
      <circle
        cx={0}
        cy={0}
        r={medallionR}
        fill={accentColor || '#1B2A4A'}
        stroke={subColor || '#D4A359'}
        strokeWidth="1.5"
      />
      <circle
        cx={0}
        cy={0}
        r={medallionR * 0.72}
        fill="none"
        stroke={subColor || '#D4A359'}
        strokeWidth="0.8"
        strokeDasharray="3 2"
      />
      {/* Diamond in Center */}
      <rect
        x={-medallionR * 0.42}
        y={-medallionR * 0.42}
        width={medallionR * 0.84}
        height={medallionR * 0.84}
        transform="rotate(45 0 0)"
        fill={subColor || '#D4A359'}
      />
      <circle cx={0} cy={0} r={medallionR * 0.2} fill={color || '#8B1E1E'} />

      {/* Top & Bottom Hand-knotted Fringes */}
      {[-hd, hd].map((fy, i) => (
        <line
          key={i}
          x1={-hw + 4}
          y1={fy}
          x2={hw - 4}
          y2={fy}
          stroke="#FAF6EE"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
      ))}
    </g>
  );
}

export function RugRunnerSilhouette({ item, widthCm, depthCm, hw, hd, color, subColor }) {
  if (usesPatternModel(item))
    return <PatternPlan item={item} widthCm={widthCm} depthCm={depthCm} />;
  const b1 = Math.min(10, widthCm * 0.12);
  return (
    <g>
      {/* Indigo Field */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color || '#1E2D42'}
        stroke="#101824"
        strokeWidth="1"
      />
      {/* Gold Inner Border */}
      <rect
        x={-hw + b1}
        y={-hd + b1}
        width={widthCm - b1 * 2}
        height={depthCm - b1 * 2}
        fill="none"
        stroke={subColor || '#C49746'}
        strokeWidth="1.2"
      />
      {/* Repeating Center Diamonds along runner */}
      {[-hd * 0.6, -hd * 0.2, hd * 0.2, hd * 0.6].map((cy, i) => (
        <g key={i}>
          <rect
            x={-8}
            y={cy - 8}
            width={16}
            height={16}
            transform={`rotate(45 0 ${cy})`}
            fill={subColor || '#C49746'}
            stroke="#8A2020"
            strokeWidth="0.75"
          />
          <circle cx={0} cy={cy} r={2.5} fill="#FAF6EE" />
        </g>
      ))}
      {/* Top and Bottom Fringes */}
      {[-hd, hd].map((fy, i) => (
        <line
          key={i}
          x1={-hw + 2}
          y1={fy}
          x2={hw - 2}
          y2={fy}
          stroke="#FAF6EE"
          strokeWidth="1.8"
          strokeDasharray="2 2"
        />
      ))}
    </g>
  );
}

export function NepaliDhakaRugSilhouette({
  item,
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  accentColor,
  subColor,
}) {
  if (usesPatternModel(item))
    return <PatternPlan item={item} widthCm={widthCm} depthCm={depthCm} />;
  const cols = Math.max(4, Math.floor(widthCm / 28));
  const rows = Math.max(4, Math.floor(depthCm / 28));
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke={accentColor}
        strokeWidth="2"
      />
      {Array.from({ length: cols * rows }).map((_, i) => {
        const x = -hw + ((i % cols) + 0.5) * (widthCm / cols);
        const y = -hd + (Math.floor(i / cols) + 0.5) * (depthCm / rows);
        return (
          <path
            key={i}
            d={`M ${x - 6} ${y} L ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} Z`}
            fill={i % 2 ? subColor : accentColor}
            opacity="0.9"
          />
        );
      })}
      <rect
        x={-hw + 5}
        y={-hd + 5}
        width={widthCm - 10}
        height={depthCm - 10}
        fill="none"
        stroke={subColor}
        strokeWidth="2"
      />
    </g>
  );
}
