/**
 * corpus.js
 * The generalization corpus: deterministic specs (kind, furniture type, seed) and a builder that turns a spec into
 * a photo with ground truth (the type, a few traits, and a per-pixel plane saying which piece is where).
 *
 * Kinds: single (one photo on a studio backdrop), sheet (several views of one piece in a grid), stacked (two
 * lifestyle photos stacked in one picture), lifestyle (a room with the piece, companions and props).
 */
import { renderModel, rng } from './render3d.js';
import { BUILDERS, ALL_TYPES, sideTable } from './furniture.js';
import {
  image,
  rect,
  ellipse,
  softShadow,
  placeSprite,
  studioBackdrop,
  roomBackdrop,
  photometric,
  boxBlur,
  jpegish,
  transform,
  downscale,
  caption,
  occlude,
} from './compose.js';

const VIEWS = {
  front: { yaw: 0, pitch: 6 },
  front2: { yaw: 0, pitch: 12 },
  three: { yaw: 35, pitch: 20 },
  three2: { yaw: -32, pitch: 16 },
  side: { yaw: 90, pitch: 6 },
  top: { yaw: 0, pitch: 88 },
};

const sizeOf = (piece, view) => {
  const { w, d, h } = piece.dims;
  const a = (view.yaw * Math.PI) / 180;
  const p = (view.pitch * Math.PI) / 180;
  const across = Math.abs(w * Math.cos(a)) + Math.abs(d * Math.sin(a));
  const deep = Math.abs(w * Math.sin(a)) + Math.abs(d * Math.cos(a));
  return { across, up: h * Math.cos(p) + deep * Math.sin(p) };
};

/** Photo-level effects, all drawn from the seeded source so every case is repeatable. */
export function effectsFor(r, level) {
  if (level === 'clean')
    return {
      cast: [1, 1, 1],
      gamma: 1,
      vignette: 0,
      noise: 0,
      blur: 0,
      jpeg: 0,
      rotate: 0,
      zoom: 1,
      shiftX: 0,
      shiftY: 0,
      mirror: false,
      down: 1,
      caption: null,
    };
  const casts = [
    [1.07, 1, 0.9],
    [0.92, 1, 1.08],
    [1, 1.05, 0.94],
    [1.04, 0.97, 0.97],
    [1, 1, 1],
  ];
  return {
    cast: r.pick(casts),
    gamma: r.range(0.82, 1.25),
    vignette: r.chance(0.5) ? r.range(0.1, 0.6) : 0,
    noise: r.chance(0.6) ? r.range(2, 9) : 0,
    blur: r.chance(0.25) ? 1 : 0,
    jpeg: r.chance(0.65) ? r.int(35, 88) : 0,
    rotate: r.chance(0.35) ? r.range(-5, 5) : 0,
    zoom: r.chance(0.4) ? r.range(1.02, 1.22) : 1,
    shiftX: r.chance(0.35) ? r.range(-0.07, 0.07) : 0,
    shiftY: r.chance(0.35) ? r.range(-0.05, 0.05) : 0,
    mirror: r.chance(0.25),
    down: r.chance(0.2) ? r.range(1.5, 2.6) : 1,
    caption: r.chance(0.2) ? r.pick(['bar', 'mark']) : null,
  };
}

/** Applies effects to a composed picture (geometry first, then light, then compression). */
export function degrade(img, r, fx) {
  let out = img;
  const corner = [img.rgba[0], img.rgba[1], img.rgba[2]];
  if (fx.rotate || fx.zoom !== 1 || fx.shiftX || fx.shiftY || fx.mirror)
    out = transform(out, { ...fx, fill: corner });
  photometric(out, r, {
    cast: fx.cast,
    gamma: fx.gamma,
    vignette: fx.vignette,
    noise: fx.noise,
    seed: r.int(1, 999),
  });
  if (fx.blur) boxBlur(out, fx.blur);
  if (fx.down > 1) out = downscale(out, fx.down);
  if (fx.caption) caption(out, r, fx.caption);
  if (fx.jpeg) jpegish(out, fx.jpeg);
  return out;
}

const STUDIO = ['white', 'white', 'white', 'offwhite', 'grey', 'dark', 'charcoal', 'beige', 'blue'];

function renderPiece(piece, view, long) {
  return renderModel(piece.model, { ...view, long, ss: 2 });
}

/** One piece on a studio backdrop. */
function single(spec, r) {
  const piece = BUILDERS[spec.type](r);
  const view = VIEWS[spec.view];
  const bg = spec.bg || r.pick(STUDIO);
  const W = spec.size || r.pick([300, 340, 380]);
  const sz = sizeOf(piece, view);
  const aspect = Math.min(1.9, Math.max(0.7, sz.across / sz.up + r.range(-0.1, 0.25)));
  const H = Math.round(W / aspect);
  const margin = r.range(0.08, 0.2);
  const img = studioBackdrop(r, W, H, bg);
  const sprite = renderPiece(piece, view, Math.round(Math.max(W, H) * 1.1));
  // fit into the frame
  const k = Math.min((W * (1 - 2 * margin)) / sprite.width, (H * (1 - 2 * margin)) / sprite.height);
  const sw = sprite.width * k;
  const sh = sprite.height * k;
  const x0 = (W - sw) / 2 + (spec.offset ?? r.range(-0.05, 0.05)) * W;
  const y0 = (H - sh) / 2 + r.range(-0.03, 0.05) * H;
  const dark = bg === 'dark' || bg === 'charcoal';
  if (r.chance(0.7) && !spec.noShadow && spec.view !== 'top')
    softShadow(img, x0 + sw / 2, y0 + sh * 0.97, sw * 0.5, sh * 0.05 + 3, dark ? 0.25 : 0.45);
  placeSprite(img, sprite, x0, y0, 1, {
    scale: k,
    reflection: r.chance(0.2) && !spec.noShadow && spec.view !== 'top' ? 0.25 : 0,
  });
  return { img, pieces: [{ id: 1, ...piece.truth }], dims: piece.dims, bg };
}

/** Several views of one piece in a grid on a plain backdrop. */
function sheet(spec, r) {
  const piece = BUILDERS[spec.type](r);
  const layout = spec.layout || r.pick(['2x2', '1x4', '2x2', '1x3']);
  const bg = spec.bg || r.pick(['white', 'white', 'offwhite', 'dark', 'grey']);
  const roles = layout === '1x3' ? ['front', 'side', 'three'] : ['front', 'side', 'top', 'three'];
  const cols = layout === '2x2' ? 2 : roles.length;
  const rows = layout === '2x2' ? 2 : 1;
  const cw = layout === '2x2' ? 330 : 240;
  const ch = layout === '2x2' ? 250 : 260;
  const W = cw * cols;
  const H = ch * rows;
  const img = studioBackdrop(r, W, H, bg);
  // same pixels per cm in every panel, so the views keep their real proportions
  const ext = Math.max(piece.dims.w, piece.dims.d, piece.dims.h) * 1.15;
  const pad = r.range(0.76, 0.9);
  const ppc = (Math.min(cw, ch) * pad * 0.92) / ext;
  const shuffled =
    layout === '2x2' && r.chance(0.5) ? [roles[0], roles[2], roles[1], roles[3]] : roles;
  const expected = [];
  shuffled.forEach((role, i) => {
    const view = role === 'side' && r.chance(0.5) ? { ...VIEWS.side, yaw: -90 } : VIEWS[role];
    const sprite = renderModel(piece.model, { ...view, ppc, ss: 2 });
    const cx = (i % cols) * cw + cw / 2;
    const cy = Math.floor(i / cols) * ch + ch / 2;
    const sc = Math.min(1, (cw * pad) / sprite.width, (ch * pad) / sprite.height);
    if (role !== 'top' && r.chance(0.5))
      softShadow(
        img,
        cx,
        cy + (sprite.height * sc) / 2 - 2,
        sprite.width * sc * 0.45,
        5,
        bg === 'dark' ? 0.2 : 0.35
      );
    placeSprite(img, sprite, cx - (sprite.width * sc) / 2, cy - (sprite.height * sc) / 2, 1, {
      scale: sc,
    });
    expected.push(
      role === 'front' ? 'front' : role === 'top' ? 'top' : role === 'side' ? 'side' : 'three'
    );
  });
  return {
    img,
    pieces: [{ id: 1, ...piece.truth }],
    dims: piece.dims,
    bg,
    expected,
    nViews: shuffled.length,
    layout,
  };
}

/** A room photo: backdrop, rug, the piece, companions touching it, occluders. */
export function lifestyleScene(spec, r, { W = 360, H = 270 } = {}) {
  const { img, floorY, rug } = roomBackdrop(r, W, H);
  const main = BUILDERS[spec.type](r);
  const view = spec.view
    ? VIEWS[spec.view]
    : r.pick([VIEWS.front, VIEWS.front, VIEWS.front2, VIEWS.three, VIEWS.three2]);
  const sz = sizeOf(main, view);
  const wFrac = spec.fill ?? r.range(0.4, 0.78);
  const ppc = Math.min((W * wFrac) / sz.across, (H * 0.8) / sz.up);
  const footY = Math.min(H - 6, floorY + H * r.range(0.04, 0.2));
  const pieces = [];
  const placed = [];
  const entries = [];
  // companions by type
  const t = spec.type;
  const comps = [];
  const wantComps = spec.companions ?? r.chance(0.7);
  if (wantComps) {
    if (t === 'sofa' || t === 'corner-sofa') {
      if (r.chance(0.75)) comps.push({ type: 'coffee-table', dx: 0.0, front: true });
      if (r.chance(0.5)) comps.push({ type: 'armchair', dx: -0.75, touch: r.chance(0.6) });
      if (r.chance(0.4)) comps.push({ type: 'armchair', dx: 0.75, touch: r.chance(0.6) });
      if (r.chance(0.3)) comps.push({ type: 'side', dx: 0.62 });
    } else if (t === 'bed') {
      comps.push({ type: 'nightstand', dx: -0.62 }, { type: 'nightstand', dx: 0.62 });
    } else if (t === 'table' || t === 'table-round') {
      comps.push({ type: 'chair', dx: -0.3, front: true }, { type: 'chair', dx: 0.3, front: true });
    } else if (t === 'armchair' || t === 'lounge' || t === 'tub-chair') {
      if (r.chance(0.6)) comps.push({ type: 'side', dx: 0.7 });
    } else if (t === 'cabinet' || t === 'wardrobe' || t === 'bookshelf') {
      if (r.chance(0.5)) comps.push({ type: 'chair', dx: 0.7 });
    }
  }
  const cx = W * r.range(0.4, 0.6);
  const mainSprite = renderModel(main.model, { ...view, ppc, ss: 2 });
  const mw = mainSprite.width;
  const mh = mainSprite.height;
  if (rug && spec.type !== 'wardrobe')
    ellipse(
      img,
      cx,
      footY - mh * 0.02,
      mw * 0.7,
      mh * 0.18 + 8,
      r.pick([
        [170, 150, 130],
        [120, 100, 96],
        [210, 200, 180],
        [90, 110, 120],
      ]),
      1
    );
  const jobs = [];
  jobs.push({
    sprite: mainSprite,
    x: cx - mw / 2,
    y: footY - mh,
    id: 1,
    truth: main.truth,
    depth: 0,
  });
  let nextId = 2;
  for (const c of comps) {
    const cp = c.type === 'side' ? sideTable(r) : BUILDERS[c.type](r);
    const cv = view;
    const sp = renderModel(cp.model, { ...cv, ppc, ss: 2 });
    const x = cx + c.dx * mw - sp.width / 2 + (c.touch ? (c.dx > 0 ? -1 : 1) * sp.width * 0.12 : 0);
    const foot = c.front ? footY + sp.height * 0.35 : footY - mh * 0.02 + (c.dx ? 0 : 0);
    const y = Math.min(H - sp.height + 4, foot - sp.height);
    jobs.push({
      sprite: sp,
      x,
      y,
      id: nextId++,
      truth: cp.truth,
      depth: c.front ? 1 : 0,
      comp: true,
    });
  }
  jobs.sort((a, b) => a.y + a.sprite.height - (b.y + b.sprite.height));
  for (const j of jobs) {
    softShadow(
      img,
      j.x + j.sprite.width / 2,
      j.y + j.sprite.height - 1,
      j.sprite.width * 0.5,
      5 + j.sprite.height * 0.03,
      0.4
    );
    const box = placeSprite(img, j.sprite, j.x, j.y, j.id, { reflection: spec.reflect ? 0.2 : 0 });
    placed.push({ id: j.id, box });
    pieces.push({ id: j.id, ...j.truth, main: j.id === 1 });
    entries.push(j);
  }
  const mainBox = placed.find((p) => p.id === 1).box;
  const occ = spec.occlude ?? r.chance(0.3);
  if (occ) occlude(img, r, mainBox);
  pieces.sort((a, b) => a.id - b.id);
  return { img, pieces, dims: main.dims, bg: 'room', hasComps: comps.length };
}

/** Two lifestyle photos of the same piece stacked in one picture. */
function stacked(spec, r) {
  const seed = r.int(1, 1e6);
  const a = lifestyleScene(
    { ...spec, view: 'front', companions: false, occlude: false },
    rng(seed),
    { W: 340, H: 240 }
  );
  const b = lifestyleScene(
    { ...spec, view: 'three', companions: false, occlude: false },
    rng(seed),
    { W: 340, H: 240 }
  );
  const img = image(340, 480);
  img.rgba.set(a.img.rgba, 0);
  img.rgba.set(b.img.rgba, a.img.rgba.length);
  img.ids.set(a.img.ids, 0);
  img.ids.set(b.img.ids, a.img.ids.length);
  return { img, pieces: a.pieces, dims: a.dims, bg: 'room' };
}

/**
 * Builds one corpus case.
 * @param {{ kind: 'single'|'sheet'|'lifestyle'|'stacked', type: string, seed: number, view?: string, level?: string }} spec
 */
export function buildCase(spec) {
  const r = rng(spec.seed * 7919 + ALL_TYPES.indexOf(spec.type) * 104729 + 17);
  const built =
    spec.kind === 'single'
      ? single(spec, r)
      : spec.kind === 'sheet'
        ? sheet(spec, r)
        : spec.kind === 'stacked'
          ? stacked(spec, r)
          : lifestyleScene(spec, r);
  const fx = effectsFor(r, spec.level || 'real');
  // sheets keep their grid straight and unmirrored: a scanned product page is not rotated
  if (spec.kind === 'sheet') {
    fx.rotate = 0;
    fx.zoom = 1;
    fx.shiftX = 0;
    fx.shiftY = 0;
    fx.mirror = false;
    fx.down = 1;
    fx.caption = null;
  }
  const out = degrade(built.img, r, fx);
  return { spec, ...built, img: out, fx, truth: built.pieces[0] };
}

const ROTATE_VIEWS = ['front', 'front', 'front', 'three', 'three2', 'side', 'top'];

/**
 * The corpus: `perType` cases of each kind for each of the 19 types. Deterministic.
 * @param {{ single?: number, sheet?: number, lifestyle?: number, stacked?: number }} counts per type
 */
export function corpusSpecs(counts = { single: 4, sheet: 1, lifestyle: 2, stacked: 0 }) {
  const specs = [];
  for (const type of ALL_TYPES) {
    for (let i = 0; i < (counts.single ?? 0); i++)
      specs.push({
        kind: 'single',
        type,
        seed: i + 1,
        view: ROTATE_VIEWS[(i + ALL_TYPES.indexOf(type)) % ROTATE_VIEWS.length],
      });
    for (let i = 0; i < (counts.sheet ?? 0); i++)
      specs.push({ kind: 'sheet', type, seed: 100 + i });
    for (let i = 0; i < (counts.lifestyle ?? 0); i++)
      specs.push({ kind: 'lifestyle', type, seed: 200 + i });
    for (let i = 0; i < (counts.stacked ?? 0); i++)
      specs.push({ kind: 'stacked', type, seed: 300 + i });
  }
  return specs.map((s, n) => ({ ...s, id: `${s.kind}-${s.type}-${s.view || ''}${s.seed}`, n }));
}

export { ALL_TYPES, rect };
