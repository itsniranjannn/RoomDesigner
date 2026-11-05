import * as THREE from 'three';
import {
  rugPatternOps,
  curtainPatternOps,
  rugCanvasSize,
  patternKey,
  artOps,
  artCanvasSize,
} from './patterns.js';

/**
 * patternTextures.js
 * Draws the rug and curtain patterns (see patterns.js) onto canvases and turns them into three.js
 * textures. Pictures are cached by pattern, size and colours; the oldest are released first so
 * dragging a colour picker does not pile up pictures.
 */

const MAX_CACHED = 40;
const cache = new Map();

/** Replays drawing instructions onto a 2D canvas context. */
export function drawOps(ctx, ops) {
  for (const op of ops) {
    if (op.k === 'rect') {
      ctx.fillStyle = op.fill;
      ctx.fillRect(op.x, op.y, op.w, op.h);
    } else if (op.k === 'poly') {
      ctx.fillStyle = op.fill;
      ctx.beginPath();
      op.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    } else if (op.k === 'circle') {
      ctx.beginPath();
      ctx.arc(op.cx, op.cy, Math.max(0, op.r), 0, Math.PI * 2);
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.lw || 1;
        ctx.stroke();
      }
    } else if (op.k === 'line') {
      ctx.strokeStyle = op.stroke;
      ctx.lineWidth = op.lw || 1;
      ctx.beginPath();
      ctx.moveTo(op.x1, op.y1);
      ctx.lineTo(op.x2, op.y2);
      ctx.stroke();
    }
  }
}

function remember(key, tex) {
  cache.set(key, tex);
  while (cache.size > MAX_CACHED) {
    const [oldKey, old] = cache.entries().next().value;
    cache.delete(oldKey);
    old.dispose();
  }
}

function build({ width, height, ops }, { repeat }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawOps(ctx, ops);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

/** The picture of a rug pattern at a footprint, or null when no canvas is available (server, tests). */
export function rugTexture(id, widthCm, depthCm, colors) {
  if (typeof document === 'undefined') return null;
  const size = rugCanvasSize(widthCm, depthCm);
  const key = patternKey('rug', id, size, colors);
  if (cache.has(key)) return cache.get(key);
  const tex = build(rugPatternOps(id, size, colors), { repeat: false });
  if (tex) remember(key, tex);
  return tex;
}

/** One repeat of a curtain fabric (set `texture.repeat` to tile it), or null without a canvas. */
export function curtainTexture(id, colors) {
  if (typeof document === 'undefined') return null;
  const key = patternKey('curtain', id, null, colors);
  if (cache.has(key)) return cache.get(key);
  const tex = build(curtainPatternOps(id, colors), { repeat: true });
  if (tex) remember(key, tex);
  return tex;
}

/** The picture inside a frame (landscape, abstract, mandala, sunrise), or null without a canvas. */
export function artTexture(style, widthCm, heightCm, colors) {
  if (typeof document === 'undefined') return null;
  const size = artCanvasSize(widthCm, heightCm);
  const key = `art:${style}:${size.width}x${size.height}:${colors?.a}:${colors?.b}`;
  if (cache.has(key)) return cache.get(key);
  const tex = build(artOps(style, size, colors), { repeat: false });
  if (tex) remember(key, tex);
  return tex;
}
