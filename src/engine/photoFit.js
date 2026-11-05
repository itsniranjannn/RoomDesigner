/**
 * photoFit.js
 * Helpers for judging a photo before it is used (too dark, too small, cut off, busy background, tilted) and for
 * fitting the size of the model to what a photo shows (matching the silhouette, scoring how close it is).
 * Pure functions over pixels and masks, so they run the same in the browser and in tests.
 */
import { fitBackground, maskBounds, maskCoverage } from './hull.js';

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Plain-language problems with a photo, each with how to fix it. Empty when the photo looks good.
 * @param {{width:number, height:number, rgba:Uint8ClampedArray|Uint8Array, sourceWidth?:number, sourceHeight?:number}} photo
 * @param {Uint8Array} mask 1 where the piece is, as cut out of the photo
 * @returns {Array<{ id: string, text: string, fix: string }>}
 */
export function photoQuality(photo, mask) {
  const out = [];
  const { width, height, rgba } = photo;
  if (!width || !height || !rgba) return out;

  // Light: the piece itself, or the whole picture when nothing was cut out yet
  const bounds = mask ? maskBounds(mask, width, height) : null;
  let sum = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 6000)));
  for (let y = 0; y < height; y += step)
    for (let x = 0; x < width; x += step) {
      const p = y * width + x;
      if (mask && bounds && !mask[p]) continue;
      sum += luma(rgba[p * 4], rgba[p * 4 + 1], rgba[p * 4 + 2]);
      n++;
    }
  const mean = n ? sum / n : 128;
  if (mean < 62)
    out.push({
      id: 'dark',
      text: 'This photo is quite dark.',
      fix: 'Switch on the lights or stand near a window. Dark photos lose the colors and the edges of the piece.',
    });

  // Resolution: the original, and how many pixels the piece itself spans
  const srcW = photo.sourceWidth || width;
  const srcH = photo.sourceHeight || height;
  const pieceLong = bounds ? Math.max(bounds.width, bounds.height) * (srcW / width) : null;
  if (Math.max(srcW, srcH) < 500 || (pieceLong !== null && pieceLong < 260))
    out.push({
      id: 'small',
      text: 'The piece is small in this photo, or the photo has few pixels.',
      fix: 'Step closer so the piece fills most of the frame, and use the normal camera rather than a zoomed or cropped copy.',
    });

  if (bounds) {
    // Cut off: the piece reaches the edge of the picture
    const m = 2;
    const cut =
      bounds.minX <= m ||
      bounds.minY <= m ||
      bounds.maxX >= width - 1 - m ||
      bounds.maxY >= height - 1 - m;
    if (cut)
      out.push({
        id: 'cutoff',
        text: 'Part of the piece touches the edge of the photo.',
        fix: 'Step back so there is a little empty space all round the piece.',
      });

    // Tilt: the floor line under the piece should run level
    const tilt = floorTiltDegrees(mask, width, height, bounds);
    if (tilt !== null && Math.abs(tilt) > 4)
      out.push({
        id: 'tilted',
        text: `The camera looks tilted (about ${Math.round(Math.abs(tilt))} degrees).`,
        fix: 'Hold the phone upright and level, with the lens at mid-height of the piece.',
      });
  }

  // Busy background: the border of the picture is not a calm, even color
  const bg = fitBackground(rgba, width, height);
  const busy = bg.noise > 8 || (mask && maskCoverage(mask) < 0.04 && bg.noise > 5);
  if (busy)
    out.push({
      id: 'busy',
      text: 'The background is busy, so the piece may not separate cleanly.',
      fix: 'Place the piece against a plain wall or a sheet, and keep other objects out of the frame.',
    });
  return out;
}

/**
 * Tilt of the floor line under a piece, in degrees (positive when it falls to the right), from the lowest
 * object pixel in each column. Null when too few columns reach the bottom to judge.
 */
export function floorTiltDegrees(mask, width, height, bounds = maskBounds(mask, width, height)) {
  if (!bounds) return null;
  const low = [];
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let y = bounds.maxY; y >= bounds.minY; y--) {
      if (mask[y * width + x]) {
        low.push([x, y]);
        break;
      }
    }
  }
  // Only columns that stand on the floor: legs and feet, not an arch or a raised middle
  const floor = low.filter(([, y]) => y >= bounds.maxY - bounds.height * 0.1);
  if (floor.length < Math.max(6, bounds.width * 0.25)) return null;
  const mx = floor.reduce((a, [x]) => a + x, 0) / floor.length;
  const my = floor.reduce((a, [, y]) => a + y, 0) / floor.length;
  let num = 0;
  let den = 0;
  for (const [x, y] of floor) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  if (den < 1) return null;
  // The span the line was fitted over must be wide enough for the angle to mean something
  const xs = floor.map(([x]) => x);
  if ((Math.max(...xs) - Math.min(...xs)) / bounds.width < 0.4) return null;
  return (Math.atan(num / den) * 180) / Math.PI;
}

// ---------- size correction against a photo ----------

/** Which of the three sizes runs across the picture and which up it, for each photo angle. */
export const VIEW_AXES = {
  front: { across: 'widthCm', up: 'heightCm', along: 'depthCm' },
  back: { across: 'widthCm', up: 'heightCm', along: 'depthCm' },
  right: { across: 'depthCm', up: 'heightCm', along: 'widthCm' },
  left: { across: 'depthCm', up: 'heightCm', along: 'widthCm' },
  top: { across: 'widthCm', up: 'depthCm', along: 'heightCm' },
};

const clampCm = (v) => Math.min(600, Math.max(5, Math.round(v)));

/** Width over height of the cut-out piece in a photo, or null when nothing was cut out. */
export function photoAspect(mask, width, height) {
  const b = maskBounds(mask, width, height);
  return b ? b.width / b.height : null;
}

/** Crops a mask to the piece and resamples it to a square grid (the same stretch the analysis uses). */
export function normalizeMask(mask, width, height, size = 64) {
  const b = maskBounds(mask, width, height);
  if (!b) return null;
  const out = new Uint8Array(size * size);
  for (let v = 0; v < size; v++) {
    const sy = Math.min(b.maxY, b.minY + Math.floor(((v + 0.5) / size) * b.height));
    for (let u = 0; u < size; u++) {
      const sx = Math.min(b.maxX, b.minX + Math.floor(((u + 0.5) / size) * b.width));
      out[v * size + u] = mask[sy * width + sx] ? 1 : 0;
    }
  }
  return {
    mask: out,
    size,
    // The bounds as a share of the whole frame
    frac: { w: b.width / width, h: b.height / height },
  };
}

/** Share of the two silhouettes that overlap (intersection over union), for masks of equal size. */
export function silhouetteOverlap(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) both++;
    if (a[i] || b[i]) either++;
  }
  return either ? both / either : 0;
}

/**
 * How well a model's silhouette matches the photo's, 0-1: the overlap of the two shapes (each stretched to its
 * own bounds) times how close their proportions are.
 * @param {{mask: Uint8Array, size: number, frac: {w:number, h:number}}} model silhouette of the model, from normalizeMask
 * @param {{mask: Uint8Array, size: number}} photo silhouette of the cut-out
 * @param {number} modelAspect width over height of the model's silhouette bounds
 * @param {number} photoAspectRatio width over height of the cut-out bounds
 */
export function fitScore(model, photo, modelAspect, photoAspectRatio) {
  const overlap = silhouetteOverlap(model?.mask, photo?.mask);
  const ratio =
    modelAspect > 0 && photoAspectRatio > 0
      ? Math.min(modelAspect, photoAspectRatio) / Math.max(modelAspect, photoAspectRatio)
      : 0;
  return { score: overlap * ratio, overlap, ratio };
}

/** A word and a tone for a fit score. */
export function describeFit(score) {
  if (score >= 0.85) return { level: 'good', label: 'Close match' };
  if (score >= 0.7) return { level: 'fair', label: 'Fairly close' };
  return { level: 'poor', label: 'Noticeably different' };
}

/**
 * The sizes that make the model's silhouette bounds the same proportions as the photo's cut-out.
 * Of the two sizes the photo shows, the one the user set last (`anchor`) is kept and the other follows.
 * @param {{widthCm:number, depthCm:number, heightCm:number}} dims
 * @param {string} view photo angle
 * @param {number} aspect width over height of the cut-out in the photo
 * @param {{w:number, h:number}} frac the model's silhouette bounds as a share of its size box (1, 1 for a full box)
 * @param {string} [anchor] the size to keep
 */
export function matchPhotoDims(dims, view, aspect, frac = { w: 1, h: 1 }, anchor = 'widthCm') {
  const axes = VIEW_AXES[view];
  if (!axes || !(aspect > 0)) return dims;
  const fw = frac.w > 0.05 ? frac.w : 1;
  const fh = frac.h > 0.05 ? frac.h : 1;
  // (across * fw) / (up * fh) = aspect
  const keep = anchor === axes.up ? axes.up : anchor === axes.across ? axes.across : null;
  const out = { ...dims };
  if (keep === axes.up || (keep === null && view !== 'top')) {
    out[axes.across] = clampCm((dims[axes.up] * fh * aspect) / fw);
  } else {
    out[axes.up] = clampCm((dims[axes.across] * fw) / (aspect * fh));
  }
  return out;
}

/** Which size to nudge, and which way, to bring a model closer to a photo (for the plain-language hint). */
export function fitHint(view, modelAspect, photoAspectRatio) {
  const axes = VIEW_AXES[view];
  if (!axes || !(modelAspect > 0) || !(photoAspectRatio > 0)) return null;
  const k = modelAspect / photoAspectRatio;
  if (k > 0.92 && k < 1.08) return null;
  const names = { widthCm: 'width', depthCm: 'depth', heightCm: 'height' };
  const across = names[axes.across];
  const up = names[axes.up];
  return k > 1
    ? `The model looks wider than your photo: try a smaller ${across} or a larger ${up}.`
    : `The model looks narrower than your photo: try a larger ${across} or a smaller ${up}.`;
}

/** Binary silhouette from RGBA render pixels, bottom row first as WebGL returns them. */
export function silhouetteFromRender(pixels, width, height, threshold = 96) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const i = (srcRow * width + x) * 4;
      mask[y * width + x] = pixels[i] > threshold ? 1 : 0;
    }
  }
  return mask;
}
