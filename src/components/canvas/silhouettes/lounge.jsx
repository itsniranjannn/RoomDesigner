/** 2D plan symbols: lounge seating. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { LINE, HAIR, DETAIL, P } from './parts.jsx';

export function SofaLSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  const mainD = depthCm * 0.55;
  const chaiseW = widthCm * 0.34;
  const armW = Math.min(widthCm, depthCm) * 0.09;
  const backH = mainD * 0.28;
  const seats = widthCm > 240 ? 3 : 2;
  const seatW = (widthCm - chaiseW - armW) / seats;
  const backN = seats + 1;
  const backW = (widthCm - armW - 4) / backN;
  return (
    <g>
      {/* L-shaped base: main run along the back plus the chaise return */}
      <path
        d={`M ${-hw} ${-hd} H ${hw} V ${hd} H ${hw - chaiseW} V ${-hd + mainD} H ${-hw} Z`}
        fill={color}
        stroke="#222222"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Backrest with loose, buttoned back cushions */}
      <rect
        x={-hw + armW}
        y={-hd + 1}
        width={P(widthCm - armW)}
        height={backH}
        rx={3}
        fill={cushionColor}
        stroke={LINE}
        strokeWidth="0.6"
      />
      {Array.from({ length: backN }).map((_, i) => (
        <g key={i}>
          <rect
            x={-hw + armW + 2 + backW * i}
            y={-hd + 3}
            width={P(backW - 3)}
            height={P(backH - 4)}
            rx={3}
            fill="none"
            stroke={DETAIL}
            strokeWidth="0.6"
          />
          <circle
            cx={-hw + armW + 2 + backW * (i + 0.5)}
            cy={-hd + backH / 2 + 1}
            r={1}
            fill={DETAIL}
          />
        </g>
      ))}
      <rect
        x={-hw}
        y={-hd}
        width={armW}
        height={mainD}
        rx={4}
        fill={cushionColor}
        stroke={LINE}
        strokeWidth="0.8"
      />
      <rect
        x={hw - armW}
        y={-hd}
        width={armW}
        height={depthCm}
        rx={4}
        fill={cushionColor}
        stroke={LINE}
        strokeWidth="0.8"
      />
      {/* Seat cushions with welting */}
      {Array.from({ length: seats }).map((_, idx) => (
        <g key={idx}>
          <rect
            x={-hw + armW + idx * seatW + 1}
            y={-hd + backH + 1}
            width={P(Math.max(0, seatW - 2))}
            height={P(Math.max(0, mainD - backH - 3))}
            rx={3}
            fill={color}
            stroke="#2B2B2B"
            strokeWidth="0.7"
          />
          <rect
            x={-hw + armW + idx * seatW + 4}
            y={-hd + backH + 4}
            width={P(Math.max(0, seatW - 8))}
            height={P(Math.max(0, mainD - backH - 9))}
            rx={2}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.5"
          />
        </g>
      ))}
      <rect
        x={hw - chaiseW + 1}
        y={-hd + backH + 1}
        width={P(Math.max(0, chaiseW - armW - 2))}
        height={P(Math.max(0, depthCm - backH - 3))}
        rx={3}
        fill={color}
        stroke="#2B2B2B"
        strokeWidth="0.7"
      />
      <rect
        x={hw - chaiseW + 4}
        y={-hd + backH + 4}
        width={P(Math.max(0, chaiseW - armW - 8))}
        height={P(Math.max(0, depthCm - backH - 9))}
        rx={2}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.5"
      />
      {/* Scatter cushions */}
      <g transform={`translate(${-hw + armW + 16} ${-hd + backH + 14}) rotate(-16)`}>
        <rect
          x={-8}
          y={-8}
          width={16}
          height={16}
          rx={3}
          fill="#EADFCB"
          stroke={LINE}
          strokeWidth="0.6"
        />
        <line x1={-6} y1={0} x2={6} y2={0} stroke={HAIR} strokeWidth="0.5" />
      </g>
      <g transform={`translate(${-hw + armW + seatW * 1.5} ${-hd + backH + 12}) rotate(20)`}>
        <rect
          x={-7}
          y={-7}
          width={14}
          height={14}
          rx={3}
          fill="#C9A98A"
          stroke={LINE}
          strokeWidth="0.6"
        />
      </g>
    </g>
  );
}

export function BeanBagSilhouette({ hw, hd, color, cushionColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <ellipse cx={0} cy={0} rx={hw} ry={hd} fill={color} stroke="#4A3220" strokeWidth="1.2" />
      {/* Panel seams meeting at the top, seat dimple and carry handle */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1={Math.cos((i * Math.PI) / 3) * r * 0.12}
          y1={Math.sin((i * Math.PI) / 3) * r * 0.12}
          x2={Math.cos((i * Math.PI) / 3) * hw * 0.97}
          y2={Math.sin((i * Math.PI) / 3) * hd * 0.97}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.7"
          strokeDasharray="3 2"
        />
      ))}
      <ellipse
        cx={0}
        cy={hd * 0.08}
        rx={hw * 0.4}
        ry={hd * 0.4}
        fill={cushionColor}
        fillOpacity="0.75"
        stroke={DETAIL}
        strokeWidth="0.7"
      />
      <ellipse
        cx={0}
        cy={hd * 0.08}
        rx={hw * 0.2}
        ry={hd * 0.2}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      <path
        d={`M ${-hw * 0.12} ${-hd * 0.62} Q 0 ${-hd * 0.78} ${hw * 0.12} ${-hd * 0.62}`}
        fill="none"
        stroke="#4A3220"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function BenchSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const slats = Math.max(2, Math.round(depthCm / 14));
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#3D2A1C"
        strokeWidth="1.2"
      />
      {/* Seat slats with gaps */}
      {Array.from({ length: slats - 1 }).map((_, i) => (
        <line
          key={i}
          x1={-hw + 1}
          y1={-hd + (depthCm * (i + 1)) / slats}
          x2={hw - 1}
          y2={-hd + (depthCm * (i + 1)) / slats}
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="1"
        />
      ))}
      {/* End frames and stretcher beneath, dashed, with pegs */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={s * (hw - 5) - 2.5}
            y={-hd * 0.85}
            width={5}
            height={depthCm * 0.85}
            fill={subColor}
            fillOpacity="0.5"
            stroke={HAIR}
            strokeWidth="0.7"
            strokeDasharray="3 2"
          />
          {[-0.3, 0.3].map((f) => (
            <circle key={f} cx={s * (hw - 5)} cy={hd * f} r={1} fill={DETAIL} />
          ))}
        </g>
      ))}
      <line
        x1={-hw + 8}
        y1={0}
        x2={hw - 8}
        y2={0}
        stroke={HAIR}
        strokeWidth="0.8"
        strokeDasharray="4 3"
      />
    </g>
  );
}
