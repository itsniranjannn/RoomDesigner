/** 2D plan symbols: planters, round rugs and screens. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function PlanterSilhouette({ hw, hd, color, subColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={subColor} stroke="#8A7F70" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.82} fill="#4E3B2B" />
      {/* Foliage clusters */}
      {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        return <circle key={idx} cx={Math.sin(rad) * r * 0.42} cy={-Math.cos(rad) * r * 0.42} r={r * 0.34} fill={color} stroke="#2B3D33" strokeWidth="0.6" opacity="0.92" />;
      })}
      <circle cx={0} cy={0} r={r * 0.3} fill={color} stroke="#2B3D33" strokeWidth="0.6" />
    </g>
  );
}

export function RugRoundSilhouette({ hw, hd, color, subColor, accentColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <circle cx={0} cy={0} r={r * 0.92} fill="none" stroke={subColor} strokeWidth="2" />
      <circle cx={0} cy={0} r={r * 0.72} fill="none" stroke={accentColor} strokeWidth="3" />
      <circle cx={0} cy={0} r={r * 0.5} fill="none" stroke={subColor} strokeWidth="1.2" strokeDasharray="4 3" />
      {/* Central medallion */}
      <circle cx={0} cy={0} r={r * 0.26} fill={accentColor} />
      <circle cx={0} cy={0} r={r * 0.14} fill={subColor} />
    </g>
  );
}

export function ScreenSilhouette({ widthCm, hw, hd, color, accentColor }) {
  const panels = Math.min(6, Math.max(3, Math.round(widthCm / 50)));
  const step = widthCm / panels;
  const pts = Array.from({ length: panels + 1 }).map((_, idx) => `${-hw + idx * step},${idx % 2 === 0 ? -hd : hd}`);
  return (
    <g>
      {/* Folding panels drawn as a zigzag */}
      <polyline points={pts.join(' ')} fill="none" stroke="#2B2117" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts.join(' ')} fill="none" stroke={accentColor} strokeWidth="0.8" strokeDasharray="3 3" />
    </g>
  );
}
