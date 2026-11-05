/**
 * 2D plan symbols: pieces that hang on a wall (pictures, mirrors, shelves, clocks, planters, curtains).
 * Coordinates are centred at (0, 0), widthCm x depthCm, the back (against the wall) at -y. Every wall piece
 * is drawn the same way so it reads at a glance: a dashed outline (it is above the floor), a short tick at
 * each end that touches the wall, and a small glyph for what it is. The symbol is at least a few
 * centimetres deep on the plan so it stays visible and easy to grab even when the piece itself is thin.
 */
import { LINE, DETAIL, HAIR } from './parts.jsx';

const hangDepth = (widthCm, depthCm) => Math.max(depthCm, Math.min(widthCm * 0.2, 12));

/** The shared outline: dashed box from the wall out, with wall ticks at both ends. */
function Hung({ widthCm, depthCm, fill, children, stroke = LINE, solid = false }) {
  const hw = widthCm / 2;
  const vd = hangDepth(widthCm, depthCm);
  const y0 = -depthCm / 2;
  const tick = Math.min(5, widthCm * 0.12);
  return (
    <g data-wall-mounted="true">
      <rect
        x={-hw}
        y={y0}
        width={widthCm}
        height={vd}
        rx={1}
        fill={fill}
        fillOpacity={solid ? 1 : 0.85}
        stroke={stroke}
        strokeWidth="1"
        strokeDasharray={solid ? undefined : '5 2.5'}
      />
      <line x1={-hw - tick} y1={y0} x2={-hw} y2={y0} stroke={stroke} strokeWidth="1.4" />
      <line x1={hw} y1={y0} x2={hw + tick} y2={y0} stroke={stroke} strokeWidth="1.4" />
      {children}
    </g>
  );
}

export function WallArtSilhouette({ item, widthCm, depthCm, color }) {
  const vd = hangDepth(widthCm, depthCm);
  const y0 = -depthCm / 2;
  const gallery = item?.artStyle === 'gallery';
  return (
    <Hung widthCm={widthCm} depthCm={depthCm} fill="#FAF6EE">
      {gallery ? (
        [-0.33, 0, 0.34].map((f, i) => (
          <rect
            key={i}
            x={widthCm * f - widthCm * 0.13}
            y={y0 + vd * 0.18}
            width={widthCm * 0.26}
            height={vd * 0.64}
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        ))
      ) : (
        <>
          <rect
            x={-widthCm / 2 + 2}
            y={y0 + vd * 0.2}
            width={widthCm - 4}
            height={vd * 0.6}
            fill="none"
            stroke={color || DETAIL}
            strokeWidth="1"
          />
          <path
            d={`M ${-widthCm * 0.18} ${y0 + vd * 0.74} L ${-widthCm * 0.05} ${y0 + vd * 0.3} L ${widthCm * 0.06} ${y0 + vd * 0.6} L ${widthCm * 0.14} ${y0 + vd * 0.42} L ${widthCm * 0.22} ${y0 + vd * 0.74} Z`}
            fill={item?.subColor || DETAIL}
            fillOpacity="0.6"
            stroke="none"
          />
        </>
      )}
    </Hung>
  );
}

export function WallMirrorHungSilhouette({ item, widthCm, depthCm }) {
  const vd = hangDepth(widthCm, depthCm);
  const y0 = -depthCm / 2;
  const glint = (x) => (
    <line
      key={x}
      x1={x}
      y1={y0 + vd * 0.78}
      x2={x + vd * 0.5}
      y2={y0 + vd * 0.22}
      stroke="#FFFFFF"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  );
  return (
    <Hung widthCm={widthCm} depthCm={depthCm} fill={item?.mirrorColor || '#B0D3E2'}>
      {glint(-widthCm * 0.22)}
      {glint(-widthCm * 0.22 + vd * 0.9)}
      {glint(-widthCm * 0.22 + vd * 1.5)}
    </Hung>
  );
}

export function WallShelfSilhouette({ widthCm, depthCm, color }) {
  const y0 = -depthCm / 2;
  const hw = widthCm / 2;
  return (
    <Hung widthCm={widthCm} depthCm={depthCm} fill={color || '#8A6A4B'} solid>
      {[-0.32, 0.32].map((f) => (
        <line
          key={f}
          x1={widthCm * f}
          y1={y0}
          x2={widthCm * f}
          y2={y0 + depthCm}
          stroke={HAIR}
          strokeWidth="1"
        />
      ))}
      <line x1={-hw} y1={y0 + depthCm} x2={hw} y2={y0 + depthCm} stroke={LINE} strokeWidth="1" />
    </Hung>
  );
}

export function WallClockSilhouette({ widthCm, depthCm }) {
  const vd = hangDepth(widthCm, depthCm);
  const y0 = -depthCm / 2;
  return (
    <Hung widthCm={widthCm} depthCm={depthCm} fill="#F6F1E7">
      <circle
        cx={0}
        cy={y0 + vd / 2}
        r={Math.min(vd * 0.36, widthCm * 0.2)}
        fill="none"
        stroke={LINE}
        strokeWidth="0.9"
      />
      <line x1={0} y1={y0 + vd / 2} x2={0} y2={y0 + vd * 0.28} stroke={LINE} strokeWidth="0.9" />
      <line
        x1={0}
        y1={y0 + vd / 2}
        x2={vd * 0.22}
        y2={y0 + vd / 2}
        stroke={LINE}
        strokeWidth="0.9"
      />
    </Hung>
  );
}

export function WallPlanterSilhouette({ widthCm, depthCm, color, subColor }) {
  const vd = hangDepth(widthCm, depthCm);
  const y0 = -depthCm / 2;
  return (
    <Hung widthCm={widthCm} depthCm={depthCm} fill={subColor || '#D4CABB'}>
      {[-0.28, 0, 0.28].map((f, i) => (
        <circle
          key={i}
          cx={widthCm * f}
          cy={y0 + vd * 0.55}
          r={Math.min(vd * 0.32, widthCm * 0.12)}
          fill={color || '#4F7A52'}
          stroke="#2B3D33"
          strokeWidth="0.6"
        />
      ))}
    </Hung>
  );
}

export function CurtainSilhouette({ item, widthCm, depthCm, color }) {
  const vd = hangDepth(widthCm, depthCm);
  const y0 = -depthCm / 2;
  const open = item?.curtainStyle === 'open';
  const sheer = !!item?.sheer;
  const hw = widthCm / 2;
  const wave = (x0, x1) => {
    const n = Math.max(3, Math.round((x1 - x0) / 9));
    const step = (x1 - x0) / n;
    let d = `M ${x0} ${y0 + vd * 0.5}`;
    for (let i = 0; i < n; i++)
      d += ` Q ${x0 + step * (i + 0.5)} ${y0 + vd * (i % 2 ? 0.1 : 0.9)} ${x0 + step * (i + 1)} ${y0 + vd * 0.5}`;
    return d;
  };
  const spans = open
    ? [
        [-hw, -hw + widthCm * 0.3],
        [hw - widthCm * 0.3, hw],
      ]
    : [[-hw, hw]];
  return (
    <Hung widthCm={widthCm} depthCm={depthCm} fill={color || '#D9CBB0'}>
      {spans.map(([a, b], i) => (
        <g key={i}>
          <rect
            x={a}
            y={y0}
            width={b - a}
            height={vd}
            fill={color}
            fillOpacity={sheer ? 0.25 : 0.7}
            stroke="none"
          />
          <path d={wave(a, b)} fill="none" stroke={LINE} strokeWidth="0.8" />
        </g>
      ))}
      <circle cx={-hw} cy={y0 + 1.5} r="2" fill={LINE} />
      <circle cx={hw} cy={y0 + 1.5} r="2" fill={LINE} />
    </Hung>
  );
}
