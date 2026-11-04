/** 2D plan symbols: tables. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { BarHandle, LINE, HAIR, DETAIL, METAL, METAL_DARK, P } from './parts.jsx';

function LegPlan({ x, y, s = 5 }) {
  return (
    <rect
      x={x - s / 2}
      y={y - s / 2}
      width={s}
      height={s}
      fill="none"
      stroke={HAIR}
      strokeWidth="0.7"
      strokeDasharray="2 1.5"
    />
  );
}

export function TableSilhouette({ item, widthCm, depthCm, hw, hd, color }) {
  const id = item?.id || '';
  const conference = id === 'conference-table';
  const seam = id === 'dining-table-large' || conference;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#4A3B2B"
        strokeWidth="1.2"
      />
      {/* Edge banding and inlay line */}
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={P(widthCm - 6)}
        height={P(depthCm - 6)}
        rx={2}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.7"
      />
      {/* Wood grain */}
      {[-0.3, -0.1, 0.12, 0.3].map((f) => (
        <line
          key={f}
          x1={-hw * 0.8}
          y1={hd * f * 2}
          x2={hw * 0.8}
          y2={hd * f * 2}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.6"
        />
      ))}
      {seam && (
        <line x1={0} y1={-hd + 3} x2={0} y2={hd - 3} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
      )}
      {conference &&
        [-0.18, 0.18].map((f) => (
          <g key={f}>
            <rect
              x={widthCm * f - 9}
              y={-5}
              width={18}
              height={10}
              rx={1.5}
              fill="#2B2D30"
              stroke={LINE}
              strokeWidth="0.5"
            />
            <rect
              x={widthCm * f - 7}
              y={-2.5}
              width={14}
              height={5}
              rx={1}
              fill={METAL}
              stroke="none"
            />
          </g>
        ))}
      {/* Apron and legs beneath (hidden, dashed) */}
      <rect
        x={-hw + 8}
        y={-hd + 8}
        width={P(widthCm - 16)}
        height={P(depthCm - 16)}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="4 3"
      />
      {[
        [-hw + 8, -hd + 8],
        [hw - 8, -hd + 8],
        [-hw + 8, hd - 8],
        [hw - 8, hd - 8],
      ].map(([x, y], i) => (
        <LegPlan key={i} x={x} y={y} />
      ))}
      {id === 'dining-table-4' && <BarHandle x={0} y={hd - 9} length={8} color="#C4A869" />}
    </g>
  );
}

export function TableRoundSilhouette({ hw, hd, color }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="#4A3B2B" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.94} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      <circle cx={0} cy={0} r={r * 0.55} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.7" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line
          key={i}
          x1={Math.cos((i * Math.PI) / 4) * r * 0.55}
          y1={Math.sin((i * Math.PI) / 4) * r * 0.55}
          x2={Math.cos((i * Math.PI) / 4) * r * 0.94}
          y2={Math.sin((i * Math.PI) / 4) * r * 0.94}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="0.5"
        />
      ))}
      {/* Pedestal column and four foot spurs beneath */}
      <circle
        cx={0}
        cy={0}
        r={r * 0.1}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="2 1.5"
      />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={Math.cos((i * Math.PI) / 2) * r * 0.1}
          y1={Math.sin((i * Math.PI) / 2) * r * 0.1}
          x2={Math.cos((i * Math.PI) / 2) * r * 0.44}
          y2={Math.sin((i * Math.PI) / 2) * r * 0.44}
          stroke={HAIR}
          strokeWidth="2"
          strokeDasharray="3 2"
        />
      ))}
    </g>
  );
}

export function CoffeeTableSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={4}
        fill={color}
        stroke="#5A4A3A"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={P(widthCm - 6)}
        height={P(depthCm - 6)}
        rx={3}
        fill="none"
        stroke="rgba(0,0,0,0.22)"
        strokeWidth="0.7"
      />
      {[-0.25, 0.1].map((f) => (
        <line
          key={f}
          x1={-hw * 0.8}
          y1={hd * f * 2}
          x2={hw * 0.8}
          y2={hd * f * 2}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.6"
        />
      ))}
      {/* Lower shelf and corner legs beneath, dashed */}
      <rect
        x={-hw + 9}
        y={-hd + 9}
        width={P(widthCm - 18)}
        height={P(depthCm - 18)}
        rx={2}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="4 3"
      />
      {[
        [-hw + 7, -hd + 7],
        [hw - 7, -hd + 7],
        [-hw + 7, hd - 7],
        [hw - 7, hd - 7],
      ].map(([x, y], i) => (
        <LegPlan key={i} x={x} y={y} s={4.5} />
      ))}
    </g>
  );
}

export function SideTableSilhouette({ hw, hd, color, subColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="#5A4A3A" strokeWidth="1.2" />
      <circle
        cx={0}
        cy={0}
        r={r * 0.9}
        fill={subColor}
        fillOpacity="0.45"
        stroke={DETAIL}
        strokeWidth="0.7"
      />
      <circle cx={0} cy={0} r={r * 0.72} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.6" />
      <circle
        cx={0}
        cy={0}
        r={r * 0.22}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="2 1.5"
      />
      <circle
        cx={0}
        cy={0}
        r={r * 0.6}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="4 3"
      />
    </g>
  );
}

export function DeskSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const pedW = widthCm * 0.28;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#3D2A1C"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 2.5}
        y={-hd + 2.5}
        width={P(widthCm - 5)}
        height={P(depthCm - 5)}
        rx={2}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.7"
      />
      {/* Leather desk pad with stitched border and cable grommet */}
      <rect
        x={-hw * 0.5}
        y={-hd * 0.35}
        width={widthCm * 0.44}
        height={depthCm * 0.5}
        rx={2.5}
        fill={subColor}
        stroke={LINE}
        strokeWidth="0.6"
      />
      <rect
        x={-hw * 0.5 + 2}
        y={-hd * 0.35 + 2}
        width={P(widthCm * 0.44 - 4)}
        height={P(depthCm * 0.5 - 4)}
        rx={2}
        fill="none"
        stroke="#9AA0A5"
        strokeWidth="0.5"
        strokeDasharray="2 1.5"
      />
      <circle
        cx={-hw * 0.72}
        cy={-hd * 0.62}
        r={3}
        fill="#C5CBD0"
        stroke={METAL_DARK}
        strokeWidth="0.6"
      />
      {/* Centre drawer line and pull at the front edge */}
      <line
        x1={-hw * 0.5}
        y1={hd - 5}
        x2={hw * 0.1}
        y2={hd - 5}
        stroke={DETAIL}
        strokeWidth="0.8"
      />
      <BarHandle x={-hw * 0.2} y={hd - 3} length={7} color="#C4A869" />
      {/* Right drawer pedestal (dashed) with three pulls, left steel sled frame */}
      <rect
        x={hw - pedW - 2}
        y={-hd + 3}
        width={pedW}
        height={P(depthCm - 6)}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.7"
        strokeDasharray="4 3"
      />
      <BarHandle
        x={hw - pedW / 2 - 2}
        y={hd - 3}
        length={Math.min(10, pedW * 0.5)}
        color="#C4A869"
      />
      <line x1={-hw + 6} y1={-hd + 6} x2={-hw + 6} y2={hd - 6} stroke={METAL} strokeWidth="2" />
    </g>
  );
}

export function NightstandSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#5A4026"
        strokeWidth="1.2"
      />
      <rect
        x={-hw - 1}
        y={-hd - 1}
        width={widthCm + 2}
        height={depthCm + 2}
        rx={3.5}
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.6"
      />
      <rect
        x={-hw + 4}
        y={-hd + 4}
        width={P(widthCm - 8)}
        height={P(depthCm - 8)}
        rx={2}
        fill="none"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.7"
      />
      {/* Two drawer fronts seen at the edge, round brass knobs */}
      <line x1={-hw + 3} y1={hd - 4} x2={hw - 3} y2={hd - 4} stroke={DETAIL} strokeWidth="0.8" />
      <circle cx={0} cy={hd - 2} r={1.5} fill="#C4A869" stroke={LINE} strokeWidth="0.4" />
      {[
        [-hw + 4, -hd + 4],
        [hw - 4, -hd + 4],
        [-hw + 4, hd - 6],
        [hw - 4, hd - 6],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={1.8}
          fill="none"
          stroke={HAIR}
          strokeWidth="0.6"
          strokeDasharray="2 1.5"
        />
      ))}
    </g>
  );
}
