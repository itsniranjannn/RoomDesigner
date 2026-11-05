/**
 * patterns.js
 * Procedural patterns for rugs and curtains, as plain drawing instructions ("ops"): rectangles, polygons,
 * circles and lines in picture pixels. Pure and seeded, so a pattern looks the same every time and in every
 * browser, and so it can be tested and also drawn as a small SVG preview in the inspector. The 3D view
 * replays the ops onto a canvas (patternTextures.js); nothing is downloaded.
 *
 * A piece keeps only the pattern id (`overrides.pattern`); colours come from the piece's main, sub and
 * accent colours, so the existing colour override and its companion colours keep working.
 */

/** Rug patterns. `classic` is the original hand-built galaicha model that rugs had before patterns existed. */
export const RUG_PATTERNS = [
  { id: 'classic', label: 'Galaicha', note: 'The original medallion rug' },
  { id: 'persian', label: 'Persian', note: 'Medallion, border and corner motifs' },
  { id: 'kilim', label: 'Kilim', note: 'Flat-woven bands of zigzags and diamonds' },
  { id: 'dhaka', label: 'Dhaka', note: 'Nepali dhaka stripes with diamonds' },
  { id: 'stripes', label: 'Striped', note: 'Broad stripes with fine lines' },
  { id: 'rings', label: 'Rings', note: 'Concentric rings, best for round rugs' },
  { id: 'shag', label: 'Shag', note: 'Deep, soft pile' },
  { id: 'plain', label: 'Plain', note: 'One colour with a woven grain' },
];

/** Curtain patterns. */
export const CURTAIN_PATTERNS = [
  { id: 'plain', label: 'Plain', note: 'One colour with a woven grain' },
  { id: 'stripes', label: 'Stripes', note: 'Vertical stripes' },
  { id: 'check', label: 'Check', note: 'Gingham check' },
  { id: 'trellis', label: 'Trellis', note: 'Diamond trellis with small dots' },
];

export const PATTERN_KINDS = { rug: RUG_PATTERNS, curtain: CURTAIN_PATTERNS };

export const patternsFor = (kind) => PATTERN_KINDS[kind] || null;

/** True when `id` is a known pattern of `kind` ('rug' or 'curtain'). */
export const isPatternId = (kind, id) => !!patternsFor(kind)?.some((p) => p.id === id);

const KIND_BY_SHAPE = {
  rug: 'rug',
  'rug-runner': 'rug',
  'rug-round': 'rug',
  'nepali-dhaka-rug': 'rug',
  curtain: 'curtain',
};

/** Which pattern family a piece belongs to ('rug' or 'curtain'), or null for pieces that cannot be patterned. */
export const patternKindOf = (def) => def?.patternKind || KIND_BY_SHAPE[def?.shapeType] || null;

/** The pattern a piece is drawn with, or null when it has none (an ordinary piece). */
export function patternOf(def) {
  const kind = patternKindOf(def);
  if (!kind) return null;
  return isPatternId(kind, def.pattern) ? def.pattern : null;
}

/** True when a rug definition asks for a pattern other than the original galaicha model. */
export const usesPatternModel = (def) => {
  const p = patternOf(def);
  return !!p && p !== 'classic';
};

// ---------- small helpers ----------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedOf = (text) => [...text].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);

function parse(hex) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.padEnd(6, '8').slice(0, 6);
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [136, 136, 136];
}

const toHex = (rgb) =>
  `#${rgb
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;

/** Blends two hex colours (t = 0 gives `a`, 1 gives `b`). */
export function mix(a, b, t) {
  const pa = parse(a);
  const pb = parse(b);
  return toHex(pa.map((v, i) => v + (pb[i] - v) * t));
}
const lighten = (c, t) => mix(c, '#FFFFFF', t);
const darken = (c, t) => mix(c, '#000000', t);

const CREAM = '#F3E9D2';

// Op constructors
const rect = (x, y, w, h, fill) => ({ k: 'rect', x, y, w, h, fill });
const poly = (pts, fill) => ({ k: 'poly', pts, fill });
const circle = (cx, cy, r, fill, stroke, lw) => ({ k: 'circle', cx, cy, r, fill, stroke, lw });
const line = (x1, y1, x2, y2, stroke, lw = 1) => ({ k: 'line', x1, y1, x2, y2, stroke, lw });
const diamond = (cx, cy, rx, ry, fill) =>
  poly(
    [
      [cx, cy - ry],
      [cx + rx, cy],
      [cx, cy + ry],
      [cx - rx, cy],
    ],
    fill
  );

/** A rectangular frame of four bars: outer box (x, y, w, h) with border thickness t. */
function frame(x, y, w, h, t, fill) {
  return [
    rect(x, y, w, t, fill),
    rect(x, y + h - t, w, t, fill),
    rect(x, y + t, t, h - t * 2, fill),
    rect(x + w - t, y + t, t, h - t * 2, fill),
  ];
}

/** The picture size for a rug: the long side is `long` pixels and the shape follows the footprint. */
export function rugCanvasSize(widthCm, depthCm, long = 512) {
  const w = Math.max(1, Number(widthCm) || 1);
  const d = Math.max(1, Number(depthCm) || 1);
  const ratio = Math.max(0.125, Math.min(8, w / d));
  return ratio >= 1
    ? { width: long, height: Math.max(64, Math.round(long / ratio)) }
    : { width: Math.max(64, Math.round(long * ratio)), height: long };
}

// ---------- rugs ----------

function persian(W, H, c) {
  const s = Math.min(W, H);
  const ops = [rect(0, 0, W, H, c.main)];
  const m = s * 0.035;
  const band = s * 0.085;
  ops.push(...frame(m, m, W - m * 2, H - m * 2, band, c.accent));
  ops.push(...frame(m + band, m + band, W - (m + band) * 2, H - (m + band) * 2, s * 0.012, c.sub));
  // Small diamonds running along the border
  const step = s * 0.075;
  const by = m + band / 2;
  for (let x = m + band; x < W - m - band; x += step) {
    ops.push(diamond(x + step / 2, by, step * 0.26, step * 0.3, c.sub));
    ops.push(diamond(x + step / 2, H - by, step * 0.26, step * 0.3, c.sub));
  }
  for (let y = m + band; y < H - m - band; y += step) {
    ops.push(diamond(by, y + step / 2, step * 0.3, step * 0.26, c.sub));
    ops.push(diamond(W - by, y + step / 2, step * 0.3, step * 0.26, c.sub));
  }
  const ix = m + band * 1.35;
  const fx = W - ix;
  const fy = H - ix;
  ops.push(...frame(ix, ix, fx - ix, fy - ix, s * 0.01, lighten(c.sub, 0.2)));
  // Corner spandrels
  const k = s * 0.2;
  const tri = (ax, ay, bx, by2, cx, cy, fill) =>
    poly(
      [
        [ax, ay],
        [bx, by2],
        [cx, cy],
      ],
      fill
    );
  ops.push(tri(ix, ix, ix + k, ix, ix, ix + k, c.accent));
  ops.push(tri(fx, ix, fx - k, ix, fx, ix + k, c.accent));
  ops.push(tri(ix, fy, ix + k, fy, ix, fy - k, c.accent));
  ops.push(tri(fx, fy, fx - k, fy, fx, fy - k, c.accent));
  // Field scatter, then the medallion on top
  const cx = W / 2;
  const cy = H / 2;
  const R = s * 0.3;
  const grid = s * 0.13;
  for (let y = ix + grid / 2; y < fy; y += grid) {
    for (let x = ix + grid / 2; x < fx; x += grid) {
      const far = Math.hypot(x - cx, y - cy) > R * 1.5;
      const nearCorner =
        (x < ix + k * 0.9 || x > fx - k * 0.9) && (y < ix + k * 0.9 || y > fy - k * 0.9);
      if (far && !nearCorner)
        ops.push(diamond(x, y, grid * 0.14, grid * 0.14, lighten(c.main, 0.22)));
    }
  }
  ops.push(diamond(cx, cy, R * 1.25, R * 1.55, c.accent));
  ops.push(diamond(cx, cy, R * 1.05, R * 1.3, c.sub));
  ops.push(diamond(cx, cy, R * 0.9, R * 1.12, c.main));
  ops.push(circle(cx, cy, R * 0.62, c.accent));
  ops.push(circle(cx, cy, R * 0.5, c.sub));
  ops.push(circle(cx, cy, R * 0.36, c.main));
  ops.push(diamond(cx, cy, R * 0.26, R * 0.26, c.accent));
  ops.push(circle(cx, cy, R * 0.07, c.sub));
  return ops;
}

function kilim(W, H, c) {
  const ops = [rect(0, 0, W, H, c.main)];
  const bands = Math.max(5, Math.round(H / (W * 0.16)));
  const bh = H / bands;
  const palette = [c.sub, c.accent, CREAM, lighten(c.main, 0.25)];
  const tw = Math.max(18, W / 9);
  for (let i = 0; i < bands; i++) {
    const y = i * bh;
    const col = palette[i % palette.length];
    const alt = palette[(i + 1) % palette.length];
    const type = i % 4;
    if (type === 0) {
      // Zigzag triangles pointing up and down
      for (let x = 0; x < W; x += tw) {
        ops.push(
          poly(
            [
              [x, y + bh * 0.9],
              [x + tw / 2, y + bh * 0.1],
              [x + tw, y + bh * 0.9],
            ],
            col
          )
        );
        ops.push(
          poly(
            [
              [x + tw / 2, y + bh * 0.9],
              [x + tw, y + bh * 0.1],
              [x + tw * 1.5, y + bh * 0.9],
            ],
            alt
          )
        );
      }
    } else if (type === 1) {
      // A row of nested diamonds
      for (let x = tw / 2; x < W + tw / 2; x += tw * 1.4) {
        ops.push(diamond(x, y + bh / 2, tw * 0.62, bh * 0.46, col));
        ops.push(diamond(x, y + bh / 2, tw * 0.36, bh * 0.28, alt));
      }
    } else if (type === 2) {
      ops.push(rect(0, y + bh * 0.3, W, bh * 0.14, col));
      ops.push(rect(0, y + bh * 0.56, W, bh * 0.14, alt));
    } else {
      // Stepped blocks
      for (let x = 0; x < W; x += tw) {
        ops.push(rect(x, y + bh * 0.2, tw * 0.55, bh * 0.6, col));
        ops.push(rect(x + tw * 0.55, y + bh * 0.4, tw * 0.3, bh * 0.2, alt));
      }
    }
    ops.push(rect(0, y, W, 2, darken(c.main, 0.25)));
  }
  ops.push(...frame(0, 0, W, H, Math.min(W, H) * 0.03, darken(c.main, 0.3)));
  return ops;
}

function dhaka(W, H, c) {
  const ops = [rect(0, 0, W, H, c.main)];
  const cols = Math.max(5, Math.round(W / 56) | 1);
  const cw = W / cols;
  for (let i = 0; i < cols; i++) {
    const x = i * cw;
    const kind = i % 4;
    if (kind === 0) {
      ops.push(rect(x + cw * 0.18, 0, cw * 0.64, H, c.accent));
      ops.push(rect(x + cw * 0.4, 0, cw * 0.2, H, CREAM));
    } else if (kind === 1 || kind === 3) {
      // Column of diamonds on a lighter ground
      ops.push(rect(x, 0, cw, H, kind === 1 ? c.sub : CREAM));
      const step = cw * 1.3;
      for (let y = step / 2; y < H + step / 2; y += step) {
        ops.push(diamond(x + cw / 2, y, cw * 0.4, step * 0.42, kind === 1 ? c.main : c.accent));
        ops.push(diamond(x + cw / 2, y, cw * 0.18, step * 0.2, kind === 1 ? CREAM : c.sub));
      }
    } else {
      // Row of small triangles
      const step = cw * 0.95;
      for (let y = 0; y < H; y += step) {
        ops.push(
          poly(
            [
              [x + cw * 0.1, y + step * 0.9],
              [x + cw / 2, y + step * 0.1],
              [x + cw * 0.9, y + step * 0.9],
            ],
            c.sub
          )
        );
      }
    }
    ops.push(rect(x, 0, 1.5, H, darken(c.main, 0.3)));
  }
  const t = Math.min(W, H) * 0.035;
  ops.push(rect(0, 0, W, t * 2, c.accent), rect(0, H - t * 2, W, t * 2, c.accent));
  ops.push(rect(0, t * 2, W, t * 0.5, c.sub), rect(0, H - t * 2.5, W, t * 0.5, c.sub));
  return ops;
}

function stripes(W, H, c) {
  const ops = [rect(0, 0, W, H, c.main)];
  const n = Math.max(6, Math.round(W / 46) * 2);
  const sw = W / n;
  for (let i = 0; i < n; i++) {
    if (i % 2) ops.push(rect(i * sw, 0, sw, H, c.sub));
    if (i % 4 === 1) ops.push(rect(i * sw + sw * 0.4, 0, sw * 0.2, H, c.accent));
  }
  ops.push(rect(0, 0, W, H * 0.025, c.accent), rect(0, H * 0.975, W, H * 0.025, c.accent));
  return ops;
}

function rings(W, H, c) {
  const R = Math.min(W, H) / 2;
  const ops = [rect(0, 0, W, H, c.main)];
  const cols = [c.accent, c.main, c.sub, c.main, CREAM, c.accent, c.sub, c.main];
  cols.forEach((col, i) => ops.push(circle(W / 2, H / 2, R * (1 - i * 0.115), col)));
  ops.push(circle(W / 2, H / 2, R * 0.08, c.sub));
  return ops;
}

function plain(W, H, c, rand) {
  const ops = [rect(0, 0, W, H, c.main)];
  const dark = darken(c.main, 0.07);
  for (let x = 0; x < W; x += 6) ops.push(line(x, 0, x, H, dark, 1));
  for (let i = 0; i < 220; i++) ops.push(rect(rand() * W, rand() * H, 2, 2, lighten(c.main, 0.12)));
  ops.push(...frame(0, 0, W, H, Math.min(W, H) * 0.02, darken(c.main, 0.15)));
  return ops;
}

function shag(W, H, c, rand) {
  const ops = [rect(0, 0, W, H, darken(c.main, 0.12))];
  const count = Math.round((W * H) / 70);
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const a = rand() * Math.PI;
    const len = 4 + rand() * 6;
    const tone = rand();
    const col = tone < 0.4 ? darken(c.main, 0.08) : tone < 0.85 ? c.main : lighten(c.main, 0.16);
    ops.push(line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, col, 2 + rand() * 1.5));
  }
  return ops;
}

const RUG_DRAW = { persian, kilim, dhaka, stripes, rings, plain, shag };

/**
 * Drawing instructions for a rug picture.
 * @param {string} id - a rug pattern id
 * @param {{width:number,height:number}} size - picture size in pixels (see rugCanvasSize)
 * @param {{main:string,sub:string,accent:string}} colors
 * @returns {{width:number,height:number,ops:object[]}}
 */
export function rugPatternOps(id, size, colors) {
  const draw = RUG_DRAW[id] || RUG_DRAW.plain;
  const c = {
    main: colors?.main || '#8B1E1E',
    sub: colors?.sub || '#D4A359',
    accent: colors?.accent || '#1B2A4A',
  };
  const { width: W, height: H } = size;
  const rand = rng(seedOf(`rug:${id}:${W}x${H}:${c.main}`));
  return { width: W, height: H, ops: draw(W, H, c, rand) };
}

// ---------- curtains (a tile that repeats across the fabric) ----------

const TILE = 256;

function curtainPlain(c, rand) {
  const ops = [rect(0, 0, TILE, TILE, c.main)];
  const dark = darken(c.main, 0.05);
  for (let x = 0; x < TILE; x += 8) ops.push(line(x, 0, x, TILE, dark, 2));
  for (let i = 0; i < 160; i++)
    ops.push(rect(rand() * TILE, rand() * TILE, 2, 3, lighten(c.main, 0.08)));
  return ops;
}

function curtainStripes(c) {
  const ops = [rect(0, 0, TILE, TILE, c.main)];
  const w = TILE / 8;
  for (let i = 0; i < 8; i += 2) ops.push(rect(i * w, 0, w, TILE, c.sub));
  for (let i = 1; i < 8; i += 4) ops.push(rect(i * w + w * 0.4, 0, w * 0.2, TILE, c.accent));
  return ops;
}

function curtainCheck(c) {
  const ops = [rect(0, 0, TILE, TILE, c.main)];
  const n = 4;
  const w = TILE / n;
  for (let i = 0; i < n; i++)
    ops.push(rect(i * w + w * 0.25, 0, w * 0.5, TILE, mix(c.main, c.sub, 0.5)));
  for (let j = 0; j < n; j++)
    ops.push(rect(0, j * w + w * 0.25, TILE, w * 0.5, mix(c.main, c.sub, 0.5)));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      ops.push(rect(i * w + w * 0.25, j * w + w * 0.25, w * 0.5, w * 0.5, c.sub));
  return ops;
}

function curtainTrellis(c) {
  const ops = [rect(0, 0, TILE, TILE, c.main)];
  const w = TILE / 2;
  for (let i = 0; i <= 2; i++) {
    ops.push(line(i * w, 0, i * w + w, w, c.sub, 3));
    ops.push(line(i * w, w, i * w + w, 0, c.sub, 3));
    ops.push(line(i * w, w, i * w + w, TILE, c.sub, 3));
    ops.push(line(i * w, TILE, i * w + w, w, c.sub, 3));
  }
  for (const [x, y] of [
    [0, 0],
    [w, w],
    [TILE, 0],
    [0, TILE],
    [TILE, TILE],
    [w, 0],
    [w, TILE],
    [0, w],
    [TILE, w],
  ])
    ops.push(circle(x, y, 7, c.accent));
  return ops;
}

const CURTAIN_DRAW = {
  plain: curtainPlain,
  stripes: curtainStripes,
  check: curtainCheck,
  trellis: curtainTrellis,
};

/** Drawing instructions for one repeat of a curtain fabric (a TILE x TILE picture). */
export function curtainPatternOps(id, colors) {
  const draw = CURTAIN_DRAW[id] || curtainPlain;
  const c = {
    main: colors?.main || '#D9CBB0',
    sub: colors?.sub || lighten(colors?.main || '#D9CBB0', 0.35),
    accent: colors?.accent || darken(colors?.main || '#D9CBB0', 0.25),
  };
  const rand = rng(seedOf(`curtain:${id}:${c.main}`));
  return { width: TILE, height: TILE, ops: draw(c, rand) };
}

/** A stable text key for a set of drawing instructions' inputs, used to cache pictures. */
export const patternKey = (kind, id, size, colors) =>
  `${kind}:${id}:${size?.width ?? TILE}x${size?.height ?? TILE}:${colors?.main}:${colors?.sub}:${colors?.accent}`;

// ---------- wall art (the picture inside a frame) ----------

/** Pictures that can hang in a frame. */
export const ART_STYLES = ['landscape', 'abstract', 'mandala', 'sunrise'];

const lerpBands = (W, H, top, bottom, bands = 14) =>
  Array.from({ length: bands }, (_, i) =>
    rect(0, (H * i) / bands, W, H / bands + 1, mix(top, bottom, i / (bands - 1)))
  );

/**
 * Drawing instructions for a framed picture.
 * @param {string} style - one of ART_STYLES
 * @param {{width:number,height:number}} size - picture size in pixels
 * @param {{a:string,b:string}} colors - two colours the picture is built around
 */
export function artOps(style, size, colors) {
  const { width: W, height: H } = size;
  const a = colors?.a || '#C97B4A';
  const b = colors?.b || '#3D5A6C';
  const rand = rng(seedOf(`art:${style}:${W}x${H}:${a}:${b}`));
  let ops;
  if (style === 'abstract') {
    ops = [rect(0, 0, W, H, '#F1E9DA')];
    ops.push(circle(W * 0.38, H * 0.4, Math.min(W, H) * 0.3, a));
    ops.push(rect(W * 0.5, H * 0.45, W * 0.32, H * 0.38, b));
    ops.push(circle(W * 0.66, H * 0.3, Math.min(W, H) * 0.12, lighten(a, 0.35)));
    ops.push(rect(W * 0.12, H * 0.74, W * 0.42, H * 0.06, darken(b, 0.25)));
    for (let i = 0; i < 6; i++)
      ops.push(line(rand() * W, rand() * H, rand() * W, rand() * H, darken(b, 0.35), 2));
  } else if (style === 'mandala') {
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.46;
    ops = [rect(0, 0, W, H, darken(b, 0.35))];
    ops.push(circle(cx, cy, R, a));
    ops.push(circle(cx, cy, R * 0.86, darken(b, 0.2)));
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      const px = (r, d) => [cx + Math.cos(ang + d) * r, cy + Math.sin(ang + d) * r];
      ops.push(poly([px(R * 0.82, -0.17), px(R * 0.5, 0), px(R * 0.82, 0.17)], i % 2 ? a : CREAM));
    }
    ops.push(circle(cx, cy, R * 0.42, lighten(b, 0.1)));
    ops.push(circle(cx, cy, R * 0.32, a));
    ops.push(circle(cx, cy, R * 0.2, CREAM));
    ops.push(circle(cx, cy, R * 0.08, b));
  } else if (style === 'sunrise') {
    ops = lerpBands(W, H, lighten(a, 0.55), lighten(a, 0.15));
    ops.push(circle(W / 2, H * 0.62, Math.min(W, H) * 0.24, '#FFF4DA'));
    ops.push(rect(0, H * 0.62, W, H * 0.38, darken(b, 0.1)));
    for (let i = 0; i < 5; i++)
      ops.push(rect(0, H * (0.66 + i * 0.065), W, H * 0.012, lighten(b, 0.12 + i * 0.06)));
  } else {
    // landscape: sky, sun, snow-capped peaks and a green foreground
    ops = lerpBands(W, H, '#BFD9EA', '#F6E7CF');
    ops.push(circle(W * 0.76, H * 0.24, Math.min(W, H) * 0.09, '#FFF2C9'));
    const peak = (x, h, w, col) => [
      poly(
        [
          [x - w, H * 0.72],
          [x, H * (0.72 - h)],
          [x + w, H * 0.72],
        ],
        col
      ),
      poly(
        [
          [x - w * 0.28, H * (0.72 - h * 0.72)],
          [x, H * (0.72 - h)],
          [x + w * 0.28, H * (0.72 - h * 0.72)],
        ],
        '#FFFFFF'
      ),
    ];
    ops.push(...peak(W * 0.3, 0.46, W * 0.36, mix(b, '#8FA4B8', 0.5)));
    ops.push(...peak(W * 0.66, 0.36, W * 0.32, mix(b, '#6E8399', 0.4)));
    ops.push(
      poly(
        [
          [0, H * 0.78],
          [W * 0.4, H * 0.66],
          [W, H * 0.8],
          [W, H],
          [0, H],
        ],
        mix('#3F6B3A', a, 0.25)
      )
    );
    ops.push(rect(0, H * 0.9, W, H * 0.1, darken(mix('#3F6B3A', a, 0.25), 0.2)));
  }
  return { width: W, height: H, ops };
}

/** The picture size of a framed picture: long side 384 pixels, following the frame's shape. */
export const artCanvasSize = (widthCm, heightCm) => {
  const r = Math.max(0.25, Math.min(4, (widthCm || 1) / (heightCm || 1)));
  return r >= 1
    ? { width: 384, height: Math.round(384 / r) }
    : { width: Math.round(384 * r), height: 384 };
};
