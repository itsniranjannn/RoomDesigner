/** 2D plan symbols: bathroom and utility pieces. Coordinates are centered at (0, 0), widthCm x depthCm. */
import {
  TapPlan,
  DrainPlan,
  KnobPlan,
  detailScale,
  LINE,
  HAIR,
  DETAIL,
  METAL,
  METAL_DARK,
  P,
} from './parts.jsx';

export function VanitySilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const s = detailScale(widthCm, depthCm, 50, 0.8, 1.3);
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke={LINE}
        strokeWidth="1.2"
      />
      {/* Stone countertop with overhang line */}
      <rect
        x={-hw + 1.5}
        y={-hd + 1.5}
        width={P(widthCm - 3)}
        height={P(depthCm - 3)}
        rx={2}
        fill={subColor}
        stroke={DETAIL}
        strokeWidth="0.7"
      />
      {/* Undermount basin, bowl slope, drain and overflow */}
      <ellipse
        cx={0}
        cy={hd * 0.1}
        rx={hw * 0.56}
        ry={hd * 0.6}
        fill="#F4F4F1"
        stroke={METAL_DARK}
        strokeWidth="0.9"
      />
      <ellipse
        cx={0}
        cy={hd * 0.14}
        rx={hw * 0.34}
        ry={hd * 0.34}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      <DrainPlan x={0} y={hd * 0.14} r={2.4} />
      <rect x={-2.2} y={-hd * 0.4} width={4.4} height={1.5} rx={0.7} fill="#2B2E31" />
      <TapPlan x={0} y={-hd + 7.5} s={s} />
      {/* Door split and knobs at the front edge, drawer line behind them */}
      <line x1={0} y1={hd * 0.78} x2={0} y2={hd - 1.5} stroke={DETAIL} strokeWidth="0.9" />
      <circle cx={-hw * 0.12} cy={hd - 3} r={1.4} fill="#C4A869" stroke={LINE} strokeWidth="0.4" />
      <circle cx={hw * 0.12} cy={hd - 3} r={1.4} fill="#C4A869" stroke={LINE} strokeWidth="0.4" />
    </g>
  );
}

export function SquatToiletSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const padW = widthCm * 0.26;
  const padD = depthCm * 0.34;
  const padY = hd * 0.2;
  return (
    <g stroke={LINE} strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={5} fill={color} />
      {/* Ribbed foot pads */}
      {[-1, 1].map((sg) => {
        const x0 = sg * hw * 0.58 - padW / 2;
        return (
          <g key={sg}>
            <rect
              x={x0}
              y={padY}
              width={padW}
              height={padD}
              rx={2}
              fill="#E9EBEC"
              strokeWidth="0.8"
            />
            {[0.14, 0.3, 0.46, 0.62, 0.78, 0.92].map((f) => (
              <line
                key={f}
                x1={x0 + 1.5}
                y1={padY + padD * f}
                x2={x0 + padW - 1.5}
                y2={padY + padD * f}
                strokeWidth="0.5"
                stroke={METAL_DARK}
              />
            ))}
          </g>
        );
      })}
      {/* Elongated pan with sloping inner line and the drain at the back */}
      <ellipse
        cx={0}
        cy={-hd * 0.04}
        rx={hw * 0.4}
        ry={hd * 0.66}
        fill={subColor}
        stroke={METAL_DARK}
        strokeWidth="0.9"
      />
      <ellipse
        cx={0}
        cy={-hd * 0.02}
        rx={hw * 0.26}
        ry={hd * 0.5}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      <ellipse cx={0} cy={-hd * 0.42} rx={hw * 0.13} ry={hd * 0.14} fill="#3A3F44" stroke="none" />
      {/* Flush pipe and stop valve on the back wall */}
      <circle cx={0} cy={-hd + 5} r={2.6} fill="#D8DBDD" strokeWidth="0.7" />
      <rect x={3} y={-hd + 3.6} width={6} height={2.6} rx={1.2} fill={METAL} strokeWidth="0.5" />
    </g>
  );
}

export function TankSilhouette({ hw, hd, color, subColor, accentColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke={METAL_DARK} strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.78} fill="none" stroke={DETAIL} strokeWidth="0.8" />
      <circle cx={0} cy={0} r={r * 0.38} fill={subColor} stroke={METAL_DARK} strokeWidth="0.8" />
      {/* Dome seam and relief valve */}
      <circle
        cx={0}
        cy={0}
        r={r * 0.58}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="3 2"
      />
      <rect
        x={r * 0.5}
        y={-r * 0.05}
        width={r * 0.34}
        height={3}
        rx={1.4}
        fill={METAL}
        stroke={LINE}
        strokeWidth="0.5"
      />
      {/* Inlet (blue) and outlet (red) pipes at the back, thermostat dial at the front */}
      <circle cx={-r * 0.4} cy={-r * 0.55} r={2.8} fill="#2F6DB5" stroke={LINE} strokeWidth="0.6" />
      <circle cx={r * 0.4} cy={-r * 0.55} r={2.8} fill="#B5352B" stroke={LINE} strokeWidth="0.6" />
      <circle cx={-r * 0.4} cy={-r * 0.55} r={1} fill={accentColor} />
      <KnobPlan x={-r * 0.14} y={r * 0.78} r={3} />
      <circle cx={r * 0.3} cy={r * 0.78} r={1.2} fill="#38D26B" />
    </g>
  );
}

export function BasketSilhouette({ hw, hd, color, accentColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="#4A3B2B" strokeWidth="1.2" />
      {/* Lid rim, weave rings and lid knob */}
      <circle cx={0} cy={0} r={r * 0.9} fill="none" stroke={accentColor} strokeWidth="1.1" />
      {[0.74, 0.58, 0.42].map((f) => (
        <circle
          key={f}
          cx={0}
          cy={0}
          r={r * f}
          fill="none"
          stroke={accentColor}
          strokeWidth="0.8"
          strokeDasharray="3 2"
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line
          key={i}
          x1={Math.cos((i * Math.PI) / 4) * r * 0.2}
          y1={Math.sin((i * Math.PI) / 4) * r * 0.2}
          x2={Math.cos((i * Math.PI) / 4) * r * 0.88}
          y2={Math.sin((i * Math.PI) / 4) * r * 0.88}
          stroke={accentColor}
          strokeWidth="0.5"
          strokeOpacity="0.7"
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.12} fill={accentColor} stroke="#4A3B2B" strokeWidth="0.7" />
      {/* Carry handles */}
      <rect
        x={-r - 2}
        y={-r * 0.16}
        width={6}
        height={r * 0.32}
        rx={2}
        fill={accentColor}
        stroke="#4A3B2B"
        strokeWidth="0.6"
      />
      <rect
        x={r - 4}
        y={-r * 0.16}
        width={6}
        height={r * 0.32}
        rx={2}
        fill={accentColor}
        stroke="#4A3B2B"
        strokeWidth="0.6"
      />
    </g>
  );
}
