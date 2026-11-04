/** 2D plan symbols: decor. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function PlantSilhouette({ hw, hd, color, subColor }) {
  const radius = Math.min(hw, hd) * 0.42;
  return (
    <g>
      <circle cx={0} cy={0} r={radius} fill={subColor} stroke="#A89B88" strokeWidth="1" />
      <circle cx={0} cy={0} r={radius * 0.75} fill="#4E3B2B" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        const lx = Math.sin(rad) * (hw * 0.85);
        const ly = -Math.cos(rad) * (hd * 0.85);
        return (
          <ellipse
            key={idx}
            cx={lx * 0.6}
            cy={ly * 0.6}
            rx={hw * 0.3}
            ry={hd * 0.16}
            transform={`rotate(${angle}, ${lx * 0.6}, ${ly * 0.6})`}
            fill={color}
            stroke="#2B3D33"
            strokeWidth="0.75"
          />
        );
      })}
    </g>
  );
}

export function LampSilhouette({ hw, hd, subColor }) {
  const radius = Math.min(hw, hd) * 0.45;
  return (
    <g>
      <circle
        cx={0}
        cy={hd * 0.4}
        r={radius * 0.6}
        fill="#262422"
        stroke="#111111"
        strokeWidth="1"
      />
      <path
        d={`M 0 ${hd * 0.4} Q ${hw * 0.6} ${0} 0 ${-hd * 0.3}`}
        fill="none"
        stroke="#262422"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx={0}
        cy={-hd * 0.3}
        r={radius * 0.85}
        fill={subColor}
        stroke="#B3A898"
        strokeWidth="1"
      />
      <circle cx={0} cy={-hd * 0.3} r={3} fill="#C97B4A" />
    </g>
  );
}

export function LampTripodSilhouette({ hw, hd, color, subColor }) {
  const radius = Math.min(hw, hd);
  return (
    <g>
      {[90, 210, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={0}
            y1={0}
            x2={Math.cos(rad) * radius * 0.92}
            y2={Math.sin(rad) * radius * 0.92}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={0} cy={0} r={radius * 0.6} fill={subColor} stroke="#B3A898" strokeWidth="1" />
      <circle cx={0} cy={0} r={radius * 0.46} fill="none" stroke="#B3A898" strokeWidth="0.6" />
      <circle cx={0} cy={0} r={Math.max(2, radius * 0.08)} fill="#C97B4A" />
    </g>
  );
}

export function LampTorchiereSilhouette({ hw, hd, color, subColor }) {
  const radius = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={radius * 0.96} fill={color} stroke="#111111" strokeWidth="1" />
      <circle cx={0} cy={0} r={radius * 0.72} fill={subColor} stroke="#B3A898" strokeWidth="1" />
      <circle cx={0} cy={0} r={radius * 0.22} fill="#F0DDB4" stroke="#B3A898" strokeWidth="0.8" />
    </g>
  );
}

export function WallMirrorSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#4A3B2B"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={widthCm - 6}
        height={depthCm - 6}
        fill="#B0D3E2"
        stroke="#7E9DAA"
        strokeWidth="0.8"
      />
      <line
        x1={-hw * 0.3}
        y1={-hd + 5}
        x2={-hw * 0.1}
        y2={hd - 5}
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1={hw * 0.1}
        y1={-hd + 5}
        x2={hw * 0.25}
        y2={hd - 5}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </g>
  );
}
