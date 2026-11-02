/** 2D plan symbols: floor-standing kitchen units. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function SinkUnitSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  const bowlW = widthCm * 0.22;
  const bowlH = depthCm * 0.62;
  const boardX = widthCm * 0.06;
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#4A453C" strokeWidth="1.2" />
      {/* Double stainless bowls */}
      {[-hw + widthCm * 0.05, -hw + widthCm * 0.29].map((bx, idx) => (
        <g key={idx}>
          <rect x={bx} y={-hd + depthCm * 0.2} width={bowlW} height={bowlH} rx={4} fill="#C6CCD2" stroke="#8E98A0" strokeWidth="1" />
          <circle cx={bx + bowlW / 2} cy={-hd + depthCm * 0.2 + bowlH / 2} r={2} fill="#5A646E" />
        </g>
      ))}
      {/* Tap at the back */}
      <circle cx={-hw + widthCm * 0.27} cy={-hd + depthCm * 0.1} r={3} fill="#5A646E" />
      {/* Drainer board with ribs */}
      <rect x={boardX} y={-hd + depthCm * 0.12} width={hw - boardX - widthCm * 0.04} height={depthCm * 0.76} rx={2} fill={subColor} stroke="#8E98A0" strokeWidth="0.8" />
      {[0.25, 0.4, 0.55, 0.7, 0.85].map((f, idx) => (
        <line
          key={idx}
          x1={boardX + (hw - boardX - widthCm * 0.04) * 0.08}
          y1={-hd + depthCm * (0.12 + 0.76 * f)}
          x2={boardX + (hw - boardX - widthCm * 0.04) * 0.92}
          y2={-hd + depthCm * (0.12 + 0.76 * f)}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.8"
        />
      ))}
    </g>
  );
}

export function ApplianceSilhouette({ widthCm, depthCm, hw, hd, color, subColor, accentColor }) {
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#4A5057" strokeWidth="1.2" />
      <rect x={-hw * 0.94} y={-hd * 0.9} width={widthCm * 0.94} height={depthCm * 0.9} rx={2} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" />
      {/* Control strip along the front edge */}
      <rect x={-hw * 0.9} y={hd * 0.62} width={widthCm * 0.9} height={depthCm * 0.2} rx={2} fill={subColor} />
      <circle cx={-hw * 0.55} cy={hd * 0.72} r={2.4} fill={accentColor} />
      <circle cx={hw * 0.55} cy={hd * 0.72} r={2.4} fill={accentColor} />
      <rect x={-widthCm * 0.14} y={hd * 0.68} width={widthCm * 0.28} height={depthCm * 0.07} rx={1} fill="#7FD1B9" opacity="0.8" />
    </g>
  );
}
