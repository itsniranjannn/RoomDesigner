/** 2D plan symbols: tabletop and soft-goods pieces (cushion, vase, laptop, frame...). Centered at (0, 0). */
import { HAIR, P } from './parts.jsx';

const EDGE = 'rgba(40, 34, 28, 0.55)';

/** Scatter cushion or bed pillow seen from above: piped edge, centre button, crease. */
export function CushionSilhouette({ widthCm, depthCm, hw, hd, color }) {
  const round = Math.min(hw, hd) * 0.28;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={round}
        fill={color}
        stroke={EDGE}
        strokeWidth="0.9"
      />
      <rect
        x={-hw + 2.5}
        y={-hd + 2.5}
        width={P(widthCm - 5)}
        height={P(depthCm - 5)}
        rx={round * 0.7}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      <circle cx={0} cy={0} r={1.6} fill="rgba(0,0,0,0.35)" />
      <line x1={-hw * 0.5} y1={0} x2={hw * 0.5} y2={0} stroke={HAIR} strokeWidth="0.5" />
    </g>
  );
}

/** Vase with a few stems: round lip, dark opening and flower heads. */
export function VaseSilhouette({ hw, hd, color, subColor }) {
  const r = Math.min(hw, hd);
  const heads = [
    [-0.2, -0.15],
    [0.22, -0.05],
    [0, 0.24],
  ];
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke={EDGE} strokeWidth="0.9" />
      <circle cx={0} cy={0} r={r * 0.7} fill="#2A2622" stroke="none" />
      {heads.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x * r * 2} cy={y * r * 2} r={r * 0.3} fill="#4F7A47" stroke="none" />
          <circle cx={x * r * 2} cy={y * r * 2} r={r * 0.14} fill={subColor || '#E7B94B'} />
        </g>
      ))}
    </g>
  );
}

/** Open laptop from above: keyboard deck, trackpad and the lid's back edge. */
export function LaptopSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1.5}
        fill={color}
        stroke="#6A7075"
        strokeWidth="0.9"
      />
      <rect x={-hw} y={-hd} width={widthCm} height={2.4} rx={1} fill="#5C6166" stroke="none" />
      <rect
        x={-hw + widthCm * 0.07}
        y={-hd + depthCm * 0.14}
        width={P(widthCm * 0.86)}
        height={P(depthCm * 0.42)}
        rx={1}
        fill="#2B2E31"
        stroke="none"
      />
      <rect
        x={-widthCm * 0.14}
        y={-hd + depthCm * 0.64}
        width={P(widthCm * 0.28)}
        height={P(depthCm * 0.22)}
        rx={1}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
    </g>
  );
}

/** Photo frame seen from above: a thin bar with the print edge showing. */
export function PhotoFrameSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1}
        fill={color}
        stroke={EDGE}
        strokeWidth="0.9"
      />
      <rect
        x={-hw + 1.5}
        y={-hd + 1.2}
        width={P(widthCm - 3)}
        height={P(depthCm * 0.4)}
        fill={subColor || '#E9E2D4'}
        stroke="none"
      />
    </g>
  );
}

/** Shelf speaker: cabinet with a large woofer and a small tweeter. */
export function SpeakerSilhouette({ widthCm, depthCm, hw, hd, color }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#0B0C0D"
        strokeWidth="1"
      />
      <circle
        cx={0}
        cy={hd * 0.18}
        r={r * 0.52}
        fill="#17191B"
        stroke="#52575C"
        strokeWidth="0.8"
      />
      <circle cx={0} cy={hd * 0.18} r={r * 0.2} fill="#2B2D30" stroke="none" />
      <circle
        cx={0}
        cy={-hd * 0.52}
        r={r * 0.16}
        fill="#17191B"
        stroke="#52575C"
        strokeWidth="0.6"
      />
    </g>
  );
}

/** Electric kettle from above: round lid, handle at the back and a spout at the front. */
export function KettleSilhouette({ hw, hd, color }) {
  const r = Math.min(hw, hd) * 0.72;
  return (
    <g>
      <rect
        x={-r * 0.22}
        y={r * 0.8}
        width={r * 0.44}
        height={P(hd - r * 0.8)}
        rx={1}
        fill={color}
        stroke="#4A4640"
        strokeWidth="0.7"
      />
      <rect
        x={-r * 0.28}
        y={-hd + 1}
        width={r * 0.56}
        height={P(hd - r * 0.5)}
        rx={r * 0.2}
        fill="none"
        stroke="#1B1D20"
        strokeWidth={r * 0.28}
        opacity="0.9"
      />
      <circle cx={0} cy={0} r={r} fill={color} stroke="#4A4640" strokeWidth="0.9" />
      <circle cx={0} cy={0} r={r * 0.62} fill="none" stroke={HAIR} strokeWidth="0.6" />
      <circle cx={0} cy={0} r={r * 0.16} fill="#1B1D20" stroke="none" />
    </g>
  );
}

/** Fruit bowl from above: wide rim, a ring inside and a few pieces of fruit. */
export function BowlSilhouette({ hw, hd, color }) {
  const r = Math.min(hw, hd);
  const fruit = [
    [-0.28, -0.12, '#C0392B'],
    [0.26, -0.2, '#E6A93B'],
    [0.04, 0.3, '#7BA34A'],
    [-0.06, -0.02, '#D9732B'],
  ];
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke={EDGE} strokeWidth="0.9" />
      <circle cx={0} cy={0} r={r * 0.8} fill="none" stroke={HAIR} strokeWidth="0.6" />
      {fruit.map(([x, y, c], i) => (
        <circle
          key={i}
          cx={x * r * 1.6}
          cy={y * r * 1.6}
          r={r * 0.24}
          fill={c}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        />
      ))}
    </g>
  );
}

/** Folded towels or a folded throw: layered rectangle with a coloured band. */
export function FoldedSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke={EDGE}
        strokeWidth="0.9"
      />
      <rect
        x={-hw}
        y={-depthCm * 0.12}
        width={widthCm}
        height={P(depthCm * 0.24)}
        fill={subColor || color}
        opacity="0.85"
        stroke="none"
      />
      <line
        x1={-hw + widthCm * 0.33}
        y1={-hd}
        x2={-hw + widthCm * 0.33}
        y2={hd}
        stroke={HAIR}
        strokeWidth="0.5"
      />
      <line
        x1={-hw}
        y1={-hd + depthCm * 0.2}
        x2={hw}
        y2={-hd + depthCm * 0.2}
        stroke={HAIR}
        strokeWidth="0.5"
      />
    </g>
  );
}
