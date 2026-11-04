/** 2D plan symbols: bedroom pieces. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function DressingTableSilhouette({
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  subColor,
  handleColor,
}) {
  const drawerW = widthCm * 0.28;
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
      {/* Mirror standing along the back edge */}
      <rect
        x={-hw * 0.75}
        y={-hd}
        width={widthCm * 0.75}
        height={Math.max(2, depthCm * 0.1)}
        rx={1}
        fill="#B0D3E2"
        stroke="#4A3B2B"
        strokeWidth="0.8"
      />
      {/* Drawer bank on each side with the knee space in the middle */}
      <rect
        x={-hw + 3}
        y={-hd + depthCm * 0.2}
        width={drawerW}
        height={depthCm * 0.75}
        rx={2}
        fill={subColor}
        opacity="0.55"
      />
      <rect
        x={hw - 3 - drawerW}
        y={-hd + depthCm * 0.2}
        width={drawerW}
        height={depthCm * 0.75}
        rx={2}
        fill={subColor}
        opacity="0.55"
      />
      <circle cx={-hw + 3 + drawerW / 2} cy={hd - depthCm * 0.12} r={2} fill={handleColor} />
      <circle cx={hw - 3 - drawerW / 2} cy={hd - depthCm * 0.12} r={2} fill={handleColor} />
      {/* Tabletop clutter: tray and bottles */}
      <rect
        x={-widthCm * 0.14}
        y={-hd + depthCm * 0.2}
        width={widthCm * 0.28}
        height={depthCm * 0.2}
        rx={2}
        fill="rgba(255,255,255,0.3)"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.5"
      />
      <circle cx={-widthCm * 0.06} cy={-hd + depthCm * 0.3} r={2} fill={handleColor} />
      <circle cx={widthCm * 0.06} cy={-hd + depthCm * 0.3} r={1.5} fill="#FFFFFF" />
    </g>
  );
}

export function CribSilhouette({ widthCm, depthCm, hw, hd, color, fabricColor, accentColor }) {
  const bars = Math.max(4, Math.floor(widthCm / 9));
  const barStep = (widthCm * 0.86) / (bars - 1);
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
        x={-hw * 0.9}
        y={-hd * 0.8}
        width={widthCm * 0.9}
        height={depthCm * 0.8}
        rx={2}
        fill={fabricColor}
        stroke="#D8CFBF"
        strokeWidth="0.8"
      />
      {/* Blanket across the lower half */}
      <rect
        x={-hw * 0.9}
        y={0}
        width={widthCm * 0.9}
        height={hd * 0.8}
        rx={2}
        fill={accentColor}
        opacity="0.85"
      />
      {/* Rail slats along both long sides */}
      {Array.from({ length: bars }).map((_, idx) => {
        const bx = -hw * 0.86 + idx * barStep;
        return (
          <g key={idx}>
            <line x1={bx} y1={-hd} x2={bx} y2={-hd * 0.8} stroke="#3D2A1C" strokeWidth="1.4" />
            <line x1={bx} y1={hd * 0.8} x2={bx} y2={hd} stroke="#3D2A1C" strokeWidth="1.4" />
          </g>
        );
      })}
    </g>
  );
}

export function TrunkSilhouette({ widthCm, depthCm, hw, hd, color, accentColor, subColor }) {
  const strapW = widthCm * 0.06;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#2B1C12"
        strokeWidth="1.2"
      />
      {/* Lid seam and hinge line */}
      <rect
        x={-hw * 0.96}
        y={-hd * 0.9}
        width={widthCm * 0.96}
        height={depthCm * 0.9}
        rx={2}
        fill="none"
        stroke={subColor}
        strokeWidth="0.9"
      />
      <line
        x1={-hw * 0.96}
        y1={-hd * 0.7}
        x2={hw * 0.96}
        y2={-hd * 0.7}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.9"
      />
      {/* Metal straps and lock plate */}
      <rect
        x={-hw * 0.55 - strapW / 2}
        y={-hd}
        width={strapW}
        height={depthCm}
        fill={accentColor}
        opacity="0.9"
      />
      <rect
        x={hw * 0.55 - strapW / 2}
        y={-hd}
        width={strapW}
        height={depthCm}
        fill={accentColor}
        opacity="0.9"
      />
      <rect
        x={-widthCm * 0.03}
        y={hd * 0.4}
        width={widthCm * 0.06}
        height={depthCm * 0.18}
        rx={1}
        fill={accentColor}
        stroke="#806222"
        strokeWidth="0.6"
      />
    </g>
  );
}
