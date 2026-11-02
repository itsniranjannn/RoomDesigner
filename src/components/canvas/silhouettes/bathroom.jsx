/** 2D plan symbols: bathroom and utility pieces. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function VanitySilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#3D3A36" strokeWidth="1.2" />
      {/* Stone countertop */}
      <rect x={-hw * 0.96} y={-hd * 0.92} width={widthCm * 0.96} height={depthCm * 0.92} rx={2} fill={subColor} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      {/* Inset basin and drain */}
      <ellipse cx={0} cy={hd * 0.12} rx={hw * 0.55} ry={hd * 0.58} fill="#F4F4F1" stroke="#9AA0A5" strokeWidth="1" />
      <circle cx={0} cy={hd * 0.12} r={2.2} fill="#6B7075" />
      {/* Tap at the back */}
      <rect x={-3} y={-hd * 0.88} width={6} height={Math.max(2, depthCm * 0.1)} rx={2} fill="#B7BCC0" />
      {/* Door split at the front edge */}
      <line x1={0} y1={hd * 0.8} x2={0} y2={hd} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
    </g>
  );
}

export function SquatToiletSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const padW = widthCm * 0.26;
  return (
    <g stroke="#7B8085" strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={5} fill={color} />
      {/* Foot pads with ribs */}
      <rect x={-hw * 0.82} y={hd * 0.1} width={padW} height={depthCm * 0.4} rx={2} fill="#E4E6E7" />
      <rect x={hw * 0.82 - padW} y={hd * 0.1} width={padW} height={depthCm * 0.4} rx={2} fill="#E4E6E7" />
      {[0.25, 0.45, 0.65].map((f, idx) => (
        <g key={idx} strokeWidth="0.6" stroke="#B7BCC0">
          <line x1={-hw * 0.82} y1={hd * (0.1 + 0.8 * f)} x2={-hw * 0.82 + padW} y2={hd * (0.1 + 0.8 * f)} />
          <line x1={hw * 0.82 - padW} y1={hd * (0.1 + 0.8 * f)} x2={hw * 0.82} y2={hd * (0.1 + 0.8 * f)} />
        </g>
      ))}
      {/* Elongated pan with drain */}
      <ellipse cx={0} cy={-hd * 0.1} rx={hw * 0.4} ry={hd * 0.72} fill={subColor} stroke="#9AA0A5" />
      <ellipse cx={0} cy={-hd * 0.5} rx={hw * 0.14} ry={hd * 0.14} fill="#3A3F44" stroke="none" />
    </g>
  );
}

export function TankSilhouette({ hw, hd, color, subColor, accentColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="#6B7075" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.78} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <circle cx={0} cy={0} r={r * 0.4} fill={subColor} stroke="#8E98A0" strokeWidth="0.8" />
      {/* Inlet and outlet pipes at the back */}
      <circle cx={-r * 0.35} cy={-r * 0.55} r={2.4} fill={accentColor} />
      <circle cx={r * 0.35} cy={-r * 0.55} r={2.4} fill="#B7BCC0" />
    </g>
  );
}

export function BasketSilhouette({ hw, hd, color, accentColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="#4A3B2B" strokeWidth="1.2" />
      {/* Woven rings */}
      <circle cx={0} cy={0} r={r * 0.82} fill="none" stroke={accentColor} strokeWidth="1" strokeDasharray="3 2" />
      <circle cx={0} cy={0} r={r * 0.62} fill="none" stroke={accentColor} strokeWidth="1" strokeDasharray="3 2" />
      <circle cx={0} cy={0} r={r * 0.42} fill="rgba(0,0,0,0.18)" stroke={accentColor} strokeWidth="0.8" />
      {/* Carry handles */}
      <rect x={-r - 1} y={-r * 0.16} width={5} height={r * 0.32} rx={2} fill={accentColor} />
      <rect x={r - 4} y={-r * 0.16} width={5} height={r * 0.32} rx={2} fill={accentColor} />
    </g>
  );
}
