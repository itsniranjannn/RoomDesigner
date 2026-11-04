/** 2D plan symbols: planters, round rugs and screens. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { HAIR, METAL } from './parts.jsx';

export function PlanterSilhouette({ hw, hd, color, subColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      {/* Saucer, pot rim and band, soil with mulch stones */}
      <circle cx={0} cy={0} r={r} fill="none" stroke={HAIR} strokeWidth="0.8" />
      <circle cx={0} cy={0} r={r * 0.92} fill={subColor} stroke="#8A7F70" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.82} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <circle cx={0} cy={0} r={r * 0.74} fill="#4E3B2B" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle
          key={i}
          cx={Math.cos(i * 2.1) * r * 0.5}
          cy={Math.sin(i * 2.1) * r * 0.5}
          r={1.4}
          fill={i % 2 ? '#B8AFA2' : '#8E877C'}
        />
      ))}
      {/* Leaves of different sizes fanning from the centre, with midribs */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = i * 30 + (i % 2) * 8;
        const len = r * (0.52 + (0.28 * ((i * 5) % 3)) / 2);
        return (
          <g key={i} transform={`rotate(${angle})`}>
            <ellipse
              cx={0}
              cy={-len * 0.55}
              rx={r * 0.13}
              ry={len * 0.5}
              fill={color}
              stroke="#2B3D33"
              strokeWidth="0.6"
              opacity="0.95"
            />
            <line
              x1={0}
              y1={-len * 0.1}
              x2={0}
              y2={-len * 1.0}
              stroke="#2B3D33"
              strokeWidth="0.4"
            />
          </g>
        );
      })}
      <circle cx={0} cy={0} r={r * 0.1} fill="#4A3A28" />
    </g>
  );
}

export function RugRoundSilhouette({ hw, hd, color, subColor, accentColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <circle cx={0} cy={0} r={r * 0.92} fill="none" stroke={subColor} strokeWidth="2" />
      <circle cx={0} cy={0} r={r * 0.72} fill="none" stroke={accentColor} strokeWidth="3" />
      <circle
        cx={0}
        cy={0}
        r={r * 0.5}
        fill="none"
        stroke={subColor}
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      {/* Petal motif ring, central medallion and binding edge */}
      {Array.from({ length: 16 }).map((_, i) => (
        <rect
          key={i}
          x={r * 0.74}
          y={-1.4}
          width={r * 0.12}
          height={2.8}
          fill={i % 2 ? subColor : accentColor}
          transform={`rotate(${i * 22.5})`}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.26} fill={accentColor} />
      <circle cx={0} cy={0} r={r * 0.14} fill={subColor} />
      <circle cx={0} cy={0} r={r * 0.97} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" />
    </g>
  );
}

export function ScreenSilhouette({ widthCm, hw, hd, color, accentColor }) {
  const panels = Math.min(6, Math.max(3, Math.round(widthCm / 50)));
  const step = widthCm / panels;
  const pts = Array.from({ length: panels + 1 }).map(
    (_, idx) => `${-hw + idx * step},${idx % 2 === 0 ? -hd : hd}`
  );
  return (
    <g>
      {/* Folding panels drawn as a zigzag */}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="#2B2117"
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={accentColor}
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      {/* Hinge barrels at each fold, feet beneath each panel */}
      {Array.from({ length: panels + 1 }).map((_, idx) => (
        <circle
          key={idx}
          cx={-hw + idx * step}
          cy={idx % 2 === 0 ? -hd : hd}
          r={2.2}
          fill={METAL}
          stroke="#2B2117"
          strokeWidth="0.6"
        />
      ))}
      {Array.from({ length: panels }).map((_, idx) => (
        <circle
          key={idx}
          cx={-hw + (idx + 0.5) * step}
          cy={0}
          r={1.4}
          fill="none"
          stroke={HAIR}
          strokeWidth="0.5"
          strokeDasharray="1.5 1.5"
        />
      ))}
    </g>
  );
}
