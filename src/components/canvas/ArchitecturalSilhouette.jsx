import React from 'react';

/**
 * ArchitecturalSilhouette.jsx
 * Professional, category-differentiated 2D architectural drafting graphics.
 * Used both on the 2D drafting canvas and in catalog swatch previews.
 * 
 * Coordinates: Centered at (0, 0) with dimensions widthCm x depthCm.
 */
export function ArchitecturalSilhouette({ item, widthCm, depthCm, isSwatch = false }) {
  const hw = widthCm / 2;
  const hd = depthCm / 2;

  const {
    color = '#8B6F47',
    fabricColor = '#FAF6EE',
    headboardColor = '#5A554E',
    accentColor = '#C4B8A5',
    cushionColor = '#4A5057',
    subColor = '#323639',
    handleColor = '#C4A869',
    shapeType = 'table',
  } = item;

  switch (shapeType) {
    case 'bed': {
      const isSingle = widthCm < 120;
      const pillowW = isSingle ? widthCm * 0.65 : widthCm * 0.38;
      const pillowH = depthCm * 0.2;
      const duvetTopY = -hd + depthCm * 0.44;

      return (
        <g>
          {/* Bed Base Frame */}
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={4}
            fill={color}
            stroke="#3D2A1C"
            strokeWidth="1.2"
          />

          {/* Wooden / Upholstered Headboard at top */}
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm * 0.12}
            rx={2}
            fill={headboardColor}
          />

          {/* Mattress */}
          <rect
            x={-hw + 3}
            y={-hd + depthCm * 0.12 + 2}
            width={widthCm - 6}
            height={depthCm * 0.88 - 5}
            rx={3}
            fill={fabricColor}
            stroke="#D8CFBF"
            strokeWidth="0.8"
          />

          {/* Pillows */}
          {isSingle ? (
            <rect
              x={-pillowW / 2}
              y={-hd + depthCm * 0.16}
              width={pillowW}
              height={pillowH}
              rx={3}
              fill="#FFFFFF"
              stroke="#D4C9BA"
              strokeWidth="0.8"
            />
          ) : (
            <>
              <rect
                x={-hw + widthCm * 0.08}
                y={-hd + depthCm * 0.16}
                width={pillowW}
                height={pillowH}
                rx={3}
                fill="#FFFFFF"
                stroke="#D4C9BA"
                strokeWidth="0.8"
              />
              <rect
                x={hw - widthCm * 0.08 - pillowW}
                y={-hd + depthCm * 0.16}
                width={pillowW}
                height={pillowH}
                rx={3}
                fill="#FFFFFF"
                stroke="#D4C9BA"
                strokeWidth="0.8"
              />
            </>
          )}

          {/* Duvet / Throw Quilt across lower bed */}
          <path
            d={`M ${-hw + 3} ${duvetTopY} L ${hw - 3} ${duvetTopY} L ${hw - 3} ${hd - 3} L ${-hw + 3} ${hd - 3} Z`}
            fill={accentColor}
            opacity="0.85"
          />

          {/* Turned-down sheet fold */}
          <line
            x1={-hw + 3}
            y1={duvetTopY}
            x2={hw - 3}
            y2={duvetTopY}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </g>
      );
    }

    case 'sofa': {
      const isLoveseat = widthCm < 180;
      const armW = widthCm * 0.12;
      const backH = depthCm * 0.28;
      const numCushions = isLoveseat ? 2 : 3;
      const cushionW = (widthCm - armW * 2) / numCushions;

      return (
        <g>
          {/* Base Frame */}
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={6}
            fill={color}
            stroke="#222222"
            strokeWidth="1.2"
          />

          {/* Padded Backrest */}
          <rect
            x={-hw + armW}
            y={-hd}
            width={widthCm - armW * 2}
            height={backH}
            rx={3}
            fill={cushionColor}
          />

          {/* Left Armrest */}
          <rect
            x={-hw}
            y={-hd}
            width={armW}
            height={depthCm}
            rx={4}
            fill={cushionColor}
            stroke="#222222"
            strokeWidth="0.8"
          />

          {/* Right Armrest */}
          <rect
            x={hw - armW}
            y={-hd}
            width={armW}
            height={depthCm}
            rx={4}
            fill={cushionColor}
            stroke="#222222"
            strokeWidth="0.8"
          />

          {/* Seat Cushions */}
          {Array.from({ length: numCushions }).map((_, idx) => (
            <rect
              key={idx}
              x={-hw + armW + idx * cushionW + 1}
              y={-hd + backH + 1}
              width={cushionW - 2}
              height={depthCm - backH - 3}
              rx={3}
              fill={color}
              stroke="#2B2B2B"
              strokeWidth="0.6"
            />
          ))}
        </g>
      );
    }

    case 'armchair': {
      const armW = widthCm * 0.18;
      const backH = depthCm * 0.28;

      return (
        <g>
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={6}
            fill={color}
            stroke="#222222"
            strokeWidth="1.2"
          />

          {/* Curved Backrest */}
          <rect
            x={-hw + armW * 0.5}
            y={-hd}
            width={widthCm - armW}
            height={backH}
            rx={4}
            fill={cushionColor}
          />

          {/* Left Armrest */}
          <rect
            x={-hw}
            y={-hd}
            width={armW}
            height={depthCm}
            rx={4}
            fill={cushionColor}
          />

          {/* Right Armrest */}
          <rect
            x={hw - armW}
            y={-hd}
            width={armW}
            height={depthCm}
            rx={4}
            fill={cushionColor}
          />

          {/* Deep Seat Cushion */}
          <rect
            x={-hw + armW + 2}
            y={-hd + backH + 2}
            width={widthCm - armW * 2 - 4}
            height={depthCm - backH - 5}
            rx={3}
            fill={color}
            stroke="#222222"
            strokeWidth="0.8"
          />
        </g>
      );
    }

    case 'chair': {
      return (
        <g>
          {/* Frame */}
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={4}
            fill={color}
            stroke="#1A1918"
            strokeWidth="1"
          />

          {/* Curved Backrest rail */}
          <path
            d={`M ${-hw + 3} ${-hd + 3} Q 0 ${-hd - 2} ${hw - 3} ${-hd + 3}`}
            fill="none"
            stroke="#1A1918"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Woven Cane / Cushion Seat Insert */}
          <rect
            x={-hw + 4}
            y={-hd + 8}
            width={widthCm - 8}
            height={depthCm - 12}
            rx={3}
            fill={cushionColor}
            stroke="#9E8D76"
            strokeWidth="0.8"
          />

          {/* Corner Leg Caps */}
          <circle cx={-hw + 6} cy={-hd + 6} r={2} fill="#111111" />
          <circle cx={hw - 6} cy={-hd + 6} r={2} fill="#111111" />
          <circle cx={-hw + 6} cy={hd - 6} r={2} fill="#111111" />
          <circle cx={hw - 6} cy={hd - 6} r={2} fill="#111111" />
        </g>
      );
    }

    case 'table': {
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

    case 'desk': {
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

    case 'coffee-table': {
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

    case 'nightstand': {
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

    case 'wardrobe': {
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

    case 'bookshelf': {
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

    case 'rug': {
      return (
        <g>
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={4}
            fill={color}
            stroke="#9C8F7E"
            strokeWidth="0.8"
          />
          <rect
            x={-hw + 6}
            y={-hd + 6}
            width={widthCm - 12}
            height={depthCm - 12}
            rx={2}
            fill="none"
            stroke="#C4B8A5"
            strokeWidth="0.75"
            strokeDasharray="4 3"
          />
        </g>
      );
    }

    case 'chest-drawers': {
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

    case 'table-round': {
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

    case 'desk-chair': {
      return (
        <g>
          {[0, 72, 144, 216, 288].map((angle, idx) => {
            const rad = (angle * Math.PI) / 180;
            const lx = Math.sin(rad) * (hw * 0.85);
            const ly = -Math.cos(rad) * (hd * 0.85);
            return (
              <g key={idx}>
                <line x1={0} y1={0} x2={lx} y2={ly} stroke="#1C1A17" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={lx} cy={ly} r={2.5} fill="#111111" />
              </g>
            );
          })}
          <circle cx={0} cy={0} r={hw * 0.55} fill={cushionColor} stroke="#181818" strokeWidth="1" />
          <path
            d={`M ${-hw * 0.6} ${-hd * 0.55} Q 0 ${-hd * 0.8} ${hw * 0.6} ${-hd * 0.55}`}
            fill="none"
            stroke="#1C1A17"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      );
    }

    case 'kitchen-island': {
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

    case 'plant': {
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

    case 'lamp': {
      const radius = Math.min(hw, hd) * 0.45;
      return (
        <g>
          <circle cx={0} cy={hd * 0.4} r={radius * 0.6} fill="#262422" stroke="#111111" strokeWidth="1" />
          <path
            d={`M 0 ${hd * 0.4} Q ${hw * 0.6} ${0} 0 ${-hd * 0.3}`}
            fill="none"
            stroke="#262422"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={0} cy={-hd * 0.3} r={radius * 0.85} fill={subColor} stroke="#B3A898" strokeWidth="1" />
          <circle cx={0} cy={-hd * 0.3} r={3} fill="#C97B4A" />
        </g>
      );
    }

    case 'side-table': {
      const r = Math.min(hw, hd);
      return (
        <g>
          <circle cx={0} cy={0} r={r} fill={color} stroke="#3D2A1C" strokeWidth="1.2" />
          <circle cx={0} cy={0} r={r * 0.85} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
          <circle cx={0} cy={0} r={r * 0.4} fill={subColor} stroke="#6B5134" strokeWidth="0.8" />
        </g>
      );
    }

    case 'ottoman': {
      return (
        <g>
          <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={6} fill={color} stroke="#2D251E" strokeWidth="1.2" />
          <rect x={-hw + 4} y={-hd + 4} width={widthCm - 8} height={depthCm - 8} rx={4} fill={cushionColor} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
          <line x1={-hw + 10} y1={0} x2={hw - 10} y2={0} stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx={-hw * 0.35} cy={0} r={2} fill="#2D251E" />
          <circle cx={hw * 0.35} cy={0} r={2} fill="#2D251E" />
        </g>
      );
    }

    case 'bed-bunk': {
      const postSize = 6;
      return (
        <g>
          <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#2B3830" strokeWidth="1.4" />
          <rect x={-hw + postSize} y={-hd + depthCm * 0.12} width={widthCm - postSize * 2} height={depthCm * 0.82} rx={2} fill={fabricColor} stroke="#D4C8B8" strokeWidth="0.8" />
          <rect x={-hw + postSize + 4} y={-hd + depthCm * 0.15} width={widthCm * 0.65} height={depthCm * 0.18} rx={2} fill="#FFFFFF" stroke="#C8BCAB" strokeWidth="0.8" />
          <rect x={-hw + postSize} y={-hd + depthCm * 0.42} width={widthCm - postSize * 2} height={depthCm * 0.52} fill={accentColor} opacity={0.35} />
          <line x1={-hw + postSize} y1={-hd + depthCm * 0.42} x2={hw - postSize} y2={-hd + depthCm * 0.42} stroke={accentColor} strokeWidth="1.2" />
          {[[-hw, -hd], [hw - postSize, -hd], [-hw, hd - postSize], [hw - postSize, hd - postSize]].map(([px, py], i) => (
            <rect key={i} x={px} y={py} width={postSize} height={postSize} fill="#2B3830" />
          ))}
          <g transform={`translate(${hw - 8}, 0)`}>
            <rect x={-2} y={-hd + depthCm * 0.3} width={8} height={depthCm * 0.45} fill="#FAF6EE" stroke="#C97B4A" strokeWidth="1" />
            {[0.35, 0.45, 0.55, 0.65].map((t, idx) => (
              <line key={idx} x1={-1} y1={-hd + depthCm * t} x2={5} y2={-hd + depthCm * t} stroke="#C97B4A" strokeWidth="1.5" />
            ))}
          </g>
        </g>
      );
    }

    case 'vanity-dresser': {
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

    case 'bar-stool': {
      const r = Math.min(hw, hd);
      return (
        <g>
          <circle cx={0} cy={0} r={r * 0.95} fill="none" stroke="#1C1A17" strokeWidth="1.5" />
          <line x1={-r * 0.8} y1={-r * 0.8} x2={r * 0.8} y2={r * 0.8} stroke="#1C1A17" strokeWidth="1" />
          <line x1={r * 0.8} y1={-r * 0.8} x2={-r * 0.8} y2={r * 0.8} stroke="#1C1A17" strokeWidth="1" />
          <circle cx={0} cy={0} r={r * 0.75} fill={cushionColor} stroke={color} strokeWidth="1.5" />
          <path d={`M ${-r * 0.55} ${-r * 0.3} Q 0 ${-r * 0.75} ${r * 0.55} ${-r * 0.3}`} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    }

    case 'sideboard': {
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

    case 'kitchen-counter': {
      return (
        <g>
          <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#4A453C" strokeWidth="1.2" />
          <rect x={-hw * 0.7} y={-hd + 8} width={widthCm * 0.45} height={depthCm - 16} rx={3} fill="#C6CCD2" stroke="#8E98A0" strokeWidth="1" />
          <rect x={-hw * 0.7 + 3} y={-hd + 11} width={widthCm * 0.2} height={depthCm - 22} rx={2} fill="#E2E6EA" stroke="#AAB3BA" strokeWidth="0.8" />
          <rect x={-hw * 0.7 + widthCm * 0.22 + 3} y={-hd + 11} width={widthCm * 0.2} height={depthCm - 22} rx={2} fill="#E2E6EA" stroke="#AAB3BA" strokeWidth="0.8" />
          <circle cx={-hw * 0.7 + widthCm * 0.225} cy={-hd + 8} r={3} fill="#5A646E" />
          <path d={`M ${-hw * 0.7 + widthCm * 0.225} ${-hd + 8} Q ${-hw * 0.7 + widthCm * 0.225} ${-hd + 18} ${-hw * 0.7 + widthCm * 0.225} ${-hd + 20}`} fill="none" stroke="#5A646E" strokeWidth="2" strokeLinecap="round" />
          <rect x={hw * 0.1} y={-hd + 12} width={widthCm * 0.35} height={depthCm - 24} rx={2} fill="#C4A882" stroke="#9E805B" strokeWidth="0.8" />
        </g>
      );
    }

    case 'kitchen-stove': {
      return (
        <g>
          <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#111111" strokeWidth="1.4" />
          <circle cx={-hw * 0.45} cy={-hd * 0.35} r={hw * 0.28} fill="#181A1B" stroke="#444444" strokeWidth="1" />
          <circle cx={hw * 0.45} cy={-hd * 0.35} r={hw * 0.24} fill="#181A1B" stroke="#444444" strokeWidth="1" />
          <circle cx={-hw * 0.45} cy={hd * 0.25} r={hw * 0.24} fill="#181A1B" stroke="#444444" strokeWidth="1" />
          <circle cx={hw * 0.45} cy={hd * 0.25} r={hw * 0.32} fill="#181A1B" stroke="#444444" strokeWidth="1" />
          {[
            [-hw * 0.45, -hd * 0.35, hw * 0.28],
            [hw * 0.45, -hd * 0.35, hw * 0.24],
            [-hw * 0.45, hd * 0.25, hw * 0.24],
            [hw * 0.45, hd * 0.25, hw * 0.32],
          ].map(([bx, by, br], idx) => (
            <g key={idx}>
              <line x1={bx - br * 0.7} y1={by} x2={bx + br * 0.7} y2={by} stroke="#666666" strokeWidth="1" />
              <line x1={bx} y1={by - br * 0.7} x2={bx} y2={by + br * 0.7} stroke="#666666" strokeWidth="1" />
            </g>
          ))}
          <line x1={-hw + 4} y1={hd - 6} x2={hw - 4} y2={hd - 6} stroke="#555555" strokeWidth="0.8" />
          {[-hw * 0.6, -hw * 0.2, hw * 0.2, hw * 0.6].map((kx, i) => (
            <circle key={i} cx={kx} cy={hd - 3} r={2} fill="#C4A869" />
          ))}
        </g>
      );
    }

    case 'kitchen-fridge': {
      return (
        <g>
          <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} stroke="#3E4348" strokeWidth="1.2" />
          <line x1={0} y1={-hd} x2={0} y2={hd - 14} stroke="#2D3034" strokeWidth="1.2" />
          <line x1={-hw} y1={hd - 14} x2={hw} y2={hd - 14} stroke="#2D3034" strokeWidth="1.5" />
          <rect x={-4} y={-hd * 0.4} width={2} height={depthCm * 0.45} rx={0.5} fill={handleColor} />
          <rect x={2} y={-hd * 0.4} width={2} height={depthCm * 0.45} rx={0.5} fill={handleColor} />
          <rect x={-hw * 0.4} y={hd - 10} width={widthCm * 0.8} height={2.5} rx={0.5} fill={handleColor} />
        </g>
      );
    }

    case 'dining-nook': {
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
          <line x1={-hw + 8} y1={-hd + 8} x2={hw - 8} y2={-hd + 8} stroke="#7D6F5E" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={-hw + 8} y1={-hd + 8} x2={-hw + 8} y2={hd - 8} stroke="#7D6F5E" strokeWidth="1" strokeDasharray="3 3" />
        </g>
      );
    }

    case 'pantry-cabinet': {
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

    case 'rug-runner': {
      return (
        <g>
          <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#B5A894" strokeWidth="0.8" />
          <rect x={-hw + 4} y={-hd + 4} width={widthCm - 8} height={depthCm - 8} fill="none" stroke={subColor} strokeWidth="1" />
          {[-hd, hd].map((fy, i) => (
            <line key={i} x1={-hw + 2} y1={fy} x2={hw - 2} y2={fy} stroke="#C4B8A5" strokeWidth="1.5" strokeDasharray="2 2" />
          ))}
        </g>
      );
    }

    case 'wall-mirror': {
      return (
        <g>
          <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={color} stroke="#4A3B2B" strokeWidth="1.2" />
          <rect x={-hw + 3} y={-hd + 3} width={widthCm - 6} height={depthCm - 6} fill="#B0D3E2" stroke="#7E9DAA" strokeWidth="0.8" />
          <line x1={-hw * 0.3} y1={-hd + 5} x2={-hw * 0.1} y2={hd - 5} stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round" />
          <line x1={hw * 0.1} y1={-hd + 5} x2={hw * 0.25} y2={hd - 5} stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" strokeLinecap="round" />
        </g>
      );
    }

    case 'credenza':
    default: {
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
  }
}

