import { useId } from 'react';
import { getFurnitureType } from '../../../data/furnitureCatalog.js';
import {
  stepTiers,
  channelBackT,
  WRAP_END,
  guardRailSpans,
  wardrobeLayout,
  deskLayout,
  deskLegThick,
  wrapThickness,
  doorHandleSpot,
  mirrorSpan,
} from '../../preview3d/models/designLayout.js';
import { effectivePalette, shadeColour } from '../../preview3d/models/designPalette.js';
import { SwingArc, BarHandle } from './parts.jsx';

const OUTLINE = '#22180E';

/**
 * Colours of a photo-made piece on the plan after a recolour, by the same rule as its 3D model: slots that were
 * the body's material follow the new colour, contrasting ones (two-tone doors, a dark frame) stay as photographed.
 */
function planPalette(design, color) {
  const palette = design.palette || {};
  if (!palette.body) return { ...palette, body: color };
  return effectivePalette({ palette }, color);
}

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
  const { type, traits = {} } = design;
  const eff = planPalette(design, color);
  const cushion = eff.cushion || eff.body;
  // A wood or cane frame is drawn as the classic seat in 3D, which has no channels or terraced arms
  const classic = !!(traits.frame || traits.cane);
  const chan = !!traits.chan && !classic;
  const step = !!traits.step && !classic && type === 'sofa';
  // Arms photographed in their own colour keep it, as on the 3D upholstered seat (a classic frame has none)
  const armFill = !classic && design.palette?.arm ? eff.arm : null;
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
  if (chan)
    return (
      <ChannelSeatPlan
        widthCm={widthCm}
        depthCm={depthCm}
        hw={hw}
        hd={hd}
        color={color}
        cushion={cushion}
        seats={longSeat ? 1 : seats}
        armW={armW}
        step={step}
        armFill={armFill}
      />
    );
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
      {armFill && (
        <ArmFills
          widthCm={widthCm}
          depthCm={depthCm}
          armW={armW}
          rx={roll ? armW / 2 : 6}
          fill={armFill}
        />
      )}
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
              width={Math.max(0, (longSeat ? inner : inner / seats) - 3)}
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
      {step && <ArmTiers widthCm={widthCm} hd={hd} armW={armW} y0={-hd + 2} />}
    </g>
  );
}

/** Both arms in their own colour, with the seat's outline drawn again over them. */
function ArmFills({ widthCm, depthCm, armW, rx, fill }) {
  const hw = widthCm / 2;
  const hd = depthCm / 2;
  return (
    <g name="arm-fills">
      {[-1, 1].map((sg) => (
        <rect
          key={sg}
          x={sg < 0 ? -hw : hw - armW}
          y={-hd}
          width={armW}
          height={depthCm}
          rx={Math.min(rx, armW / 2)}
          fill={fill}
        />
      ))}
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={rx}
        fill="none"
        stroke="#222222"
        strokeWidth="1.2"
      />
    </g>
  );
}

/** Seams between the slabs of terraced arms, running front to back on both arms. */
function ArmTiers({ widthCm, hd, armW, y0 }) {
  const tiers = stepTiers({ armW: armW / 100, armH: 0.62, seatH: 0.44 });
  const hw = widthCm / 2;
  return (
    <g name="arm-tiers">
      {[-1, 1].flatMap((sg) =>
        tiers.slice(1).map((t, k) => {
          const x = sg * (hw - (t.off - t.w / 2) * 100);
          return (
            <line
              key={`${sg}${k}`}
              x1={x}
              y1={y0}
              x2={x}
              y2={hd - 2}
              stroke={LINE}
              strokeWidth="0.7"
            />
          );
        })
      )}
    </g>
  );
}

/** Lines `step` apart across a span (channel seams), as x positions between a and b. */
function seams(a, b, step) {
  const n = Math.max(2, Math.round((b - a) / step));
  return Array.from({ length: n - 1 }, (_, i) => a + ((b - a) * (i + 1)) / n);
}

/**
 * Plan of a channel-tufted sofa or armchair: the back with its channels running up to the top edge, the seat
 * channels running front to back, and the arms channelled over the top or terraced in slabs.
 */
function ChannelSeatPlan({ widthCm, depthCm, hw, hd, color, cushion, seats, armW, step, armFill }) {
  const backT = channelBackT(depthCm / 100) * 100;
  const inner = widthCm - armW * 2;
  const seam = { stroke: LINE, strokeWidth: 0.6 };
  const cw = inner / seats;
  return (
    <g name="channel-plan">
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={5}
        fill={color}
        stroke="#222222"
        strokeWidth="1.2"
      />
      {armFill && (
        <ArmFills widthCm={widthCm} depthCm={depthCm} armW={armW} rx={5} fill={armFill} />
      )}
      {/* Back: channels running up and over its top */}
      {seams(-hw + 1, hw - 1, 10).map((x) => (
        <line key={`b${x}`} x1={x} y1={-hd + 1} x2={x} y2={-hd + backT} {...seam} />
      ))}
      <line x1={-hw + armW} y1={-hd + backT} x2={hw - armW} y2={-hd + backT} {...seam} />
      {Array.from({ length: seats }).map((_, i) => {
        const x0 = -hw + armW + cw * i + (seats > 1 ? 0.6 : 0);
        const x1 = x0 + cw - (seats > 1 ? 1.2 : 0);
        return (
          <g key={i}>
            <rect
              x={x0}
              y={-hd + backT}
              width={x1 - x0}
              height={depthCm - backT - 1}
              rx={3}
              fill={cushion}
              stroke={LINE}
              strokeWidth="0.7"
            />
            {seams(x0, x1, 10).map((x) => (
              <line key={x} x1={x} y1={-hd + backT + 1} x2={x} y2={hd - 1.5} {...seam} />
            ))}
          </g>
        );
      })}
      {[-1, 1].map((sg) => (
        <g key={sg}>
          <line
            x1={sg * (hw - armW)}
            y1={-hd + backT}
            x2={sg * (hw - armW)}
            y2={hd - 1}
            stroke={LINE}
            strokeWidth="0.8"
          />
          {!step &&
            seams(hw - armW, hw, 10).map((x) => (
              <line key={x} x1={sg * x} y1={-hd + backT + 1} x2={sg * x} y2={hd - 1.5} {...seam} />
            ))}
        </g>
      ))}
      {step && <ArmTiers widthCm={widthCm} hd={hd} armW={armW} y0={-hd + backT} />}
    </g>
  );
}

/** Types drawn on the plan from the design record alone (when there is no top photo to show). */
const SHAPE_PLAN_TYPES = [
  'bed',
  'chair',
  'corner-sofa',
  'tub-chair',
  'ottoman',
  'daybed',
  'etagere',
  'stool',
  'cabinet',
];

/** The corner of an L-shaped sofa: the run along the back and the chaise, as plan points. */
export function cornerSofaPoints(widthCm, depthCm, traits = {}) {
  const hw = widthCm / 2;
  const hd = depthCm / 2;
  const seats = Math.min(4, Math.max(1, Math.round(traits.seats ?? 2)));
  const armW = Math.min(20, Math.max(7, (traits.arm ?? 0.08) * widthCm));
  const chaise = Math.min(widthCm * 0.5, Math.max(55, widthCm - armW - seats * 72));
  const mainD = depthCm * 0.55;
  const pts = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [hw - chaise, hd],
    [hw - chaise, -hd + mainD],
    [-hw, -hd + mainD],
  ];
  const flip = traits.side === 'left' ? -1 : 1;
  const out = pts.map(([x, y]) => [x * flip, y]);
  if (flip < 0) out.reverse();
  return { points: out, chaise, mainD, armW, seats };
}

/**
 * Plan of a photo-made bed from its design record: headboard (its width and colour), the sheet, pillows with a
 * bolster or a second tier, the duvet with its folded-back sheet and throw, footboard and stitching lines.
 */
function BedPlan({ design, widthCm, depthCm, hw, hd, color }) {
  const { traits = {} } = design;
  const eff = planPalette(design, color);
  const head = eff.body;
  const base = eff.base || head;
  const sheet = eff.sheet || eff.pillow || '#f1eee8';
  const pillow = eff.pillow || '#f7f5f0';
  const duvet = eff.accent || '#a89a88';
  const n = Math.min(4, Math.max(1, Math.round(traits.pillows ?? 2)));
  const headW = widthCm * Math.min(1.15, Math.max(0.7, traits.headW ?? 1));
  // A tube metal frame shows as thin head and foot rails round a slim frame
  const metal = !!traits.metal;
  const headT = metal ? 3.2 : Math.min(14, depthCm * 0.07);
  const footT = metal ? 3.2 : traits.foot ? Math.min(10, depthCm * 0.05) : 0;
  const inner = widthCm - 6;
  // Never negative, however narrow the bed is resized
  const pillowW = Math.max(0, Math.min(75, inner / n - 4));
  const pillowH = traits.tiers ? 40 : 34;
  const pillowY = -hd + headT + 4;
  const duvetTop = -hd + depthCm * 0.38;
  const duvetBottom = hd - footT - 1;
  const lumbar = traits.lumbar === undefined ? n >= 2 : Boolean(traits.lumbar);
  const quiltCols = Math.max(2, Math.round(inner / 40));
  const quilt = 'rgba(34,24,14,0.28)';
  return (
    <g>
      {metal ? (
        <rect
          x={-hw + 1}
          y={-hd + 1}
          width={widthCm - 2}
          height={depthCm - 2}
          rx={3}
          fill="none"
          stroke={base}
          strokeWidth="2"
        />
      ) : (
        <>
          <rect
            x={-hw}
            y={-hd + headT * 0.6}
            width={widthCm}
            height={depthCm - headT * 0.6}
            rx={4}
            fill={base}
            stroke={OUTLINE}
            strokeWidth="1.2"
          />
          <rect
            x={-headW / 2}
            y={-hd}
            width={headW}
            height={headT}
            rx={3}
            fill={head}
            stroke={OUTLINE}
            strokeWidth="1.2"
          />
        </>
      )}
      <rect
        x={-hw + 3}
        y={-hd + headT}
        width={inner}
        height={depthCm - headT - footT - 2}
        rx={3}
        fill={sheet}
        stroke={LINE}
        strokeWidth="0.7"
      />
      {Array.from({ length: n }).map((_, i) => (
        <rect
          key={i}
          x={(i - (n - 1) / 2) * (pillowW + 4) - pillowW / 2}
          y={pillowY}
          width={pillowW}
          height={pillowH}
          rx={8}
          fill={pillow}
          stroke={LINE}
          strokeWidth="0.8"
        />
      ))}
      {traits.tiers &&
        Array.from({ length: n }).map((_, i) => (
          <rect
            key={`f${i}`}
            x={(i - (n - 1) / 2) * (pillowW * 0.78 + 5) - (pillowW * 0.78) / 2}
            y={pillowY + pillowH - 6}
            width={pillowW * 0.78}
            height={26}
            rx={7}
            fill={pillow}
            stroke={LINE}
            strokeWidth="0.8"
          />
        ))}
      {lumbar && (
        <rect
          x={-Math.min(widthCm * 0.15, 28)}
          y={pillowY + pillowH + (traits.tiers ? 20 : 2)}
          width={Math.min(widthCm * 0.3, 56)}
          height={20}
          rx={9}
          fill={pillow}
          stroke={LINE}
          strokeWidth="0.8"
        />
      )}
      <rect
        x={-hw + 1}
        y={duvetTop}
        width={widthCm - 2}
        height={duvetBottom - duvetTop}
        rx={5}
        fill={duvet}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      {traits.fold !== 0 && (
        <rect
          x={-hw + 2}
          y={duvetTop}
          width={widthCm - 4}
          height={Math.min(16, depthCm * 0.08)}
          rx={4}
          fill={sheet}
          stroke={LINE}
          strokeWidth="0.7"
        />
      )}
      {Array.from({ length: quiltCols - 1 }).map((_, i) => (
        <line
          key={i}
          x1={-hw + 1 + ((widthCm - 2) * (i + 1)) / quiltCols}
          y1={duvetTop + 20}
          x2={-hw + 1 + ((widthCm - 2) * (i + 1)) / quiltCols}
          y2={duvetBottom - 4}
          stroke={quilt}
          strokeWidth="0.8"
        />
      ))}
      {traits.throw && (
        <rect
          x={-hw + 8}
          y={duvetBottom - 38}
          width={Math.max(0, widthCm - 16)}
          height={30}
          rx={3}
          fill={duvet}
          fillOpacity="0.6"
          stroke={LINE}
          strokeWidth="0.8"
        />
      )}
      {traits.foot && !metal && (
        <rect
          x={-hw}
          y={hd - footT}
          width={widthCm}
          height={footT}
          rx={3}
          fill={traits.foot === 2 ? base : head}
          stroke={OUTLINE}
          strokeWidth="1.2"
        />
      )}
      {metal && <MetalEndsPlan widthCm={widthCm} hw={hw} hd={hd} t={headT} color={base} />}
      {traits.rails && <GuardRailsPlan depthCm={depthCm} hw={hw} color={base} />}
    </g>
  );
}

/** Bent tube head and foot rails of a metal bed, with the corner posts. */
function MetalEndsPlan({ widthCm, hw, hd, t, color }) {
  return (
    <g name="metal-ends">
      {[-1, 1].map((sg) => (
        <rect
          key={sg}
          x={-hw}
          y={sg < 0 ? -hd : hd - t}
          width={widthCm}
          height={t}
          rx={t / 2}
          fill={color}
          stroke={OUTLINE}
          strokeWidth="0.6"
        />
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <circle
            key={`${sx}${sy}`}
            cx={sx * (hw - 2)}
            cy={sy * (hd - 2)}
            r={2}
            fill={color}
            stroke={OUTLINE}
            strokeWidth="0.6"
          />
        ))
      )}
    </g>
  );
}

/** Low guard rails along the long sides, where they stand (one nearer the head, one nearer the foot). */
function GuardRailsPlan({ depthCm, hw, color }) {
  return (
    <g name="guard-rails">
      {guardRailSpans(depthCm / 100).map(({ side, z0, z1 }) => (
        <rect
          key={side}
          x={side * (hw - 1.1) - 1.1}
          y={z0 * 100}
          width={2.2}
          height={(z1 - z0) * 100}
          rx={1.1}
          fill={color}
          stroke={OUTLINE}
          strokeWidth="0.5"
        />
      ))}
    </g>
  );
}

/** Points of an elliptical arc (angles from the back, -y, towards +x) as an SVG path fragment. */
function arcPoints(rx, ry, a0, a1, steps = 28) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return `${(Math.sin(a) * rx).toFixed(2)} ${(-Math.cos(a) * ry).toFixed(2)}`;
  });
}

/**
 * Wrap-around tub chair from above: the round drum cushion pushed forward and the thick horseshoe shell round
 * the back, its arms ending part way along the sides.
 */
function WrapTubPlan({ widthCm, depthCm, hw, hd, color, cushion }) {
  const r = Math.min(widthCm, depthCm) / 2;
  const t = wrapThickness(r / 100) * 100;
  const k = 1 - t / r;
  const ox = hw;
  const oy = hd;
  const ix = hw * k;
  const iy = hd * k;
  const outer = arcPoints(ox, oy, -WRAP_END, WRAP_END);
  const inner = arcPoints(ix, iy, WRAP_END, -WRAP_END);
  // Rounded arm ends: half circles round the end of each arm, from the outer edge to the inner one (right)
  // and back out again (left)
  const end = (a, from) => {
    const cx = Math.sin(a) * ((ox + ix) / 2);
    const cy = -Math.cos(a) * ((oy + iy) / 2);
    const rx = (ox - ix) / 2;
    const ry = (oy - iy) / 2;
    return Array.from({ length: 9 }, (_, i) => {
      const b = from + (Math.PI * i) / 8;
      return `${(cx + Math.sin(b) * rx).toFixed(2)} ${(cy - Math.cos(b) * ry).toFixed(2)}`;
    });
  };
  const d = `M ${[
    ...outer,
    ...end(WRAP_END, WRAP_END),
    ...inner,
    ...end(-WRAP_END, -WRAP_END - Math.PI),
  ].join(' L ')} Z`;
  return (
    <g name="wrap-plan">
      <ellipse
        cx={0}
        cy={hd * 0.1}
        rx={ix * 1.02}
        ry={iy * 1.02}
        fill={cushion}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path d={d} fill={color} stroke={OUTLINE} strokeWidth="1.2" strokeLinejoin="round" />
      <path
        d={`M ${arcPoints((ox + ix) / 2, (oy + iy) / 2, -WRAP_END * 0.8, WRAP_END * 0.8).join(' L ')}`}
        fill="none"
        stroke={LINE}
        strokeWidth="0.6"
        strokeDasharray="3 2"
      />
    </g>
  );
}

/**
 * Dining chair from above: the seat covers the footprint in its own colour, with the back rail and the two
 * back posts showing behind it in the frame's colour, as the 3D chair does.
 */
function ChairPlan({ design, widthCm, depthCm, hw, hd, palette }) {
  const traits = design.traits || {};
  const frame = palette.body;
  const seat = palette.cushion || frame;
  const post = Math.min(3.5, widthCm * 0.1, depthCm * 0.1);
  const railD = Math.min(2.5, depthCm * 0.1);
  return (
    <g name="chair-plan">
      <rect
        x={-hw}
        y={-hd + 1}
        width={widthCm}
        height={Math.max(0, depthCm - 2)}
        rx={Math.min(3, widthCm * 0.1)}
        fill={seat}
        stroke={OUTLINE}
        strokeWidth="1.2"
      />
      {/* the top rail across the back, and a slatted or open back drawn as a hairline */}
      <rect
        x={-hw + post}
        y={-hd + 0.5}
        width={Math.max(0, widthCm - post * 2)}
        height={railD}
        fill={frame}
        stroke={LINE}
        strokeWidth="0.5"
      />
      {traits.back === 'solid' && (
        <line
          x1={-hw + post}
          y1={-hd + 0.5 + railD}
          x2={hw - post}
          y2={-hd + 0.5 + railD}
          stroke={LINE}
          strokeWidth="0.6"
        />
      )}
      {[-1, 1].map((sg) => (
        <rect
          key={sg}
          x={sg < 0 ? -hw + 0.5 : hw - post - 0.5}
          y={-hd + 0.5}
          width={post}
          height={post}
          fill={frame}
          stroke={LINE}
          strokeWidth="0.5"
        />
      ))}
      <line
        x1={-hw + 4}
        y1={hd - 2.5}
        x2={hw - 4}
        y2={hd - 2.5}
        stroke={LINE}
        strokeWidth="1.6"
        strokeDasharray="4 3"
      />
    </g>
  );
}

/**
 * Stool from above: all seat, in the seat's colour; the frame shows only as the low back rail (an arc round the
 * back of a round seat, a bar across a square one) when there is one. Stools drawn before the seat and back
 * options existed always had the back rail.
 */
function StoolPlan({ design, widthCm, depthCm, hw, hd, palette }) {
  const traits = design.traits || {};
  const round = traits.seat !== 'square';
  const back = traits.seat === undefined || !!traits.back;
  const seat = palette.cushion || palette.body;
  const stroke = { stroke: OUTLINE, strokeWidth: 1.2 };
  const tube = (traits.seat === undefined ? 0.028 : 0.032) * 100;
  return (
    <g name="stool-plan">
      {round ? (
        <ellipse cx={0} cy={0} rx={hw} ry={hd} fill={seat} {...stroke} />
      ) : (
        <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={6} fill={seat} {...stroke} />
      )}
      {back &&
        (round ? (
          <path
            d={`M ${arcPoints(hw * 0.88, hd * 0.88, -Math.PI * 0.35, Math.PI * 0.35, 16).join(' L ')}`}
            fill="none"
            stroke={palette.body}
            strokeWidth={Math.min(tube, Math.min(widthCm, depthCm) * 0.12)}
            strokeLinecap="round"
          />
        ) : (
          <rect
            x={-hw + Math.min(2, widthCm * 0.1)}
            y={-hd + Math.min(1.75, depthCm * 0.08)}
            width={Math.max(0, widthCm - Math.min(4, widthCm * 0.2))}
            height={Math.min(2.5, depthCm * 0.12)}
            fill={palette.body}
            stroke={LINE}
            strokeWidth="0.5"
          />
        ))}
    </g>
  );
}

/** Plan drawn from the design record for the shapes that have no seating plan of their own. */
function ShapePlan({ design, widthCm, depthCm, hw, hd, color }) {
  const { type, traits = {} } = design;
  const palette = planPalette(design, color);
  const cushion = palette.cushion || palette.body;
  const stroke = { stroke: OUTLINE, strokeWidth: 1.2 };
  if (type === 'bed')
    return (
      <BedPlan design={design} widthCm={widthCm} depthCm={depthCm} hw={hw} hd={hd} color={color} />
    );
  if (type === 'corner-sofa') {
    const { points, chaise, mainD, armW, seats } = cornerSofaPoints(widthCm, depthCm, traits);
    const flip = traits.side === 'left' ? -1 : 1;
    const backT = Math.min(mainD * 0.27, depthCm * 0.2);
    const seatsW = widthCm - chaise - armW;
    return (
      <g>
        <path
          d={`M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`}
          fill={color}
          {...stroke}
          strokeLinejoin="round"
        />
        {Array.from({ length: seats }).map((_, i) => {
          const x0 = -hw + armW + (seatsW / seats) * i + 1.5;
          const w = Math.max(0, seatsW / seats - 3);
          return (
            <rect
              key={i}
              x={flip < 0 ? hw - armW - (seatsW / seats) * (i + 1) + 1.5 : x0}
              y={-hd + backT + 2}
              width={w}
              height={Math.max(0, mainD - backT - 4)}
              rx={4}
              fill={cushion}
              stroke={LINE}
              strokeWidth="0.7"
            />
          );
        })}
        <rect
          x={flip < 0 ? -hw + armW + 1.5 : hw - chaise + 1.5}
          y={-hd + mainD - 2}
          width={Math.max(0, chaise - armW - 3)}
          height={Math.max(0, depthCm - mainD - 2 - 4)}
          rx={4}
          fill={cushion}
          stroke={LINE}
          strokeWidth="0.7"
        />
        <line
          x1={-hw + 3}
          y1={-hd + backT}
          x2={hw - 3}
          y2={-hd + backT}
          stroke={LINE}
          strokeWidth="0.7"
        />
      </g>
    );
  }
  if (type === 'tub-chair' && traits.wrap)
    return (
      <WrapTubPlan
        widthCm={widthCm}
        depthCm={depthCm}
        hw={hw}
        hd={hd}
        color={color}
        cushion={cushion}
      />
    );
  if (type === 'chair')
    return (
      <ChairPlan
        design={design}
        widthCm={widthCm}
        depthCm={depthCm}
        hw={hw}
        hd={hd}
        palette={palette}
      />
    );
  if (type === 'stool')
    return (
      <StoolPlan
        design={design}
        widthCm={widthCm}
        depthCm={depthCm}
        hw={hw}
        hd={hd}
        palette={palette}
      />
    );
  if (type === 'tub-chair' || type === 'ottoman') {
    const round = type === 'tub-chair' ? traits.plan !== 'bucket' : traits.shape === 'round';
    const inset =
      type === 'tub-chair' ? Math.min(widthCm, depthCm) * 0.14 : Math.min(widthCm, depthCm) * 0.07;
    return (
      <g>
        {round ? (
          <ellipse cx={0} cy={0} rx={hw} ry={hd} fill={color} {...stroke} />
        ) : (
          <rect
            x={-hw}
            y={-hd}
            width={widthCm}
            height={depthCm}
            rx={type === 'tub-chair' ? hw * 0.5 : 6}
            fill={color}
            {...stroke}
          />
        )}
        {round ? (
          <ellipse
            cx={0}
            cy={type === 'tub-chair' ? hd * 0.12 : 0}
            rx={hw - inset}
            ry={hd - inset}
            fill={cushion}
            stroke={LINE}
            strokeWidth="0.7"
          />
        ) : (
          <rect
            x={-hw + inset}
            y={-hd + inset}
            width={widthCm - inset * 2}
            height={depthCm - inset * 2}
            rx={5}
            fill={cushion}
            stroke={LINE}
            strokeWidth="0.7"
          />
        )}
        {type === 'tub-chair' && (
          <path
            d={`M ${-hw * 0.78} ${-hd * 0.2} A ${hw * 0.78} ${hd * 0.78} 0 0 1 ${hw * 0.78} ${-hd * 0.2}`}
            fill="none"
            stroke={LINE}
            strokeWidth="1.4"
          />
        )}
        {traits.tufted &&
          type === 'ottoman' &&
          [-0.25, 0.25].flatMap((a) =>
            [-0.25, 0.25].map((b) => (
              <circle key={`${a}${b}`} cx={a * widthCm} cy={b * depthCm} r={1.3} fill={LINE} />
            ))
          )}
      </g>
    );
  }
  if (type === 'daybed') {
    const rail = Math.min(7, depthCm * 0.08);
    const ends = traits.ends === 0 || traits.ends === 1 ? traits.ends : 2;
    return (
      <g>
        <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={3} fill={color} {...stroke} />
        <rect
          x={-hw + (ends ? rail : 2)}
          y={-hd + rail}
          width={Math.max(0, widthCm - (ends === 2 ? rail * 2 : ends ? rail + 2 : 4))}
          height={Math.max(0, depthCm - rail - 3)}
          rx={4}
          fill={cushion}
          stroke={LINE}
          strokeWidth="0.7"
        />
        <ellipse
          cx={-hw + rail + 9}
          cy={0}
          rx={5}
          ry={depthCm * 0.3}
          fill={palette.accent || cushion}
          stroke={LINE}
          strokeWidth="0.7"
        />
        {ends === 2 && (
          <ellipse
            cx={hw - rail - 9}
            cy={0}
            rx={5}
            ry={depthCm * 0.3}
            fill={palette.accent || cushion}
            stroke={LINE}
            strokeWidth="0.7"
          />
        )}
      </g>
    );
  }
  if (type === 'etagere') {
    const cols = Math.min(4, Math.max(1, Math.round(traits.cols ?? 1)));
    return (
      <g>
        <rect
          x={-hw}
          y={-hd}
          width={widthCm}
          height={depthCm}
          rx={1.5}
          fill={color}
          fillOpacity="0.35"
          {...stroke}
        />
        <rect
          x={-hw + 2.5}
          y={-hd + 2.5}
          width={widthCm - 5}
          height={depthCm - 5}
          fill="none"
          stroke={LINE}
          strokeWidth="0.7"
        />
        {Array.from({ length: cols - 1 }).map((_, i) => (
          <line
            key={i}
            x1={-hw + (widthCm * (i + 1)) / cols}
            y1={-hd + 2.5}
            x2={-hw + (widthCm * (i + 1)) / cols}
            y2={hd - 2.5}
            stroke={LINE}
            strokeWidth="0.7"
          />
        ))}
        <line
          x1={-hw + 3}
          y1={hd - 3}
          x2={hw - 3}
          y2={hd - 3}
          stroke={LINE}
          strokeWidth="1.6"
          strokeDasharray="4 3"
        />
      </g>
    );
  }
  // Cabinet or sideboard: the top, with a tick for each door or drawer front. A sideboard drawn from photos has
  // its top in the accent colour (or a shade lighter than the body), as in 3D
  const n = Math.min(5, Math.max(1, Math.round(traits.n ?? 2)));
  const top =
    traits.front === undefined ? color : palette.accent || shadeColour(palette.body, 0.04);
  return (
    <g>
      <rect x={-hw} y={-hd} width={widthCm} height={depthCm} rx={2} fill={top} {...stroke} />
      {Array.from({ length: n - 1 }).map((_, i) => (
        <line
          key={i}
          x1={-hw + (widthCm * (i + 1)) / n}
          y1={hd - 5}
          x2={-hw + (widthCm * (i + 1)) / n}
          y2={hd}
          stroke={LINE}
          strokeWidth="0.8"
        />
      ))}
      <line
        x1={-hw + 4}
        y1={hd - 3}
        x2={hw - 4}
        y2={hd - 3}
        stroke={LINE}
        strokeWidth="1.6"
        strokeDasharray="4 3"
      />
    </g>
  );
}

/** Wardrobe details only the photo-made model draws; a record with none of them keeps the plain symbol. */
const WARDROBE_TRAITS = ['mirror', 'drawers', 'handle', 'upper', 'niche', 'fluted'];

/** Whether a wardrobe or desk record has details beyond the plain catalog piece. */
export function hasCaseworkTraits(design) {
  const t = design.traits || {};
  const p = design.palette || {};
  if (design.type === 'wardrobe') return WARDROBE_TRAITS.some((k) => t[k]) || !!p.door || !!p.trim;
  if (design.type === 'desk') return !!(t.ped || t.base || t.modesty);
  return false;
}

const HIDDEN = { fill: 'none', stroke: LINE, strokeWidth: 0.7, strokeDasharray: '3 2' };

/**
 * Wardrobe from above: the carcass with its doors along the front, a swing arc and handle for each, the
 * mirror door picked out in glass blue, and an open niche drawn as the recess behind the front.
 */
function WardrobePlan({ design, widthCm, depthCm, hw, hd, color }) {
  const { traits = {} } = design;
  const eff = planPalette(design, color);
  const door = eff.door || eff.body;
  const handle = eff.trim || '#C4A869';
  const L = wardrobeLayout({ widthM: widthCm / 100, heightM: 2.2, traits });
  const front = 2.4;
  const swing = Math.min(30, depthCm * 0.5);
  return (
    <g name="wardrobe-plan">
      <rect
        x={-hw}
        y={-hd}
        width={widthCm}
        height={depthCm}
        rx={1.5}
        fill={color}
        stroke="#2B2117"
        strokeWidth="1.3"
      />
      <line
        x1={-hw + 2}
        y1={-hd + 3}
        x2={hw - 2}
        y2={-hd + 3}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="0.6"
      />
      {L.niche && (
        <rect
          x={L.niche.x0 * 100}
          y={-hd + 4}
          width={(L.niche.x1 - L.niche.x0) * 100}
          height={depthCm - 4 - front}
          {...HIDDEN}
        />
      )}
      {L.cols.map((c, i) => {
        const x0 = (c.x - c.w / 2) * 100;
        const w = c.w * 100;
        const spot = doorHandleSpot(traits.handle || 'bar', c.w);
        const mirror = i === L.mirrorIdx && !!mirrorSpan(c.x, c.w, c.edge, spot);
        const hinge = c.edge > 0 ? x0 : x0 + w;
        return (
          <g key={i}>
            <rect
              x={x0 + 0.3}
              y={hd - front}
              width={Math.max(0, w - 0.6)}
              height={front}
              fill={mirror ? '#CFE3EA' : door}
              stroke={OUTLINE}
              strokeWidth="0.5"
            />
            <SwingArc
              x={hinge}
              y={hd}
              r={Math.min(w - 1, swing)}
              openDown={false}
              flip={c.edge < 0}
            />
            <BarHandle
              x={c.edge > 0 ? x0 + w - 3.5 : x0 + 3.5}
              y={hd - 1.8}
              length={traits.handle === 'bar' ? 3 : 1.8}
              horizontal={false}
              color={handle}
            />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Desk from above: the top, with what holds it up drawn hidden (dashed) beneath it: drawer pedestals, sled
 * runners or panel ends, legs and the modesty panel.
 */
function DeskPlan({ design, widthCm, depthCm, hw, hd, color }) {
  const { traits = {} } = design;
  const legThick = deskLegThick(widthCm / 100, traits);
  const D = deskLayout({
    widthM: widthCm / 100,
    depthM: depthCm / 100,
    heightM: 0.75,
    traits,
    legThick,
  });
  const lt = legThick * 100;
  const pedD = depthCm - 8;
  const pedY = -2 - pedD / 2;
  return (
    <g name="desk-plan">
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
      {D.pedestals.map((p) => (
        <g key={p.side}>
          <rect x={(p.x - p.w / 2) * 100} y={pedY} width={p.w * 100} height={pedD} {...HIDDEN} />
          {/* the drawer pulls, standing just proud of the pedestal front */}
          <line
            x1={(p.x - p.w * 0.18) * 100}
            y1={pedY + pedD + 1.2}
            x2={(p.x + p.w * 0.18) * 100}
            y2={pedY + pedD + 1.2}
            stroke={LINE}
            strokeWidth="0.9"
          />
        </g>
      ))}
      {D.base === 'sled' &&
        [-1, 1].map((sg) => (
          <g key={sg}>
            <line
              x1={sg * D.endX * 100}
              y1={-hd + 4}
              x2={sg * D.endX * 100}
              y2={hd - 4}
              {...HIDDEN}
              strokeWidth="1.4"
            />
            <rect x={sg * D.endX * 100 - 2.5} y={-hd + 8.5} width={5} height={3} {...HIDDEN} />
          </g>
        ))}
      {D.base === 'panel' &&
        [-1, 1].map((sg) => (
          <rect
            key={sg}
            x={sg * D.endX * 100 - (D.endT * 100) / 2}
            y={-hd + 2}
            width={D.endT * 100}
            height={depthCm - 5}
            {...HIDDEN}
          />
        ))}
      {D.legs.map(([x, z], i) =>
        traits.roundLegs ? (
          <circle key={i} cx={x * 100} cy={z * 100} r={lt / 2} {...HIDDEN} />
        ) : (
          <rect
            key={i}
            x={x * 100 - lt / 2}
            y={z * 100 - lt / 2}
            width={lt}
            height={lt}
            {...HIDDEN}
          />
        )
      )}
      {traits.modesty ? (
        <line x1={-hw + 8} y1={-hd + 5} x2={hw - 8} y2={-hd + 5} {...HIDDEN} strokeWidth="1.2" />
      ) : null}
      <line
        x1={-hw + 4}
        y1={hd - 3}
        x2={hw - 4}
        y2={hd - 3}
        stroke={LINE}
        strokeWidth="1.6"
        strokeDasharray="4 3"
      />
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

  if (item.design && SHAPE_PLAN_TYPES.includes(item.design.type) && !loops?.length) {
    return (
      <ShapePlan
        design={item.design}
        widthCm={widthCm}
        depthCm={depthCm}
        hw={hw}
        hd={hd}
        color={color}
      />
    );
  }

  if (item.design && hasCaseworkTraits(item.design) && !loops?.length) {
    const Plan = item.design.type === 'desk' ? DeskPlan : WardrobePlan;
    return (
      <Plan
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
