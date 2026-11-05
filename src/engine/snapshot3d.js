/**
 * snapshot3d.js
 * Captures the live 3D canvas as a PNG, optionally under a title strip. The 3D views register a capture
 * function while they are on screen (see components/preview3d/SnapshotBridge.jsx); the export menus call
 * `capture3D`. The scene is rendered again at a larger size and read back in the same tick, so no
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

/** Resolves after the browser has painted, so a progress message shows before heavy work starts. */
const nextFrame = () =>
  new Promise((resolve) => {
    const done = () => setTimeout(resolve, 0);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(done);
    else done();
  });

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

/**
 * The 3D view as a PNG blob, optionally under a title strip.
 * `size` is a key of RENDER_SIZES (standard is twice the screen size). `background` is 'scene' (the room
 * colors on a cream sheet), 'white' or 'transparent'. `highQuality` renders with larger shadow maps.
 * `onProgress(text)` is called as the work moves on, so a menu can show it.
 * @param {{ title: string, subtitle?: string, size?: string, background?: string, titleBlock?: boolean,
 *   highQuality?: boolean, compact?: boolean, onProgress?: (text: string) => void }} info
 * @returns {Promise<{ blob: Blob, width: number, height: number }>}
 */
export async function capture3D({
  title,
  subtitle = '',
  size = 'standard',
  background = 'scene',
  titleBlock = true,
  highQuality = false,
  compact = false,
  onProgress = () => {},
}) {
  if (!source) throw new Error('Open the 3D view first, then export it.');
  onProgress('Rendering the picture…');
  await nextFrame();
  const shot = source({ size, background, highQuality }); // { dataUrl, width, height, alpha }
  if (!shot?.dataUrl) throw new Error('The 3D view could not be captured.');
  // A browser that cannot give a see-through canvas gets a white one instead
  const bg = background === 'transparent' && !shot.alpha ? 'white' : background;
  onProgress('Adding the title and saving…');
  await nextFrame();
  const img = await loadImage(shot.dataUrl);
  const strip = !titleBlock
    ? 0
    : compact
      ? Math.max(72, Math.round(img.width * 0.045))
      : Math.max(96, Math.round(img.width * 0.07));
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height + strip;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create a drawing surface.');
  if (bg !== 'transparent') {
    ctx.fillStyle = bg === 'white' ? '#FFFFFF' : '#FAF8F3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, strip);

  if (strip) {
    const pad = Math.round(strip * 0.3);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#22180E';
    ctx.font = `600 ${Math.round(strip * 0.4)}px ${SERIF}`;
    const maxTitle = canvas.width * 0.6;
    let text = String(title);
    while (ctx.measureText(text).width > maxTitle && text.length > 4)
      text = `${text.slice(0, -2)}…`;
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
  }

  const blob = await toBlob(canvas);
  if (!blob) throw new Error('The picture could not be saved.');
  return { blob, width: canvas.width, height: canvas.height };
}
