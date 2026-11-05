import { useId, useMemo } from 'react';
import {
  rugPatternOps,
  rugCanvasSize,
  curtainPatternOps,
  patternOf,
} from '../../preview3d/patterns.js';

/**
 * PatternPlan.jsx
 * Draws a rug (or curtain fabric) pattern as SVG, from the same drawing instructions the 3D view paints on
 * a canvas, so the plan, the exports and the inspector previews show the pattern the room will have.
 */

/** One drawing instruction as an SVG element. */
function Op({ op }) {
  if (op.k === 'rect') return <rect x={op.x} y={op.y} width={op.w} height={op.h} fill={op.fill} />;
  if (op.k === 'poly')
    return <polygon points={op.pts.map((p) => p.join(',')).join(' ')} fill={op.fill} />;
  if (op.k === 'circle')
    return (
      <circle
        cx={op.cx}
        cy={op.cy}
        r={Math.max(0, op.r)}
        fill={op.fill || 'none'}
        stroke={op.stroke}
        strokeWidth={op.lw}
      />
    );
  if (op.k === 'line')
    return (
      <line x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2} stroke={op.stroke} strokeWidth={op.lw} />
    );
  return null;
}

/** All the ops of a picture, in picture pixels. */
export function Ops({ ops }) {
  return (
    <>
      {ops.map((op, i) => (
        <Op key={i} op={op} />
      ))}
    </>
  );
}

/**
 * A rug pattern filling the footprint (centred at 0, 0). `round` clips it to a circle.
 * `quality` is the long side of the drawing in pixels; plans use a light one, thumbnails a lighter one.
 */
export function PatternPlan({ item, widthCm, depthCm, round = false, quality = 224 }) {
  const id = useId();
  const pattern = patternOf(item);
  const picture = useMemo(() => {
    if (!pattern || pattern === 'classic') return null;
    const size = round
      ? { width: quality, height: quality }
      : rugCanvasSize(widthCm, depthCm, quality);
    return rugPatternOps(pattern, size, {
      main: item.color,
      sub: item.subColor,
      accent: item.accentColor,
    });
  }, [pattern, round, quality, widthCm, depthCm, item.color, item.subColor, item.accentColor]);
  if (!picture) return null;
  const hw = widthCm / 2;
  const hd = depthCm / 2;
  const clip = `pp-${id.replace(/:/g, '')}`;
  const r = Math.min(hw, hd);
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          {round ? (
            <circle cx={0} cy={0} r={r} />
          ) : (
            <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g
          transform={`translate(${round ? -r : -hw} ${round ? -r : -hd}) scale(${(round ? r * 2 : widthCm) / picture.width} ${(round ? r * 2 : depthCm) / picture.height})`}
        >
          <Ops ops={picture.ops} />
        </g>
      </g>
      {round ? (
        <circle cx={0} cy={0} r={r} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
      ) : (
        <rect
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          rx={3}
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="1"
        />
      )}
    </g>
  );
}

/** A curtain fabric tile as a small square swatch (inspector previews). */
export function CurtainSwatch({ pattern, colors, size = 36 }) {
  const picture = useMemo(() => curtainPatternOps(pattern, colors), [pattern, colors]);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${picture.width} ${picture.height}`}
      aria-hidden="true"
    >
      <Ops ops={picture.ops} />
    </svg>
  );
}
