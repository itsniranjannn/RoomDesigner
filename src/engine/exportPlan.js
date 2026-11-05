/**
 * exportPlan.js
 * Exports a room or one floor of a flat as a PNG or a PDF.
 *
 * The picture is not redrawn by a second drawing routine. A sheet model (sheetModel.js) is
 * turned into a standalone SVG by the same plan symbols the editor uses (PlanSheets.jsx,
 * react-dom/server), and that SVG is rasterised on a canvas. Everything in the SVG is drawn
 * with plain attributes and system fonts, so nothing depends on the page's CSS.
 */

import { createElement } from 'react';
import { jpegToPdf } from './pdf.js';
import { roomToJson } from './share.js';
import {
  SANS,
  SERIF,
  exportFileName,
  safeBaseName,
  pdfLayout,
  rasterSize,
  dateStamp,
} from './exportLayout.js';
import { capture3D } from './snapshot3d.js';
import { normalizeRenderPrefs } from './renderSettings.js';
import { buildRoomSheet, buildFlatSheet, estimateMeasure } from './sheetModel.js';

/** Text measurement with the same fonts the sheet uses; falls back to an estimate. */
function createMeasure() {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return estimateMeasure;
    return (text, size, weight = 400, family = SANS) => {
      ctx.font = `${weight} ${size}px ${family === SERIF ? SERIF : SANS}`;
      return ctx.measureText(String(text)).width;
    };
  } catch {
    return estimateMeasure;
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** The standalone SVG markup of a sheet model, sized for the raster it will become. */
export async function sheetToSvg(model, opts = {}) {
  const [{ renderToStaticMarkup }, { PlanSheet }] = await Promise.all([
    import('react-dom/server'),
    import('../components/export/PlanSheets.jsx'),
  ]);
  const size = rasterSize(model.width, model.height, opts);
  const markup = renderToStaticMarkup(
    createElement(PlanSheet, { model, width: size.width, height: size.height })
  );
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`, ...size };
}

/** Draws an SVG string onto a canvas of the given pixel size. */
export async function svgToCanvas(svg, width, height) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('The plan could not be drawn.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not create a drawing surface.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FAF8F3';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function render(model) {
  const { svg, width, height } = await sheetToSvg(model);
  const canvas = await svgToCanvas(svg, width, height);
  return { model, svg, canvas, width, height };
}

/** Renders a room's sheet. Returns { model, svg, canvas, width, height }. */
export async function renderRoomPlan(room, date = new Date()) {
  if (!room) throw new Error('There is no room to export.');
  return render(buildRoomSheet(room, { measure: createMeasure(), date }));
}

/** Renders one floor of a flat. Returns { model, svg, canvas, width, height }. */
export async function renderFlatPlan(flat, rooms, levelId, date = new Date()) {
  if (!flat) throw new Error('There is no flat to export.');
  return render(buildFlatSheet(flat, rooms, levelId, { measure: createMeasure(), date }));
}

async function toPng(rendered) {
  const blob = await canvasToBlob(rendered.canvas, 'image/png');
  if (!blob) throw new Error('The picture could not be saved.');
  return blob;
}

async function toPdf(rendered) {
  const blob = await canvasToBlob(rendered.canvas, 'image/jpeg', 0.94);
  if (!blob) throw new Error('The plan could not be saved.');
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const { model, width, height } = rendered;
  const layout = pdfLayout(model.width, model.height, model.scale);
  return new Blob([jpegToPdf(jpeg, width, height, layout)], { type: 'application/pdf' });
}

export async function exportRoomPlanAsPNG(room) {
  const rendered = await renderRoomPlan(room);
  const name = exportFileName(room.name, 'floorplan', 'png', 'Room', new Date());
  downloadBlob(await toPng(rendered), name);
  return name;
}

export async function exportRoomPlanAsPDF(room) {
  const rendered = await renderRoomPlan(room);
  const name = exportFileName(room.name, 'floorplan', 'pdf', 'Room', new Date());
  downloadBlob(await toPdf(rendered), name);
  return name;
}

function flatPlanName(flat, levelId) {
  const level = flat.levels.find((l) => l.id === levelId) || flat.levels[0];
  const multi = flat.levels.length > 1;
  return multi ? `${flat.name}-${level.name}` : flat.name;
}

export async function exportFlatPlanAsPNG(flat, rooms, levelId) {
  const rendered = await renderFlatPlan(flat, rooms, levelId);
  const name = exportFileName(flatPlanName(flat, levelId), 'floorplan', 'png', 'Flat', new Date());
  downloadBlob(await toPng(rendered), name);
  return name;
}

export async function exportFlatPlanAsPDF(flat, rooms, levelId) {
  const rendered = await renderFlatPlan(flat, rooms, levelId);
  const name = exportFileName(flatPlanName(flat, levelId), 'floorplan', 'pdf', 'Flat', new Date());
  downloadBlob(await toPdf(rendered), name);
  return name;
}

/** The current 3D view of a room as a PNG at twice the screen size, under a title strip. */
export async function exportRoom3DAsPNG(room) {
  const date = new Date();
  const { blob } = await capture3D({
    title: room.name || 'Room',
    subtitle: `3D view  ·  ${dateStamp(date)}`,
  });
  const name = exportFileName(room.name, '3d', 'png', 'Room', date);
  downloadBlob(blob, name);
  return name;
}

/** The current 3D view of a flat (the floors shown on screen) as a PNG under a title strip. */
export async function exportFlat3DAsPNG(flat, levelId) {
  const date = new Date();
  const level = flat.levels.find((l) => l.id === levelId) || flat.levels[0];
  const { blob } = await capture3D({
    title: flat.name || 'Flat',
    subtitle: `3D view${flat.levels.length > 1 ? `, up to ${level.name}` : ''}  ·  ${dateStamp(date)}`,
  });
  const name = exportFileName(flatPlanName(flat, levelId), '3d', 'png', 'Flat', date);
  downloadBlob(blob, name);
  return name;
}

/**
 * A high-resolution render of the current 3D view of a room: antialiased, large shadow maps, up to 4096 px
 * wide. `prefs` = { size, background, titleBlock } (see renderSettings.js); `onProgress(text)` reports steps.
 */
export async function exportRoomRenderAsPNG(room, prefs = {}, onProgress = () => {}) {
  const date = new Date();
  const p = normalizeRenderPrefs(prefs);
  const { blob } = await capture3D({
    title: room.name || 'Room',
    subtitle: `Render  ·  ${dateStamp(date)}`,
    ...p,
    highQuality: true,
    compact: true,
    onProgress,
  });
  const name = exportFileName(room.name, 'render', 'png', 'Room', date);
  downloadBlob(blob, name);
  return name;
}

/** A high-resolution render of the current 3D view of a flat (the floors shown on screen). */
export async function exportFlatRenderAsPNG(flat, levelId, prefs = {}, onProgress = () => {}) {
  const date = new Date();
  const p = normalizeRenderPrefs(prefs);
  const level = flat.levels.find((l) => l.id === levelId) || flat.levels[0];
  const { blob } = await capture3D({
    title: flat.name || 'Flat',
    subtitle: `Render${flat.levels.length > 1 ? `, up to ${level.name}` : ''}  ·  ${dateStamp(date)}`,
    ...p,
    highQuality: true,
    compact: true,
    onProgress,
  });
  const name = exportFileName(flatPlanName(flat, levelId), 'render', 'png', 'Flat', date);
  downloadBlob(blob, name);
  return name;
}

export function exportRoomAsJSON(room) {
  downloadBlob(
    new Blob([roomToJson(room)], { type: 'application/json' }),
    `${safeBaseName(room.name, 'Room')}.room.json`
  );
}

export { toPng as renderedToPngBlob, toPdf as renderedToPdfBlob };
