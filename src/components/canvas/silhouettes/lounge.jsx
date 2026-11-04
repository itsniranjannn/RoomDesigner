/** 2D plan symbols: lounge seating. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function SofaLSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  const mainD = depthCm * 0.55;
  const chaiseW = widthCm * 0.34;
  const armW = Math.min(widthCm, depthCm) * 0.09;
  const backH = mainD * 0.28;
  const seats = 2;
  const seatW = (widthCm - chaiseW - armW) / seats;
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
      <rect
        x={-hw + armW}
        y={-hd}
        width={widthCm - armW}
        height={backH}
        rx={3}
        fill={cushionColor}
      />
      <rect x={-hw} y={-hd} width={armW} height={mainD} rx={4} fill={cushionColor} />
      <rect x={hw - armW} y={-hd} width={armW} height={depthCm} rx={4} fill={cushionColor} />
      {Array.from({ length: seats }).map((_, idx) => (
        <rect
          key={idx}
          x={-hw + armW + idx * seatW + 1}
          y={-hd + backH + 1}
          width={Math.max(0, seatW - 2)}
          height={Math.max(0, mainD - backH - 3)}
          rx={3}
          fill={color}
          stroke="#2B2B2B"
          strokeWidth="0.6"
        />
      ))}
      {/* Chaise cushion */}
      <rect
        x={hw - chaiseW + 1}
        y={-hd + backH + 1}
        width={Math.max(0, chaiseW - armW - 2)}
        height={Math.max(0, depthCm - backH - 3)}
        rx={3}
        fill={color}
        stroke="#2B2B2B"
        strokeWidth="0.6"
      />
    </g>
  );
}

export function BeanBagSilhouette({ hw, hd, color, cushionColor }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={hw} ry={hd} fill={color} stroke="#2B2B2B" strokeWidth="1.2" />
      <ellipse
        cx={0}
        cy={hd * 0.08}
        rx={hw * 0.7}
        ry={hd * 0.66}
        fill={cushionColor}
        opacity="0.7"
      />
      {/* Slumped crease lines */}
      <path
        d={`M ${-hw * 0.5} ${-hd * 0.2} Q 0 ${hd * 0.15} ${hw * 0.5} ${-hd * 0.2}`}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="1"
      />
      <path
        d={`M ${-hw * 0.35} ${hd * 0.25} Q 0 ${hd * 0.5} ${hw * 0.35} ${hd * 0.25}`}
        fill="none"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.8"
      />
    </g>
  );
}

export function BenchSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const slats = Math.max(2, Math.round(depthCm / 14));
  const slatH = depthCm / slats;
  const endW = widthCm * 0.05;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#2B2117"
        strokeWidth="1.2"
      />
      {/* Seat slats */}
      {Array.from({ length: slats - 1 }).map((_, idx) => (
        <line
          key={idx}
          x1={-hw + 1}
          y1={-hd + slatH * (idx + 1)}
          x2={hw - 1}
          y2={-hd + slatH * (idx + 1)}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.8"
        />
      ))}
      {/* End frames */}
      <rect
        x={-hw + 2}
        y={-hd + 1}
        width={endW}
        height={Math.max(0, depthCm - 2)}
        fill={subColor}
        opacity="0.7"
      />
      <rect
        x={hw - 2 - endW}
        y={-hd + 1}
        width={endW}
        height={Math.max(0, depthCm - 2)}
        fill={subColor}
        opacity="0.7"
      />
    </g>
  );
}
