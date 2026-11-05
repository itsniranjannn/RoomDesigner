import * as THREE from 'three';
import { getFloor, getWall } from './materials.js';

/**
 * surfaceTextures.js
 * Procedural pictures for the floor and wall finishes, drawn once on a canvas (nothing is downloaded), and
 * the shared materials that use them. The pictures are mapped from where a surface is in the room (not
 * from the model's own texture coordinates), so every wall piece, floor slab and outline shape lines up and
 * keeps the same scale whatever its size.
 */

const SIZE = 512;

/** Small seeded random numbers, so a finish looks the same every time and in every browser. */
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

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `rgb(${r},${g},${b})`;
}

function speckle(ctx, rand, count, dark = 0.08, light = 0.06, size = 2) {
  for (let i = 0; i < count; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const isDark = rand() < 0.55;
    ctx.fillStyle = isDark
      ? `rgba(0,0,0,${(rand() * dark).toFixed(3)})`
      : `rgba(255,255,255,${(rand() * light).toFixed(3)})`;
    ctx.fillRect(x, y, 1 + rand() * size, 1 + rand() * size);
  }
}

/** Soft round blotches drawn again at each edge so the picture repeats without a seam. */
function blotches(ctx, rand, count, color, maxAlpha, minR, maxR) {
  for (let i = 0; i < count; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = minR + rand() * (maxR - minR);
    const a = (rand() * maxAlpha).toFixed(3);
    for (const dx of [-SIZE, 0, SIZE]) {
      for (const dy of [-SIZE, 0, SIZE]) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx < -r || cx > SIZE + r || cy < -r || cy > SIZE + r) continue;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color.replace('A', a));
        g.addColorStop(1, color.replace('A', '0'));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
  }
}

/** Boards running along the picture's width; each row has seams at its own spots. */
function drawBoards(ctx, rand, { base, jitter, rows, grain, seam }) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const rowH = SIZE / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const cuts = [0];
    const seamAt = Math.floor(rand() * SIZE * 0.6 + SIZE * 0.2);
    cuts.push(seamAt, SIZE);
    for (let c = 0; c < cuts.length - 1; c++) {
      const x0 = cuts[c];
      const x1 = cuts[c + 1];
      ctx.fillStyle = shade(base, (rand() - 0.5) * jitter);
      ctx.fillRect(x0, y, x1 - x0, rowH);
      // Grain: long thin lines with slight changes in tone
      for (let g = 0; g < 9; g++) {
        const gy = y + 3 + rand() * (rowH - 6);
        ctx.strokeStyle = `rgba(${grain},${(0.05 + rand() * 0.12).toFixed(3)})`;
        ctx.lineWidth = 0.6 + rand() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x0, gy);
        ctx.bezierCurveTo(
          x0 + (x1 - x0) * 0.3,
          gy + (rand() - 0.5) * 3,
          x0 + (x1 - x0) * 0.7,
          gy + (rand() - 0.5) * 3,
          x1,
          gy + (rand() - 0.5) * 2
        );
        ctx.stroke();
      }
      // A couple of knots on darker boards
      if (rand() < 0.35) {
        const kx = x0 + rand() * (x1 - x0);
        const ky = y + rowH * (0.3 + rand() * 0.4);
        ctx.strokeStyle = `rgba(${grain},0.22)`;
        ctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.ellipse(kx, ky, 2 + k * 2.5, 1 + k * 1.1, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Seam at the board end
      ctx.fillStyle = seam;
      ctx.fillRect(x1 - 1, y, 2, rowH);
    }
    ctx.fillStyle = seam;
    ctx.fillRect(0, y, SIZE, 2);
  }
  speckle(ctx, rand, 1200, 0.05, 0.04, 1.5);
}

const DRAW = {
  plank(ctx, rand) {
    drawBoards(ctx, rand, {
      base: '#B98B5E',
      jitter: 26,
      rows: 8,
      grain: '70,40,20',
      seam: 'rgba(60,35,18,0.55)',
    });
  },
  oak(ctx, rand) {
    drawBoards(ctx, rand, {
      base: '#D9BC91',
      jitter: 20,
      rows: 6,
      grain: '150,110,60',
      seam: 'rgba(120,90,55,0.4)',
    });
  },
  walnut(ctx, rand) {
    drawBoards(ctx, rand, {
      base: '#5A3B29',
      jitter: 22,
      rows: 8,
      grain: '20,10,5',
      seam: 'rgba(15,8,4,0.6)',
    });
  },
  tile(ctx, rand) {
    ctx.fillStyle = '#9C988F';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const n = 2;
    const cell = SIZE / n;
    const grout = 5;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = shade('#DAD6CC', (rand() - 0.5) * 14);
        ctx.fillRect(i * cell + grout / 2, j * cell + grout / 2, cell - grout, cell - grout);
      }
    }
    blotches(ctx, rand, 24, 'rgba(255,255,255,A)', 0.07, 40, 120);
    speckle(ctx, rand, 900, 0.05, 0.05, 1.5);
  },
  concrete(ctx, rand) {
    ctx.fillStyle = '#9B9994';
    ctx.fillRect(0, 0, SIZE, SIZE);
    blotches(ctx, rand, 38, 'rgba(60,60,58,A)', 0.14, 50, 150);
    blotches(ctx, rand, 30, 'rgba(240,240,236,A)', 0.12, 40, 120);
    speckle(ctx, rand, 5000, 0.18, 0.12, 2);
  },
  marble(ctx, rand) {
    ctx.fillStyle = '#ECE9E4';
    ctx.fillRect(0, 0, SIZE, SIZE);
    blotches(ctx, rand, 16, 'rgba(170,168,170,A)', 0.1, 60, 160);
    for (let v = 0; v < 7; v++) {
      let x = rand() * SIZE;
      let y = rand() * SIZE;
      let ang = rand() * Math.PI * 2;
      ctx.strokeStyle = `rgba(110,108,118,${(0.1 + rand() * 0.2).toFixed(3)})`;
      ctx.lineWidth = 0.7 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 26; s++) {
        ang += (rand() - 0.5) * 0.9;
        x += Math.cos(ang) * 14;
        y += Math.sin(ang) * 14;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    speckle(ctx, rand, 700, 0.05, 0.05, 1.2);
  },
  carpet(ctx, rand) {
    ctx.fillStyle = '#A59A8C';
    ctx.fillRect(0, 0, SIZE, SIZE);
    blotches(ctx, rand, 20, 'rgba(70,60,50,A)', 0.07, 60, 160);
    speckle(ctx, rand, 14000, 0.22, 0.2, 1.4);
  },
  brick(ctx, rand) {
    ctx.fillStyle = '#B9B2A6';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const rows = 12;
    const perRow = 4;
    const bh = SIZE / rows;
    const bw = SIZE / perRow;
    const mortar = 4;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let c = -1; c < perRow + 1; c++) {
        const x = c * bw + off;
        const tones = ['#A4553F', '#9A4B38', '#B0614A', '#8F4533', '#A85E45'];
        ctx.fillStyle = shade(tones[Math.floor(rand() * tones.length)], (rand() - 0.5) * 16);
        ctx.fillRect(x + mortar / 2, r * bh + mortar / 2, bw - mortar, bh - mortar);
      }
    }
    speckle(ctx, rand, 5000, 0.2, 0.1, 2);
  },
  plaster(ctx, rand) {
    ctx.fillStyle = '#E4DDD0';
    ctx.fillRect(0, 0, SIZE, SIZE);
    blotches(ctx, rand, 40, 'rgba(120,105,85,A)', 0.07, 50, 150);
    blotches(ctx, rand, 30, 'rgba(255,255,250,A)', 0.1, 40, 120);
    speckle(ctx, rand, 3500, 0.08, 0.07, 1.8);
  },
  panel(ctx, rand) {
    ctx.fillStyle = '#A57B52';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const boards = 8;
    const bw = SIZE / boards;
    for (let b = 0; b < boards; b++) {
      ctx.fillStyle = shade('#A57B52', (rand() - 0.5) * 22);
      ctx.fillRect(b * bw, 0, bw, SIZE);
      for (let g = 0; g < 8; g++) {
        const gx = b * bw + 4 + rand() * (bw - 8);
        ctx.strokeStyle = `rgba(70,40,20,${(0.06 + rand() * 0.12).toFixed(3)})`;
        ctx.lineWidth = 0.6 + rand();
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(
          gx + (rand() - 0.5) * 3,
          SIZE * 0.3,
          gx + (rand() - 0.5) * 3,
          SIZE * 0.7,
          gx,
          SIZE
        );
        ctx.stroke();
      }
      // The groove between boards, with a lit edge beside it
      ctx.fillStyle = 'rgba(40,22,10,0.6)';
      ctx.fillRect(b * bw, 0, 3, SIZE);
      ctx.fillStyle = 'rgba(255,230,190,0.18)';
      ctx.fillRect(b * bw + 3, 0, 2, SIZE);
    }
    speckle(ctx, rand, 900, 0.05, 0.04, 1.5);
  },
};

const seedOf = (name) => [...name].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7);

const textureCache = new Map();

/** The repeating picture for a texture name (plank, tile, brick...), or null if there is none. */
export function getTexture(name) {
  if (!name || !DRAW[name] || typeof document === 'undefined') return null;
  if (textureCache.has(name)) return textureCache.get(name);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  DRAW[name](ctx, rng(seedOf(name)));
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  textureCache.set(name, tex);
  return tex;
}

/**
 * A standard material that reads its picture by where each pixel is in the room: seen from above it uses
 * the floor plane, from the side the wall plane. `tileM` is how many metres one repeat covers.
 */
function worldMapped(texture, tileM, roughness) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness });
  const size = tileM.toFixed(3);
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSurfPos;\nvarying vec3 vSurfNrm;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSurfPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvSurfNrm = normalize(mat3(modelMatrix) * normal);'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSurfPos;\nvarying vec3 vSurfNrm;'
      )
      .replace(
        '#include <map_fragment>',
        `vec3 an = abs(vSurfNrm);
vec2 surfUv = an.y > 0.5 ? vSurfPos.xz : (an.x > an.z ? vec2(vSurfPos.z, -vSurfPos.y) : vec2(vSurfPos.x, -vSurfPos.y));
vec4 sampledDiffuseColor = texture2D(map, surfUv / ${size});
diffuseColor *= sampledDiffuseColor;`
      );
  };
  mat.side = THREE.DoubleSide;
  mat.customProgramCacheKey = () => `surface-${size}`;
  return mat;
}

const materialCache = new Map();

function build(kind, def) {
  if (!def) return null;
  const key = `${kind}:${def.id}`;
  if (materialCache.has(key)) return materialCache.get(key);
  const texture = getTexture(def.texture);
  const mat = texture
    ? worldMapped(texture, def.tileM, def.roughness)
    : new THREE.MeshStandardMaterial({ color: def.swatch, roughness: def.roughness });
  materialCache.set(key, mat);
  return mat;
}

/** Shared material for a floor finish id, or null for the classic look. */
export const floorMaterial = (id) => build('floor', getFloor(id));
/** Shared material for a wall finish id, or null for the classic look. */
export const wallMaterial = (id) => build('wall', getWall(id));
