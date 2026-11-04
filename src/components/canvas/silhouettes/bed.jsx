/** 2D plan symbols: bed. Coordinates are centered at (0, 0), widthCm x depthCm. */
import { HAIR, DETAIL, P } from './parts.jsx';

function PillowPlan({ x, y, w, h }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill="#FFFFFF"
        stroke="#BFB3A2"
        strokeWidth="0.8"
      />
      <rect
        x={x + 3}
        y={y + 3}
        width={P(w - 6)}
        height={P(h - 6)}
        rx={2.5}
        fill="none"
        stroke="#DDD3C4"
        strokeWidth="0.6"
      />
      <line
        x1={x + w * 0.2}
        y1={y + h / 2}
        x2={x + w * 0.8}
        y2={y + h / 2}
        stroke="#CFC4B3"
        strokeWidth="0.6"
      />
    </g>
  );
}

export function BedSilhouette({
  item,
  widthCm,
  depthCm,
  hw,
  hd,
  color,
  fabricColor,
  headboardColor,
  accentColor,
}) {
  const id = item?.id || '';
  const isSingle = widthCm < 120;
  const big = widthCm > 180;
  const storage = id === 'bed-storage-single';
  const slatted = id === 'bed-single';
  const pillowW = isSingle ? widthCm * 0.62 : widthCm * (big ? 0.27 : 0.38);
  const pillowH = Math.min(depthCm * 0.2, 42);
  const hbH = depthCm * 0.1;
  const duvetTopY = -hd + depthCm * 0.46;
  const channels = Math.max(3, Math.round(widthCm / 24));
  const nStitch = Math.max(1, Math.round(widthCm / 40) - 1);
  return (
    <g>
      {/* Bed frame with side rails */}
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
      <rect
        x={-hw + 1.5}
        y={-hd + hbH}
        width={P(widthCm - 3)}
        height={P(depthCm - hbH - 1.5)}
        rx={3}
        fill="none"
        stroke={DETAIL}
        strokeWidth="0.6"
      />

      {/* Headboard: tufted channels, or vertical slats on the single */}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={hbH}
        rx={2}
        fill={headboardColor}
        stroke="#3D2A1C"
        strokeWidth="0.9"
      />
      {slatted
        ? Array.from({ length: Math.round(widthCm / 8) }).map((_, i, a) => (
            <line
              key={i}
              x1={-hw + 6 + ((widthCm - 12) * (i + 0.5)) / a.length}
              y1={-hd + 1.5}
              x2={-hw + 6 + ((widthCm - 12) * (i + 0.5)) / a.length}
              y2={-hd + hbH - 1.5}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="0.8"
            />
          ))
        : Array.from({ length: channels - 1 }).map((_, i) => {
            const x = -hw + (widthCm * (i + 1)) / channels;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={-hd + 1}
                  x2={x}
                  y2={-hd + hbH - 1}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth="0.7"
                />
                <circle cx={x} cy={-hd + hbH / 2} r={1} fill="rgba(0,0,0,0.4)" />
              </g>
            );
          })}

      {/* Mattress with piping and a seam line */}
      <rect
        x={-hw + 3}
        y={-hd + hbH + 1.5}
        width={P(widthCm - 6)}
        height={P(depthCm - hbH - 4.5)}
        rx={3}
        fill={fabricColor}
        stroke="#C9BFAE"
        strokeWidth="0.9"
      />
      <rect
        x={-hw + 5.5}
        y={-hd + hbH + 4}
        width={P(widthCm - 11)}
        height={P(depthCm - hbH - 9.5)}
        rx={2}
        fill="none"
        stroke="#DCD3C3"
        strokeWidth="0.6"
      />

      {/* Pillows: two (four on a king) with flange and crease */}
      {isSingle ? (
        <PillowPlan x={-pillowW / 2} y={-hd + hbH + 5} w={pillowW} h={pillowH} />
      ) : (
        [-1, 1].map((s) => (
          <PillowPlan
            key={s}
            x={s * widthCm * (big ? 0.26 : 0.23) - pillowW / 2}
            y={-hd + hbH + 5}
            w={pillowW}
            h={pillowH}
          />
        ))
      )}
      {big &&
        [-1, 1].map((s) => (
          <PillowPlan
            key={`e${s}`}
            x={s * widthCm * 0.12 - pillowW * 0.4}
            y={-hd + hbH + 5 + pillowH * 0.7}
            w={pillowW * 0.8}
            h={pillowH * 0.7}
          />
        ))}

      {/* Duvet: quilt stitching, fold-back, side drape and a throw at the foot */}
      <rect
        x={-hw + 3}
        y={duvetTopY}
        width={P(widthCm - 6)}
        height={P(hd - duvetTopY - 3)}
        rx={2}
        fill={accentColor}
        fillOpacity="0.9"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.7"
      />
      <rect
        x={-hw + 3}
        y={duvetTopY}
        width={P(widthCm - 6)}
        height={depthCm * 0.06}
        fill="#FFFFFF"
        fillOpacity="0.85"
      />
      <line
        x1={-hw + 3}
        y1={duvetTopY + depthCm * 0.06}
        x2={hw - 3}
        y2={duvetTopY + depthCm * 0.06}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.8"
      />
      {Array.from({ length: nStitch }).map((_, i) => (
        <line
          key={i}
          x1={-hw + 3 + ((widthCm - 6) * (i + 1)) / (nStitch + 1)}
          y1={duvetTopY + depthCm * 0.08}
          x2={-hw + 3 + ((widthCm - 6) * (i + 1)) / (nStitch + 1)}
          y2={hd - 5}
          stroke="rgba(0,0,0,0.22)"
          strokeWidth="0.6"
        />
      ))}
      {[0.4, 0.7].map((f) => (
        <line
          key={f}
          x1={-hw + 5}
          y1={duvetTopY + (hd - duvetTopY) * f}
          x2={hw - 5}
          y2={duvetTopY + (hd - duvetTopY) * f}
          stroke="rgba(0,0,0,0.22)"
          strokeWidth="0.6"
        />
      ))}
      {!isSingle && (
        <rect
          x={-hw * 0.82}
          y={hd - 36}
          width={widthCm * 0.82}
          height={22}
          rx={2}
          fill="rgba(0,0,0,0.14)"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.6"
        />
      )}

      {/* Footboard line and corner feet */}
      <line x1={-hw} y1={hd - 4} x2={hw} y2={hd - 4} stroke={DETAIL} strokeWidth="0.8" />
      {[
        [-hw + 1, -hd + 1],
        [hw - 7, -hd + 1],
        [-hw + 1, hd - 7],
        [hw - 7, hd - 7],
      ].map(([px, py], i) => (
        <rect
          key={i}
          x={px}
          y={py}
          width={6}
          height={6}
          rx={1.5}
          fill="none"
          stroke={HAIR}
          strokeWidth="0.7"
        />
      ))}

      {/* Storage bed: two drawers each side shown as dashed fronts with knobs */}
      {storage &&
        [-1, 1].map((s) => (
          <g key={s}>
            {[0.28, 0.66].map((f) => (
              <g key={f}>
                <rect
                  x={s < 0 ? -hw - 0.5 : hw - 3}
                  y={-hd + depthCm * f - depthCm * 0.14}
                  width={3.5}
                  height={depthCm * 0.28}
                  rx={1}
                  fill="none"
                  stroke={DETAIL}
                  strokeWidth="0.7"
                />
                <circle
                  cx={s < 0 ? -hw + 1 : hw - 1}
                  cy={-hd + depthCm * f}
                  r={1.2}
                  fill="#C4A869"
                  stroke="#3D2A1C"
                  strokeWidth="0.4"
                />
              </g>
            ))}
          </g>
        ))}
    </g>
  );
}

export function BedBunkSilhouette({ widthCm, depthCm, hw, hd, color, fabricColor, accentColor }) {
  const postSize = 6;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={2}
        fill={color}
        stroke="#2B3830"
        strokeWidth="1.4"
      />
      {/* Slatted base shows as fine lines under the mattress edge */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1={-hw + postSize}
          y1={-hd + postSize + ((depthCm - postSize * 2) * (i + 0.5)) / 12}
          x2={hw - postSize}
          y2={-hd + postSize + ((depthCm - postSize * 2) * (i + 0.5)) / 12}
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.6"
        />
      ))}
      <rect
        x={-hw + postSize}
        y={-hd + depthCm * 0.1}
        width={P(widthCm - postSize * 2)}
        height={depthCm * 0.84}
        rx={2}
        fill={fabricColor}
        stroke="#D4C8B8"
        strokeWidth="0.8"
      />
      <rect
        x={-hw + postSize + 4}
        y={-hd + depthCm * 0.13}
        width={widthCm * 0.62}
        height={depthCm * 0.17}
        rx={3}
        fill="#FFFFFF"
        stroke="#C8BCAB"
        strokeWidth="0.8"
      />
      <line
        x1={-hw + postSize + 10}
        y1={-hd + depthCm * 0.215}
        x2={-hw + postSize + widthCm * 0.55}
        y2={-hd + depthCm * 0.215}
        stroke="#D3C9B8"
        strokeWidth="0.6"
      />
      <rect
        x={-hw + postSize}
        y={-hd + depthCm * 0.42}
        width={P(widthCm - postSize * 2)}
        height={depthCm * 0.52}
        fill={accentColor}
        fillOpacity={0.4}
      />
      <line
        x1={-hw + postSize}
        y1={-hd + depthCm * 0.42}
        x2={hw - postSize}
        y2={-hd + depthCm * 0.42}
        stroke={accentColor}
        strokeWidth="1.2"
      />
      {/* Guard rails with spindles along the long sides */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <line
            x1={s * (hw - 2)}
            y1={-hd + postSize}
            x2={s * (hw - 2)}
            y2={hd - postSize}
            stroke="#2B3830"
            strokeWidth="1.4"
          />
          {Array.from({ length: 10 }).map((_, i) => (
            <circle
              key={i}
              cx={s * (hw - 2)}
              cy={-hd + postSize + ((depthCm - postSize * 2) * (i + 0.5)) / 10}
              r={0.9}
              fill="#2B3830"
            />
          ))}
        </g>
      ))}
      {[
        [-hw, -hd],
        [hw - postSize, -hd],
        [-hw, hd - postSize],
        [hw - postSize, hd - postSize],
      ].map(([px, py], i) => (
        <g key={i}>
          <rect x={px} y={py} width={postSize} height={postSize} fill="#2B3830" />
          <circle cx={px + postSize / 2} cy={py + postSize / 2} r={1.8} fill="#4C5E54" />
        </g>
      ))}
      {/* Ladder at the foot end */}
      <g>
        <rect
          x={hw - 36}
          y={hd - 8}
          width={28}
          height={7}
          rx={1}
          fill="#FAF6EE"
          stroke="#2B3830"
          strokeWidth="0.9"
        />
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={hw - 36 + 28 * t}
            y1={hd - 8}
            x2={hw - 36 + 28 * t}
            y2={hd - 1}
            stroke="#C97B4A"
            strokeWidth="1.6"
          />
        ))}
      </g>
    </g>
  );
}
