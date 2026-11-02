/** 2D plan symbols: storage. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function WardrobeSilhouette({ widthCm, depthCm, hw, hd, color, handleColor }) {
  const numDoors = widthCm > 140 ? 3 : 2;
  const doorW = widthCm / numDoors;

  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#2B2620"
        strokeWidth="1.2"
      />

      {/* Dashed Hanging Clothes Rail */}
      <line
        x1={-hw + 8}
        y1={0}
        x2={hw - 8}
        y2={0}
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* Door panel divisions */}
      {Array.from({ length: numDoors - 1 }).map((_, idx) => {
        const dx = -hw + (idx + 1) * doorW;
        return (
          <line
            key={idx}
            x1={dx}
            y1={-hd}
            x2={dx}
            y2={hd}
            stroke="#2B2620"
            strokeWidth="1"
          />
        );
      })}

      {/* Vertical Door Pulls */}
      {Array.from({ length: numDoors }).map((_, idx) => {
        const hx = -hw + idx * doorW + doorW / 2;
        return (
          <line
            key={idx}
            x1={hx}
            y1={hd - 8}
            x2={hx}
            y2={hd - 2}
            stroke={handleColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

export function BookshelfSilhouette({ widthCm, depthCm, hw, hd, color }) {
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

      {/* Back panel inset */}
      <line
        x1={-hw + 3}
        y1={-hd + 3}
        x2={hw - 3}
        y2={-hd + 3}
        stroke="#241910"
        strokeWidth="1.5"
      />

      {/* Colorful Book Spine Blocks along the shelf */}
      <g transform={`translate(${-hw + 8}, ${-hd + 6})`}>
        <rect x={0} y={0} width={8} height={depthCm - 12} fill="#C97B4A" rx={1} />
        <rect x={10} y={0} width={12} height={depthCm - 12} fill="#4A5D52" rx={1} />
        <rect x={24} y={0} width={9} height={depthCm - 12} fill="#BA9E7B" rx={1} />
        <rect x={35} y={0} width={14} height={depthCm - 12} fill="#3E444A" rx={1} />
        <rect x={51} y={0} width={7} height={depthCm - 12} fill="#8C7A65" rx={1} />
        <rect x={60} y={0} width={11} height={depthCm - 12} fill="#C4A869" rx={1} />
      </g>
    </g>
  );
}

export function ChestDrawersSilhouette({ widthCm, depthCm, hw, hd, color, handleColor }) {
  const numDrawers = 3;
  const tierH = depthCm / numDrawers;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#2B2117"
        strokeWidth="1.2"
      />
      {Array.from({ length: numDrawers }).map((_, idx) => {
        const dy = -hd + idx * tierH;
        return (
          <g key={idx}>
            {idx > 0 && (
              <line
                x1={-hw}
                y1={dy}
                x2={hw}
                y2={dy}
                stroke="#2B2117"
                strokeWidth="0.8"
              />
            )}
            <line
              x1={-14}
              y1={dy + tierH / 2}
              x2={14}
              y2={dy + tierH / 2}
              stroke={handleColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
}

export function SideboardSilhouette({ widthCm, depthCm, hw, hd, color, subColor, handleColor }) {
  const numDoors = 3;
  const doorW = widthCm / numDoors;
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#2D1C10" strokeWidth="1.2" />
      {Array.from({ length: numDoors - 1 }).map((_, i) => (
        <line key={i} x1={-hw + (i + 1) * doorW} y1={-hd} x2={-hw + (i + 1) * doorW} y2={hd} stroke="#3D2817" strokeWidth="1" />
      ))}
      {Array.from({ length: numDoors }).map((_, i) => (
        <rect key={i} x={-hw + (i + 0.5) * doorW - 6} y={hd - 5} width={12} height={2} rx={0.5} fill={handleColor} />
      ))}
      <ellipse cx={0} cy={0} rx={widthCm * 0.25} ry={depthCm * 0.2} fill={subColor} stroke="#A88B68" strokeWidth="0.6" />
    </g>
  );
}

export function VanityDresserSilhouette({ widthCm, depthCm, hw, hd, color, subColor, handleColor }) {
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#3D2B1C" strokeWidth="1.2" />
      <line x1={-hw * 0.7} y1={-hd + 3} x2={hw * 0.7} y2={-hd + 3} stroke="#C4A869" strokeWidth="2.5" />
      <ellipse cx={0} cy={-hd + 5} rx={widthCm * 0.3} ry={4} fill="#B0D3E2" stroke="#759FB0" strokeWidth="0.8" />
      <line x1={0} y1={-hd + 8} x2={0} y2={hd - 4} stroke="#4A3728" strokeWidth="1" />
      <rect x={-hw * 0.4 - 6} y={hd - 6} width={12} height={2.5} rx={1} fill={handleColor} />
      <rect x={hw * 0.4 - 6} y={hd - 6} width={12} height={2.5} rx={1} fill={handleColor} />
      <rect x={-hw * 0.4} y={-hd * 0.2} width={widthCm * 0.35} height={depthCm * 0.4} rx={2} fill={subColor} stroke="#A88B68" strokeWidth="0.6" />
    </g>
  );
}

export function CredenzaSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#22180E"
        strokeWidth="1.2"
      />
      {/* Slatted Tambour Wood Groove Lines */}
      {Array.from({ length: Math.floor(widthCm / 14) }).map((_, idx) => {
        const sx = -hw + 7 + idx * 14;
        return (
          <line
            key={idx}
            x1={sx}
            y1={-hd + 3}
            x2={sx}
            y2={hd - 3}
            stroke="rgba(0, 0, 0, 0.25)"
            strokeWidth="0.8"
          />
        );
      })}
      {/* Centered Media / Soundbar Device Outline */}
      <rect
        x={-widthCm * 0.22}
        y={-5}
        width={widthCm * 0.44}
        height={10}
        rx={2}
        fill="#1E1E1E"
        stroke="#444444"
        strokeWidth="0.5"
      />
    </g>
  );
}

export function PantryCabinetSilhouette({ widthCm, depthCm, hw, hd, color, handleColor }) {
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#222B24" strokeWidth="1.2" />
      <line x1={0} y1={-hd} x2={0} y2={hd} stroke="#222B24" strokeWidth="1.2" />
      {[-hd * 0.5, 0, hd * 0.5].map((sy, i) => (
        <line key={i} x1={-hw + 4} y1={sy} x2={hw - 4} y2={sy} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeDasharray="2 3" />
      ))}
      <rect x={-4} y={-8} width={2} height={16} rx={0.5} fill={handleColor} />
      <rect x={2} y={-8} width={2} height={16} rx={0.5} fill={handleColor} />
    </g>
  );
}

export function TvSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  return <g><rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#080909" strokeWidth="1.2" /><rect x={-hw + 5} y={-hd + 3} width={widthCm - 10} height={depthCm - 7} fill="#293B4A" stroke={subColor} strokeWidth="1" /><line x1={0} y1={hd} x2={0} y2={hd + 7} stroke="#080909" strokeWidth="2" /><line x1={-12} y1={hd + 7} x2={12} y2={hd + 7} stroke="#080909" strokeWidth="2" /></g>;
}
