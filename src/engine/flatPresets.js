/**
 * flatPresets.js
 * Ready-made starting points for the flat designer: blank, an outer shell by size,
 * and studio / 1BHK / 2BHK / 3BHK layouts. Each preset is described as a tiling of
 * room rectangles; the walls, doors and windows are generated from the tiling, then
 * rooms are detected from the walls like any other plan.
 */

import { CELL, edgesToRuns, addSegment, snapCm } from './flatWalls.js';
import { createFlat, furnishRoomRecord, uid } from './flat.js';
import { reconcile, analyzeLevel, setSpaceMeta } from './flatPlan.js';

export const PRESETS = [
  { value: 'blank', label: 'Blank', note: 'Start from an empty plan' },
  { value: 'shell', label: 'Outer shell by size', note: 'Four outer walls, then add your own' },
  { value: 'studio', label: 'Studio', note: 'One main room, kitchen and bathroom' },
  { value: '1bhk', label: '1BHK', note: 'Hall, kitchen, 1 bedroom, bathroom, store' },
  { value: '2bhk', label: '2BHK', note: 'Hall, dining, kitchen, 2 bedrooms, 2 bathrooms, passage' },
  {
    value: '3bhk',
    label: '3BHK',
    note: 'Hall, dining, kitchen, 3 bedrooms, 2 bathrooms, store, passage',
  },
];

const DOOR_W = 90;
const BATH_DOOR_W = 75;
const WINDOW_W = 120;

// Each tile: [id, kind, name, x, y, width, depth] in cm. Neighbouring tiles share their walls.
const LAYOUTS = {
  studio: {
    name: 'Studio flat',
    tiles: [
      ['hall', 'living', 'Living area', 0, 0, 400, 460],
      ['kitchen', 'kitchen', 'Kitchen', 400, 0, 200, 240],
      ['bath', 'bathroom', 'Bathroom', 400, 240, 200, 220],
    ],
    entrance: ['hall', 'bottom'],
    doors: [
      ['hall', 'kitchen'],
      ['hall', 'bath'],
    ],
  },
  '1bhk': {
    name: 'One-bedroom flat',
    tiles: [
      ['hall', 'living', 'Hall', 0, 0, 420, 300],
      ['kitchen', 'kitchen', 'Kitchen', 420, 0, 260, 300],
      ['bath', 'bathroom', 'Bathroom', 0, 300, 170, 270],
      ['bed', 'bedroom', 'Bedroom', 170, 300, 350, 270],
      ['store', 'store', 'Store', 520, 300, 160, 270],
    ],
    entrance: ['hall', 'left'],
    doors: [
      ['hall', 'kitchen'],
      ['hall', 'bath'],
      ['hall', 'bed'],
      ['kitchen', 'store'],
    ],
  },
  '2bhk': {
    name: 'Two-bedroom flat',
    tiles: [
      ['hall', 'living', 'Hall', 0, 0, 460, 340],
      ['dining', 'dining', 'Dining', 460, 0, 240, 340],
      ['kitchen', 'kitchen', 'Kitchen', 700, 0, 240, 340],
      ['passage', 'corridor', 'Passage', 0, 340, 940, 100],
      ['master', 'bedroom', 'Master bedroom', 0, 440, 340, 260],
      ['mbath', 'bathroom', 'Attached bathroom', 340, 440, 160, 260],
      ['cbath', 'bathroom', 'Common bathroom', 500, 440, 160, 260],
      ['bed2', 'bedroom', 'Bedroom 2', 660, 440, 280, 260],
    ],
    entrance: ['hall', 'left'],
    doors: [
      ['hall', 'dining'],
      ['dining', 'kitchen'],
      ['hall', 'passage'],
      ['master', 'passage'],
      ['master', 'mbath'],
      ['cbath', 'passage'],
      ['bed2', 'passage'],
    ],
  },
  '3bhk': {
    name: 'Three-bedroom flat',
    tiles: [
      ['hall', 'living', 'Hall', 0, 0, 560, 360],
      ['dining', 'dining', 'Dining', 560, 0, 280, 360],
      ['kitchen', 'kitchen', 'Kitchen', 840, 0, 280, 360],
      ['store', 'store', 'Store', 1120, 0, 140, 360],
      ['passage', 'corridor', 'Passage', 0, 360, 1260, 100],
      ['bed2', 'bedroom', 'Bedroom 2', 0, 460, 300, 300],
      ['bed3', 'bedroom', 'Bedroom 3', 300, 460, 300, 300],
      ['cbath', 'bathroom', 'Common bathroom', 600, 460, 160, 300],
      ['master', 'bedroom', 'Master bedroom', 760, 460, 340, 300],
      ['mbath', 'bathroom', 'Attached bathroom', 1100, 460, 160, 300],
    ],
    entrance: ['hall', 'left'],
    doors: [
      ['hall', 'dining'],
      ['dining', 'kitchen'],
      ['kitchen', 'store'],
      ['hall', 'passage'],
      ['bed2', 'passage'],
      ['bed3', 'passage'],
      ['cbath', 'passage'],
      ['master', 'passage'],
      ['master', 'mbath'],
    ],
  },
};

const rectOf = (t) => ({ x: t[3], y: t[4], w: t[5], d: t[6] });

function addRectWalls(edges, r) {
  let next = edges;
  next = addSegment(next, r.x, r.y, r.x + r.w, r.y);
  next = addSegment(next, r.x, r.y + r.d, r.x + r.w, r.y + r.d);
  next = addSegment(next, r.x, r.y, r.x, r.y + r.d);
  next = addSegment(next, r.x + r.w, r.y, r.x + r.w, r.y + r.d);
  return next;
}

/** A door centred on the wall two tiles share. */
function doorBetween(a, b, width) {
  const A = rectOf(a);
  const B = rectOf(b);
  if (A.x + A.w === B.x || B.x + B.w === A.x) {
    const line = A.x + A.w === B.x ? B.x : A.x;
    const lo = Math.max(A.y, B.y);
    const hi = Math.min(A.y + A.d, B.y + B.d);
    if (hi - lo < width + 20) return null;
    return {
      id: uid('door'),
      type: 'door',
      axis: 'v',
      line,
      start: snapCm((lo + hi) / 2 - width / 2),
      widthCm: width,
      swing: 'inward-left',
    };
  }
  if (A.y + A.d === B.y || B.y + B.d === A.y) {
    const line = A.y + A.d === B.y ? B.y : A.y;
    const lo = Math.max(A.x, B.x);
    const hi = Math.min(A.x + A.w, B.x + B.w);
    if (hi - lo < width + 20) return null;
    return {
      id: uid('door'),
      type: 'door',
      axis: 'h',
      line,
      start: snapCm((lo + hi) / 2 - width / 2),
      widthCm: width,
      swing: 'inward-left',
    };
  }
  return null;
}

/** Spans of a tile side that face the outside of the whole layout. */
function exteriorSpans(tile, tiles) {
  const r = rectOf(tile);
  const inside = (px, py) =>
    tiles.some((t) => {
      const q = rectOf(t);
      return px > q.x && px < q.x + q.w && py > q.y && py < q.y + q.d;
    });
  const sides = {
    top: { axis: 'h', line: r.y, from: r.x, to: r.x + r.w, probe: (p) => [p, r.y - CELL / 2] },
    bottom: {
      axis: 'h',
      line: r.y + r.d,
      from: r.x,
      to: r.x + r.w,
      probe: (p) => [p, r.y + r.d + CELL / 2],
    },
    left: { axis: 'v', line: r.x, from: r.y, to: r.y + r.d, probe: (p) => [r.x - CELL / 2, p] },
    right: {
      axis: 'v',
      line: r.x + r.w,
      from: r.y,
      to: r.y + r.d,
      probe: (p) => [r.x + r.w + CELL / 2, p],
    },
  };
  const out = [];
  for (const [side, s] of Object.entries(sides)) {
    const flags = [];
    for (let p = s.from; p < s.to; p += CELL) {
      const [px, py] = s.probe(p + CELL / 2);
      flags.push(!inside(px, py));
    }
    let i = 0;
    while (i < flags.length) {
      if (!flags[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j < flags.length && flags[j]) j++;
      out.push({
        side,
        axis: s.axis,
        line: s.line,
        from: s.from + i * CELL,
        to: s.from + j * CELL,
      });
      i = j;
    }
  }
  return out;
}

function centered(span, width) {
  return snapCm((span.from + span.to) / 2 - width / 2);
}

function layoutOpenings(layout) {
  const tiles = layout.tiles;
  const byId = new Map(tiles.map((t) => [t[0], t]));
  const ops = [];
  for (const [a, b] of layout.doors) {
    const tb = byId.get(b);
    const width = tb[1] === 'bathroom' || byId.get(a)[1] === 'bathroom' ? BATH_DOOR_W : DOOR_W;
    const op = doorBetween(byId.get(a), tb, width);
    if (op) ops.push(op);
  }
  // Front door
  const [entranceId, side] = layout.entrance;
  const entranceSpans = exteriorSpans(byId.get(entranceId), tiles).filter((s) => s.side === side);
  const entrance = entranceSpans.sort((p, q) => q.to - q.from - (p.to - p.from))[0];
  if (entrance) {
    ops.push({
      id: uid('door'),
      type: 'door',
      axis: entrance.axis,
      line: entrance.line,
      start: centered(entrance, DOOR_W),
      widthCm: DOOR_W,
      swing: 'inward-left',
    });
  }
  // One window per room on its longest outside wall
  for (const t of tiles) {
    if (t[1] === 'corridor') continue;
    const spans = exteriorSpans(t, tiles)
      .filter((s) => !(t[0] === entranceId && s.side === side))
      .sort((p, q) => q.to - q.from - (p.to - p.from));
    const span = spans[0];
    if (!span) continue;
    const width = t[1] === 'bathroom' ? 60 : t[1] === 'store' ? 60 : WINDOW_W;
    if (span.to - span.from < width + 40) continue;
    ops.push({
      id: uid('win'),
      type: 'window',
      axis: span.axis,
      line: span.line,
      start: centered(span, width),
      widthCm: width,
    });
  }
  return ops;
}

/**
 * Builds a new flat for a starting point.
 * @param {'blank'|'shell'|'studio'|'1bhk'|'2bhk'|'3bhk'} preset
 * @returns {{ flat: Object, rooms: Object }} rooms keyed by id
 */
export function buildPresetFlat(
  preset = 'blank',
  { name, widthCm = 800, depthCm = 600, flatId } = {}
) {
  let flat = createFlat(name || 'My Flat');
  if (flatId) flat = { ...flat, id: flatId };
  const levelId = flat.levels[0].id;
  if (preset === 'blank') return { flat, rooms: {} };

  let edges = new Set();
  let openings = [];
  let tiles = null;
  if (preset === 'shell') {
    const w = Math.max(200, Math.min(2400, snapCm(widthCm)));
    const d = Math.max(200, Math.min(2400, snapCm(depthCm)));
    edges = addRectWalls(edges, { x: 0, y: 0, w, d });
    openings = [
      {
        id: uid('door'),
        type: 'door',
        axis: 'h',
        line: d,
        start: snapCm(w / 2 - DOOR_W / 2),
        widthCm: DOOR_W,
        swing: 'inward-left',
      },
      {
        id: uid('win'),
        type: 'window',
        axis: 'h',
        line: 0,
        start: snapCm(w / 2 - WINDOW_W / 2),
        widthCm: WINDOW_W,
      },
    ];
  } else {
    const layout = LAYOUTS[preset];
    if (!layout) return { flat, rooms: {} };
    tiles = layout.tiles;
    for (const t of tiles) edges = addRectWalls(edges, rectOf(t));
    openings = layoutOpenings(layout);
    if (!name) flat = { ...flat, name: layout.name };
  }
  flat = {
    ...flat,
    walls: { [levelId]: edgesToRuns(edges) },
    openings: { [levelId]: openings },
  };
  let state = reconcile(flat, {});

  if (tiles) {
    const analysis = analyzeLevel(state.flat, levelId);
    for (const t of tiles) {
      const r = rectOf(t);
      const region = analysis.regions.find(
        (g) => g.x === r.x && g.y === r.y && g.widthCm === r.w && g.depthCm === r.d
      );
      const space =
        region &&
        state.flat.spaces.find(
          (s) => s.levelId === levelId && s.x === region.x && s.y === region.y
        );
      if (!space) continue;
      const next = setSpaceMeta(state.flat, state.rooms, space.id, { name: t[2], kind: t[1] });
      state = { ...state, ...next };
      const room = state.rooms[space.roomId];
      state.rooms = { ...state.rooms, [room.id]: furnishRoomRecord(room, t[1]) };
    }
  } else {
    const only = state.flat.spaces[0];
    if (only)
      state = {
        ...state,
        ...setSpaceMeta(state.flat, state.rooms, only.id, { name: 'Open room', kind: 'room' }),
      };
  }
  // Preset rooms are all named, so the next drawn room starts at "Room 1"
  return { flat: { ...state.flat, roomCounter: 0 }, rooms: state.rooms };
}
