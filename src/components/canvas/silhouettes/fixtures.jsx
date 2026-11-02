/** 2D plan symbols: fixtures. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function FixtureToiletSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g stroke="#7B8085" strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm * 0.3} rx={3} fill={color} />
      <ellipse cx={0} cy={depthCm * 0.12} rx={hw * 0.92} ry={depthCm * 0.4} fill={color} />
      <ellipse cx={0} cy={depthCm * 0.14} rx={hw * 0.62} ry={depthCm * 0.28} fill={subColor} stroke="#9AA0A5" />
      <circle cx={0} cy={-hd + depthCm * 0.14} r={2.6} fill="#B7BCC0" />
    </g>
  );
}

export function FixtureBasinSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g stroke="#7B8085" strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={6} fill={color} />
      <ellipse cx={0} cy={hd * 0.15} rx={hw * 0.72} ry={hd * 0.62} fill={subColor} stroke="#9AA0A5" />
      <circle cx={0} cy={hd * 0.15} r={2.4} fill="#6B7075" />
      <rect x={-3} y={-hd + 2} width={6} height={7} rx={2} fill="#B7BCC0" />
    </g>
  );
}

export function FixtureShowerSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g stroke="#6F8791" strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} fill={color} />
      <rect x={-hw + 4} y={-hd + 4} width={widthCm - 8} height={depthCm - 8} fill="none" strokeDasharray="5 3" />
      <line x1={-hw} y1={-hd} x2={hw} y2={hd} strokeOpacity="0.35" />
      <line x1={hw} y1={-hd} x2={-hw} y2={hd} strokeOpacity="0.35" />
      <circle cx={0} cy={0} r={4} fill={subColor} />
      <circle cx={-hw + 10} cy={-hd + 10} r={4} fill="#B7BCC0" />
    </g>
  );
}

export function FixtureBathtubSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g stroke="#7B8085" strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={10} fill={color} />
      <rect x={-hw + 7} y={-hd + 7} width={widthCm - 14} height={depthCm - 14} rx={Math.min(depthCm, widthCm) * 0.32} fill={subColor} stroke="#9AA0A5" />
      <circle cx={-hw + 16} cy={0} r={2.6} fill="#6B7075" />
      <rect x={hw - 12} y={-3} width={7} height={6} rx={2} fill="#B7BCC0" />
    </g>
  );
}

export function FixtureWasherSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return (
    <g stroke="#6B7075" strokeWidth="1.2">
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} />
      <circle cx={0} cy={hd * 0.15} r={Math.min(hw, hd) * 0.6} fill={subColor} stroke="#9AA0A5" />
      <circle cx={0} cy={hd * 0.15} r={Math.min(hw, hd) * 0.38} fill="none" stroke="#C9CED1" />
      <rect x={-hw + 5} y={-hd + 4} width={widthCm * 0.5} height={5} rx={2} fill="#B7BCC0" />
    </g>
  );
}
