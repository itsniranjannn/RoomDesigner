/**
 * sheetModel.js
 * Turns a room or one floor of a flat into a "sheet": everything a printed plan needs, with
 * every position worked out in centimetres of real space (the drawing is never distorted).
 * The model is plain data. components/export/PlanSheets.jsx draws it and exportPlan.js
 * rasterises that drawing, so the file here can be tested without a browser.
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';
import { SPACE_KINDS, stairRect, stairGeometry, stairFootprint, stairTargetIndex } from './flat.js';
import { openingsOf, openWallsOf, levelSolidEdges, entranceOf } from './flatPlan.js';
import { hasOutline, outlineEdges, pointOnEdge, polygonArea } from './roomShape.js';
import {
  CELL,
  analyzeRuns,
  wallStretches,
  regionLabelPoint,
  defaultSwing,
  EXTERIOR_THICK_CM,
  INTERIOR_THICK_CM,
} from './flatWalls.js';
import {
  SANS,
  SERIF,
  chooseScale,
  estimateTextWidth,
  fitText,
  fmtMetres,
  legendGrid,
  placePieceLabels,
  scaleBarLength,
  sizeText,
  areaText,
  titleBlockText,
} from './exportLayout.js';

export const ROOM_WALL_CM = 16;

export const estimateMeasure = (text, size, weight = 400) => estimateTextWidth(text, size, weight);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Bounding box of a placed rectangle after rotation. */
function rotatedBounds(x, y, w, d, rotationDeg) {
  const r = (rotationDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const bw = w * c + d * s;
  const bd = w * s + d * c;
  return { x0: x - bw / 2, y0: y - bd / 2, x1: x + bw / 2, y1: y + bd / 2 };
}

const grow = (box, other) => ({
  x0: Math.min(box.x0, other.x0),
  y0: Math.min(box.y0, other.y0),
  x1: Math.max(box.x1, other.x1),
  y1: Math.max(box.y1, other.y1),
});

/**
 * Stacks the title block, scale bar and key under a drawing and returns the sheet frame.
 * `content` is the drawing's bounding box in plan coordinates.
 */
function frameSheet({ content, k, title, legend, legendTitle, kinds, measure }) {
  const build = (scale) => {
    const margin = 30 * k;
    const contentW = content.x1 - content.x0;
    const contentH = content.y1 - content.y0;
    const innerW = Math.max(contentW, 330 * k);
    const width = innerW + margin * 2;
    const ox = margin + (innerW - contentW) / 2 - content.x0;
    const oy = margin - content.y0;
    let y = margin + contentH + 16 * k;

    const barLen = scaleBarLength(contentW);
    const scaleBar = {
      x: margin,
      y: y + 6 * k,
      lengthCm: barLen,
      label: barLen >= 100 ? `${barLen / 100} m` : `${barLen} cm`,
      fontSize: 8.5 * k,
    };
    y += 22 * k;

    let key = null;
    if (legend && legend.length > 0) {
      const fontSize = 8.6 * k;
      const grid = legendGrid(
        legend.map((e, i) => ({ ...e, n: e.n ?? i + 1 })),
        innerW,
        { fontSize, measure: (t) => measure(t, fontSize, 500, SANS) }
      );
      key = {
        x: margin,
        y: y + 4 * k,
        fontSize,
        grid,
        entries: legend,
        title: legendTitle,
        innerW,
      };
      y += 4 * k + 12 * k + grid.height + 8 * k;
    }

    // Room kinds as colour swatches, wrapped to the sheet width
    let kindKey = null;
    if (kinds && kinds.length > 0) {
      const font = 8.6 * k;
      const rowH = font * 1.9;
      let x = 0;
      let row = 0;
      const entries = [];
      for (const e of kinds) {
        const w = measure(e.label, font, 500, SANS) + font * 2.4;
        if (x > 0 && x + w > innerW) {
          x = 0;
          row++;
        }
        entries.push({ ...e, w, x: margin + x, row });
        x += w + font * 1.2;
      }
      kindKey = { font, entries, y: y + 2 * k, rowH, title: 'Rooms' };
      y += 2 * k + font * 1.6 + (row + 1) * rowH + 4 * k;
    }

    const blockH = 46 * k;
    const titleY = y + 6 * k;
    const text = titleBlockText({ ...title, scale });
    const rightW = Math.max(
      ...text.right.map((t) => measure(t, 9 * k, 500, SANS)),
      measure(text.footer, 8 * k, 400, SANS)
    );
    const leftW = innerW - rightW - 18 * k;
    const titleFont = 17 * k;
    const titleBlock = {
      x: margin,
      y: titleY,
      w: innerW,
      h: blockH,
      k,
      title: fitText(text.title, leftW, (t) => measure(t, titleFont, 700, SERIF)),
      titleFont,
      subtitle: fitText(text.subtitle, leftW, (t) => measure(t, 10 * k, 400, SANS)),
      subtitleFont: 10 * k,
      right: text.right,
      footer: text.footer,
      rightFont: 9 * k,
    };
    const height = titleY + blockH + margin * 0.8;
    return { width, height, k, margin, ox, oy, scaleBar, key, kindKey, titleBlock, scale };
  };
  // The scale is chosen for the whole sheet, so size it once with a stand-in label first
  const first = build({ label: '1:1', orientation: 'landscape' });
  const scale = chooseScale(first.width, first.height);
  return build(scale);
}

// ---------- room ----------

function resolveOpening(item, type, outlined = false) {
  if (outlined) {
    return {
      id: item.id,
      type,
      edge: item.edge ?? 0,
      offsetCm: item.offsetCm,
      widthCm: Number.isFinite(item.widthCm) ? item.widthCm : type === 'door' ? 90 : 120,
      outward: item.swingDirection === 'outward',
    };
  }
  const wall = item.wall || (type === 'door' ? 'bottom' : 'top');
  return {
    id: item.id,
    type,
    wall,
    horizontal: wall === 'top' || wall === 'bottom',
    offsetCm: item.offsetCm,
    widthCm: Number.isFinite(item.widthCm) ? item.widthCm : type === 'door' ? 90 : 120,
    outward: item.swingDirection === 'outward',
  };
}

/**
 * Sheet for one room: walls with the doors and windows, every piece of furniture with its
 * name or a numbered key entry, the two overall dimensions and a title block.
 */
export function buildRoomSheet(room, { measure = estimateMeasure, date = new Date() } = {}) {
  const W = room.widthCm || 500;
  const D = room.depthCm || 400;
  const k = clamp(Math.max(W, D) / 420, 1, 4);
  const wall = ROOM_WALL_CM;

  const outlined = hasOutline(room);
  const edges = outlined ? outlineEdges(room) : [];
  const windows = (room.windows || []).map((w) => resolveOpening(w, 'window', outlined));
  const doors = (room.doors || []).map((d) => resolveOpening(d, 'door', outlined));
  for (const o of [...windows, ...doors]) {
    const len = outlined ? (edges[o.edge]?.len ?? 0) : o.horizontal ? W : D;
    if (!Number.isFinite(o.offsetCm)) o.offsetCm = Math.round(len / 2 - o.widthCm / 2);
  }

  const pieces = [];
  for (const item of room.placedFurniture || []) {
    const def = resolveItemDef(item);
    if (!def) continue;
    pieces.push({
      id: item.id,
      def,
      x: item.x,
      y: item.y,
      widthCm: def.widthCm,
      depthCm: def.depthCm,
      rotationDeg: item.rotationDeg || 0,
      name: def.name,
    });
  }

  // The drawing's own bounds: walls, doors that swing outwards and anything poking out
  let box = { x0: -wall / 2, y0: -wall / 2, x1: W + wall / 2, y1: D + wall / 2 };
  for (const d of doors) {
    if (!d.outward) continue;
    if (outlined) {
      const e = edges[d.edge];
      if (!e) continue;
      for (const pt of [
        pointOnEdge(e, d.offsetCm, 0),
        pointOnEdge(e, d.offsetCm + d.widthCm, 0),
        pointOnEdge(e, d.offsetCm, -d.widthCm - 2),
        pointOnEdge(e, d.offsetCm + d.widthCm, -d.widthCm - 2),
      ])
        box = grow(box, { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y });
      continue;
    }
    if (d.wall === 'top') box.y0 = Math.min(box.y0, -d.widthCm - 2);
    if (d.wall === 'bottom') box.y1 = Math.max(box.y1, D + d.widthCm + 2);
    if (d.wall === 'left') box.x0 = Math.min(box.x0, -d.widthCm - 2);
    if (d.wall === 'right') box.x1 = Math.max(box.x1, W + d.widthCm + 2);
  }
  for (const p of pieces)
    box = grow(box, rotatedBounds(p.x, p.y, p.widthCm, p.depthCm, p.rotationDeg));

  const labelFont = 8.6 * k;
  const bounds = { x0: box.x0 - 4 * k, y0: box.y0 - 4 * k, x1: box.x1 + 4 * k, y1: box.y1 + 4 * k };
  const { labels, legend } = placePieceLabels(pieces, {
    fontSize: labelFont,
    measure: (t) => measure(t, labelFont, 500, SANS),
    bounds,
  });

  const dimOffset = 14 * k;
  const dimText = 9.5 * k;
  const content = {
    x0: box.x0 - dimOffset - dimText * 1.7,
    y0: box.y0 - dimOffset - dimText * 1.7,
    x1: Math.max(box.x1, bounds.x1) + 6 * k,
    y1: Math.max(box.y1, bounds.y1) + 4 * k,
  };

  const frame = frameSheet({
    content,
    k,
    title: {
      kind: 'room',
      name: room.name,
      widthCm: W,
      depthCm: D,
      areaCm2: outlined ? polygonArea(room.outline) : W * D,
      date,
    },
    legend,
    legendTitle: 'Key to numbered pieces',
    measure,
  });

  return {
    kind: 'room',
    ...frame,
    room: { W, D, wall },
    outline: outlined ? { points: room.outline, edges } : null,
    windows,
    doors,
    pieces,
    labels,
    labelFont,
    dims: {
      offset: dimOffset,
      fontSize: dimText,
      x0: box.x0,
      y0: box.y0,
      top: `${fmtMetres(W)} (${W} cm)`,
      left: `${fmtMetres(D)} (${D} cm)`,
    },
  };
}

// ---------- flat ----------

/** How far a door's leaf swings beyond its wall line, for the drawing bounds. */
function swingReach(op) {
  return op.type === 'door' ? op.widthCm : 0;
}

/** Wall thickness where an opening sits (same rule the on-screen plan uses). */
function thicknessAtOpening(op, analysis) {
  const i = Math.floor(op.start / CELL);
  const line = Math.round(op.line / CELL);
  const key = op.axis === 'h' ? `h${i},${line}` : `v${line},${i}`;
  return analysis.isExteriorEdge(key) ? EXTERIOR_THICK_CM : INTERIOR_THICK_CM;
}

/** Width of the room row that holds a point, for fitting a label. */
function rowWidthAt(space, x, y) {
  const j = Math.floor(y / CELL);
  let best = space.widthCm;
  for (const [rj, i0, i1] of space.runs || []) {
    if (rj === j && x >= i0 * CELL && x <= i1 * CELL) best = (i1 - i0) * CELL;
  }
  return best;
}

function roomLabel(space, measure, k) {
  const pt = regionLabelPoint(space);
  const avail = Math.max(20, rowWidthAt(space, pt.x, pt.y) - 10 * k);
  let font = 13 * k;
  const nameW = (f) => measure(space.name, f, 700, SANS);
  while (font > 6.5 * k && nameW(font) > avail) font -= 0.5 * k;
  const lines = [];
  if (nameW(font) <= avail) lines.push(space.name);
  else {
    // Two lines at a space near the middle, each trimmed to fit
    const words = space.name.split(/\s+/);
    if (words.length > 1) {
      let cut = 1;
      let bestGap = Infinity;
      for (let i = 1; i < words.length; i++) {
        const left = words.slice(0, i).join(' ').length;
        const gap = Math.abs(left - space.name.length / 2);
        if (gap < bestGap) {
          bestGap = gap;
          cut = i;
        }
      }
      lines.push(words.slice(0, cut).join(' '), words.slice(cut).join(' '));
    } else lines.push(space.name);
    for (let i = 0; i < lines.length; i++)
      lines[i] = fitText(lines[i], avail, (t) => measure(t, font, 700, SANS));
  }
  const metaFont = font * 0.78;
  const metaParts = [areaText(space.areaCm2)];
  if (space.rect) metaParts.push(sizeText(space.widthCm, space.depthCm));
  let meta = metaParts.join('  ·  ');
  if (measure(meta, metaFont, 400, SANS) > avail) meta = metaParts[0];
  if (measure(meta, metaFont, 400, SANS) > avail) meta = '';
  const lineH = font * 1.18;
  const blockH = lines.length * lineH + (meta ? metaFont * 1.3 : 0);
  if (blockH > space.depthCm - 6 * k) meta = '';
  return { id: space.id, x: pt.x, y: pt.y, font, lines, lineH, meta, metaFont };
}

/** Arrow and label for the main entrance when it is on this floor, drawn just outside its door. */
function entranceMarker(flat, levelId, k, measure) {
  const found = entranceOf(flat);
  if (!found || found.levelId !== levelId) return null;
  const { opening: op, inward } = found;
  const mx = op.axis === 'h' ? op.start + op.widthCm / 2 : op.line;
  const my = op.axis === 'h' ? op.line : op.start + op.widthCm / 2;
  const font = 10 * k;
  const tip = { x: mx - inward.dx * 12 * k, y: my - inward.dy * 12 * k };
  const tail = { x: mx - inward.dx * 42 * k, y: my - inward.dy * 42 * k };
  const base = { x: tip.x - inward.dx * 9 * k, y: tip.y - inward.dy * 9 * k };
  const nx = -inward.dy * 5 * k;
  const ny = inward.dx * 5 * k;
  const text = 'Main entrance';
  const w = measure(text, font, 700, SANS);
  // The label sits beyond the tail; sideways entrances keep it clear of the arrow
  const label =
    inward.dy !== 0
      ? { x: tail.x, y: tail.y - inward.dy * font * 0.9 + (inward.dy > 0 ? 0 : font * 0.3) }
      : { x: tail.x - inward.dx * (w / 2 + font * 0.5), y: tail.y + font * 0.35 };
  return {
    text,
    font,
    x: label.x,
    y: label.y,
    shaft: { x1: tail.x, y1: tail.y, x2: base.x, y2: base.y },
    head: `${base.x + nx},${base.y + ny} ${tip.x},${tip.y} ${base.x - nx},${base.y - ny}`,
  };
}

/**
 * Sheet for one floor of a flat: rooms in their kind colours, walls at their real thickness,
 * doors and windows, stairs, the furniture of every room, room labels and overall dimensions.
 */
export function buildFlatSheet(
  flat,
  rooms,
  levelId,
  { measure = estimateMeasure, date = new Date() } = {}
) {
  const level = flat.levels.find((l) => l.id === levelId) || flat.levels[0];
  const runs = flat.walls?.[level.id] || [];
  const edges = levelSolidEdges(flat, level.id);
  const openRuns = openWallsOf(flat, level.id);
  const analysis = analyzeRuns(runs);
  const openings = openingsOf(flat, level.id);
  const spaces = flat.spaces.filter((s) => s.levelId === level.id);
  const stairs = flat.stairs.filter((s) => s.levelId === level.id);
  const stretches = edges.size > 0 ? wallStretches(edges, analysis.isExteriorEdge) : [];

  // Extent of everything drawn
  let box = null;
  const take = (x0, y0, x1, y1) => {
    box = box ? grow(box, { x0, y0, x1, y1 }) : { x0, y0, x1, y1 };
  };
  for (const s of stretches) {
    const h = s.thick / 2;
    if (s.axis === 'h') take(s.from - h, s.line - h, s.to + h, s.line + h);
    else take(s.line - h, s.from - h, s.line + h, s.to + h);
  }
  for (const st of stairs) {
    const r = stairRect(st);
    take(r.x, r.y, r.x + r.widthCm, r.y + r.depthCm);
  }
  const openingList = openings.map((op) => ({
    op,
    thick: thicknessAtOpening(op, analysis),
    swing: defaultSwing(analysis, op) * (op.flip ? -1 : 1),
  }));
  for (const { op, swing } of openingList) {
    const reach = swingReach(op);
    if (!reach) continue;
    const s = swing;
    if (op.axis === 'h')
      take(
        op.start,
        op.line + Math.min(0, s * reach),
        op.start + op.widthCm,
        op.line + Math.max(0, s * reach)
      );
    else
      take(
        op.line + Math.min(0, s * reach),
        op.start,
        op.line + Math.max(0, s * reach),
        op.start + op.widthCm
      );
  }
  if (!box) box = { x0: 0, y0: 0, x1: 600, y1: 400 };

  const spanW = box.x1 - box.x0;
  const spanH = box.y1 - box.y0;
  const k = clamp(Math.max(spanW, spanH) / 600, 1, 5);
  const roomLabels = spaces.map((s) => roomLabel(s, measure, k));

  // Furniture of rectangular rooms, positioned on the plan
  const pieces = [];
  for (const space of spaces) {
    const room = rooms[space.roomId];
    if (!room || !space.furnishable) continue;
    for (const item of room.placedFurniture || []) {
      const def = resolveItemDef(item);
      if (!def) continue;
      pieces.push({
        id: `${space.id}:${item.id}`,
        def,
        x: space.x + item.x,
        y: space.y + item.y,
        widthCm: def.widthCm,
        depthCm: def.depthCm,
        rotationDeg: item.rotationDeg || 0,
        name: def.name,
      });
    }
  }

  // Stair captions kept clear of the room labels
  const taken = roomLabels.map((l) => ({
    x: l.x - l.lines.reduce((m, t) => Math.max(m, measure(t, l.font, 700, SANS)), 0) / 2,
    y: l.y - l.lineH,
    w: l.lines.reduce((m, t) => Math.max(m, measure(t, l.font, 700, SANS)), 0),
    h: l.lines.length * l.lineH + l.metaFont * 1.4,
  }));
  const stairFont = 9.5 * k;
  const stairLabels = stairs.map((st) => {
    const r = stairRect(st);
    const target = stairTargetIndex(flat, st);
    const text = `Up to ${flat.levels[target]?.name || 'next floor'}`;
    const w = measure(text, stairFont, 600, SANS);
    const cx = r.x + r.widthCm / 2;
    const fits = r.widthCm >= w + 6;
    const options = fits
      ? [
          { x: cx, y: r.y + stairFont * 1.1 },
          { x: cx, y: r.y + r.depthCm - stairFont * 0.5 },
        ]
      : [];
    options.push(
      { x: cx, y: r.y - stairFont * 0.6 },
      { x: cx, y: r.y + r.depthCm + stairFont * 1.4 }
    );
    const pick =
      options.find((o) => {
        const b = { x: o.x - w / 2, y: o.y - stairFont, w, h: stairFont * 1.3 };
        return !taken.some(
          (t) => !(b.x + b.w <= t.x || t.x + t.w <= b.x || b.y + b.h <= t.y || t.y + t.h <= b.y)
        );
      }) || options[0];
    taken.push({ x: pick.x - w / 2, y: pick.y - stairFont, w, h: stairFont * 1.3 });
    return { id: st.id, x: pick.x, y: pick.y, text, font: stairFont };
  });
  for (const l of stairLabels) {
    const w = measure(l.text, l.font, 600, SANS);
    box = grow(box, { x0: l.x - w / 2, y0: l.y - l.font, x1: l.x + w / 2, y1: l.y + l.font * 0.4 });
  }

  // The main entrance: an arrow pointing in through the door, with its label
  const entrance = entranceMarker(flat, level.id, k, measure);
  if (entrance) {
    const w = measure(entrance.text, entrance.font, 700, SANS);
    box = grow(box, {
      x0: entrance.x - w / 2,
      y0: entrance.y - entrance.font,
      x1: entrance.x + w / 2,
      y1: entrance.y + entrance.font * 0.4,
    });
  }

  const wallBox = { x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 };
  const dimOffset = 16 * k;
  const dimText = 10.5 * k;
  const content = {
    x0: box.x0 - dimOffset - dimText * 1.7,
    y0: box.y0 - dimOffset - dimText * 1.7,
    x1: box.x1 + 6 * k,
    y1: box.y1 + 4 * k,
  };

  const kinds = [];
  const seen = new Set();
  for (const s of spaces) {
    const key = s.kind === 'corridor' ? 'passage' : s.kind;
    if (seen.has(key)) continue;
    seen.add(key);
    const def = SPACE_KINDS[key] || SPACE_KINDS.room;
    kinds.push({ kind: key, label: def.label, color: def.color });
  }
  const areaCm2 = spaces.reduce((n, s) => n + (s.areaCm2 || 0), 0);
  const frame = frameSheet({
    content,
    k,
    title: {
      kind: 'flat',
      name: flat.name,
      areaCm2,
      levelName: level.name,
      rooms: spaces.length,
      date,
    },
    kinds,
    measure,
  });

  return {
    kind: 'flat',
    ...frame,
    level: { id: level.id, name: level.name },
    spaces,
    stretches,
    openRuns,
    openings: openingList,
    stairs: stairs.map((st) => ({
      stair: st,
      geometry: stairGeometry(st),
      footprint: stairFootprint(st),
    })),
    pieces,
    roomLabels,
    stairLabels,
    entrance,
    box: wallBox,
    empty: runs.length === 0 && stairs.length === 0,
    dims: {
      offset: dimOffset,
      fontSize: dimText,
      x0: wallBox.x0,
      y0: wallBox.y0,
      x1: wallBox.x1,
      y1: wallBox.y1,
      top: `${fmtMetres(Math.round(spanW))}`,
      left: `${fmtMetres(Math.round(spanH))}`,
    },
  };
}
