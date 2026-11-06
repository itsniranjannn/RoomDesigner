/**
 * render3d.js
 * A tiny deterministic software renderer for procedural furniture "photos": convex polygons with a z-buffer,
 * orthographic camera (yaw and pitch), flat lambert shading and a few cheap material textures. Pure JS, no canvas,
 * so the corpus is identical on every machine. Units are centimeters: x right, y away from the camera, z up.
 */

/** Seeded random numbers (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  return next;
}

export const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
export const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const shadeC = (c, k) => c.map((v) => clamp8(v * k));

/** Cheap integer hash noise in -1..1. */
export function hash2(x, y, seed = 0) {
  let h =
    (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** A scene of 3D polygons: add boxes, cylinders and extrusions, then render with a camera. */
export class Model {
  constructor() {
    this.polys = [];
  }

  /** A convex polygon with an outward normal. */
  poly(verts, color, mat = 'plain', opts = {}) {
    // Outward normal from the winding; callers pass counter-clockwise seen from outside
    const n = norm(cross(sub(verts[1], verts[0]), sub(verts[2], verts[0])));
    this.polys.push({ verts, n, color, mat, ...opts });
    return this;
  }

  /** Axis-aligned box from its low corner and size. */
  box(x, y, z, w, d, h, color, mat = 'plain', opts = {}) {
    const x1 = x + w;
    const y1 = y + d;
    const z1 = z + h;
    const f = (a, b, c, e) => this.poly([a, b, c, e], color, mat, opts);
    f([x, y, z], [x1, y, z], [x1, y, z1], [x, y, z1]); // front (-y) seen from the camera side
    this.polys[this.polys.length - 1].n = [0, -1, 0];
    f([x1, y1, z], [x, y1, z], [x, y1, z1], [x1, y1, z1]);
    this.polys[this.polys.length - 1].n = [0, 1, 0];
    f([x, y1, z], [x, y, z], [x, y, z1], [x, y1, z1]);
    this.polys[this.polys.length - 1].n = [-1, 0, 0];
    f([x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1]);
    this.polys[this.polys.length - 1].n = [1, 0, 0];
    f([x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1]);
    this.polys[this.polys.length - 1].n = [0, 0, 1];
    f([x, y1, z], [x1, y1, z], [x1, y, z], [x, y, z]);
    this.polys[this.polys.length - 1].n = [0, 0, -1];
    return this;
  }

  /** Vertical cylinder (optionally an ellipse) of radius rx, ry from z up by h. */
  cyl(cx, cy, z, rx, h, color, mat = 'plain', opts = {}) {
    const ry = opts.ry ?? rx;
    const sides = opts.sides ?? 28;
    const ring = (zz) =>
      Array.from({ length: sides }, (_, i) => {
        const a = (i / sides) * Math.PI * 2;
        return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, zz];
      });
    const lo = ring(z);
    const hi = ring(z + h);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const a = ((i + 0.5) / sides) * Math.PI * 2;
      this.polys.push({
        verts: [lo[i], lo[j], hi[j], hi[i]],
        n: [Math.cos(a), Math.sin(a), 0],
        color,
        mat,
        ...opts,
      });
    }
    this.polys.push({ verts: hi, n: [0, 0, 1], color, mat, ...opts });
    return this;
  }

  /**
   * A profile in the xz plane extruded along y: rolled arms, rounded cushions, curved backs. Points are
   * [x, z] counter-clockwise seen from the camera side (-y).
   */
  prismXZ(points, y0, y1, color, mat = 'plain', opts = {}) {
    const n = points.length;
    const front = points.map(([x, z]) => [x, y0, z]);
    const back = points.map(([x, z]) => [x, y1, z]);
    this.polys.push({ verts: front, n: [0, -1, 0], color, mat, ...opts });
    this.polys.push({ verts: [...back].reverse(), n: [0, 1, 0], color, mat, ...opts });
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const e = [points[j][0] - points[i][0], points[j][1] - points[i][1]];
      const l = Math.hypot(e[0], e[1]) || 1;
      this.polys.push({
        verts: [front[i], front[j], back[j], back[i]],
        n: [e[1] / l, 0, -e[0] / l],
        color,
        mat,
        ...opts,
      });
    }
    return this;
  }

  /** A box whose top (and optionally bottom) edges are rounded in the xz plane, extruded along y. */
  roundBox(x, y, z, w, d, h, r, color, mat = 'plain', opts = {}) {
    const rr = Math.min(r, w / 2, h / 2);
    const pts = [];
    const arc = (cx, cz, a0, a1) => {
      for (let i = 0; i <= 4; i++) {
        const a = a0 + ((a1 - a0) * i) / 4;
        pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
      }
    };
    const round = opts.bottom !== false;
    if (round) arc(x + rr, z + rr, Math.PI, Math.PI * 1.5);
    else pts.push([x, z]);
    if (round) arc(x + w - rr, z + rr, Math.PI * 1.5, Math.PI * 2);
    else pts.push([x + w, z]);
    arc(x + w - rr, z + h - rr, 0, Math.PI / 2);
    arc(x + rr, z + h - rr, Math.PI / 2, Math.PI);
    return this.prismXZ(pts, y, y + d, color, mat, opts);
  }

  /** Shifts everything by (dx, dy, dz). */
  moved(dx, dy, dz) {
    for (const p of this.polys) p.verts = p.verts.map(([x, y, z]) => [x + dx, y + dy, z + dz]);
    return this;
  }

  bounds() {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const p of this.polys)
      for (const v of p.verts)
        for (let i = 0; i < 3; i++) {
          lo[i] = Math.min(lo[i], v[i]);
          hi[i] = Math.max(hi[i], v[i]);
        }
    return { lo, hi };
  }
}

/**
 * Renders a model to a transparent RGBA sprite.
 * @param {Model} model
 * @param {{yaw?: number, pitch?: number, long?: number, ss?: number, light?: number[]}} cam yaw/pitch in degrees;
 *   long is the long side of the sprite in pixels
 * @returns {{rgba: Uint8ClampedArray, width: number, height: number, ppc: number}} ppc = pixels per cm
 */
export function renderModel(model, cam = {}) {
  const yaw = ((cam.yaw ?? 0) * Math.PI) / 180;
  const pitch = ((cam.pitch ?? 8) * Math.PI) / 180;
  const ss = cam.ss ?? 2;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const { lo, hi } = model.bounds();
  const mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, 0];
  // camera frame: u right, v up, depth away
  const proj = ([x, y, z]) => {
    const dx = x - mid[0];
    const dy = y - mid[1];
    const xr = dx * c + dy * s;
    const yr = -dx * s + dy * c;
    return [xr, z * cp + yr * sp, yr * cp - z * sp];
  };
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (const p of model.polys)
    for (const vtx of p.verts) {
      const [u, v] = proj(vtx);
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
  const ppc = cam.ppc ? cam.ppc * ss : ((cam.long ?? 320) * ss) / Math.max(u1 - u0, v1 - v0);
  const W = Math.ceil((u1 - u0) * ppc) + 4 * ss;
  const H = Math.ceil((v1 - v0) * ppc) + 4 * ss;
  const buf = new Float32Array(W * H * 4); // premultiplied-ish accumulate (rgb, alpha)
  const depth = new Float32Array(W * H).fill(Infinity);
  const light = cam.light ?? [-0.35, -0.5, 0.8];
  const L = norm(light);
  const screen = (v) => {
    const [u, vv, d] = proj(v);
    return [(u - u0) * ppc + 2 * ss, (v1 - vv) * ppc + 2 * ss, d];
  };
  const faceShade = (n, mat) => {
    const nx = n[0] * c + n[1] * s;
    const ny = -n[0] * s + n[1] * c;
    const nz = n[2];
    const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const base = mat === 'metal' ? 0.42 : 0.5;
    return base + (1 - base) * lam;
  };
  const texture = (mat, x, y, color, nrm) => {
    switch (mat) {
      case 'fabric': {
        const g = hash2(x, y, 3) * 5 + hash2(x >> 2, y >> 2, 9) * 3;
        return [color[0] + g, color[1] + g, color[2] + g];
      }
      case 'leather': {
        const g = hash2(x >> 1, y >> 1, 5) * 2;
        const gloss = Math.max(0, Math.sin(x * 0.045 + y * 0.02)) * 14 * (nrm[2] > 0.5 ? 1 : 0.4);
        return [color[0] + g + gloss, color[1] + g + gloss, color[2] + g + gloss];
      }
      case 'wood': {
        const g = Math.sin(y * 0.55 + hash2(x >> 5, y >> 3, 7) * 3 + x * 0.04) * 6;
        return [color[0] + g, color[1] + g * 0.85, color[2] + g * 0.7];
      }
      case 'metal': {
        const g = Math.sin(x * 0.13) * 8 + hash2(x, y, 4) * 2;
        return [color[0] + g, color[1] + g, color[2] + g];
      }
      default:
        return [
          color[0] + hash2(x, y, 1) * 1.5,
          color[1] + hash2(x, y, 1) * 1.5,
          color[2] + hash2(x, y, 1) * 1.5,
        ];
    }
  };
  const glass = [];
  for (const p of model.polys) {
    const ny = -p.n[0] * s + p.n[1] * c;
    const nz = p.n[2];
    // facing the camera? camera looks along (0, cp, -sp)
    if (ny * cp - nz * sp >= -1e-4 && !p.double) continue;
    if (p.mat === 'glass') {
      glass.push(p);
      continue;
    }
    rasterPoly(p, false);
  }
  function rasterPoly(p, blend) {
    const pts = p.verts.map(screen);
    const shade = faceShade(p.n, p.mat) * (p.light ?? 1);
    const alpha = blend ? (p.alpha ?? 0.3) : 1;
    for (let i = 1; i + 1 < pts.length; i++) {
      const a = pts[0];
      const b = pts[i];
      const d = pts[i + 1];
      const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], d[0])));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], d[0])));
      const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], d[1])));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], d[1])));
      const den = (b[1] - d[1]) * (a[0] - d[0]) + (d[0] - b[0]) * (a[1] - d[1]);
      if (Math.abs(den) < 1e-9) continue;
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const l1 = ((b[1] - d[1]) * (px - d[0]) + (d[0] - b[0]) * (py - d[1])) / den;
          const l2 = ((d[1] - a[1]) * (px - d[0]) + (a[0] - d[0]) * (py - d[1])) / den;
          const l3 = 1 - l1 - l2;
          if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
          const z = l1 * a[2] + l2 * b[2] + l3 * d[2];
          const idx = y * W + x;
          if (z > depth[idx] + (p.bias ?? 0.0)) continue;
          const col = texture(p.mat === 'glass' ? 'plain' : p.mat, x, y, p.color, p.n);
          const o = idx * 4;
          if (blend) {
            buf[o] = buf[o] * (1 - alpha) + clamp8(col[0] * shade) * alpha;
            buf[o + 1] = buf[o + 1] * (1 - alpha) + clamp8(col[1] * shade) * alpha;
            buf[o + 2] = buf[o + 2] * (1 - alpha) + clamp8(col[2] * shade) * alpha;
            buf[o + 3] = buf[o + 3] + (1 - buf[o + 3]) * alpha;
          } else {
            depth[idx] = z;
            buf[o] = clamp8(col[0] * shade);
            buf[o + 1] = clamp8(col[1] * shade);
            buf[o + 2] = clamp8(col[2] * shade);
            buf[o + 3] = 1;
          }
        }
    }
  }
  // glass last, far to near, depth-tested but not written
  glass.sort(
    (p, q) =>
      q.verts.reduce((m, v) => m + screen(v)[2], 0) / q.verts.length -
      p.verts.reduce((m, v) => m + screen(v)[2], 0) / p.verts.length
  );
  for (const p of glass) rasterPoly(p, true);
  // box-downsample the supersampled buffer
  const w = Math.ceil(W / ss);
  const h = Math.ceil(H / ss);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let yy = 0; yy < ss; yy++)
        for (let xx = 0; xx < ss; xx++) {
          const sx = x * ss + xx;
          const sy = y * ss + yy;
          if (sx >= W || sy >= H) continue;
          const o = (sy * W + sx) * 4;
          const al = buf[o + 3];
          r += buf[o] * al;
          g += buf[o + 1] * al;
          b += buf[o + 2] * al;
          a += al;
        }
      const o = (y * w + x) * 4;
      if (a > 0) {
        out[o] = r / a;
        out[o + 1] = g / a;
        out[o + 2] = b / a;
      }
      out[o + 3] = (a / (ss * ss)) * 255;
    }
  return { rgba: out, width: w, height: h, ppc: ppc / ss };
}
