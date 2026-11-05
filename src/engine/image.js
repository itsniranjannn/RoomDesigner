/**
 * image.js
 * Browser helpers for user-supplied photos: validate, downscale and read pixels.
 */

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

/** Downscales so the longest edge is at most maxDim; returns pixels and a data URL. */
export async function readImage(file, maxDim = 1400, mime = 'image/jpeg', quality = 0.85) {
  validateImageFile(file);
  const img = await loadBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const thumb = document.createElement('canvas');
  thumb.width = 96;
  thumb.height = Math.max(1, Math.round(96 / (width / height)));
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return {
    width,
    height,
    sourceWidth: img.naturalWidth,
    sourceHeight: img.naturalHeight,
    aspect: width / height,
    thumbUrl: thumb.toDataURL('image/jpeg', 0.7),
    dataUrl: canvas.toDataURL(mime, quality),
    rgba: ctx.getImageData(0, 0, width, height).data,
  };
}

/** Same shape as readImage's result, for pixels already in memory (a crop of a bigger picture). */
export function imageFromPixels(
  rgba,
  width,
  height,
  maxDim = 480,
  mime = 'image/jpeg',
  quality = 0.85
) {
  const src = document.createElement('canvas');
  src.width = width;
  src.height = height;
  src
    .getContext('2d')
    .putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  const thumb = document.createElement('canvas');
  thumb.width = 96;
  thumb.height = Math.max(1, Math.round(96 / (w / h)));
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return {
    width: w,
    height: h,
    sourceWidth: width,
    sourceHeight: height,
    aspect: w / h,
    thumbUrl: thumb.toDataURL('image/jpeg', 0.7),
    dataUrl: canvas.toDataURL(mime, quality),
    rgba: ctx.getImageData(0, 0, w, h).data,
  };
}
