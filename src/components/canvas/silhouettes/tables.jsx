/** 2D plan symbols: tables. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function TableSilhouette({ widthCm, depthCm, hw, hd, color }) {
  // Large Dining Table with Place Settings / Beveled Edge
  const numPlaces = Math.max(2, Math.floor(widthCm / 55));
  const placeW = 32;
  const placeH = 18;
  const spacing = (widthCm - numPlaces * placeW) / (numPlaces + 1);

  return (
    <g>
      {/* Tabletop Surface */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={4}
        fill={color}
        stroke="#4A3A25"
        strokeWidth="1.2"
      />

      {/* Inset drafting wood bevel */}
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={widthCm - 6}
        height={depthCm - 6}
        rx={2}
        fill="none"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="0.75"
      />

      {/* Architectural Place Mats / Table Settings */}
      {Array.from({ length: numPlaces }).map((_, idx) => {
        const px = -hw + spacing + idx * (placeW + spacing);
        return (
          <g key={idx}>
            {/* Top place setting */}
            <rect
              x={px}
              y={-hd + 5}
              width={placeW}
              height={placeH}
              rx={2}
              fill="rgba(255, 255, 255, 0.2)"
              stroke="rgba(0, 0, 0, 0.15)"
              strokeWidth="0.5"
            />
            {/* Bottom place setting */}
            <rect
              x={px}
              y={hd - placeH - 5}
              width={placeW}
              height={placeH}
              rx={2}
              fill="rgba(255, 255, 255, 0.2)"
              stroke="rgba(0, 0, 0, 0.15)"
              strokeWidth="0.5"
            />
          </g>
        );
      })}

      {/* Center Table Runner */}
      <line
        x1={-hw + 10}
        y1={0}
        x2={hw - 10}
        y2={0}
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
    </g>
  );
}

export function TableRoundSilhouette({ hw, hd, color }) {
  const radius = Math.min(hw, hd);
  return (
    <g>
      <circle
        cx={0}
        cy={0}
        r={radius}
        fill={color}
        stroke="#4A3A25"
        strokeWidth="1.2"
      />
      <circle
        cx={0}
        cy={0}
        r={radius - 4}
        fill="none"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="0.75"
      />
      <circle
        cx={0}
        cy={0}
        r={radius * 0.35}
        fill="none"
        stroke="rgba(0, 0, 0, 0.12)"
        strokeWidth="0.5"
        strokeDasharray="3 3"
      />
    </g>
  );
}

export function CoffeeTableSilhouette({ widthCm, depthCm, hw, hd, color }) {
  return (
    <g>
      {/* Stone / Wood Slab */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={6}
        fill={color}
        stroke="#8A8275"
        strokeWidth="1.2"
      />
      {/* Inset chamfer line */}
      <rect
        x={-hw + 4}
        y={-hd + 4}
        width={widthCm - 8}
        height={depthCm - 8}
        rx={3}
        fill="none"
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth="0.75"
      />
      {/* Stack of Art / Architecture Books */}
      <rect
        x={-hw + 10}
        y={-hd + 8}
        width={24}
        height={16}
        rx={1}
        fill="#C97B4A"
        opacity="0.8"
      />
      <rect
        x={-hw + 13}
        y={-hd + 10}
        width={22}
        height={14}
        rx={1}
        fill="#4A5D52"
        opacity="0.9"
      />
    </g>
  );
}

export function SideTableSilhouette({ hw, hd, color, subColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      <circle cx={0} cy={0} r={r} fill={color} stroke="#3D2A1C" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.85} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
      <circle cx={0} cy={0} r={r * 0.4} fill={subColor} stroke="#6B5134" strokeWidth="0.8" />
    </g>
  );
}

export function DeskSilhouette({ widthCm, depthCm, hw, hd, color, subColor }) {
  // Writing Desk with leather blotter pad, laptop outline & drawer bank
  const drawerW = widthCm * 0.26;
  const padW = widthCm * 0.46;
  const padH = depthCm * 0.52;

  return (
    <g>
      {/* Desktop */}
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

      {/* Right Pedestal Drawer Bank Division */}
      <line
        x1={hw - drawerW}
        y1={-hd}
        x2={hw - drawerW}
        y2={hd}
        stroke="#2B2117"
        strokeWidth="1"
      />
      {/* Drawer Pull */}
      <line
        x1={hw - drawerW / 2 - 8}
        y1={hd - 6}
        x2={hw - drawerW / 2 + 8}
        y2={hd - 6}
        stroke="#C4A869"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Cable Grommet at back */}
      <circle cx={-hw + 14} cy={-hd + 12} r={3.5} fill="#242321" />

      {/* Central Leather Desk Blotter Pad */}
      <rect
        x={-padW / 2 - 8}
        y={hd - padH - 4}
        width={padW}
        height={padH}
        rx={2}
        fill={subColor}
      />

      {/* Laptop / Notebook Silhouette */}
      <rect
        x={-padW / 2 + 4}
        y={hd - padH + 2}
        width={padW - 24}
        height={padH - 8}
        rx={1.5}
        fill="#DCD6CD"
        stroke="#999187"
        strokeWidth="0.5"
      />
    </g>
  );
}

export function NightstandSilhouette({ widthCm, depthCm, hw, hd, color }) {
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
      {/* Front Drawer seam */}
      <line
        x1={-hw + 4}
        y1={hd - 6}
        x2={hw - 4}
        y2={hd - 6}
        stroke="#3D2A1C"
        strokeWidth="0.8"
      />
      {/* Brass drawer knob */}
      <circle cx={0} cy={hd - 6} r={1.8} fill="#222222" />

      {/* Ceramic Bedside Lamp Silhouette */}
      <circle cx={-hw + 14} cy={-hd + 14} r={7} fill="#FAF6EE" stroke="#C4B9A7" strokeWidth="0.8" />
      <circle cx={-hw + 14} cy={-hd + 14} r={2.5} fill="#C97B4A" />
    </g>
  );
}
