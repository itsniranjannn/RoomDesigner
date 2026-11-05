/**
 * tint.js
 * Pure colour helpers for recolouring a piece. When the user picks a new main colour, the
 * companion colours of the piece (cushions, headboard, duvet, panels) follow it while keeping
 * their original lightness relationship to the main colour, so the piece still looks designed
 * rather than flat. Hardware, glass, screens and water are never listed as followers.
 */

function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function toHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hue2rgb(p, q, t) {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function toHex([h, s, l]) {
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Lightens (positive) or darkens (negative) a hex colour by an HSL lightness amount. */
export function shiftLightness(hex, amount) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [h, s, l] = toHsl(rgb);
  return toHex([h, s, clamp01(l + amount)]);
}

/**
 * Re-expresses `companion` (originally related to `baseMain`) relative to `newMain`: same hue
 * and saturation as the new colour, with the lightness offset the companion had from the old one.
 * Returns `companion` unchanged when any input is not a hex colour.
 */
export function retint(baseMain, newMain, companion) {
  const base = parseHex(baseMain);
  const next = parseHex(newMain);
  const comp = parseHex(companion);
  if (!base || !next || !comp) return companion;
  const [, bs, bl] = toHsl(base);
  const [nh, ns, nl] = toHsl(next);
  const [, cs, cl] = toHsl(comp);
  const sat = bs > 0.04 ? clamp01(ns * (cs / bs)) : ns * 0.8;
  return toHex([nh, clamp01(sat), clamp01(nl + (cl - bl))]);
}

/** Which companion colours follow the main colour, by plan symbol. Others stay as designed. */
const DEFAULT_FOLLOWERS = ['cushionColor', 'headboardColor'];
const FOLLOWERS = {
  bed: ['headboardColor', 'accentColor', 'cushionColor'],
  'bed-bunk': ['headboardColor', 'accentColor', 'cushionColor'],
  crib: ['headboardColor', 'accentColor'],
  sofa: ['cushionColor'],
  'sofa-l': ['cushionColor'],
  armchair: ['cushionColor'],
  ottoman: ['cushionColor'],
  'bean-bag': ['cushionColor'],
  bench: ['cushionColor'],
  chair: ['cushionColor'],
  'desk-chair': ['cushionColor'],
  'bar-stool': ['cushionColor'],
  'coffee-table': ['subColor'],
  'side-table': ['subColor'],
  nightstand: ['subColor'],
  desk: ['subColor'],
  rug: ['subColor', 'accentColor'],
  'rug-runner': ['subColor', 'accentColor'],
  'rug-round': ['subColor', 'accentColor'],
  'nepali-dhaka-rug': ['subColor', 'accentColor'],
  curtain: ['subColor', 'accentColor'],
};

export function followersFor(shapeType) {
  return FOLLOWERS[shapeType] || DEFAULT_FOLLOWERS;
}

/** Fallback offsets for followers a piece never defined, so 2D and 3D agree on a value. */
const FALLBACK_OFFSET = { cushionColor: 0.06, headboardColor: -0.12 };

/** Returns the follower colours of `base` re-tinted to `newMain` (only fields that apply). */
export function tintedCompanions(base, newMain) {
  const out = {};
  for (const key of followersFor(base.shapeType)) {
    if (base[key]) out[key] = retint(base.color, newMain, base[key]);
    else if (FALLBACK_OFFSET[key] !== undefined)
      out[key] = shiftLightness(newMain, FALLBACK_OFFSET[key]);
  }
  return out;
}
