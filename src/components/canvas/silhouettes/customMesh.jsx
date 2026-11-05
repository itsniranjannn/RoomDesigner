import { useId } from 'react';
import { getFurnitureType } from '../../../data/furnitureCatalog.js';

const OUTLINE = '#22180E';

/** Closed SVG path through flat [x, z, ...] plan coordinates in [-0.5, 0.5], scaled to the piece size. */
export function outlinePath(loops, widthCm, depthCm) {
  return loops
    .map((loop) => {
      const pts = [];
      for (let i = 0; i + 1 < loop.length; i += 2)
        pts.push(`${(loop[i] * widthCm).toFixed(2)} ${(loop[i + 1] * depthCm).toFixed(2)}`);
      return `M ${pts.join(' L ')} Z`;
    })
    .join(' ');
}

const LINE = 'rgba(34,24,14,0.55)';

/** Plan view drawn from a seating design when the user gave no top photo: arms, back, seat and feet. */
function SeatingPlan({ design, widthCm, depthCm, hw, hd, color }) {
  const { type, palette = {}, traits = {} } = design;
  const baseColor = palette.body;
  const same = !baseColor || String(baseColor).toLowerCase() === String(color).toLowerCase();
  const cushion = same ? palette.cushion || color : color;
  if (type === 'lounge') {
    const bar = Math.max(4, widthCm * 0.07);
    const seatD = depthCm * 0.52;
    return (
      <g>
        <rect
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          rx={3}
          fill={color}
          fillOpacity="0.2"
        />
        {/* wooden armrests and back rail */}
        {[-1, 1].map((sg) => (
          <rect
            key={sg}
            x={sg < 0 ? -hw : hw - bar}
            y={-hd + depthCm * 0.12}
            width={bar}
            height={depthCm * 0.88}
            rx={bar / 2.2}
            fill={color}
            stroke={OUTLINE}
            strokeWidth="1.1"
          />
        ))}
        <rect
          x={-hw}
          y={-hd}
          width={widthCm}
          height={bar * 0.9}
          rx={2}
          fill={color}
          stroke={OUTLINE}
          strokeWidth="1.1"
        />
        {/* loose cushions */}
        <rect
          x={-hw + bar + 1}
          y={-hd + bar * 0.9 + 1}
          width={widthCm - 2 * bar - 2}
          height={depthCm * 0.2}
          rx={4}
          fill={cushion}
          stroke={OUTLINE}
          strokeWidth="1"
        />
        <rect
          x={-hw + bar + 1}
          y={hd - seatD - 2}
          width={widthCm - 2 * bar - 2}
          height={seatD}
          rx={5}
          fill={cushion}
          stroke={OUTLINE}
          strokeWidth="1"
        />
        <line
          x1={-hw + bar + 6}
          y1={hd - 3}
          x2={hw - bar - 6}
          y2={hd - 3}
          stroke={LINE}
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />
      </g>
    );
  }
  const seats = type === 'sofa' ? traits.seats || 2 : 1;
  const armW = widthCm * (traits.arm ?? (type === 'sofa' ? 0.1 : 0.17));
  const backH = depthCm * 0.26;
  const inner = widthCm - armW * 2;
  const roll = !!traits.roll;
  const longSeat = type === 'sofa' && !!traits.longSeat && seats > 1;
  return (
    <g>
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={roll ? armW / 2 : 6}
        fill={color}
        stroke="#222222"
        strokeWidth="1.2"
      />
      <rect
        x={-hw + armW}
        y={-hd + 1}
        width={inner}
        height={backH}
        rx={3}
        fill={cushion}
        stroke={LINE}
        strokeWidth="0.6"
      />
      {Array.from({ length: seats }).map((_, i) => (
        <g key={i}>
          {/* One long seat cushion is drawn once, across all the seats */}
          {(!longSeat || i === 0) && (
            <rect
              x={-hw + armW + (longSeat ? 0 : (inner / seats) * i) + 1.5}
              y={-hd + backH + 2}
              width={(longSeat ? inner : inner / seats) - 3}
              height={depthCm - backH - 6}
              rx={4}
              fill={cushion}
              stroke={LINE}
              strokeWidth="0.7"
            />
          )}
          {longSeat && i > 0 && (
            <line
              x1={-hw + armW + (inner / seats) * i}
              y1={-hd + 1}
              x2={-hw + armW + (inner / seats) * i}
              y2={-hd + backH}
              stroke={LINE}
              strokeWidth="0.7"
            />
          )}
          {traits.tufted &&
            [0.28, 0.72].map((f) => (
              <circle
                key={f}
                cx={-hw + armW + (inner / seats) * (i + f)}
                cy={-hd + 1 + backH * 0.5}
                r={1.1}
                fill={LINE}
              />
            ))}
        </g>
      ))}
      {[-1, 1].map((sg) => (
        <line
          key={sg}
          x1={sg * (hw - armW)}
          y1={-hd + 2}
          x2={sg * (hw - armW)}
          y2={hd - 2}
          stroke={LINE}
          strokeWidth="0.7"
        />
      ))}
    </g>
  );
}

/** 2D plan symbols: customMesh. Coordinates are centered at (0, 0), widthCm x depthCm. */
export function CustomMeshSilhouette({ item, widthCm, depthCm, hw, hd, color, isSwatch }) {
  const loops = item.topOutline;
  const clipId = `plan-photo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // The catalog card shows the piece itself rather than its footprint
  if (isSwatch && item.thumb) {
    return (
      <image
        href={item.thumb}
        x={-30}
        y={-30}
        width={60}
        height={60}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  // The user's own photo, cut out, sits on the footprint and turns with the piece
  if (item.planImage) {
    const hasLoops = loops && loops.length > 0;
    const photoBase = getFurnitureType(item.id)?.color;
    const tinted = photoBase && String(photoBase).toLowerCase() !== String(color).toLowerCase();
    const d = hasLoops ? outlinePath(loops, widthCm, depthCm) : null;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            {d ? <path d={d} /> : <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} />}
          </clipPath>
        </defs>
        {d ? (
          <path d={d} fill={color} fillOpacity="0.28" />
        ) : (
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={3}
            fill={color}
            fillOpacity="0.28"
          />
        )}
        <image
          href={item.planImage}
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          preserveAspectRatio="none"
          clipPath={`url(#${clipId})`}
        />
        {tinted && (
          <g clipPath={`url(#${clipId})`}>
            <rect
              x={-hw}
              y={-hd}
              width={widthCm}
              height={depthCm}
              fill={color}
              fillOpacity="0.55"
              style={{ mixBlendMode: 'color' }}
            />
          </g>
        )}
        {d ? (
          <path d={d} fill="none" stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
        ) : (
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={3}
            fill="none"
            stroke={OUTLINE}
            strokeWidth="1.4"
          />
        )}
      </g>
    );
  }

  if (item.design && ['sofa', 'armchair', 'lounge'].includes(item.design.type) && !loops?.length) {
    return (
      <SeatingPlan
        design={item.design}
        widthCm={widthCm}
        depthCm={depthCm}
        hw={hw}
        hd={hd}
        color={color}
      />
    );
  }

  if (!loops || loops.length === 0) {
    return (
      <g>
        <rect
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          rx={3}
          fill={color}
          stroke={OUTLINE}
          strokeWidth="1.4"
        />
        {item.topImage && (
          <image
            href={item.topImage}
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            preserveAspectRatio="none"
          />
        )}
        <rect
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          rx={3}
          fill="none"
          stroke={OUTLINE}
          strokeWidth="1.4"
        />
        <line
          x1={-hw + 4}
          y1={hd - 3}
          x2={hw - 4}
          y2={hd - 3}
          stroke="rgba(34,24,14,0.55)"
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />
      </g>
    );
  }

  const d = outlinePath(loops, widthCm, depthCm);
  const baseColor = getFurnitureType(item.id)?.color;
  const recoloured = baseColor && String(baseColor).toLowerCase() !== String(color).toLowerCase();

  // Front edge: the lowest points of the footprint, where the piece faces the room
  let front = -Infinity;
  for (const loop of loops)
    for (let i = 1; i < loop.length; i += 2) front = Math.max(front, loop[i]);
  let left = Infinity;
  let right = -Infinity;
  for (const loop of loops) {
    for (let i = 0; i + 1 < loop.length; i += 2) {
      if (loop[i + 1] >= front - 0.03) {
        left = Math.min(left, loop[i]);
        right = Math.max(right, loop[i]);
      }
    }
  }
  const frontY = front * depthCm - 3;

  return (
    <g>
      <path d={d} fill={color} />
      {item.topImage && (
        <image
          href={item.topImage}
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          preserveAspectRatio="none"
        />
      )}
      {recoloured && (
        <path d={d} fill={color} fillOpacity="0.55" style={{ mixBlendMode: 'color' }} />
      )}
      <path d={d} fill="none" stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
      {right - left > 0.1 && (
        <line
          x1={left * widthCm + 4}
          y1={frontY}
          x2={right * widthCm - 4}
          y2={frontY}
          stroke="rgba(34,24,14,0.55)"
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />
      )}
    </g>
  );
}
