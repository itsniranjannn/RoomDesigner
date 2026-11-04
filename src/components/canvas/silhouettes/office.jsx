/** 2D plan symbols: office pieces. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { BarHandle, KnobPlan, LINE, HAIR, METAL, METAL_DARK, P } from './parts.jsx';

/** Monitor, keyboard and mouse as seen from above; (x, y) is the monitor centre. */
function Workstation({ x, y, w, subColor }) {
  const mw = Math.max(26, Math.min(w, 50));
  return (
    <g>
      <rect
        x={x - mw / 2}
        y={y - 1.5}
        width={mw}
        height={3}
        rx={0.8}
        fill={subColor}
        stroke={LINE}
        strokeWidth="0.6"
      />
      <ellipse
        cx={x}
        cy={y + 2}
        rx={mw * 0.18}
        ry={3.5}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.5"
      />
      <rect
        x={x - mw * 0.45}
        y={y + 14}
        width={mw * 0.9}
        height={10}
        rx={1.5}
        fill="#E6E8EA"
        stroke={LINE}
        strokeWidth="0.6"
      />
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={x - mw * 0.4}
          y1={y + 14 + 10 * f}
          x2={x + mw * 0.4}
          y2={y + 14 + 10 * f}
          stroke={HAIR}
          strokeWidth="0.4"
        />
      ))}
      <rect
        x={x + mw * 0.55}
        y={y + 16}
        width={5}
        height={8}
        rx={2.5}
        fill="#E6E8EA"
        stroke={LINE}
        strokeWidth="0.6"
      />
    </g>
  );
}

export function DeskLSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const mainD = depthCm * 0.45;
  const returnW = widthCm * 0.38;
  const pedW = Math.min(42, widthCm * 0.26);
  return (
    <g>
      {/* L-shaped worktop: main run along the back plus a return on the right */}
      <path
        d={`M ${-hw} ${-hd} H ${hw} V ${hd} H ${hw - returnW} V ${-hd + mainD} H ${-hw} Z`}
        fill={color}
        stroke="#2B2117"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d={`M ${-hw + 3} ${-hd + 3} H ${hw - 3} V ${hd - 3} H ${hw - returnW + 3} V ${-hd + mainD - 3} H ${-hw + 3} Z`}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <Workstation x={-hw * 0.05} y={-hd + 12} w={widthCm * 0.22} subColor={subColor} />
      {/* Cable grommets, left pedestal and its drawer pulls (dashed, below) */}
      {[-0.1, 0.12].map((f) => (
        <circle
          key={f}
          cx={widthCm * f}
          cy={-hd + 8}
          r={2.6}
          fill="#C5CBD0"
          stroke={METAL_DARK}
          strokeWidth="0.5"
        />
      ))}
      <rect
        x={-hw + 1}
        y={-hd + 3}
        width={pedW}
        height={P(mainD - 6)}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="4 3"
      />
      {[0.22, 0.5, 0.78].map((f) => (
        <BarHandle key={f} x={-hw + 1 + pedW / 2} y={-hd + mainD * f} length={8} color="#C4A869" />
      ))}
      <rect
        x={hw - returnW * 0.75}
        y={hd * 0.1}
        width={returnW * 0.5}
        height={depthCm * 0.22}
        rx={2}
        fill="rgba(255,255,255,0.25)"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.6"
      />
      <line
        x1={hw - returnW * 0.7}
        y1={hd * 0.1 + depthCm * 0.05}
        x2={hw - returnW * 0.3}
        y2={hd * 0.1 + depthCm * 0.05}
        stroke={HAIR}
        strokeWidth="0.5"
      />
    </g>
  );
}

export function StandingDeskSilhouette({ widthCm, depthCm, hw, hd, color, subColor, accentColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#2B2B2B"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={P(widthCm - 6)}
        height={P(depthCm - 6)}
        rx={2}
        fill="none"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="0.7"
      />
      <Workstation x={0} y={-hd + 12} w={widthCm * 0.28} subColor={subColor} />
      {/* Telescopic column legs on long feet, crossbar and cable tray (dashed) */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={s * (hw - 10) - 3.5}
            y={-hd * 0.8}
            width={7}
            height={depthCm * 0.8}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.8"
            strokeDasharray="4 3"
          />
          <rect
            x={s * (hw - 10) - 3}
            y={-3}
            width={6}
            height={6}
            fill={METAL}
            stroke={METAL_DARK}
            strokeWidth="0.6"
          />
        </g>
      ))}
      <line
        x1={-hw + 10}
        y1={0}
        x2={hw - 10}
        y2={0}
        stroke={HAIR}
        strokeWidth="1.2"
        strokeDasharray="4 3"
      />
      <rect
        x={-widthCm * 0.28}
        y={-hd * 0.45}
        width={widthCm * 0.56}
        height={8}
        rx={2}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="3 2"
      />
      {/* Height controller on the front edge: display and two buttons */}
      <rect
        x={hw - 33}
        y={hd - 8}
        width={13}
        height={5}
        rx={1.2}
        fill="#202225"
        stroke={LINE}
        strokeWidth="0.5"
      />
      <rect x={hw - 31.5} y={hd - 6.8} width={5} height={2.6} fill={accentColor} stroke="none" />
      <circle cx={hw - 24} cy={hd - 6.6} r={1} fill={accentColor} stroke="none" />
      <circle cx={hw - 21.5} cy={hd - 5.4} r={1} fill={METAL} stroke="none" />
    </g>
  );
}

export function ReceptionCounterSilhouette({
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  accentColor,
  subColor,
}) {
  const ledgeD = depthCm * 0.34;
  const flutes = Math.max(8, Math.round(widthCm / 8));
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={6}
        fill={color}
        stroke="#2B2B2B"
        strokeWidth="1.2"
      />
      {/* Raised front transaction ledge with a brass edge and fluted front */}
      <rect
        x={-hw * 0.97}
        y={hd * 0.94 - ledgeD}
        width={widthCm * 0.97}
        height={ledgeD}
        rx={4}
        fill={accentColor}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.8"
      />
      <line
        x1={-hw * 0.97 + 4}
        y1={hd * 0.94 - 2}
        x2={hw * 0.97 - 4}
        y2={hd * 0.94 - 2}
        stroke="#C49746"
        strokeWidth="1.2"
      />
      {Array.from({ length: flutes }).map((_, i) => (
        <line
          key={i}
          x1={-hw * 0.9 + (widthCm * 0.9 * (i + 0.5)) / flutes}
          y1={hd - 4}
          x2={-hw * 0.9 + (widthCm * 0.9 * (i + 0.5)) / flutes}
          y2={hd}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.6"
        />
      ))}
      <Workstation
        x={widthCm * 0.2}
        y={-hd + depthCm * 0.14}
        w={widthCm * 0.14}
        subColor={subColor}
      />
      <rect
        x={-widthCm * 0.2}
        y={-hd + depthCm * 0.14}
        width={widthCm * 0.18}
        height={depthCm * 0.12}
        rx={1}
        fill={subColor}
        stroke={LINE}
        strokeWidth="0.5"
      />
      <circle
        cx={-hw * 0.5}
        cy={hd - ledgeD / 2}
        r={3.4}
        fill="#E2BD66"
        stroke={LINE}
        strokeWidth="0.6"
      />
      <circle cx={-hw * 0.5} cy={hd - ledgeD / 2} r={1.2} fill="#C49746" stroke="none" />
      <KnobPlan x={hw * 0.6} y={hd - ledgeD / 2} r={2} />
      <rect
        x={-8}
        y={-hd + 4}
        width={16}
        height={3}
        rx={1}
        fill={METAL}
        stroke={METAL_DARK}
        strokeWidth="0.4"
      />
    </g>
  );
}
