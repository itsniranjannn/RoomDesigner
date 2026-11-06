/**
 * compose.js
 * Turns rendered furniture sprites into photos: studio backdrops, multi-view sheets, stacked pictures and busy
 * room scenes, then degrades them the way real photos are (colour cast, vignette, noise, JPEG blocks, tilt,
 * crop, mirror, low resolution). Every function is deterministic for a given seeded random source.
 */
import { hash2, clamp8 } from './render3d.js';

/** An RGBA picture with a parallel plane of piece ids (0 = not furniture) for scoring the cut-out. */
export function image(w, h, fill = [255, 255, 255]) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) rgba.set([fill[0], fill[1], fill[2], 255], p * 4);
  return { width: w, height: h, rgba, ids: new Uint8Array(w * h) };
}

const put = (img, x, y, c, a = 1) => {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  for (let k = 0; k < 3; k++) img.rgba[i + k] = img.rgba[i + k] * (1 - a) + c[k] * a;
};

export function rect(img, x0, y0, x1, y1, c, a = 1, clearIds = false) {
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(img.height, Math.round(y1)); y++)
    for (let x = Math.max(0, Math.round(x0)); x < Math.min(img.width, Math.round(x1)); x++) {
      put(img, x, y, typeof c === 'function' ? c(x, y) : c, a);
      if (clearIds && a >= 0.9) img.ids[y * img.width + x] = 0;
    }
}

export function ellipse(img, cx, cy, rx, ry, c, a = 1, clearIds = false) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1) {
        put(img, x, y, c, a);
        if (clearIds && a >= 0.9 && x >= 0 && y >= 0 && x < img.width && y < img.height)
          img.ids[y * img.width + x] = 0;
      }
    }
}

/** Soft shadow ellipse (gaussian-ish falloff) under a piece. */
export function softShadow(img, cx, cy, rx, ry, strength = 0.45) {
  for (let y = Math.floor(cy - ry * 1.4); y <= Math.ceil(cy + ry * 1.4); y++)
    for (let x = Math.floor(cx - rx * 1.4); x <= Math.ceil(cx + rx * 1.4); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const a = strength * Math.exp(-d * 1.6);
      if (a > 0.01) put(img, x, y, [0, 0, 0], a);
    }
}

/** Draws a sprite with its pixels tagged id, optionally mirrored below as a floor reflection. */
export function placeSprite(img, sprite, x0, y0, id, { reflection = 0, scale = 1 } = {}) {
  const sw = Math.max(1, Math.round(sprite.width * scale));
  const sh = Math.max(1, Math.round(sprite.height * scale));
  if (reflection > 0) {
    for (let y = 0; y < sh * 0.45; y++)
      for (let x = 0; x < sw; x++) {
        const sx = Math.min(sprite.width - 1, Math.floor(x / scale));
        const sy = Math.min(sprite.height - 1, Math.floor((sh - 1 - y) / scale));
        const a =
          (sprite.rgba[(sy * sprite.width + sx) * 4 + 3] / 255) *
          reflection *
          (1 - y / (sh * 0.45));
        if (a > 0.01)
          put(
            img,
            Math.round(x0) + x,
            Math.round(y0) + sh + y,
            [
              sprite.rgba[(sy * sprite.width + sx) * 4],
              sprite.rgba[(sy * sprite.width + sx) * 4 + 1],
              sprite.rgba[(sy * sprite.width + sx) * 4 + 2],
            ],
            a
          );
      }
  }
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const sx = Math.min(sprite.width - 1, Math.floor(x / scale));
      const sy = Math.min(sprite.height - 1, Math.floor(y / scale));
      const i = (sy * sprite.width + sx) * 4;
      const a = sprite.rgba[i + 3] / 255;
      if (a <= 0) continue;
      const X = Math.round(x0) + x;
      const Y = Math.round(y0) + y;
      put(img, X, Y, [sprite.rgba[i], sprite.rgba[i + 1], sprite.rgba[i + 2]], a);
      if (a > 0.5 && X >= 0 && Y >= 0 && X < img.width && Y < img.height)
        img.ids[Y * img.width + X] = id;
    }
  return { x0: Math.round(x0), y0: Math.round(y0), w: sw, h: sh };
}

// ---------- backdrops ----------

export function studioBackdrop(r, w, h, kind) {
  const grad = (c0, c1) => {
    const img = image(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const t = y / h;
        const i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) img.rgba[i + k] = c0[k] + (c1[k] - c0[k]) * t;
      }
    return img;
  };
  switch (kind) {
    case 'white':
      return image(w, h, [255, 255, 255]);
    case 'offwhite':
      return image(w, h, [r.int(236, 246), r.int(236, 246), r.int(232, 244)]);
    case 'grey':
      return grad([232, 232, 232], [206, 206, 206]);
    case 'dark':
      return image(w, h, [r.int(12, 34), r.int(12, 34), r.int(14, 38)]);
    case 'charcoal':
      return grad([58, 58, 62], [34, 34, 36]);
    case 'beige':
      return grad([226, 214, 196], [204, 190, 168]);
    case 'blue':
      return grad([150, 176, 204], [118, 144, 176]);
    default:
      return image(w, h);
  }
}

const plant = (img, r, x, baseY, size) => {
  rect(img, x - size * 0.18, baseY - size * 0.3, x + size * 0.18, baseY, [150, 90, 60], 1, true);
  for (let i = 0; i < 9; i++) {
    const a = r.range(-1.2, 1.2);
    ellipse(
      img,
      x + Math.sin(a) * size * 0.35,
      baseY - size * 0.3 - Math.cos(a) * size * 0.45 - r.range(0, size * 0.2),
      size * 0.2,
      size * 0.34,
      [r.int(40, 80), r.int(100, 150), r.int(40, 80)],
      1,
      true
    );
  }
};

/** A room: wall (plain, panelled or striped), skirting, floor with planks, window light, pictures, plants. */
export function roomBackdrop(r, w, h) {
  const img = image(w, h);
  const wallC = r.pick([
    [226, 220, 208],
    [196, 204, 196],
    [172, 150, 128],
    [218, 200, 186],
    [120, 130, 140],
    [236, 232, 224],
    [86, 96, 110],
    [190, 170, 150],
  ]);
  const floorY = Math.round(h * r.range(0.62, 0.74));
  const wallStyle = r.pick(['plain', 'panels', 'stripes', 'wainscot', 'plain']);
  for (let y = 0; y < floorY; y++)
    for (let x = 0; x < w; x++) {
      const g = (1 - y / floorY) * 14 + hash2(x >> 3, y >> 3, 2) * 3;
      put(img, x, y, [wallC[0] + g, wallC[1] + g, wallC[2] + g]);
    }
  if (wallStyle === 'panels') {
    const n = r.int(3, 5);
    for (let i = 0; i < n; i++) {
      const x0 = ((i + 0.08) * w) / n;
      const x1 = ((i + 0.92) * w) / n;
      rect(
        img,
        x0,
        floorY * 0.12,
        x1,
        floorY * 0.88,
        wallC.map((v) => v * 0.93),
        0.9
      );
      rect(
        img,
        x0,
        floorY * 0.12,
        x1,
        floorY * 0.12 + 2,
        wallC.map((v) => v * 1.12),
        0.9
      );
      rect(
        img,
        x0,
        floorY * 0.88,
        x1,
        floorY * 0.88 + 2,
        wallC.map((v) => v * 0.8),
        0.9
      );
    }
  } else if (wallStyle === 'stripes') {
    for (let x = 0; x < w; x += 22)
      rect(
        img,
        x,
        0,
        x + 10,
        floorY,
        wallC.map((v) => v * 0.94),
        1
      );
  } else if (wallStyle === 'wainscot') {
    rect(
      img,
      0,
      floorY * 0.55,
      w,
      floorY,
      wallC.map((v) => v * 0.86),
      1
    );
    rect(
      img,
      0,
      floorY * 0.55,
      w,
      floorY * 0.55 + 3,
      wallC.map((v) => v * 1.1),
      1
    );
  }
  const floorC = r.pick([
    [170, 130, 92],
    [140, 100, 70],
    [196, 176, 148],
    [92, 84, 80],
    [210, 206, 198],
    [120, 90, 64],
  ]);
  const plank = r.pick([0, 0, 18, 26]);
  for (let y = floorY; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = (y - floorY) / (h - floorY);
      let g = -t * 16 + hash2(x >> 2, y >> 2, 4) * 4;
      if (plank && (x + Math.floor(y / 6) * 13) % plank === 0) g -= 22;
      put(img, x, y, [floorC[0] + g, floorC[1] + g, floorC[2] + g]);
    }
  rect(img, 0, floorY - 6, w, floorY, [245, 242, 236], 0.9);
  if (r.chance(0.7)) {
    const wx = r.range(0.05, 0.6) * w;
    rect(img, wx, floorY * 0.12, wx + w * 0.22, floorY * 0.62, [240, 246, 252], 0.95);
    rect(
      img,
      wx + w * 0.11 - 1,
      floorY * 0.12,
      wx + w * 0.11 + 1,
      floorY * 0.62,
      [250, 250, 250],
      1
    );
    rect(img, wx, floorY * 0.37 - 1, wx + w * 0.22, floorY * 0.37 + 1, [250, 250, 250], 1);
  }
  const pics = r.int(0, 3);
  for (let i = 0; i < pics; i++) {
    const px = r.range(0.05, 0.85) * w;
    const py = r.range(0.1, 0.35) * floorY;
    const pw = r.range(0.07, 0.15) * w;
    rect(img, px - 2, py - 2, px + pw + 2, py + pw * 0.8 + 2, [60, 46, 36], 1);
    rect(img, px, py, px + pw, py + pw * 0.8, [r.int(60, 220), r.int(60, 200), r.int(60, 200)], 1);
  }
  if (r.chance(0.5)) plant(img, r, r.range(0.05, 0.95) * w, floorY + 6, h * 0.22);
  if (r.chance(0.35)) {
    const lx = r.range(0.05, 0.95) * w;
    rect(img, lx - 1.5, floorY - h * 0.3, lx + 1.5, floorY + 4, [40, 40, 40], 1);
    ellipse(img, lx, floorY - h * 0.3, h * 0.05, h * 0.04, [240, 232, 210], 1);
  }
  if (r.chance(0.5)) {
    const cx = r.pick([0.05, 0.95]) * w;
    for (let i = 0; i < 6; i++)
      rect(
        img,
        cx - 18 + i * 6,
        0,
        cx - 12 + i * 6,
        floorY + 10,
        [188, 150, 140].map((v) => v * (0.9 + (i % 2) * 0.12)),
        1
      );
  }
  return { img, floorY, rug: r.chance(0.5) };
}

// ---------- photometric degradation ----------

/** Colour cast, brightness, vignette and sensor noise, in place. */
export function photometric(
  img,
  r,
  { cast = [1, 1, 1], gamma = 1, vignette = 0, noise = 0, seed = 1 }
) {
  const { width: w, height: h, rgba } = img;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = x / w - 0.5;
      const dy = y / h - 0.5;
      const v = 1 - vignette * (dx * dx + dy * dy) * 3;
      for (let k = 0; k < 3; k++) {
        let c = (rgba[i + k] / 255) ** gamma * 255 * cast[k] * v;
        if (noise) c += hash2(x, y, seed + k) * noise;
        rgba[i + k] = clamp8(c);
      }
    }
  return img;
}

export function boxBlur(img, radius) {
  if (radius < 1) return img;
  const { width: w, height: h, rgba } = img;
  const tmp = new Float32Array(rgba.length);
  const n = radius * 2 + 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let k = 0; k < 3; k++) {
        let s = 0;
        for (let d = -radius; d <= radius; d++)
          s += rgba[(y * w + Math.min(w - 1, Math.max(0, x + d))) * 4 + k];
        tmp[(y * w + x) * 4 + k] = s / n;
      }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let k = 0; k < 3; k++) {
        let s = 0;
        for (let d = -radius; d <= radius; d++)
          s += tmp[(Math.min(h - 1, Math.max(0, y + d)) * w + x) * 4 + k];
        rgba[(y * w + x) * 4 + k] = s / n;
      }
  return img;
}

const COS = Array.from({ length: 8 }, (_, u) =>
  Array.from(
    { length: 8 },
    (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / 16) * (u === 0 ? Math.SQRT1_2 : 1) * 0.5
  )
);
/** JPEG-like compression: 4:2:0 chroma, 8x8 DCT with a quantiser; quality 1-100. */
export function jpegish(img, quality = 60) {
  const { width: w, height: h, rgba } = img;
  const q = quality < 50 ? 5000 / quality : 200 - quality * 2;
  const Q = (u, v) => Math.max(1, Math.round(((16 + (u + v) * 6) * q) / 100));
  const Y = new Float32Array(w * h);
  const Cb = new Float32Array(w * h);
  const Cr = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const r = rgba[p * 4];
    const g = rgba[p * 4 + 1];
    const b = rgba[p * 4 + 2];
    Y[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    Cb[p] = -0.1687 * r - 0.3313 * g + 0.5 * b;
    Cr[p] = 0.5 * r - 0.4187 * g - 0.0813 * b;
  }
  for (const plane of [Cb, Cr])
    for (let y = 0; y < h; y += 2)
      for (let x = 0; x < w; x += 2) {
        let s = 0;
        let n = 0;
        for (let yy = y; yy < Math.min(h, y + 2); yy++)
          for (let xx = x; xx < Math.min(w, x + 2); xx++) {
            s += plane[yy * w + xx];
            n++;
          }
        for (let yy = y; yy < Math.min(h, y + 2); yy++)
          for (let xx = x; xx < Math.min(w, x + 2); xx++) plane[yy * w + xx] = s / n;
      }
  const dct = (plane) => {
    const blk = new Float32Array(64);
    const tmp = new Float32Array(64);
    for (let by = 0; by + 8 <= h; by += 8)
      for (let bx = 0; bx + 8 <= w; bx += 8) {
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) blk[y * 8 + x] = plane[(by + y) * w + bx + x] - 128;
        for (let y = 0; y < 8; y++)
          for (let u = 0; u < 8; u++) {
            let s = 0;
            for (let x = 0; x < 8; x++) s += blk[y * 8 + x] * COS[u][x];
            tmp[y * 8 + u] = s;
          }
        for (let u = 0; u < 8; u++)
          for (let v = 0; v < 8; v++) {
            let s = 0;
            for (let y = 0; y < 8; y++) s += tmp[y * 8 + u] * COS[v][y];
            const qq = Q(u, v);
            blk[v * 8 + u] = Math.round(s / qq) * qq;
          }
        for (let y = 0; y < 8; y++)
          for (let u = 0; u < 8; u++) {
            let s = 0;
            for (let v = 0; v < 8; v++) s += blk[v * 8 + u] * COS[v][y];
            tmp[y * 8 + u] = s;
          }
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) {
            let s = 0;
            for (let u = 0; u < 8; u++) s += tmp[y * 8 + u] * COS[u][x];
            plane[(by + y) * w + bx + x] = s + 128;
          }
      }
  };
  Y.forEach((v, i) => {
    Y[i] = v;
  });
  dct(Y);
  for (let p = 0; p < w * h; p++) {
    const y = Y[p];
    rgba[p * 4] = clamp8(y + 1.402 * Cr[p]);
    rgba[p * 4 + 1] = clamp8(y - 0.34414 * Cb[p] - 0.71414 * Cr[p]);
    rgba[p * 4 + 2] = clamp8(y + 1.772 * Cb[p]);
  }
  return img;
}

/** Resamples through a mapping (dst -> src coordinates), nearest for ids and bilinear for colour. */
export function warp(img, outW, outH, map, fill = [255, 255, 255]) {
  const out = image(outW, outH, fill);
  const { width: w, height: h } = img;
  for (let y = 0; y < outH; y++)
    for (let x = 0; x < outW; x++) {
      const [sx, sy] = map(x + 0.5, y + 0.5);
      if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) {
        // outside the source: the border colour keeps edge pixels continuous
        const cx = Math.min(w - 1, Math.max(0, Math.floor(sx)));
        const cy = Math.min(h - 1, Math.max(0, Math.floor(sy)));
        const i = (cy * w + cx) * 4;
        if (sx < -3 || sy < -3 || sx > w + 3 || sy > h + 3) continue;
        out.rgba.set(img.rgba.subarray(i, i + 4), (y * outW + x) * 4);
        continue;
      }
      const x0 = Math.floor(sx - 0.5);
      const y0 = Math.floor(sy - 0.5);
      const fx = sx - 0.5 - x0;
      const fy = sy - 0.5 - y0;
      const xa = Math.max(0, x0);
      const ya = Math.max(0, y0);
      const o = (y * outW + x) * 4;
      for (let k = 0; k < 3; k++) {
        const g = (xx, yy) => img.rgba[(Math.min(h - 1, yy) * w + Math.min(w - 1, xx)) * 4 + k];
        out.rgba[o + k] =
          (g(xa, ya) * (1 - fx) + g(xa + 1, ya) * fx) * (1 - fy) +
          (g(xa, ya + 1) * (1 - fx) + g(xa + 1, ya + 1) * fx) * fy;
      }
      out.ids[y * outW + x] =
        img.ids[Math.min(h - 1, Math.floor(sy)) * w + Math.min(w - 1, Math.floor(sx))];
    }
  return out;
}

/** Rotation about the centre (degrees), zoom (>1 = closer) and off-centre shift, same output size. */
export function transform(
  img,
  { rotate = 0, zoom = 1, shiftX = 0, shiftY = 0, mirror = false, fill }
) {
  const { width: w, height: h } = img;
  const a = (rotate * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return warp(
    img,
    w,
    h,
    (x, y) => {
      let dx = (x - w / 2 - shiftX * w) / zoom;
      let dy = (y - h / 2 - shiftY * h) / zoom;
      const sx = dx * c + dy * s;
      const sy = -dx * s + dy * c;
      return [mirror ? w / 2 - sx : w / 2 + sx, h / 2 + sy];
    },
    fill
  );
}

export function downscale(img, factor) {
  const w = Math.max(8, Math.round(img.width / factor));
  const h = Math.max(8, Math.round(img.height / factor));
  const out = image(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * factor);
      const x1 = Math.max(x0 + 1, Math.min(img.width, Math.floor((x + 1) * factor)));
      const y0 = Math.floor(y * factor);
      const y1 = Math.max(y0 + 1, Math.min(img.height, Math.floor((y + 1) * factor)));
      const sum = [0, 0, 0];
      let n = 0;
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          for (let k = 0; k < 3; k++) sum[k] += img.rgba[(yy * img.width + xx) * 4 + k];
          n++;
        }
      for (let k = 0; k < 3; k++) out.rgba[(y * w + x) * 4 + k] = sum[k] / n;
      out.ids[y * w + x] =
        img.ids[
          Math.min(img.height - 1, Math.floor((y + 0.5) * factor)) * img.width +
            Math.min(img.width - 1, Math.floor((x + 0.5) * factor))
        ];
    }
  return out;
}

/** A watermark or caption: semi-transparent text-like blocks, or a solid bar along an edge. */
export function caption(img, r, kind) {
  const { width: w, height: h } = img;
  if (kind === 'bar') {
    const bh = Math.round(h * r.range(0.06, 0.1));
    const top = r.chance(0.3);
    rect(
      img,
      0,
      top ? 0 : h - bh,
      w,
      top ? bh : h,
      r.pick([
        [20, 20, 24],
        [250, 250, 250],
        [200, 40, 40],
      ]),
      1,
      true
    );
    let x = w * 0.04;
    while (x < w * 0.6) {
      const bw = r.range(6, 22);
      rect(
        img,
        x,
        (top ? 0 : h - bh) + bh * 0.3,
        x + bw,
        (top ? 0 : h - bh) + bh * 0.7,
        [140, 140, 140],
        1,
        true
      );
      x += bw + 5;
    }
  } else {
    const x0 = w * r.range(0.05, 0.5);
    const y0 = h * r.range(0.2, 0.8);
    for (let i = 0; i < 6; i++)
      rect(img, x0 + i * 14, y0, x0 + i * 14 + 9, y0 + 12, [255, 255, 255], 0.4);
  }
}

/** Props that stand in front of the furniture: partial occlusion by plants and cushions. */
export function occlude(img, r, box) {
  const x = box.x0 + box.w * r.range(0.05, 0.9);
  const base = box.y0 + box.h * r.range(0.85, 1.05);
  plant(img, r, x, base, box.h * r.range(0.35, 0.6));
}
