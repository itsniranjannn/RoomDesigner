import React from 'react';
import { ArchitecturalSilhouette } from '../canvas/ArchitecturalSilhouette.jsx';
import { regionRects } from '../../engine/flatWalls.js';
import { SPACE_KINDS } from '../../engine/flat.js';
import { SANS, SERIF } from '../../engine/exportLayout.js';

/**
 * PlanSheets.jsx
 * Static SVG drawings of a room and of one floor of a flat, built from a sheet model
 * (engine/sheetModel.js). Everything is drawn with plain attributes (no CSS classes, no CSS
 * variables, no external fonts), so the markup is a complete standalone SVG that renders the
 * same anywhere, including when it is loaded as an image for the PNG and PDF export.
 */

export const PAPER = '#FAF8F3';
const LINEN = '#F6F2EA';
const INK = '#1A1615';
const INK_MUTED = '#5C544E';
const INK_FAINT = '#8A8077';
const RULE = '#CFC4B2';
const WALL_CORE = '#332B25';
const WALL_LINE = '#141210';
const WALNUT = '#7A5B37';
const INDIGO = '#22485E';
const MAROON = '#8B2635';

const HALO = (width) => ({
  paintOrder: 'stroke',
  stroke: PAPER,
  strokeWidth: width,
  strokeLinejoin: 'round',
});

// ---------- shared: scale bar, key and title block ----------

function ScaleBar({ bar, k }) {
  const { x, y, lengthCm, label, fontSize } = bar;
  const h = 4 * k;
  const half = lengthCm / 2;
  const sw = 0.9 * Math.sqrt(k);
  return (
    <g fontFamily={SANS} fontSize={fontSize} fill={INK_MUTED}>
      <rect x={x} y={y} width={half} height={h} fill={INK} stroke={INK} strokeWidth={sw} />
      <rect x={x + half} y={y} width={half} height={h} fill={PAPER} stroke={INK} strokeWidth={sw} />
      <text x={x} y={y + h + fontSize * 1.15} textAnchor="middle">
        0
      </text>
      <text x={x + lengthCm} y={y + h + fontSize * 1.15} textAnchor="middle">
        {label}
      </text>
      <text x={x + lengthCm + 8 * k} y={y + h - 0.4 * k} fontWeight="600" fill={INK_FAINT}>
        Scale bar
      </text>
    </g>
  );
}

function TitleBlock({ tb }) {
  const { x, y, w, k } = tb;
  const sw = 1.1 * Math.sqrt(k);
  return (
    <g>
      <line x1={x} y1={y} x2={x + w} y2={y} stroke={INK} strokeWidth={sw * 1.6} />
      <line x1={x} y1={y + 3 * k} x2={x + w} y2={y + 3 * k} stroke={RULE} strokeWidth={sw * 0.7} />
      <text
        x={x}
        y={y + 6 * k + tb.titleFont * 0.85}
        fontFamily={SERIF}
        fontWeight="700"
        fontSize={tb.titleFont}
        fill={INK}
      >
        {tb.title}
      </text>
      <text
        x={x}
        y={y + 6 * k + tb.titleFont * 0.85 + tb.subtitleFont * 1.7}
        fontFamily={SANS}
        fontSize={tb.subtitleFont}
        fill={INK_MUTED}
      >
        {tb.subtitle}
      </text>
      <g fontFamily={SANS} textAnchor="end" fill={INK_MUTED}>
        {tb.right.map((line, i) => (
          <text
            key={line}
            x={x + w}
            y={y + 6 * k + tb.rightFont * (1 + i * 1.5)}
            fontSize={tb.rightFont}
            fontWeight={i === 0 ? 700 : 400}
            fill={i === 0 ? INK : INK_MUTED}
          >
            {line}
          </text>
        ))}
        <text
          x={x + w}
          y={y + 6 * k + tb.rightFont * (1 + tb.right.length * 1.5)}
          fontSize={tb.rightFont * 0.9}
          fill={INK_FAINT}
        >
          {tb.footer}
        </text>
      </g>
    </g>
  );
}

function PieceKey({ model }) {
  const { key, k } = model;
  if (!key) return null;
  const { grid, fontSize } = key;
  const r = fontSize * 0.78;
  return (
    <g fontFamily={SANS} fontSize={fontSize}>
      <text x={key.x} y={key.y + fontSize} fontWeight="700" fill={INK}>
        {key.title}
      </text>
      <line
        x1={key.x}
        y1={key.y + fontSize * 1.5}
        x2={key.x + key.innerW}
        y2={key.y + fontSize * 1.5}
        stroke={RULE}
        strokeWidth={0.7 * Math.sqrt(k)}
      />
      {key.entries.map((e, i) => {
        const col = i % grid.cols;
        const row = Math.floor(i / grid.cols);
        const cx = key.x + col * grid.colWidth + r;
        const cy = key.y + fontSize * 2.1 + row * grid.lineHeight + grid.lineHeight / 2;
        return (
          <g key={e.n}>
            <circle cx={cx} cy={cy} r={r} fill={INK} />
            <text
              x={cx}
              y={cy + fontSize * 0.34}
              textAnchor="middle"
              fontWeight="700"
              fontSize={fontSize * (e.n > 9 ? 0.78 : 0.9)}
              fill="#FFFFFF"
            >
              {e.n}
            </text>
            <text x={cx + r + fontSize * 0.7} y={cy + fontSize * 0.34} fill={INK}>
              {e.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function KindKey({ model }) {
  const { kindKey, k } = model;
  if (!kindKey) return null;
  const font = kindKey.font;
  return (
    <g fontFamily={SANS} fontSize={font}>
      <text x={model.margin} y={kindKey.y + font} fontWeight="700" fill={INK}>
        {kindKey.title}
      </text>
      {kindKey.entries.map((e) => {
        const cy = kindKey.y + font * 1.6 + e.row * kindKey.rowH + kindKey.rowH * 0.45;
        return (
          <g key={e.kind}>
            <rect
              x={e.x}
              y={cy - font * 0.5}
              width={font * 1.2}
              height={font}
              rx={font * 0.2}
              fill={e.color}
              stroke={INK_FAINT}
              strokeWidth={0.6 * Math.sqrt(k)}
            />
            <text x={e.x + font * 1.8} y={cy + font * 0.34} fill={INK}>
              {e.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <filter id="furniture-drop-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="2" dy="3.5" stdDeviation="3" floodColor="#1C1A17" floodOpacity="0.14" />
      </filter>
    </defs>
  );
}

function Furniture({ pieces }) {
  return (
    <g>
      {pieces.map((p) => (
        <g
          key={p.id}
          transform={`translate(${p.x}, ${p.y}) rotate(${p.rotationDeg})`}
          filter="url(#furniture-drop-shadow)"
        >
          <ArchitecturalSilhouette item={p.def} widthCm={p.widthCm} depthCm={p.depthCm} />
        </g>
      ))}
    </g>
  );
}

function PieceLabels({ labels, font, k }) {
  const sw = 0.7 * Math.sqrt(k);
  return (
    <g fontFamily={SANS}>
      {labels.map((l) =>
        l.kind === 'text' ? (
          <text
            key={l.id}
            x={l.x}
            y={l.y + font * 0.34}
            textAnchor="middle"
            fontSize={font}
            fontWeight="500"
            fill={INK}
            {...HALO(font * 0.4)}
          >
            {l.text}
          </text>
        ) : (
          <g key={l.id}>
            {l.leader && (
              <>
                <line
                  x1={l.anchorX}
                  y1={l.anchorY}
                  x2={l.x}
                  y2={l.y}
                  stroke={INK_FAINT}
                  strokeWidth={sw}
                  strokeDasharray={`${2 * k} ${2 * k}`}
                />
                <circle cx={l.anchorX} cy={l.anchorY} r={1.5 * k} fill={INK_FAINT} />
              </>
            )}
            <circle cx={l.x} cy={l.y} r={l.r} fill={INK} stroke={PAPER} strokeWidth={sw} />
            <text
              x={l.x}
              y={l.y + font * 0.34}
              textAnchor="middle"
              fontSize={font * (l.n > 9 ? 0.78 : 0.9)}
              fontWeight="700"
              fill="#FFFFFF"
            >
              {l.n}
            </text>
          </g>
        )
      )}
    </g>
  );
}

function DimensionLines({ dims, x1, y1, topText, leftText, k }) {
  const sw = 0.9 * Math.sqrt(k);
  const ty = dims.y0 - dims.offset;
  const lx = dims.x0 - dims.offset;
  const tick = 4 * k;
  const f = dims.fontSize;
  return (
    <g stroke={INK_MUTED} strokeWidth={sw} fill={INK_MUTED} fontFamily={SANS}>
      <line x1={dims.x0} y1={ty} x2={x1} y2={ty} />
      <line x1={dims.x0} y1={ty - tick} x2={dims.x0} y2={ty + tick} />
      <line x1={x1} y1={ty - tick} x2={x1} y2={ty + tick} />
      <text
        x={(dims.x0 + x1) / 2}
        y={ty - 4 * k}
        textAnchor="middle"
        fontSize={f}
        fontWeight="500"
        stroke="none"
      >
        {topText}
      </text>
      <line x1={lx} y1={dims.y0} x2={lx} y2={y1} />
      <line x1={lx - tick} y1={dims.y0} x2={lx + tick} y2={dims.y0} />
      <line x1={lx - tick} y1={y1} x2={lx + tick} y2={y1} />
      <text
        transform={`translate(${lx - 4 * k} ${(dims.y0 + y1) / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={f}
        fontWeight="500"
        stroke="none"
      >
        {leftText}
      </text>
    </g>
  );
}

// ---------- room ----------

function RoomWindow({ win, W, D, wall }) {
  const wall2 = wall / 2;
  const { wall: side, horizontal, offsetCm, widthCm } = win;
  const wx = horizontal ? offsetCm : side === 'left' ? -wall2 : W - wall2;
  const wy = horizontal ? (side === 'top' ? -wall2 : D - wall2) : offsetCm;
  const ww = horizontal ? widthCm : wall;
  const wh = horizontal ? wall : widthCm;
  const jamb = { stroke: WALL_LINE, strokeWidth: 2.5 };
  return (
    <g>
      <rect x={wx - 1} y={wy - 1} width={ww + 2} height={wh + 2} fill={LINEN} />
      <rect x={wx} y={wy} width={ww} height={wh} fill="rgba(90, 115, 142, 0.16)" />
      {horizontal ? (
        <>
          <line x1={wx} y1={wy} x2={wx} y2={wy + wh} {...jamb} />
          <line x1={wx + ww} y1={wy} x2={wx + ww} y2={wy + wh} {...jamb} />
          <line
            x1={wx}
            y1={wy + wh * 0.35}
            x2={wx + ww}
            y2={wy + wh * 0.35}
            stroke="#5A738E"
            strokeWidth="1.2"
          />
          <line
            x1={wx}
            y1={wy + wh * 0.65}
            x2={wx + ww}
            y2={wy + wh * 0.65}
            stroke="#5A738E"
            strokeWidth="1.2"
          />
          <line
            x1={wx + ww / 2}
            y1={wy}
            x2={wx + ww / 2}
            y2={wy + wh}
            stroke="#3D536B"
            strokeWidth="1.8"
          />
        </>
      ) : (
        <>
          <line x1={wx} y1={wy} x2={wx + ww} y2={wy} {...jamb} />
          <line x1={wx} y1={wy + wh} x2={wx + ww} y2={wy + wh} {...jamb} />
          <line
            x1={wx + ww * 0.35}
            y1={wy}
            x2={wx + ww * 0.35}
            y2={wy + wh}
            stroke="#5A738E"
            strokeWidth="1.2"
          />
          <line
            x1={wx + ww * 0.65}
            y1={wy}
            x2={wx + ww * 0.65}
            y2={wy + wh}
            stroke="#5A738E"
            strokeWidth="1.2"
          />
          <line
            x1={wx}
            y1={wy + wh / 2}
            x2={wx + ww}
            y2={wy + wh / 2}
            stroke="#3D536B"
            strokeWidth="1.8"
          />
        </>
      )}
      {/* Brass sill on the outside face */}
      {side === 'top' && (
        <line x1={wx - 4} y1={wy} x2={wx + ww + 4} y2={wy} stroke="#A67C43" strokeWidth="2" />
      )}
      {side === 'bottom' && (
        <line
          x1={wx - 4}
          y1={wy + wh}
          x2={wx + ww + 4}
          y2={wy + wh}
          stroke="#A67C43"
          strokeWidth="2"
        />
      )}
      {side === 'left' && (
        <line x1={wx} y1={wy - 4} x2={wx} y2={wy + wh + 4} stroke="#A67C43" strokeWidth="2" />
      )}
      {side === 'right' && (
        <line
          x1={wx + ww}
          y1={wy - 4}
          x2={wx + ww}
          y2={wy + wh + 4}
          stroke="#A67C43"
          strokeWidth="2"
        />
      )}
    </g>
  );
}

/** Hinge, leaf tip and far end of a door, from its wall and swing side. */
export function doorPoints(door, W, D) {
  const { wall: side, offsetCm: off, widthCm: w, outward } = door;
  const frames = {
    top: { hinge: [off, 0], tangent: [1, 0], inward: [0, 1] },
    bottom: { hinge: [off, D], tangent: [1, 0], inward: [0, -1] },
    left: { hinge: [0, off], tangent: [0, 1], inward: [1, 0] },
    right: { hinge: [W, off], tangent: [0, 1], inward: [-1, 0] },
  };
  const f = frames[side] || frames.bottom;
  const s = outward ? -1 : 1;
  const leaf = [f.hinge[0] + f.inward[0] * s * w, f.hinge[1] + f.inward[1] * s * w];
  const far = [f.hinge[0] + f.tangent[0] * w, f.hinge[1] + f.tangent[1] * w];
  const cross =
    (leaf[0] - f.hinge[0]) * (far[1] - f.hinge[1]) - (leaf[1] - f.hinge[1]) * (far[0] - f.hinge[0]);
  return { hinge: f.hinge, leaf, far, sweep: cross > 0 ? 1 : 0 };
}

function RoomDoor({ door, W, D, wall }) {
  const wall2 = wall / 2;
  const { wall: side, horizontal, offsetCm, widthCm: w } = door;
  const dx = horizontal ? offsetCm : side === 'left' ? -wall2 : W - wall2;
  const dy = horizontal ? (side === 'top' ? -wall2 : D - wall2) : offsetCm;
  const dw = horizontal ? w : wall;
  const dh = horizontal ? wall : w;
  const p = doorPoints(door, W, D);
  return (
    <g>
      <rect x={dx} y={dy} width={dw} height={dh} fill={LINEN} />
      <path
        d={`M ${p.leaf[0]} ${p.leaf[1]} A ${w} ${w} 0 0 ${p.sweep} ${p.far[0]} ${p.far[1]}`}
        fill="none"
        stroke="#9E8870"
        strokeWidth="1.2"
        strokeDasharray="3 3"
      />
      <line
        x1={p.hinge[0]}
        y1={p.hinge[1]}
        x2={p.leaf[0]}
        y2={p.leaf[1]}
        stroke="#2D231B"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <rect
        x={dx}
        y={dy}
        width={dw}
        height={dh}
        fill="#EADCC6"
        stroke="#784A28"
        strokeWidth="1.2"
      />
    </g>
  );
}

function RoomGrid({ W, D }) {
  const lines = [];
  for (let x = 10; x < W; x += 10)
    lines.push(
      x % 50 === 0 ? (
        <line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={D}
          stroke="#C4B9A8"
          strokeWidth="0.55"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      ) : (
        <line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={D}
          stroke="#E2DACD"
          strokeWidth="0.4"
          opacity="0.4"
        />
      )
    );
  for (let y = 10; y < D; y += 10)
    lines.push(
      y % 50 === 0 ? (
        <line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={W}
          y2={y}
          stroke="#C4B9A8"
          strokeWidth="0.55"
          strokeDasharray="3 3"
          opacity="0.55"
        />
      ) : (
        <line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={W}
          y2={y}
          stroke="#E2DACD"
          strokeWidth="0.4"
          opacity="0.4"
        />
      )
    );
  return <g>{lines}</g>;
}

function RoomDrawing({ model }) {
  const { W, D, wall } = model.room;
  return (
    <g transform={`translate(${model.ox} ${model.oy})`}>
      <rect x={0} y={0} width={W} height={D} fill={LINEN} />
      <RoomGrid W={W} D={D} />
      <path
        d={`M 0 0 L ${W} 0 L ${W} ${D} L 0 ${D} Z`}
        fill="none"
        stroke={WALL_CORE}
        strokeWidth={wall}
        strokeLinejoin="miter"
      />
      <rect x={0} y={0} width={W} height={D} fill="none" stroke={WALL_LINE} strokeWidth="3.2" />
      {model.windows.map((win) => (
        <RoomWindow key={win.id} win={win} W={W} D={D} wall={wall} />
      ))}
      {model.doors.map((door) => (
        <RoomDoor key={door.id} door={door} W={W} D={D} wall={wall} />
      ))}
      <Furniture pieces={model.pieces} />
      <PieceLabels labels={model.labels} font={model.labelFont} k={model.k} />
      <DimensionLines
        dims={model.dims}
        x1={W + wall / 2}
        y1={D + wall / 2}
        topText={model.dims.top}
        leftText={model.dims.left}
        k={model.k}
      />
    </g>
  );
}

// ---------- flat ----------

function FlatOpening({ entry, sk }) {
  const { op, thick, swing: s } = entry;
  const w = op.widthCm;
  const h = op.axis === 'h';
  const gap = {
    x: h ? op.start : op.line - thick / 2 - 1,
    y: h ? op.line - thick / 2 - 1 : op.start,
    width: h ? w : thick + 2,
    height: h ? thick + 2 : w,
  };
  if (op.type === 'window') {
    return (
      <g>
        <rect {...gap} fill={LINEN} />
        <rect
          x={h ? op.start : op.line - 3}
          y={h ? op.line - 3 : op.start}
          width={h ? w : 6}
          height={h ? 6 : w}
          fill="#FFFFFF"
          stroke={INDIGO}
          strokeWidth={1.1 * sk}
        />
        <line
          x1={h ? op.start : op.line}
          y1={h ? op.line : op.start}
          x2={h ? op.start + w : op.line}
          y2={h ? op.line : op.start + w}
          stroke={INDIGO}
          strokeWidth={0.8 * sk}
        />
      </g>
    );
  }
  return (
    <g>
      <rect {...gap} fill={LINEN} />
      {h ? (
        <>
          <line
            x1={op.start}
            y1={op.line}
            x2={op.start}
            y2={op.line + s * w}
            stroke={WALNUT}
            strokeWidth={2.2 * sk}
          />
          <path
            d={`M ${op.start + w} ${op.line} A ${w} ${w} 0 0 ${s > 0 ? 1 : 0} ${op.start} ${op.line + s * w}`}
            fill="none"
            stroke={WALNUT}
            strokeWidth={0.9 * sk}
            strokeDasharray={`${4 * sk} ${3 * sk}`}
          />
        </>
      ) : (
        <>
          <line
            x1={op.line}
            y1={op.start}
            x2={op.line + s * w}
            y2={op.start}
            stroke={WALNUT}
            strokeWidth={2.2 * sk}
          />
          <path
            d={`M ${op.line} ${op.start + w} A ${w} ${w} 0 0 ${s > 0 ? 0 : 1} ${op.line + s * w} ${op.start}`}
            fill="none"
            stroke={WALNUT}
            strokeWidth={0.9 * sk}
            strokeDasharray={`${4 * sk} ${3 * sk}`}
          />
        </>
      )}
    </g>
  );
}

function FlatStair({ entry, sk }) {
  const { stair, geometry: g, footprint: fp } = entry;
  const cx = stair.x + fp.widthCm / 2;
  const cy = stair.y + fp.depthCm / 2;
  const TREAD = 27;
  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${stair.rotationDeg || 0}) translate(${-g.localWidthCm / 2} ${-g.localDepthCm / 2})`}
    >
      {g.flights.map((f, fi) => {
        const vertical = f.dir === 'up' || f.dir === 'down';
        const lines = [];
        for (let i = 1; i < f.treads; i++)
          lines.push(
            vertical ? (
              <line
                key={i}
                x1={f.x}
                y1={f.y + i * TREAD}
                x2={f.x + f.widthCm}
                y2={f.y + i * TREAD}
              />
            ) : (
              <line
                key={i}
                x1={f.x + i * TREAD}
                y1={f.y}
                x2={f.x + i * TREAD}
                y2={f.y + f.widthCm}
              />
            )
          );
        let a = [0, 0];
        let b = [0, 0];
        if (f.dir === 'up') {
          a = [f.x + f.widthCm / 2, f.y + f.lengthCm - 8];
          b = [f.x + f.widthCm / 2, f.y + 8];
        } else if (f.dir === 'down') {
          a = [f.x + f.widthCm / 2, f.y + 8];
          b = [f.x + f.widthCm / 2, f.y + f.lengthCm - 8];
        } else {
          a = [f.x + 8, f.y + f.widthCm / 2];
          b = [f.x + f.lengthCm - 8, f.y + f.widthCm / 2];
        }
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const head = 9 * sk;
        const p1 = [b[0] - Math.cos(ang - 0.45) * head, b[1] - Math.sin(ang - 0.45) * head];
        const p2 = [b[0] - Math.cos(ang + 0.45) * head, b[1] - Math.sin(ang + 0.45) * head];
        return (
          <g key={fi}>
            <rect
              x={f.x}
              y={f.y}
              width={vertical ? f.widthCm : f.lengthCm}
              height={vertical ? f.lengthCm : f.widthCm}
              fill="#FCFAF6"
              stroke={INK}
              strokeWidth={1.3 * sk}
            />
            <g stroke={INK_MUTED} strokeWidth={0.8 * sk}>
              {lines}
            </g>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={MAROON} strokeWidth={1.8 * sk} />
            <polygon points={`${b[0]},${b[1]} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={MAROON} />
          </g>
        );
      })}
      {g.landing && (
        <rect
          x={g.landing.x}
          y={g.landing.y}
          width={g.landing.widthCm}
          height={g.landing.depthCm}
          fill="#EDE6D9"
          stroke={INK}
          strokeWidth={1.3 * sk}
        />
      )}
    </g>
  );
}

function FlatDrawing({ model }) {
  const sk = Math.sqrt(model.k);
  return (
    <g transform={`translate(${model.ox} ${model.oy})`}>
      {model.spaces.map((space) => (
        <g key={space.id} fill={(SPACE_KINDS[space.kind] || SPACE_KINDS.room).color}>
          {regionRects(space).map((r, i) => (
            <rect
              key={i}
              x={r.x - 0.3}
              y={r.y - 0.3}
              width={r.widthCm + 0.6}
              height={r.depthCm + 0.6}
            />
          ))}
        </g>
      ))}
      <Furniture pieces={model.pieces} />
      <g fill={INK}>
        {model.stretches.map((s, i) =>
          s.axis === 'h' ? (
            <rect
              key={i}
              x={s.from - s.thick / 2}
              y={s.line - s.thick / 2}
              width={s.to - s.from + s.thick}
              height={s.thick}
            />
          ) : (
            <rect
              key={i}
              x={s.line - s.thick / 2}
              y={s.from - s.thick / 2}
              width={s.thick}
              height={s.to - s.from + s.thick}
            />
          )
        )}
      </g>
      {model.openings.map((entry) => (
        <FlatOpening key={entry.op.id} entry={entry} sk={sk} />
      ))}
      {model.stairs.map((entry) => (
        <FlatStair key={entry.stair.id} entry={entry} sk={sk} />
      ))}
      <g fontFamily={SANS} textAnchor="middle">
        {model.roomLabels.map((l) => (
          <g key={l.id}>
            {l.lines.map((text, i) => (
              <text
                key={i}
                x={l.x}
                y={l.y + i * l.lineH - ((l.lines.length - 1) * l.lineH) / 2 + l.font * 0.1}
                fontSize={l.font}
                fontWeight="700"
                fill={INK}
                {...HALO(l.font * 0.28)}
              >
                {text}
              </text>
            ))}
            {l.meta && (
              <text
                x={l.x}
                y={l.y + ((l.lines.length - 1) * l.lineH) / 2 + l.font * 0.1 + l.metaFont * 1.45}
                fontSize={l.metaFont}
                fill={INK_MUTED}
                {...HALO(l.metaFont * 0.3)}
              >
                {l.meta}
              </text>
            )}
          </g>
        ))}
        {model.stairLabels.map((l) => (
          <text
            key={l.id}
            x={l.x}
            y={l.y}
            fontSize={l.font}
            fontWeight="600"
            fill={INK_MUTED}
            {...HALO(l.font * 0.3)}
          >
            {l.text}
          </text>
        ))}
      </g>
      <DimensionLines
        dims={model.dims}
        x1={model.dims.x1}
        y1={model.dims.y1}
        topText={model.dims.top}
        leftText={model.dims.left}
        k={model.k}
      />
      {model.empty && (
        <text
          x={(model.box.x0 + model.box.x1) / 2}
          y={(model.box.y0 + model.box.y1) / 2}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={14 * model.k}
          fill={INK_FAINT}
        >
          Nothing drawn on this floor yet
        </text>
      )}
    </g>
  );
}

// ---------- sheet ----------

/** A complete standalone SVG for a sheet model, sized `width` x `height` pixels. */
export function PlanSheet({ model, width, height }) {
  const k = model.k;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${model.width} ${model.height}`}
      role="img"
    >
      <Defs />
      <rect x={0} y={0} width={model.width} height={model.height} fill={PAPER} />
      <rect
        x={model.margin * 0.3}
        y={model.margin * 0.3}
        width={model.width - model.margin * 0.6}
        height={model.height - model.margin * 0.6}
        fill="none"
        stroke={RULE}
        strokeWidth={1.2 * Math.sqrt(k)}
      />
      {model.kind === 'room' ? <RoomDrawing model={model} /> : <FlatDrawing model={model} />}
      <ScaleBar bar={model.scaleBar} k={k} />
      <PieceKey model={model} />
      <KindKey model={model} />
      <TitleBlock tb={model.titleBlock} />
    </svg>
  );
}
