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
