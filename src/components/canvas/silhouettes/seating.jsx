/** 2D plan symbols: seating. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function SofaSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  const isLoveseat = widthCm < 180;
  const armW = widthCm * 0.12;
  const backH = depthCm * 0.28;
  const numCushions = isLoveseat ? 2 : 3;
  const cushionW = (widthCm - armW * 2) / numCushions;

  return (
    <g>
      {/* Base Frame */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={6}
        fill={color}
        stroke="#222222"
        strokeWidth="1.2"
      />

      {/* Padded Backrest */}
      <rect
        x={-hw + armW}
        y={-hd}
        width={widthCm - armW * 2}
        height={backH}
        rx={3}
        fill={cushionColor}
      />

      {/* Left Armrest */}
      <rect
        x={-hw}
        y={-hd}
        width={armW}
        height={depthCm}
        rx={4}
        fill={cushionColor}
        stroke="#222222"
        strokeWidth="0.8"
      />

      {/* Right Armrest */}
      <rect
        x={hw - armW}
        y={-hd}
        width={armW}
        height={depthCm}
        rx={4}
        fill={cushionColor}
        stroke="#222222"
        strokeWidth="0.8"
      />

      {/* Seat Cushions */}
      {Array.from({ length: numCushions }).map((_, idx) => (
        <rect
          key={idx}
          x={-hw + armW + idx * cushionW + 1}
          y={-hd + backH + 1}
          width={cushionW - 2}
          height={depthCm - backH - 3}
          rx={3}
          fill={color}
          stroke="#2B2B2B"
          strokeWidth="0.6"
        />
      ))}
    </g>
  );
}

export function ArmchairSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  const armW = widthCm * 0.18;
  const backH = depthCm * 0.28;

  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={6}
        fill={color}
        stroke="#222222"
        strokeWidth="1.2"
      />

      {/* Curved Backrest */}
      <rect
        x={-hw + armW * 0.5}
        y={-hd}
        width={widthCm - armW}
        height={backH}
        rx={4}
        fill={cushionColor}
      />

      {/* Left Armrest */}
      <rect x={-hw} y={-hd} width={armW} height={depthCm} rx={4} fill={cushionColor} />

      {/* Right Armrest */}
      <rect x={hw - armW} y={-hd} width={armW} height={depthCm} rx={4} fill={cushionColor} />

      {/* Deep Seat Cushion */}
      <rect
        x={-hw + armW + 2}
        y={-hd + backH + 2}
        width={widthCm - armW * 2 - 4}
        height={depthCm - backH - 5}
        rx={3}
        fill={color}
        stroke="#222222"
        strokeWidth="0.8"
      />
    </g>
  );
}

export function ChairSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  return (
    <g>
      {/* Frame */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={4}
        fill={color}
        stroke="#1A1918"
        strokeWidth="1"
      />

      {/* Curved Backrest rail */}
      <path
        d={`M ${-hw + 3} ${-hd + 3} Q 0 ${-hd - 2} ${hw - 3} ${-hd + 3}`}
        fill="none"
        stroke="#1A1918"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Woven Cane / Cushion Seat Insert */}
      <rect
        x={-hw + 4}
        y={-hd + 8}
        width={widthCm - 8}
        height={depthCm - 12}
        rx={3}
        fill={cushionColor}
        stroke="#9E8D76"
        strokeWidth="0.8"
      />

      {/* Corner Leg Caps */}
      <circle cx={-hw + 6} cy={-hd + 6} r={2} fill="#111111" />
      <circle cx={hw - 6} cy={-hd + 6} r={2} fill="#111111" />
      <circle cx={-hw + 6} cy={hd - 6} r={2} fill="#111111" />
      <circle cx={hw - 6} cy={hd - 6} r={2} fill="#111111" />
    </g>
  );
}

export function DeskChairSilhouette({ hw, hd, cushionColor }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        const lx = Math.sin(rad) * (hw * 0.85);
        const ly = -Math.cos(rad) * (hd * 0.85);
        return (
          <g key={idx}>
            <line
              x1={0}
              y1={0}
              x2={lx}
              y2={ly}
              stroke="#1C1A17"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx={lx} cy={ly} r={2.5} fill="#111111" />
          </g>
        );
      })}
      <circle cx={0} cy={0} r={hw * 0.55} fill={cushionColor} stroke="#181818" strokeWidth="1" />
      <path
        d={`M ${-hw * 0.6} ${-hd * 0.55} Q 0 ${-hd * 0.8} ${hw * 0.6} ${-hd * 0.55}`}
        fill="none"
        stroke="#1C1A17"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  );
}

export function BarStoolSilhouette({ hw, hd, color, cushionColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r * 0.95} fill="none" stroke="#1C1A17" strokeWidth="1.5" />
      <line
        x1={-r * 0.8}
        y1={-r * 0.8}
        x2={r * 0.8}
        y2={r * 0.8}
        stroke="#1C1A17"
        strokeWidth="1"
      />
      <line
        x1={r * 0.8}
        y1={-r * 0.8}
        x2={-r * 0.8}
        y2={r * 0.8}
        stroke="#1C1A17"
        strokeWidth="1"
      />
      <circle cx={0} cy={0} r={r * 0.75} fill={cushionColor} stroke={color} strokeWidth="1.5" />
      <path
        d={`M ${-r * 0.55} ${-r * 0.3} Q 0 ${-r * 0.75} ${r * 0.55} ${-r * 0.3}`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

export function OttomanSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={6}
        fill={color}
        stroke="#2D251E"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 4}
        y={-hd + 4}
        width={widthCm - 8}
        height={depthCm - 8}
        rx={4}
        fill={cushionColor}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
      />
      <line
        x1={-hw + 10}
        y1={0}
        x2={hw - 10}
        y2={0}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      <circle cx={-hw * 0.35} cy={0} r={2} fill="#2D251E" />
      <circle cx={hw * 0.35} cy={0} r={2} fill="#2D251E" />
    </g>
  );
}
