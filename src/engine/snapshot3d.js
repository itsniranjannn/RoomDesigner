/**
 * snapshot3d.js
 * Captures the live 3D canvas as a PNG with a title strip. The 3D views register a capture function while
 * they are on screen (see components/preview3d/SnapshotBridge.jsx); the export menus call `capture3D`.
 * The scene is rendered again at double resolution and read back in the same tick, so no
 * `preserveDrawingBuffer` (which slows every frame) is needed.
 */
import { SANS, SERIF } from './exportLayout.js';

let source = null;

/** Registers the function that renders the current 3D view; returns an unregister function. */
export function registerSnapshotSource(fn) {
  source = fn;
  return () => {
    if (source === fn) source = null;
  };
}

/** True while a 3D view is on screen and can be captured. */
export const canCapture3D = () => !!source;

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The 3D picture could not be read.'));
    img.src = url;
  });

/**
 * The 3D view as a PNG blob, 2x the on-screen size, under a title strip.
 * @param {{ title: string, subtitle?: string, background?: string }} info
 * @returns {Promise<{ blob: Blob, width: number, height: number }>}
 */
export async function capture3D({ title, subtitle = '', background = '#FAF8F3' }) {
  if (!source) throw new Error('Open the 3D view first, then export it.');
  const shot = source(2); // { dataUrl, width, height } straight from the renderer
  if (!shot?.dataUrl) throw new Error('The 3D view could not be captured.');
  const img = await loadImage(shot.dataUrl);
  const strip = Math.max(96, Math.round(img.width * 0.07));
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height + strip;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create a drawing surface.');
  ctx.fillStyle = '#FAF8F3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, strip, img.width, img.height);
  ctx.drawImage(img, 0, strip);

  // Title strip
  const pad = Math.round(strip * 0.3);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#22180E';
  ctx.font = `600 ${Math.round(strip * 0.4)}px ${SERIF}`;
  const maxTitle = canvas.width * 0.6;
  let text = String(title);
  while (ctx.measureText(text).width > maxTitle && text.length > 4) text = `${text.slice(0, -2)}…`;
  ctx.fillText(text, pad, Math.round(strip * 0.58));
  ctx.fillStyle = '#6B5E50';
  ctx.font = `400 ${Math.round(strip * 0.22)}px ${SANS}`;
  ctx.fillText(subtitle, pad, Math.round(strip * 0.85));
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8C2F39';
  ctx.font = `600 ${Math.round(strip * 0.22)}px ${SANS}`;
  ctx.fillText('Room Designer Studio', canvas.width - pad, Math.round(strip * 0.58));
  ctx.strokeStyle = 'rgba(34,24,14,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, strip - 1);
  ctx.lineTo(canvas.width, strip - 1);
  ctx.stroke();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The picture could not be saved.');
  return { blob, width: canvas.width, height: canvas.height };
}
