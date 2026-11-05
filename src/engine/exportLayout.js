/**
 * exportLayout.js
 * Pure helpers for printed plans: choosing a drawing scale, sizing the raster, file names,
 * title block wording, text fitting and label placement. Nothing here touches the DOM, so
 * the numbers can be tested without a browser.
 */

export const SANS = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
export const SERIF = "Georgia, 'Times New Roman', serif";

export const STANDARD_SCALES = [10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000];
export const A3_CM = { w: 42, h: 29.7 };
const PAGE_MARGIN_CM = 1.5;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatPlanDate(date = new Date()) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export const fmtMetres = (cm) => `${(cm / 100).toFixed(2)} m`;
export const sizeText = (widthCm, depthCm) =>
  `${(widthCm / 100).toFixed(2)} × ${(depthCm / 100).toFixed(2)} m`;
export const areaText = (areaCm2) => `${(areaCm2 / 10000).toFixed(1)} m²`;

/**
 * Smallest standard scale (1:N) at which a drawing of the given size fits an A3 sheet,
 * with the orientation that suits its shape.
 * @param {number} widthU - drawing width in cm of real space
 * @param {number} heightU - drawing height in cm of real space
 */
export function chooseScale(widthU, heightU) {
  const landscape = widthU >= heightU;
  const page = landscape ? A3_CM : { w: A3_CM.h, h: A3_CM.w };
  const usableW = page.w - PAGE_MARGIN_CM * 2;
  const usableH = page.h - PAGE_MARGIN_CM * 2;
  let denominator = STANDARD_SCALES.find((n) => widthU / n <= usableW && heightU / n <= usableH);
  if (!denominator) denominator = Math.ceil(Math.max(widthU / usableW, heightU / usableH));
  return {
    denominator,
    label: `1:${denominator}`,
    orientation: landscape ? 'landscape' : 'portrait',
    pageCm: page,
    drawCm: { w: widthU / denominator, h: heightU / denominator },
  };
}

/**
 * Pixel size of the raster for a drawing, aiming for a crisp long edge while keeping the
 * total pixel count (and any single edge) within what a canvas can hold.
 */
export function rasterSize(widthU, heightU, opts = {}) {
  const { targetLongEdge = 3200, maxPixels = 16_000_000, maxEdge = 8192 } = opts;
  const w = Math.max(1, widthU);
  const h = Math.max(1, heightU);
  let scale = targetLongEdge / Math.max(w, h);
  if (w * h * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (w * h));
  scale = Math.min(scale, maxEdge / Math.max(w, h));
  return {
    scale,
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

/** A name that is safe in a file name. */
export function safeBaseName(name, fallback = 'Plan') {
  const safe = String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return safe || fallback;
}

/** "2026-11-05" for a date, in local time. */
export function dateStamp(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** A download name such as "Living_room-floorplan.png", or "Living_room-floorplan-2026-11-05.png" with a date. */
export function exportFileName(name, kind, ext, fallback = 'Plan', date = null) {
  const stamp = date ? `-${dateStamp(date)}` : '';
  return `${safeBaseName(name, fallback)}-${kind}${stamp}.${ext}`;
}

/** Rough text width in drawing units when no real measurement is available. */
export function estimateTextWidth(text, fontSize, weight = 400) {
  const factor = Number(weight) >= 600 ? 0.6 : 0.55;
  return String(text).length * fontSize * factor;
}

/** Shortens text with an ellipsis until it fits a width. */
export function fitText(text, maxWidth, measure) {
  const s = String(text);
  if (measure(s) <= maxWidth) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(`${s.slice(0, mid).trimEnd()}…`) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo <= 0 ? '…' : `${s.slice(0, lo).trimEnd()}…`;
}

/** Words for the title block. */
export function titleBlockText({
  kind,
  name,
  widthCm,
  depthCm,
  areaCm2,
  levelName,
  rooms,
  scale,
  date = new Date(),
}) {
  const title = (name || '').trim() || (kind === 'flat' ? 'Flat plan' : 'Room plan');
  const bits = [];
  if (kind === 'flat') {
    if (levelName) bits.push(levelName);
    if (rooms !== undefined) bits.push(`${rooms} ${rooms === 1 ? 'room' : 'rooms'}`);
    bits.push(areaText(areaCm2));
  } else {
    bits.push(sizeText(widthCm, depthCm), areaText(areaCm2));
  }
  return {
    title,
    subtitle: bits.join('  ·  '),
    right: [
      `Scale ${scale.label} on ${scale.orientation === 'landscape' ? 'A3' : 'A3 portrait'}`,
      formatPlanDate(date),
    ],
    footer: 'Room Designer Studio',
  };
}

const overlaps = (a, b, pad = 2) =>
  !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );

/** The box a label of a given text occupies when centred at (x, y). */
const boxAt = (x, y, w, h) => ({ x: x - w / 2, y: y - h / 2, w, h });

/** Space inside a placed piece that horizontal text can use. */
function innerBox(piece) {
  const rot = ((Math.round(piece.rotationDeg || 0) % 360) + 360) % 360;
  const nearly = (a) => Math.abs(rot - a) <= 4 || Math.abs(rot - a - 360) <= 4;
  if (nearly(0) || nearly(180)) return { w: piece.widthCm, h: piece.depthCm };
  if (nearly(90) || nearly(270)) return { w: piece.depthCm, h: piece.widthCm };
  const s = Math.min(piece.widthCm, piece.depthCm) * 0.7;
  return { w: s, h: s };
}

/**
 * Decides where the name of every piece goes. A name that fits inside its piece is written
 * there; otherwise the piece gets a numbered badge and the name goes in the legend. No two
 * labels or badges overlap.
 * @param {Array<{ id, name, x, y, widthCm, depthCm, rotationDeg? }>} pieces
 * @returns {{ labels: Array, legend: Array<{ n: number, name: string }> }}
 */
export function placePieceLabels(pieces, { fontSize, measure, bounds }) {
  const taken = [];
  const labels = [];
  const legend = [];
  const textH = fontSize * 1.25;
  const badgeR = fontSize * 0.95;
  const free = (box) => !taken.some((t) => overlaps(box, t));
  const inside = (box) =>
    !bounds ||
    (box.x >= bounds.x0 &&
      box.y >= bounds.y0 &&
      box.x + box.w <= bounds.x1 &&
      box.y + box.h <= bounds.y1);

  // Large pieces first so a small one next to a big one does not steal its label spot
  const order = [...pieces].sort((a, b) => b.widthCm * b.depthCm - a.widthCm * a.depthCm);
  for (const piece of order) {
    const textW = measure(piece.name);
    const room = innerBox(piece);
    if (textW + 6 <= room.w && textH + 2 <= room.h) {
      const box = boxAt(piece.x, piece.y, textW, textH);
      if (free(box)) {
        taken.push(box);
        labels.push({ id: piece.id, kind: 'text', x: piece.x, y: piece.y, text: piece.name });
        continue;
      }
    }
    const n = legend.length + 1;
    const reach = Math.hypot(piece.widthCm, piece.depthCm) / 2 + badgeR + 3;
    const candidates = [{ x: piece.x, y: piece.y }];
    for (let ring = 0; ring < 3; ring++) {
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4 - Math.PI / 2;
        const r = reach + ring * badgeR * 2.2;
        candidates.push({ x: piece.x + Math.cos(ang) * r, y: piece.y + Math.sin(ang) * r });
      }
    }
    let spot = candidates.find((c) => {
      const box = boxAt(c.x, c.y, badgeR * 2, badgeR * 2);
      return free(box) && inside(box);
    });
    const leader = !!spot && (spot.x !== piece.x || spot.y !== piece.y);
    if (!spot) spot = candidates[0];
    taken.push(boxAt(spot.x, spot.y, badgeR * 2, badgeR * 2));
    labels.push({
      id: piece.id,
      kind: 'badge',
      n,
      x: spot.x,
      y: spot.y,
      anchorX: piece.x,
      anchorY: piece.y,
      leader,
      r: badgeR,
    });
    legend.push({ n, name: piece.name, id: piece.id });
  }
  // Number badges in reading order: top to bottom, left to right
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const ranked = [...legend].sort((a, b) => {
    const pa = byId.get(a.id);
    const pb = byId.get(b.id);
    return pa.y - pb.y || pa.x - pb.x;
  });
  const renumber = new Map(ranked.map((e, i) => [e.n, i + 1]));
  for (const l of labels) if (l.kind === 'badge') l.n = renumber.get(l.n);
  for (const e of legend) e.n = renumber.get(e.n);
  legend.sort((a, b) => a.n - b.n);
  return { labels, legend };
}

/** Rows and columns for a legend that has to fit a width. */
export function legendGrid(entries, availableWidth, { fontSize, measure }) {
  if (entries.length === 0) return { cols: 0, rows: 0, colWidth: 0, lineHeight: 0, height: 0 };
  const lineHeight = fontSize * 1.7;
  const colWidth = Math.min(
    availableWidth,
    Math.max(...entries.map((e) => measure(`${e.n}  ${e.name}`))) + fontSize * 2
  );
  const cols = Math.max(1, Math.floor(availableWidth / colWidth));
  const rows = Math.ceil(entries.length / cols);
  return { cols, rows, colWidth, lineHeight, height: rows * lineHeight };
}

/** A round scale bar length (cm) that is about a fifth of the drawing width. */
export function scaleBarLength(widthU) {
  const target = widthU / 5;
  const options = [50, 100, 200, 250, 500, 1000, 2000];
  let best = options[0];
  for (const o of options) if (o <= target * 1.4) best = o;
  return best;
}

const PT_PER_CM = 72 / 2.54;

/** PDF page (A3) and the size a sheet is drawn at so that it prints at its stated scale. */
export function pdfLayout(sheetWidthU, sheetHeightU, scale) {
  const landscape = scale.orientation === 'landscape';
  const pageWidthPt = Math.round((landscape ? A3_CM.w : A3_CM.h) * PT_PER_CM);
  const pageHeightPt = Math.round((landscape ? A3_CM.h : A3_CM.w) * PT_PER_CM);
  return {
    pageWidthPt,
    pageHeightPt,
    drawWidthPt: (sheetWidthU / scale.denominator) * PT_PER_CM,
    drawHeightPt: (sheetHeightU / scale.denominator) * PT_PER_CM,
  };
}
