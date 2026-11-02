/** 2D plan symbols: nepali. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function NepaliChowkiSilhouette({ widthCm, depthCm, hw, hd, color, accentColor }) {
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#1A1615" strokeWidth="1.5" />
      <rect x={-hw + 5} y={-hd + 5} width={widthCm - 10} height={depthCm - 10} fill="none" stroke={accentColor} strokeWidth="1.5" />
      <path d={`M ${-hw + 8} 0 Q 0 ${-hd + 8} ${hw - 8} 0 Q 0 ${hd - 8} ${-hw + 8} 0`} fill="none" stroke={accentColor} strokeWidth="1" />
      {[[-hw + 7, -hd + 7], [hw - 7, -hd + 7], [-hw + 7, hd - 7], [hw - 7, hd - 7]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill={accentColor} />)}
    </g>
  );
}

export function NepaliPatukaChestSilhouette({ widthCm, depthCm, hw, hd, color, accentColor, subColor }) {
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#1A1615" strokeWidth="1.5" />
      <rect x={-hw + 5} y={-hd + 5} width={widthCm - 10} height={depthCm - 10} fill={subColor} stroke={accentColor} strokeWidth="1" />
      <line x1={0} y1={-hd + 6} x2={0} y2={hd - 6} stroke={accentColor} strokeWidth="1.5" />
      <circle cx={0} cy={0} r={4} fill={accentColor} />
      <path d={`M ${-hw + 8} ${-hd + 8} H ${hw - 8} M ${-hw + 8} ${hd - 8} H ${hw - 8}`} stroke={accentColor} strokeWidth="1" />
    </g>
  );
}

export function NepaliBrassDiyaSilhouette({ hw, hd, color, accentColor }) {
  return <g><circle cx={0} cy={0} r={hw * 0.8} fill={color} stroke="#806222" strokeWidth="1.4" /><circle cx={0} cy={0} r={hw * 0.45} fill={accentColor} /><path d={`M 0 ${-hd * 0.15} Q ${hw * 0.9} ${-hd * 0.65} ${hw * 0.65} ${-hd * 0.85}`} fill="none" stroke="#806222" strokeWidth="2" /><path d={`M ${hw * 0.55} ${-hd * 0.65} q 5 -8 10 0 q -5 10 -10 0`} fill={accentColor} /></g>;
}

export function NepaliPirkaSilhouette({ widthCm, depthCm, hw, hd, color }) {
  // Traditional low wooden stool with finger slot and twin end cleats
  const slotW = widthCm * 0.32;
  const slotH = depthCm * 0.22;
  return (
    <g>
      {/* Main Plank Body */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={4}
        fill={color}
        stroke="#1A1615"
        strokeWidth="1.4"
      />
      {/* Beveled Edge Inset */}
      <rect
        x={-hw + 2}
        y={-hd + 2}
        width={Math.max(0, widthCm - 4)}
        height={Math.max(0, depthCm - 4)}
        rx={2}
        fill="none"
        stroke="rgba(0, 0, 0, 0.25)"
        strokeWidth="0.8"
      />
      {/* Twin Under-Runner Cleats */}
      <line x1={-hw + 6} y1={-hd + 1} x2={-hw + 6} y2={hd - 1} stroke="#1A1615" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={hw - 6} y1={-hd + 1} x2={hw - 6} y2={hd - 1} stroke="#1A1615" strokeWidth="2.5" strokeLinecap="round" />
      {/* Center Finger Cutout Slot */}
      <rect
        x={-slotW / 2}
        y={-slotH / 2}
        width={slotW}
        height={slotH}
        rx={slotH / 2}
        fill="#1A1615"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth="0.5"
      />
    </g>
  );
}

export function NepaliCharpaiSilhouette({ widthCm, depthCm, hw, hd, color, fabricColor, cushionColor }) {
  // Handwoven daybed with turned corner timber posts and woven cord webbing
  const postSize = Math.min(10, widthCm / 4, depthCm / 4); // stays positive on tiny catalog previews
  return (
    <g>
      {/* Outer Timber Frame */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        fill={color}
        stroke="#1A1615"
        strokeWidth="1.5"
      />
      {/* Woven Cord Webbing Interior */}
      <rect
        x={-hw + postSize}
        y={-hd + postSize}
        width={widthCm - postSize * 2}
        height={depthCm - postSize * 2}
        fill={fabricColor}
        stroke="#1A1615"
        strokeWidth="1"
      />
      {/* Cross-Hatch Jute Webbing Pattern */}
      {Array.from({ length: 9 }).map((_, idx) => {
        const stepX = (-hw + postSize) + ((idx + 1) * (widthCm - postSize * 2)) / 10;
        return (
          <line
            key={`ch-v-${idx}`}
            x1={stepX}
            y1={-hd + postSize}
            x2={stepX}
            y2={hd - postSize}
            stroke="#B89868"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        );
      })}
      {Array.from({ length: 4 }).map((_, idx) => {
        const stepY = (-hd + postSize) + ((idx + 1) * (depthCm - postSize * 2)) / 5;
        return (
          <line
            key={`ch-h-${idx}`}
            x1={-hw + postSize}
            y1={stepY}
            x2={hw - postSize}
            y2={stepY}
            stroke="#B89868"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        );
      })}
      {/* Cylindrical Bolster Pillow at Left/Head */}
      <rect
        x={-hw + postSize + 6}
        y={-hd + postSize + 5}
        width={24}
        height={depthCm - postSize * 2 - 10}
        rx={8}
        fill={cushionColor}
        stroke="#1A1615"
        strokeWidth="1.2"
      />
      {/* 4 Turned Corner Posts */}
      <circle cx={-hw + postSize / 2} cy={-hd + postSize / 2} r={postSize / 2} fill="#382015" stroke="#1A1615" strokeWidth="1" />
      <circle cx={hw - postSize / 2} cy={-hd + postSize / 2} r={postSize / 2} fill="#382015" stroke="#1A1615" strokeWidth="1" />
      <circle cx={-hw + postSize / 2} cy={hd - postSize / 2} r={postSize / 2} fill="#382015" stroke="#1A1615" strokeWidth="1" />
      <circle cx={hw - postSize / 2} cy={hd - postSize / 2} r={postSize / 2} fill="#382015" stroke="#1A1615" strokeWidth="1" />
    </g>
  );
}

export function NepaliGaddaSilhouette({ widthCm, depthCm, hw, hd, color, accentColor, cushionColor }) {
  // Traditional floor mattress seating with piping & cylindrical side bolsters (takiya)
  const bolsterW = 20;
  return (
    <g>
      {/* Main Padded Floor Mattress */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={6}
        fill={color}
        stroke="#1A1615"
        strokeWidth="1.4"
      />
      {/* Inner Quilted Tufting Border */}
      <rect
        x={-hw + bolsterW + 6}
        y={-hd + 8}
        width={widthCm - (bolsterW + 6) * 2}
        height={depthCm - 16}
        rx={3}
        fill="none"
        stroke={accentColor}
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      {/* Tufting Buttons */}
      {[-widthCm * 0.15, 0, widthCm * 0.15].map((bx, i) => (
        <g key={i}>
          <circle cx={bx} cy={-depthCm * 0.18} r={2.5} fill="#1A1615" />
          <circle cx={bx} cy={0} r={2.5} fill="#1A1615" />
          <circle cx={bx} cy={depthCm * 0.18} r={2.5} fill="#1A1615" />
        </g>
      ))}
      {/* Left Cylindrical Takiya Bolster */}
      <rect
        x={-hw + 4}
        y={-hd + 6}
        width={bolsterW}
        height={depthCm - 12}
        rx={8}
        fill={cushionColor}
        stroke="#1A1615"
        strokeWidth="1.2"
      />
      {/* Right Cylindrical Takiya Bolster */}
      <rect
        x={hw - bolsterW - 4}
        y={-hd + 6}
        width={bolsterW}
        height={depthCm - 12}
        rx={8}
        fill={cushionColor}
        stroke="#1A1615"
        strokeWidth="1.2"
      />
    </g>
  );
}

export function NepaliDhokaDividerSilhouette({ widthCm, depthCm, hw, hd, color, accentColor, subColor }) {
  // 3-panel folding screen showing carved Jali lattice panels with brass pivot knuckles
  const panelW = widthCm / 3;
  return (
    <g>
      {[0, 1, 2].map((idx) => {
        const px = -hw + idx * panelW;
        return (
          <g key={idx}>
            {/* Panel Frame */}
            <rect
              x={px}
              y={-hd}
              width={panelW}
              height={depthCm}
              rx={2}
              fill={color}
              stroke="#1A1615"
              strokeWidth="1.4"
            />
            {/* Jali Lattice Inset */}
            <rect
              x={px + 4}
              y={-hd + 4}
              width={panelW - 8}
              height={depthCm - 8}
              fill={subColor}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="0.8"
            />
            {/* Micro Lattice Fretwork Grid */}
            {Array.from({ length: 3 }).map((_, li) => (
              <line
                key={`jl-${li}`}
                x1={px + 6 + li * ((panelW - 12) / 2)}
                y1={-hd + 4}
                x2={px + 6 + li * ((panelW - 12) / 2)}
                y2={hd - 4}
                stroke="#1A1615"
                strokeWidth="0.8"
              />
            ))}
            {/* Brass Folding Hinges between panels */}
            {idx < 2 && (
              <circle
                cx={px + panelW}
                cy={0}
                r={3}
                fill={accentColor}
                stroke="#1A1615"
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

export function NepaliPujaMandirSilhouette({ widthCm, depthCm, hw, hd, color, accentColor, subColor }) {
  // Traditional tiered household shrine / puja kotha shelf
  return (
    <g>
      {/* Base Plinth */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#1A1615"
        strokeWidth="1.5"
      />
      {/* Stepped Cornice Overhang */}
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={widthCm - 6}
        height={depthCm - 6}
        rx={1}
        fill="#3A1E11"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1"
      />
      {/* Sanctum Floor (Altar cloth) */}
      <rect
        x={-hw + 8}
        y={-hd + 8}
        width={widthCm - 16}
        height={depthCm - 16}
        fill={subColor}
        stroke="#1A1615"
        strokeWidth="0.8"
      />
      {/* Twin Carved Front Columns */}
      <circle cx={-hw + 11} cy={hd - 11} r={4} fill="#6E3E26" stroke="#1A1615" strokeWidth="1" />
      <circle cx={hw - 11} cy={hd - 11} r={4} fill="#6E3E26" stroke="#1A1615" strokeWidth="1" />
      {/* Center Brass Diyo / Bell Iconography */}
      <circle cx={0} cy={0} r={5} fill={accentColor} stroke="#1A1615" strokeWidth="1" />
      <path d="M 0 -7 L 4 -2 L -4 -2 Z" fill={accentColor} />
    </g>
  );
}

export function NepaliLotaDisplaySilhouette({ hw, color, accentColor, subColor }) {
  // Turned tripod pedestal with traditional polished brass Karuwa vessel
  return (
    <g>
      {/* Circular Pedestal Top */}
      <circle cx={0} cy={0} r={hw} fill={color} stroke="#1A1615" strokeWidth="1.4" />
      {/* Tripod Leg Radii */}
      <line x1={0} y1={0} x2={0} y2={-hw + 3} stroke="#1A1615" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={0} y1={0} x2={hw * 0.86} y2={hw * 0.5} stroke="#1A1615" strokeWidth="2.5" strokeLinecap="round" />
      <line x1={0} y1={0} x2={-hw * 0.86} y2={hw * 0.5} stroke="#1A1615" strokeWidth="2.5" strokeLinecap="round" />
      {/* Brass Karuwa Vessel Body */}
      <circle cx={0} cy={0} r={hw * 0.46} fill={accentColor} stroke="#806222" strokeWidth="1.2" />
      {/* Spout projection */}
      <path d={`M 3 -${hw * 0.3} Q 14 -${hw * 0.6} 12 -${hw * 0.8} Q 9 -${hw * 0.6} 0 -${hw * 0.4}`} fill={accentColor} stroke="#806222" strokeWidth="0.8" />
      {/* Spout Tip Opening */}
      <circle cx={12} cy={-hw * 0.8} r={2} fill="#1A1615" />
      {/* Karuwa Neck & Rim */}
      <circle cx={0} cy={0} r={hw * 0.2} fill={subColor} stroke="#806222" strokeWidth="1" />
    </g>
  );
}
