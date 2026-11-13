/**
 * Colours of a photo-made piece after the user recolours it, shared by the 3D model and the 2D plan symbol so
 * both follow one rule. Plain numbers only (no three.js, so the plan does not pull it in); the arithmetic is the
 * same as three.js's Color (sRGB in, lightness in linear light, 'rgb(r,g,b)' out), so the results match it.
 */

const toLinear = (c) =>
  c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
const toSRGB = (c) => (c < 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055);

/** Linear-light RGB (0-1) of a '#rrggbb', '#rgb' or 'rgb(r,g,b)' colour, or null when it is none of those. */
export function linearRGB(colour) {
  const s = String(colour).trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const hex = parseInt(m[1], 16);
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => toLinear(v / 255));
  }
  m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return [...m[1]].map((ch) => toLinear(Math.min(1, parseInt(ch, 16) / 15)));
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(s);
  if (m) return [m[1], m[2], m[3]].map((v) => toLinear(Math.min(255, parseInt(v, 10)) / 255));
  return null;
}

// Anything that is not a colour reads as white, as three.js reads it
const WHITE = [1, 1, 1];

/** Distance between two colours in linear light, scaled to 0-441 (as the photo reader measures it). */
export function colourDistance(a, b) {
  const x = linearRGB(a) || WHITE;
  const y = linearRGB(b) || WHITE;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 255;
}

/** Hue, saturation and lightness (0-1) of a colour, measured in linear light. */
export function linearHSL(colour) {
  const [r, g, b] = linearRGB(colour) || WHITE;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (min + max) / 2;
  if (min === max) return { h: 0, s: 0, l };
  const delta = max - min;
  const s = l <= 0.5 ? delta / (max + min) : delta / (2 - max - min);
  let h;
  if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return { h: h / 6, s, l };
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * 6 * (2 / 3 - t);
  return p;
}

/** CSS 'rgb(r,g,b)' of a colour given by hue, saturation and lightness in linear light. */
function styleOfHSL(h, s, l) {
  const hh = ((h % 1) + 1) % 1;
  const ss = Math.min(1, Math.max(0, s));
  const ll = Math.min(1, Math.max(0, l));
  let rgb;
  if (ss === 0) rgb = [ll, ll, ll];
  else {
    const p = ll <= 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
    const q = 2 * ll - p;
    rgb = [hue2rgb(q, p, hh + 1 / 3), hue2rgb(q, p, hh), hue2rgb(q, p, hh - 1 / 3)];
  }
  const [r, g, b] = rgb.map((c) => Math.round(toSRGB(c) * 255));
  return `rgb(${r},${g},${b})`;
}

/** A colour nudged lighter (positive) or darker (negative) in lightness; the same as the models' shade(). */
export function shadeColour(colour, amount) {
  const { h, s, l } = linearHSL(colour);
  // A dark colour minus a fixed amount would go black: keep a fraction of its lightness instead
  const next = amount < 0 ? Math.max(l + amount, l * 0.5) : Math.min(1, l + amount);
  return styleOfHSL(h, s, next);
}

/**
 * Palette for drawing: when the body colour was changed, every slot that was the same material as the body
 * (close to it in colour) follows it, keeping its relative lightness; contrasting slots stay as photographed.
 */
export function effectivePalette(design, mainColor) {
  const base = design.palette.body;
  const out = { ...design.palette };
  if (!mainColor || String(mainColor).toLowerCase() === String(base).toLowerCase()) return out;
  const baseL = linearHSL(base).l;
  out.body = mainColor;
  for (const key of Object.keys(out)) {
    if (key === 'body') continue;
    if (colourDistance(out[key], base) < 70) {
      const dl = linearHSL(out[key]).l - baseL;
      out[key] = shadeColour(mainColor, Math.max(-0.3, Math.min(0.3, dl)));
    }
  }
  return out;
}
