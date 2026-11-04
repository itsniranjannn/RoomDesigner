/** 2D plan symbols: bedroom pieces. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { LINE, HAIR, DETAIL, METAL, METAL_DARK, P } from './parts.jsx';

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
      <rect
        x={-hw - 1}
        y={-hd - 1}
        width={widthCm + 2}
        height={depthCm + 2}
        rx={3.5}
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.6"
      />
      {/* Triple mirror along the back edge: centre panel and two angled wings, with bulbs */}
      <rect
        x={-widthCm * 0.31}
        y={-hd}
        width={widthCm * 0.62}
        height={Math.max(3, depthCm * 0.08)}
        rx={1}
        fill="#B0D3E2"
        stroke="#4A3B2B"
        strokeWidth="0.8"
      />
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M ${s * widthCm * 0.31} ${-hd} L ${s * widthCm * 0.43} ${-hd + 7} L ${s * widthCm * 0.43} ${-hd + 9.5} L ${s * widthCm * 0.31} ${-hd + 3.6} Z`}
          fill="#B0D3E2"
          stroke="#4A3B2B"
          strokeWidth="0.6"
        />
      ))}
      {[-0.24, -0.12, 0, 0.12, 0.24].map((f) => (
        <circle key={f} cx={widthCm * f} cy={-hd + 1.8} r={0.9} fill="#FFF1CC" stroke="none" />
      ))}
      {/* Drawer banks either side of the knee space, with knobs */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={s < 0 ? -hw + 3 : hw - 3 - drawerW}
            y={-hd + depthCm * 0.2}
            width={drawerW}
            height={depthCm * 0.75}
            rx={2}
            fill={subColor}
            opacity="0.55"
            stroke={DETAIL}
            strokeWidth="0.6"
          />
          <line
            x1={s < 0 ? -hw + 3 : hw - 3 - drawerW}
            y1={hd - 5}
            x2={s < 0 ? -hw + 3 + drawerW : hw - 3}
            y2={hd - 5}
            stroke={DETAIL}
            strokeWidth="0.7"
          />
          <circle
            cx={(s < 0 ? -hw + 3 : hw - 3 - drawerW) + drawerW / 2}
            cy={hd - 2.6}
            r={1.5}
            fill={handleColor}
            stroke={LINE}
            strokeWidth="0.4"
          />
        </g>
      ))}
      <rect
        x={-widthCm * 0.18}
        y={hd - 7}
        width={widthCm * 0.36}
        height={5}
        rx={1}
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.6"
      />
      <circle cx={0} cy={hd - 4.5} r={1.3} fill={handleColor} stroke={LINE} strokeWidth="0.4" />
      {/* Tabletop: jewellery box, perfume bottles, tray */}
      <rect
        x={hw * 0.45}
        y={-hd * 0.3}
        width={widthCm * 0.16}
        height={depthCm * 0.2}
        rx={1.5}
        fill="#8A6F4E"
        stroke={LINE}
        strokeWidth="0.5"
      />
      <circle
        cx={-hw * 0.28}
        cy={-hd * 0.45}
        r={2.8}
        fill="#E8D5E0"
        stroke={METAL_DARK}
        strokeWidth="0.5"
      />
      <circle
        cx={hw * 0.22}
        cy={-hd * 0.4}
        r={2.3}
        fill="#C7DDE4"
        stroke={METAL_DARK}
        strokeWidth="0.5"
      />
      <rect
        x={-hw * 0.72}
        y={-hd * 0.3}
        width={widthCm * 0.16}
        height={depthCm * 0.2}
        rx={1.5}
        fill="#F1E8D8"
        stroke={DETAIL}
        strokeWidth="0.5"
      />
      {[
        [-hw + 3, -hd + 3],
        [hw - 3, -hd + 3],
        [-hw + 3, hd - 3],
        [hw - 3, hd - 3],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={1.8}
          fill="none"
          stroke={HAIR}
          strokeWidth="0.6"
          strokeDasharray="2 1.5"
        />
      ))}
    </g>
  );
}

export function CribSilhouette({ widthCm, depthCm, hw, hd, color, fabricColor, accentColor }) {
  const slats = Math.max(8, Math.round(widthCm / 8));
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={color}
        stroke="#7D6F5E"
        strokeWidth="1.2"
      />
      {/* Teething rails and slatted long sides */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <line
            x1={-hw + 5}
            y1={s * (hd - 2.5)}
            x2={hw - 5}
            y2={s * (hd - 2.5)}
            stroke="#7D6F5E"
            strokeWidth="2.4"
          />
          {Array.from({ length: slats }).map((_, i) => (
            <line
              key={i}
              x1={-hw + 8 + ((widthCm - 16) * i) / (slats - 1)}
              y1={s * (hd - 1)}
              x2={-hw + 8 + ((widthCm - 16) * i) / (slats - 1)}
              y2={s * (hd - 4)}
              stroke="#7D6F5E"
              strokeWidth="0.8"
            />
          ))}
        </g>
      ))}
      {/* Head and foot boards with inset panels */}
      {[-1, 1].map((s) => (
        <g key={`b${s}`}>
          <rect
            x={s < 0 ? -hw : hw - 4}
            y={-hd + 4}
            width={4}
            height={P(depthCm - 8)}
            fill="#7D6F5E"
            fillOpacity="0.5"
            stroke="#7D6F5E"
            strokeWidth="0.7"
          />
        </g>
      ))}
      {/* Mattress with piping, striped blanket and pillow */}
      <rect
        x={-hw + 7}
        y={-hd + 7}
        width={P(widthCm - 14)}
        height={P(depthCm - 14)}
        rx={3}
        fill={fabricColor}
        stroke="#C9BFAE"
        strokeWidth="0.8"
      />
      <rect
        x={-hw + 9.5}
        y={-hd + 9.5}
        width={P(widthCm - 19)}
        height={P(depthCm - 19)}
        rx={2}
        fill="none"
        stroke="#DCD3C3"
        strokeWidth="0.5"
      />
      <rect
        x={-hw + widthCm * 0.3}
        y={-hd + 9}
        width={widthCm * 0.55}
        height={P(depthCm - 18)}
        rx={2}
        fill={accentColor}
        fillOpacity="0.85"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.6"
      />
      {[0.4, 0.55, 0.7].map((f) => (
        <line
          key={f}
          x1={-hw + widthCm * f}
          y1={-hd + 10}
          x2={-hw + widthCm * f}
          y2={hd - 10}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.4"
        />
      ))}
      <rect
        x={-hw + 10}
        y={-hd + depthCm * 0.3}
        width={widthCm * 0.2}
        height={depthCm * 0.4}
        rx={4}
        fill="#FFFFFF"
        stroke="#C8BCAB"
        strokeWidth="0.7"
      />
      {[
        [-hw + 2.5, -hd + 2.5],
        [hw - 2.5, -hd + 2.5],
        [-hw + 2.5, hd - 2.5],
        [hw - 2.5, hd - 2.5],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.2} fill="#7D6F5E" stroke="none" />
      ))}
    </g>
  );
}

export function TrunkSilhouette({ widthCm, depthCm, hw, hd, color, accentColor, subColor }) {
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={3}
        fill={subColor}
        stroke="#3D2A1C"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={P(widthCm - 6)}
        height={P(depthCm - 6)}
        rx={2}
        fill={color}
        fillOpacity="0.45"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.7"
      />
      {/* Metal straps over the lid, studs, corner brackets */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={s * widthCm * 0.3 - 2.5}
            y={-hd}
            width={5}
            height={depthCm}
            fill={accentColor}
            stroke={LINE}
            strokeWidth="0.5"
          />
          {[0.22, 0.5, 0.78].map((f) => (
            <circle
              key={f}
              cx={s * widthCm * 0.3}
              cy={-hd + depthCm * f}
              r={0.9}
              fill="#E2BD66"
              stroke="none"
            />
          ))}
        </g>
      ))}
      {[
        [-hw, -hd],
        [hw - 5, -hd],
        [-hw, hd - 5],
        [hw - 5, hd - 5],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={5}
          height={5}
          fill={accentColor}
          stroke={LINE}
          strokeWidth="0.4"
        />
      ))}
      {/* Lock plate and hasp at the front, hinges at the back, side rope handles */}
      <rect
        x={-4}
        y={hd - 7}
        width={8}
        height={7}
        rx={1}
        fill={accentColor}
        stroke={LINE}
        strokeWidth="0.5"
      />
      <circle cx={0} cy={hd - 3.5} r={1.3} fill="#1A1A1A" stroke="none" />
      {[-1, 1].map((s) => (
        <rect
          key={`h${s}`}
          x={s * widthCm * 0.4 - 4}
          y={-hd - 0.5}
          width={8}
          height={3}
          fill={METAL}
          stroke={METAL_DARK}
          strokeWidth="0.4"
        />
      ))}
      <rect
        x={-hw - 2}
        y={-4}
        width={3}
        height={8}
        rx={1.5}
        fill="none"
        stroke="#C9B48A"
        strokeWidth="1"
      />
      <rect
        x={hw - 1}
        y={-4}
        width={3}
        height={8}
        rx={1.5}
        fill="none"
        stroke="#C9B48A"
        strokeWidth="1"
      />
    </g>
  );
}
