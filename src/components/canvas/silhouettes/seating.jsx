/** 2D plan symbols: seating. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { LINE, HAIR, DETAIL, METAL, METAL_DARK, P } from './parts.jsx';

function Foot({ x, y, r = 2.4, color = '#2B1C12' }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth="0.7"
      strokeDasharray="2 1.5"
    />
  );
}

function ScatterCushion({ x, y, s = 16, angle = 20, fill = '#EADFCB' }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect
        x={-s / 2}
        y={-s / 2}
        width={s}
        height={s}
        rx={3}
        fill={fill}
        stroke={LINE}
        strokeWidth="0.6"
      />
      <rect
        x={-s / 2 + 2}
        y={-s / 2 + 2}
        width={P(s - 4)}
        height={P(s - 4)}
        rx={2}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.5"
      />
      <line x1={-s / 2 + 2} y1={0} x2={s / 2 - 2} y2={0} stroke={HAIR} strokeWidth="0.5" />
    </g>
  );
}

export function SofaSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  const numCushions = widthCm < 180 ? 2 : 3;
  const armW = widthCm * 0.11;
  const backH = depthCm * 0.28;
  const cushionW = (widthCm - armW * 2) / numCushions;
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
      {/* Padded backrest with loose back cushions and buttons */}
      <rect
        x={-hw + armW}
        y={-hd + 1}
        width={P(widthCm - armW * 2)}
        height={backH}
        rx={3}
        fill={cushionColor}
        stroke={LINE}
        strokeWidth="0.6"
      />
      {Array.from({ length: numCushions }).map((_, i) => (
        <g key={i}>
          <rect
            x={-hw + armW + cushionW * i + 2}
            y={-hd + 3}
            width={P(cushionW - 4)}
            height={P(backH - 5)}
            rx={3}
            fill="none"
            stroke={DETAIL}
            strokeWidth="0.6"
          />
          <circle
            cx={-hw + armW + cushionW * (i + 0.5)}
            cy={-hd + backH * 0.5 + 1}
            r={1}
            fill={DETAIL}
          />
        </g>
      ))}
      {/* Armrests with top welting */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={s < 0 ? -hw : hw - armW}
            y={-hd}
            width={armW}
            height={depthCm}
            rx={4}
            fill={cushionColor}
            stroke={LINE}
            strokeWidth="0.8"
          />
          <rect
            x={(s < 0 ? -hw : hw - armW) + 2.5}
            y={-hd + 3}
            width={P(armW - 5)}
            height={P(depthCm - 6)}
            rx={2.5}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.5"
          />
        </g>
      ))}
      {/* Loose seat cushions with welting */}
      {Array.from({ length: numCushions }).map((_, i) => (
        <g key={i}>
          <rect
            x={-hw + armW + cushionW * i + 1}
            y={-hd + backH}
            width={P(cushionW - 2)}
            height={P(depthCm - backH - 2)}
            rx={3}
            fill={cushionColor}
            stroke={LINE}
            strokeWidth="0.7"
          />
          <rect
            x={-hw + armW + cushionW * i + 4}
            y={-hd + backH + 3}
            width={P(cushionW - 8)}
            height={P(depthCm - backH - 8)}
            rx={2}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.5"
          />
        </g>
      ))}
      {/* Scatter cushions and feet */}
      <ScatterCushion x={-hw + armW + 16} y={-hd + backH + 14} angle={-18} />
      <ScatterCushion x={hw - armW - 16} y={-hd + backH + 14} angle={22} fill="#C9A98A" />
      {[
        [-hw + 5, -hd + 5],
        [hw - 5, -hd + 5],
        [-hw + 5, hd - 5],
        [hw - 5, hd - 5],
      ].map(([x, y], i) => (
        <Foot key={i} x={x} y={y} />
      ))}
    </g>
  );
}

export function ArmchairSilhouette({ item, widthCm, depthCm, hw, hd, color, cushionColor }) {
  const recliner = item?.id === 'recliner-chair';
  const armW = widthCm * 0.17;
  const backH = depthCm * 0.28;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={8}
        fill={color}
        stroke="#222222"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + armW}
        y={-hd + 1}
        width={P(widthCm - armW * 2)}
        height={backH}
        rx={4}
        fill={cushionColor}
        stroke={LINE}
        strokeWidth="0.6"
      />
      <rect
        x={-hw + armW + 3}
        y={-hd + 4}
        width={P(widthCm - armW * 2 - 6)}
        height={P(backH - 6)}
        rx={3}
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.6"
      />
      {recliner && (
        <g>
          {[0.3, 0.55, 0.8].map((f) => (
            <line
              key={f}
              x1={-hw + armW + 6}
              y1={-hd + backH * f}
              x2={hw - armW - 6}
              y2={-hd + backH * f}
              stroke={HAIR}
              strokeWidth="0.5"
            />
          ))}
        </g>
      )}
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect
            x={s < 0 ? -hw : hw - armW}
            y={-hd}
            width={armW}
            height={depthCm}
            rx={5}
            fill={cushionColor}
            stroke={LINE}
            strokeWidth="0.8"
          />
          <rect
            x={(s < 0 ? -hw : hw - armW) + 3}
            y={-hd + 4}
            width={P(armW - 6)}
            height={P(depthCm - 8)}
            rx={3}
            fill="none"
            stroke={HAIR}
            strokeWidth="0.5"
          />
        </g>
      ))}
      <rect
        x={-hw + armW + 1}
        y={-hd + backH}
        width={P(widthCm - armW * 2 - 2)}
        height={P(depthCm - backH - 2)}
        rx={4}
        fill={cushionColor}
        stroke={LINE}
        strokeWidth="0.7"
      />
      <rect
        x={-hw + armW + 4}
        y={-hd + backH + 3}
        width={P(widthCm - armW * 2 - 8)}
        height={P(depthCm - backH - 8)}
        rx={3}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.5"
      />
      {recliner ? (
        <g>
          {/* Footrest seam and side recline lever */}
          <line
            x1={-hw + armW + 3}
            y1={hd - 18}
            x2={hw - armW - 3}
            y2={hd - 18}
            stroke={DETAIL}
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />
          <rect
            x={hw - 4}
            y={hd * 0.1}
            width={3.5}
            height={14}
            rx={1.5}
            fill={METAL}
            stroke={METAL_DARK}
            strokeWidth="0.5"
          />
        </g>
      ) : (
        <ScatterCushion x={-hw + armW + 14} y={-hd + backH + 12} s={14} angle={-20} />
      )}
      {[
        [-hw + 5, -hd + 5],
        [hw - 5, -hd + 5],
        [-hw + 5, hd - 5],
        [hw - 5, hd - 5],
      ].map(([x, y], i) => (
        <Foot key={i} x={x} y={y} />
      ))}
    </g>
  );
}

export function ChairSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  const legR = 2.2;
  return (
    <g>
      {/* Seat frame and stitched cushion */}
      <rect
        x={-hw + 1}
        y={-hd + 8}
        width={P(widthCm - 2)}
        height={P(depthCm - 9)}
        rx={4}
        fill={color}
        stroke="#222222"
        strokeWidth="1.1"
      />
      <rect
        x={-hw + 4}
        y={-hd + 11}
        width={P(widthCm - 8)}
        height={P(depthCm - 15)}
        rx={3}
        fill={cushionColor}
        stroke={LINE}
        strokeWidth="0.6"
      />
      <rect
        x={-hw + 7}
        y={-hd + 14}
        width={P(widthCm - 14)}
        height={P(depthCm - 21)}
        rx={2}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.5"
      />
      {/* Backrest top rail with slats */}
      <rect
        x={-hw + 2}
        y={-hd}
        width={P(widthCm - 4)}
        height={5}
        rx={2}
        fill={color}
        stroke="#222222"
        strokeWidth="1"
      />
      {[-0.28, -0.14, 0, 0.14, 0.28].map((f) => (
        <line
          key={f}
          x1={widthCm * f}
          y1={-hd + 5}
          x2={widthCm * f}
          y2={-hd + 9}
          stroke={LINE}
          strokeWidth="1.1"
        />
      ))}
      {/* Legs and stretchers */}
      {[
        [-hw + 4, hd - 4],
        [hw - 4, hd - 4],
        [-hw + 4, -hd + 2.5],
        [hw - 4, -hd + 2.5],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x - legR}
          y={y - legR}
          width={legR * 2}
          height={legR * 2}
          fill="#1A1A1A"
          stroke="none"
        />
      ))}
      <line
        x1={-hw + 4}
        y1={hd - 4}
        x2={hw - 4}
        y2={hd - 4}
        stroke={HAIR}
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
    </g>
  );
}

export function DeskChairSilhouette({ hw, hd, cushionColor }) {
  const reach = Math.min(hw, hd) - 1;
  return (
    <g>
      {/* Five-star base and casters shown dashed underneath */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <g key={i} stroke={HAIR} strokeWidth="1">
            <line
              x1={0}
              y1={0}
              x2={Math.sin(a) * reach}
              y2={Math.cos(a) * reach}
              strokeDasharray="3 2"
            />
            <circle
              cx={Math.sin(a) * reach}
              cy={Math.cos(a) * reach}
              r={2.6}
              fill="#2A2A2A"
              stroke="none"
            />
          </g>
        );
      })}
      {/* Seat, padded back and arm pads */}
      <rect
        x={-hw * 0.7}
        y={-hd * 0.5}
        width={hw * 1.4}
        height={hd * 1.35}
        rx={8}
        fill={cushionColor}
        stroke="#222222"
        strokeWidth="1.1"
      />
      <rect
        x={-hw * 0.55}
        y={-hd * 0.35}
        width={hw * 1.1}
        height={hd * 1.05}
        rx={6}
        fill="none"
        stroke={HAIR}
        strokeWidth="0.6"
      />
      <path
        d={`M ${-hw * 0.68} ${-hd * 0.55} Q 0 ${-hd * 1.0} ${hw * 0.68} ${-hd * 0.55}`}
        fill="none"
        stroke="#222222"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {[-1, 1].map((s) => (
        <rect
          key={s}
          x={s * hw * 0.78 - 3}
          y={-hd * 0.3}
          width={6}
          height={hd * 0.8}
          rx={2.5}
          fill="#2A2A2A"
          stroke="none"
        />
      ))}
      <circle cx={0} cy={0} r={4} fill={METAL} stroke={METAL_DARK} strokeWidth="0.7" />
    </g>
  );
}

export function BarStoolSilhouette({ hw, hd, color, cushionColor }) {
  const r = Math.min(hw, hd);
  return (
    <g>
      {/* Foot ring and splayed legs, dashed beneath the seat */}
      <circle
        cx={0}
        cy={0}
        r={r * 0.9}
        fill="none"
        stroke={HAIR}
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <circle
            key={`${sx}${sz}`}
            cx={sx * r * 0.7}
            cy={sz * r * 0.7}
            r={1.8}
            fill="#1A1A1A"
            stroke="none"
          />
        ))
      )}
      <circle cx={0} cy={0} r={r} fill={cushionColor} stroke="#222222" strokeWidth="1.2" />
      <circle cx={0} cy={0} r={r * 0.82} fill="none" stroke={DETAIL} strokeWidth="0.7" />
      <circle cx={0} cy={0} r={r * 0.5} fill="none" stroke={HAIR} strokeWidth="0.5" />
      <circle cx={0} cy={0} r={1.6} fill={DETAIL} />
      <path
        d={`M ${-r * 0.78} ${-r * 0.35} A ${r * 0.88} ${r * 0.88} 0 0 1 ${r * 0.78} ${-r * 0.35}`}
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </g>
  );
}

export function OttomanSilhouette({ widthCm, depthCm, hw, hd, color, cushionColor }) {
  const cols = Math.max(2, Math.min(6, Math.round(widthCm / 20)));
  const rows = Math.max(1, Math.min(3, Math.round(depthCm / 20)));
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={7}
        fill={cushionColor}
        stroke="#222222"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + 3}
        y={-hd + 3}
        width={P(widthCm - 6)}
        height={P(depthCm - 6)}
        rx={5}
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.7"
      />
      {/* Button tufting in a grid, with diamond creases */}
      {Array.from({ length: cols }).flatMap((_, i) =>
        Array.from({ length: rows }).map((__, j) => {
          const x = -hw + 8 + ((widthCm - 16) * (i + 0.5)) / cols;
          const y = -hd + 8 + ((depthCm - 16) * (j + 0.5)) / rows;
          return (
            <g key={`${i}-${j}`}>
              <circle cx={x} cy={y} r={1.4} fill={color} stroke="none" />
              {i < cols - 1 && j < rows - 1 && (
                <path
                  d={`M ${x} ${y} L ${x + (widthCm - 16) / cols} ${y + (depthCm - 16) / rows}`}
                  stroke={HAIR}
                  strokeWidth="0.4"
                />
              )}
            </g>
          );
        })
      )}
      {[
        [-hw + 5, -hd + 5],
        [hw - 5, -hd + 5],
        [-hw + 5, hd - 5],
        [hw - 5, hd - 5],
      ].map(([x, y], i) => (
        <Foot key={i} x={x} y={y} r={2} />
      ))}
    </g>
  );
}
