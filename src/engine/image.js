/**
 * image.js
 * Browser helpers for user-supplied photos: validate, downscale and read pixels.
 */
import { shrinkRgba } from './foreground.js';

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function validateImageFile(file) {
  if (!file) throw new Error('No file selected.');
  if (!ALLOWED_TYPES.includes(file.type))
    throw new Error('Please choose a PNG, JPEG or WebP image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That image is larger than 12 MB.');
}

function loadBitmap(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    img.src = url;
  });
}

/** Pixels of a canvas drawn with `draw`, at the given size, on white (a transparent PNG reads as on white). */
function canvasPixels(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  draw(ctx);
  return ctx.getImageData(0, 0, width, height).data;
}

/** A canvas showing pixels, for the previews and data URLs (not for analysis). */
function pixelCanvas(rgba, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas;
}

/** The result shape of readImage and imageFromPixels, with a small thumbnail and a data URL. */
function photoRecord(rgba, width, height, sourceWidth, sourceHeight, mime, quality) {
  const canvas = pixelCanvas(rgba, width, height);
  const thumb = document.createElement('canvas');
  thumb.width = 96;
  thumb.height = Math.max(1, Math.round(96 / (width / height)));
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return {
    width,
    height,
    sourceWidth,
    sourceHeight,
    aspect: width / height,
    thumbUrl: thumb.toDataURL('image/jpeg', 0.7),
    dataUrl: canvas.toDataURL(mime, quality),
    rgba,
  };
}

/** Pictures larger than this many pixels are first scaled by the browser before the exact downscale. */
const FULL_DECODE_PIXELS = 24e6;

/**
 * Downscales so the longest edge is at most maxDim; returns pixels and a data URL. The downscale is the engine's
 * own box average (foreground.shrinkRgba), not the browser's resampling, so the photo analysed here is exactly the
 * one the tests analyse from the same file.
 */
export async function readImage(file, maxDim = 1400, mime = 'image/jpeg', quality = 0.85) {
  validateImageFile(file);
  const img = await loadBitmap(file);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  // a very large photo is first brought down by the browser to a size the exact downscale can take quickly
  const pre = nw * nh > FULL_DECODE_PIXELS ? Math.sqrt(FULL_DECODE_PIXELS / (nw * nh)) : 1;
  const dw = Math.max(1, Math.round(nw * pre));
  const dh = Math.max(1, Math.round(nh * pre));
  const full = canvasPixels(dw, dh, (ctx) => ctx.drawImage(img, 0, 0, dw, dh));
  const small = shrinkRgba(full, dw, dh, maxDim);
  return photoRecord(small.rgba, small.width, small.height, nw, nh, mime, quality);
}

/**
 * Same shape as readImage's result, for pixels already in memory (a crop of a bigger picture), downscaled the same
 * exact way.
 */
export function imageFromPixels(
  rgba,
  width,
  height,
  maxDim = 480,
  mime = 'image/jpeg',
  quality = 0.85
) {
  const small = shrinkRgba(new Uint8ClampedArray(rgba), width, height, maxDim);
  return photoRecord(small.rgba, small.width, small.height, width, height, mime, quality);
}
