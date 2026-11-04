/** 2D plan symbols: fixtures. Coordinates are centered at (0, 0), widthCm x depthCm. */
import {
  TapPlan,
  KnobPlan,
  DrainPlan,
  SwingArc,
  detailScale,
  LINE,
  HAIR,
  DETAIL,
  METAL,
  METAL_DARK,
} from './parts.jsx';

export function FixtureToiletSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const tankH = depthCm * 0.22;
  const bowlRy = depthCm * 0.34;
  const cy = hd - bowlRy - 1;
  return (
    <g stroke={LINE} strokeWidth="1.2">
      {/* Cistern with dual flush buttons */}
      <rect x={-hw} y={-hd} width={widthCm} height={tankH} rx={3} fill={color} />
      <g strokeWidth="0.6" stroke={METAL_DARK}>
        <rect
          x={-hw * 0.3}
          y={-hd + tankH * 0.3}
          width={hw * 0.34}
          height={tankH * 0.4}
          rx={1.2}
          fill="#F4F4F2"
        />
        <rect
          x={hw * 0.08}
          y={-hd + tankH * 0.3}
          width={hw * 0.22}
          height={tankH * 0.4}
          rx={1.2}
          fill="#F4F4F2"
        />
      </g>
      {/* Bowl outer, seat ring, lid line and water */}
      <ellipse cx={0} cy={cy} rx={hw * 0.92} ry={bowlRy} fill={color} />
      <ellipse
        cx={0}
        cy={cy + 1}
        rx={hw * 0.78}
        ry={bowlRy * 0.86}
        fill="none"
        strokeWidth="0.8"
        stroke={DETAIL}
      />
      <ellipse
        cx={0}
        cy={cy + 2}
        rx={hw * 0.5}
        ry={bowlRy * 0.66}
        fill={subColor}
        stroke={METAL_DARK}
        strokeWidth="0.8"
      />
      <ellipse
        cx={0}
        cy={cy + bowlRy * 0.1}
        rx={hw * 0.2}
        ry={bowlRy * 0.22}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      {/* Seat hinges at the back */}
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={s * hw * 0.4 - 2}
          y={cy - bowlRy * 0.95}
          width={4}
          height={2.4}
          rx={0.8}
          fill={METAL}
          strokeWidth="0.5"
        />
      ))}
    </g>
  );
}

export function FixtureBasinSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const s = detailScale(widthCm, depthCm, 50, 0.8, 1.3);
  return (
    <g stroke={LINE} strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={6} fill={color} />
      {/* Back splash */}
      <line
        x1={-hw + 4}
        y1={-hd + 3.5}
        x2={hw - 4}
        y2={-hd + 3.5}
        strokeWidth="0.6"
        stroke={DETAIL}
      />
      {/* Bowl rim, sloping inner bowl, drain and overflow */}
      <ellipse
        cx={0}
        cy={hd * 0.1}
        rx={hw * 0.74}
        ry={hd * 0.66}
        fill="none"
        strokeWidth="0.8"
        stroke={DETAIL}
      />
      <ellipse
        cx={0}
        cy={hd * 0.1}
        rx={hw * 0.64}
        ry={hd * 0.56}
        fill={subColor}
        stroke={METAL_DARK}
        strokeWidth="0.8"
      />
      <ellipse
        cx={0}
        cy={hd * 0.14}
        rx={hw * 0.3}
        ry={hd * 0.26}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      <DrainPlan x={0} y={hd * 0.14} r={2.6} />
      <rect x={-2.5} y={-hd * 0.36} width={5} height={1.6} rx={0.8} fill="#2B2E31" stroke="none" />
      {/* Mixer tap on the back rim */}
      <TapPlan x={0} y={-hd + 8.5} s={s} />
      {/* Pedestal below (hidden, dashed) */}
      <circle
        cx={0}
        cy={-hd * 0.1}
        r={Math.min(hw, hd) * 0.28}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="3 2"
      />
    </g>
  );
}

export function FixtureShowerSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const doorW = widthCm * 0.6;
  const headR = Math.max(5, Math.min(widthCm, depthCm) * 0.11);
  return (
    <g stroke="#58727C" strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} fill={color} />
      {/* Tray lip and sunken floor with fall lines to the drain */}
      <rect
        x={-hw + 4}
        y={-hd + 4}
        width={widthCm - 8}
        height={depthCm - 8}
        fill={subColor}
        strokeWidth="0.7"
      />
      <g strokeWidth="0.5" stroke={HAIR}>
        <line x1={-hw + 4} y1={-hd + 4} x2={-4} y2={-4} />
        <line x1={hw - 4} y1={-hd + 4} x2={4} y2={-4} />
        <line x1={-hw + 4} y1={hd - 4} x2={-4} y2={4} />
        <line x1={hw - 4} y1={hd - 4} x2={4} y2={4} />
      </g>
      <DrainPlan x={0} y={0} r={4.5} />
      {/* Glass screens: front door plus fixed panel, fixed right side */}
      <g stroke="#3F6370" strokeWidth="1.6">
        <line x1={-hw} y1={hd - 1} x2={-hw + doorW} y2={hd - 1} />
        <line x1={-hw + doorW} y1={hd - 1} x2={hw} y2={hd - 1} strokeWidth="2.2" />
        <line x1={hw - 1} y1={-hd} x2={hw - 1} y2={hd} strokeWidth="2.2" />
      </g>
      <rect
        x={-hw + doorW - 12}
        y={hd - 3.4}
        width={9}
        height={2.2}
        rx={1.1}
        fill={METAL}
        strokeWidth="0.5"
      />
      {/* Door swing */}
      <SwingArc x={-hw} y={hd - 1} r={doorW - 2} openDown={false} />
      {/* Rain head on its arm from the back wall, hand shower rail and mixer */}
      <line x1={0} y1={-hd} x2={0} y2={-hd + headR + 12} stroke={METAL_DARK} strokeWidth="1.6" />
      <circle
        cx={0}
        cy={-hd + headR + 12}
        r={headR}
        fill="#E9EDEF"
        stroke={METAL_DARK}
        strokeWidth="0.9"
      />
      <circle
        cx={0}
        cy={-hd + headR + 12}
        r={headR * 0.55}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      <rect
        x={-hw * 0.52}
        y={-hd + 1}
        width={2.4}
        height={5}
        rx={1}
        fill={METAL}
        strokeWidth="0.5"
      />
      <circle cx={hw * 0.44} cy={-hd + 5} r={3.4} fill={METAL} strokeWidth="0.6" />
      <KnobPlan x={hw * 0.44} y={-hd + 5} r={1.8} />
    </g>
  );
}

export function FixtureBathtubSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const inner = Math.min(depthCm, widthCm) * 0.32;
  return (
    <g stroke={LINE} strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={10} fill={color} />
      <rect
        x={-hw + 7}
        y={-hd + 7}
        width={widthCm - 22}
        height={depthCm - 14}
        rx={inner}
        fill={subColor}
        stroke={METAL_DARK}
        strokeWidth="0.9"
      />
      {/* Sloped back rest at the head end */}
      <path
        d={`M ${-hw + 7 + inner * 0.9} ${-hd + 10} Q ${-hw + 7 + inner * 1.3} 0 ${-hw + 7 + inner * 0.9} ${hd - 10}`}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
      />
      <DrainPlan x={hw - 26} y={0} r={3} />
      <circle cx={hw - 40} cy={-hd + 10} r={1.9} fill={METAL} strokeWidth="0.5" />
      {/* Bath mixer on the deck, spout over the tub */}
      <g transform={`translate(${hw - 10} 0) rotate(90)`}>
        <TapPlan x={0} y={0} s={1.1} double />
      </g>
    </g>
  );
}

export function FixtureWasherSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const r = Math.min(hw, hd) * 0.62;
  return (
    <g stroke={LINE} strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} />
      {/* Worktop seam and front control strip */}
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={widthCm - 4}
        height={depthCm - 4}
        rx={2}
        fill="none"
        strokeWidth="0.5"
        stroke={HAIR}
      />
      <line x1={-hw + 2} y1={hd - 12} x2={hw - 2} y2={hd - 12} strokeWidth="0.6" stroke={DETAIL} />
      {/* Soap drawer, display, buttons and programme dial */}
      <rect
        x={-hw + 5}
        y={hd - 10}
        width={widthCm * 0.26}
        height={6}
        rx={1.2}
        fill="#EEF0F1"
        strokeWidth="0.6"
      />
      <line x1={-hw + 8} y1={hd - 7} x2={-hw + widthCm * 0.26 + 2} y2={hd - 7} strokeWidth="0.6" />
      <rect
        x={-widthCm * 0.1}
        y={hd - 10}
        width={widthCm * 0.2}
        height={5}
        rx={1}
        fill="#1B2A33"
        strokeWidth="0.5"
      />
      {[-1, 0, 1].map((k) => (
        <rect
          key={k}
          x={k * 5 - 1.8}
          y={hd - 4}
          width={3.6}
          height={1.8}
          rx={0.6}
          fill="#2A2D30"
          stroke="none"
        />
      ))}
      <KnobPlan x={hw * 0.64} y={hd - 7} r={3.4} />
      {/* Door opening arc and drum outline (dashed, below the worktop) */}
      <circle
        cx={0}
        cy={-hd * 0.1}
        r={r}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="3 2"
      />
      <circle
        cx={0}
        cy={-hd * 0.1}
        r={r * 0.62}
        fill={subColor}
        fillOpacity="0.25"
        stroke={HAIR}
        strokeWidth="0.5"
        strokeDasharray="2 2"
      />
      {/* Hose connections at the back */}
      <circle cx={-hw * 0.5} cy={-hd + 5} r={2} fill={METAL} strokeWidth="0.5" />
      <circle cx={-hw * 0.3} cy={-hd + 5} r={2} fill="#C7DCEB" strokeWidth="0.5" />
    </g>
  );
}
