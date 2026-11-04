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
    aspect: width / height,
    thumbUrl: thumb.toDataURL('image/jpeg', 0.7),
    dataUrl: canvas.toDataURL(mime, quality),
    rgba: ctx.getImageData(0, 0, width, height).data,
  };
}
