/** 2D plan symbols: kitchen. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function KitchenIslandSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={4}
        fill={color}
        stroke="#5A6D63"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={widthCm - 6}
        height={depthCm - 6}
        rx={2}
        fill="none"
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth="0.8"
      />
      <line
        x1={-hw + 6}
        y1={hd - 18}
        x2={hw - 6}
        y2={hd - 18}
        stroke="#4A5D52"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <circle cx={-hw * 0.4} cy={hd - 9} r={6} fill="none" stroke="#4A5D52" strokeWidth="1" />
      <circle cx={hw * 0.4} cy={hd - 9} r={6} fill="none" stroke="#4A5D52" strokeWidth="1" />
    </g>
  );
}

export function KitchenCounterSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#4A453C"
        strokeWidth="1.2"
      />
      <rect
        x={-hw * 0.7}
        y={-hd + 8}
        width={widthCm * 0.45}
        height={Math.max(0, depthCm - 16)}
        rx={3}
        fill="#C6CCD2"
        stroke="#8E98A0"
        strokeWidth="1"
      />
      <rect
        x={-hw * 0.7 + 3}
        y={-hd + 11}
        width={widthCm * 0.2}
        height={Math.max(0, depthCm - 22)}
        rx={2}
        fill="#E2E6EA"
        stroke="#AAB3BA"
        strokeWidth="0.8"
      />
      <rect
        x={-hw * 0.7 + widthCm * 0.22 + 3}
        y={-hd + 11}
        width={widthCm * 0.2}
        height={Math.max(0, depthCm - 22)}
        rx={2}
        fill="#E2E6EA"
        stroke="#AAB3BA"
        strokeWidth="0.8"
      />
      <circle cx={-hw * 0.7 + widthCm * 0.225} cy={-hd + 8} r={3} fill="#5A646E" />
      <path
        d={`M ${-hw * 0.7 + widthCm * 0.225} ${-hd + 8} Q ${-hw * 0.7 + widthCm * 0.225} ${-hd + 18} ${-hw * 0.7 + widthCm * 0.225} ${-hd + 20}`}
        fill="none"
        stroke="#5A646E"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x={hw * 0.1}
        y={-hd + 12}
        width={widthCm * 0.35}
        height={Math.max(0, depthCm - 24)}
        rx={2}
        fill="#C4A882"
        stroke="#9E805B"
        strokeWidth="0.8"
      />
    </g>
  );
}

export function KitchenStoveSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#111111"
        strokeWidth="1.4"
      />
      <circle
        cx={-hw * 0.45}
        cy={-hd * 0.35}
        r={hw * 0.28}
        fill="#181A1B"
        stroke="#444444"
        strokeWidth="1"
      />
      <circle
        cx={hw * 0.45}
        cy={-hd * 0.35}
        r={hw * 0.24}
        fill="#181A1B"
        stroke="#444444"
        strokeWidth="1"
      />
      <circle
        cx={-hw * 0.45}
        cy={hd * 0.25}
        r={hw * 0.24}
        fill="#181A1B"
        stroke="#444444"
        strokeWidth="1"
      />
      <circle
        cx={hw * 0.45}
        cy={hd * 0.25}
        r={hw * 0.32}
        fill="#181A1B"
        stroke="#444444"
        strokeWidth="1"
      />
      {[
        [-hw * 0.45, -hd * 0.35, hw * 0.28],
        [hw * 0.45, -hd * 0.35, hw * 0.24],
        [-hw * 0.45, hd * 0.25, hw * 0.24],
        [hw * 0.45, hd * 0.25, hw * 0.32],
      ].map(([bx, by, br], idx) => (
        <g key={idx}>
          <line
            x1={bx - br * 0.7}
            y1={by}
            x2={bx + br * 0.7}
            y2={by}
            stroke="#666666"
            strokeWidth="1"
          />
          <line
            x1={bx}
            y1={by - br * 0.7}
            x2={bx}
            y2={by + br * 0.7}
            stroke="#666666"
            strokeWidth="1"
          />
        </g>
      ))}
      <line x1={-hw + 4} y1={hd - 6} x2={hw - 4} y2={hd - 6} stroke="#555555" strokeWidth="0.8" />
      {[-hw * 0.6, -hw * 0.2, hw * 0.2, hw * 0.6].map((kx, i) => (
        <circle key={i} cx={kx} cy={hd - 3} r={2} fill="#C4A869" />
      ))}
    </g>
  );
}

export function KitchenFridgeSilhouette({ widthCm, depthCm, hw, hd, color, handleColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#3E4348"
        strokeWidth="1.2"
      />
      <line x1={0} y1={-hd} x2={0} y2={hd - 14} stroke="#2D3034" strokeWidth="1.2" />
      <line x1={-hw} y1={hd - 14} x2={hw} y2={hd - 14} stroke="#2D3034" strokeWidth="1.5" />
      <rect x={-4} y={-hd * 0.4} width={2} height={depthCm * 0.45} rx={0.5} fill={handleColor} />
      <rect x={2} y={-hd * 0.4} width={2} height={depthCm * 0.45} rx={0.5} fill={handleColor} />
      <rect
        x={-hw * 0.4}
        y={hd - 10}
        width={widthCm * 0.8}
        height={2.5}
        rx={0.5}
        fill={handleColor}
      />
    </g>
  );
}

export function DiningNookSilhouette({ hw, hd, color, cushionColor }) {
  const seatD = 40;
  return (
    <g>
      <path
        d={`M ${-hw} ${-hd} L ${hw} ${-hd} L ${hw} ${-hd + seatD} L ${-hw + seatD} ${-hd + seatD} L ${-hw + seatD} ${hd} L ${-hw} ${hd} Z`}
        fill={color}
        stroke="#4D3823"
        strokeWidth="1.2"
      />
      <path
        d={`M ${-hw + 3} ${-hd + 3} L ${hw - 3} ${-hd + 3} L ${hw - 3} ${-hd + seatD - 3} L ${-hw + seatD - 3} ${-hd + seatD - 3} L ${-hw + seatD - 3} ${hd - 3} L ${-hw + 3} ${hd - 3} Z`}
        fill={cushionColor}
        stroke="#948572"
        strokeWidth="0.8"
      />
      <line
        x1={-hw + 8}
        y1={-hd + 8}
        x2={hw - 8}
        y2={-hd + 8}
        stroke="#7D6F5E"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1={-hw + 8}
        y1={-hd + 8}
        x2={-hw + 8}
        y2={hd - 8}
        stroke="#7D6F5E"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </g>
  );
}
