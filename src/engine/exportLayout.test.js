import { describe, it, expect } from 'vitest';
import {
  chooseScale,
  rasterSize,
  exportFileName,
  safeBaseName,
  formatPlanDate,
  titleBlockText,
  fitText,
  estimateTextWidth,
  placePieceLabels,
  legendGrid,
  scaleBarLength,
  pdfLayout,
  sizeText,
  areaText,
} from './exportLayout.js';
import { buildRoomSheet, buildFlatSheet } from './sheetModel.js';
import { FURNITURE_CATALOG } from '../data/furnitureCatalog.js';
import { buildPresetFlat } from './flatPresets.js';
import { jpegToPdf } from './pdf.js';

const measure = (t, size, weight) => estimateTextWidth(t, size, weight);

describe('scale and raster size', () => {
  it('picks the smallest standard scale that fits an A3 sheet', () => {
    expect(chooseScale(600, 400).label).toBe('1:20');
    expect(chooseScale(1100, 750).label).toBe('1:50');
    expect(chooseScale(600, 400).orientation).toBe('landscape');
    expect(chooseScale(400, 900).orientation).toBe('portrait');
    // whatever scale is chosen, the drawing fits the page margins
    for (const [w, h] of [
      [300, 300],
      [1283, 1120],
      [5000, 2500],
      [2400, 3600],
    ]) {
      const s = chooseScale(w, h);
      expect(s.drawCm.w).toBeLessThanOrEqual(s.pageCm.w - 3 + 1e-9);
      expect(s.drawCm.h).toBeLessThanOrEqual(s.pageCm.h - 3 + 1e-9);
    }
  });

  it('sizes the raster to a crisp long edge and caps the pixel count', () => {
    const r = rasterSize(1000, 800);
    expect(r.width).toBe(3200);
    expect(r.height).toBe(2560);
    const huge = rasterSize(4000, 4000, { targetLongEdge: 9000 });
    expect(huge.width * huge.height).toBeLessThanOrEqual(16_000_000 + 4000);
    const thin = rasterSize(9000, 100, { targetLongEdge: 20000, maxPixels: 1e9 });
    expect(thin.width).toBeLessThanOrEqual(8192);
    expect(rasterSize(0, 0).width).toBeGreaterThan(0);
  });
});

describe('names, dates and wording', () => {
  it('builds safe file names', () => {
    expect(exportFileName('Living room', 'floorplan', 'png')).toBe('Living_room-floorplan.png');
    expect(exportFileName('  Flat: 2BHK / "Ground"  ', 'floorplan', 'pdf')).toBe(
      'Flat_2BHK_Ground-floorplan.pdf'
    );
    expect(exportFileName('', 'floorplan', 'png', 'Room')).toBe('Room-floorplan.png');
    expect(exportFileName('../../evil', 'x', 'png')).not.toContain('/');
    expect(safeBaseName('Café room', 'Plan')).toBe('Caf_room');
  });

  it('formats the date without locale surprises', () => {
    expect(formatPlanDate(new Date(2026, 10, 4))).toBe('4 November 2026');
    expect(formatPlanDate(new Date(2027, 0, 31))).toBe('31 January 2027');
  });

  it('words the title block for a room and a flat', () => {
    const scale = chooseScale(600, 400);
    const date = new Date(2026, 10, 4);
    const room = titleBlockText({
      kind: 'room',
      name: 'Bedroom',
      widthCm: 400,
      depthCm: 350,
      areaCm2: 140000,
      scale,
      date,
    });
    expect(room.title).toBe('Bedroom');
    expect(room.subtitle).toContain('4.00 × 3.50 m');
    expect(room.subtitle).toContain('14.0 m²');
    expect(room.right).toEqual(['Scale 1:20 on A3', '4 November 2026']);
    const flat = titleBlockText({
      kind: 'flat',
      name: '',
      levelName: 'Ground floor',
      rooms: 8,
      areaCm2: 658000,
      scale,
      date,
    });
    expect(flat.title).toBe('Flat plan');
    expect(flat.subtitle).toContain('Ground floor');
    expect(flat.subtitle).toContain('8 rooms');
    expect(flat.subtitle).toContain('65.8 m²');
    expect(titleBlockText({ kind: 'flat', rooms: 1, areaCm2: 0, scale }).subtitle).toContain(
      '1 room '
    );
    expect(sizeText(520, 340)).toBe('5.20 × 3.40 m');
    expect(areaText(123456)).toBe('12.3 m²');
  });

  it('shortens text to fit a width', () => {
    const m = (t) => measure(t, 10);
    expect(fitText('Short', 200, m)).toBe('Short');
    const cut = fitText('A very long room name that cannot fit', 80, m);
    expect(cut.endsWith('…')).toBe(true);
    expect(m(cut)).toBeLessThanOrEqual(80);
    expect(fitText('Anything', 2, m)).toBe('…');
  });

  it('chooses round scale bar lengths', () => {
    expect(scaleBarLength(600)).toBe(100);
    expect(scaleBarLength(1200)).toBe(250);
    expect(scaleBarLength(100)).toBe(50);
  });
});

describe('label placement', () => {
  const piece = (id, name, x, y, w, d, rot = 0) => ({
    id,
    name,
    x,
    y,
    widthCm: w,
    depthCm: d,
    rotationDeg: rot,
  });
  const fontSize = 10;
  const m = (t) => measure(t, fontSize, 500);

  it('writes a name inside a piece that is big enough and badges the rest', () => {
    const { labels, legend } = placePieceLabels(
      [
        piece('sofa', '3-Seater Sofa', 200, 200, 220, 90),
        piece('lamp', 'Floor Lamp', 40, 40, 30, 30),
      ],
      { fontSize, measure: m }
    );
    expect(labels.find((l) => l.id === 'sofa').kind).toBe('text');
    expect(labels.find((l) => l.id === 'lamp').kind).toBe('badge');
    expect(legend).toEqual([{ n: 1, name: 'Floor Lamp', id: 'lamp' }]);
  });

  it('turns the available space with the piece', () => {
    const wide = piece('a', 'Long Piece Name', 100, 100, 150, 30, 0);
    const turned = piece('b', 'Long Piece Name', 100, 100, 150, 30, 90);
    expect(placePieceLabels([wide], { fontSize, measure: m }).labels[0].kind).toBe('text');
    expect(placePieceLabels([turned], { fontSize, measure: m }).labels[0].kind).toBe('badge');
  });

  it('keeps text labels clear of each other and of badges', () => {
    const pieces = [];
    for (let i = 0; i < 12; i++)
      pieces.push(
        piece(
          `p${i}`,
          `Piece number ${i}`,
          120 + (i % 3) * 80,
          100 + Math.floor(i / 3) * 40,
          78,
          38
        )
      );
    const { labels } = placePieceLabels(pieces, {
      fontSize,
      measure: m,
      bounds: { x0: 0, y0: 0, x1: 500, y1: 400 },
    });
    const boxes = labels.map((l) =>
      l.kind === 'text'
        ? { x: l.x - m(l.text) / 2, y: l.y - 6, w: m(l.text), h: 12 }
        : { x: l.x - l.r, y: l.y - l.r, w: l.r * 2, h: l.r * 2 }
    );
    for (let a = 0; a < boxes.length; a++)
      for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a];
        const B = boxes[b];
        const clash = !(
          A.x + A.w <= B.x ||
          B.x + B.w <= A.x ||
          A.y + A.h <= B.y ||
          B.y + B.h <= A.y
        );
        expect(clash).toBe(false);
      }
  });

  it('numbers the key in reading order', () => {
    const { legend, labels } = placePieceLabels(
      [piece('low', 'Low', 100, 300, 20, 20), piece('high', 'High', 100, 50, 20, 20)],
      { fontSize, measure: m }
    );
    expect(legend.map((e) => e.name)).toEqual(['High', 'Low']);
    expect(labels.find((l) => l.id === 'high').n).toBe(1);
  });

  it('lays a legend out in columns that fit the width', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({ n: i + 1, name: `Item ${i + 1}` }));
    const g = legendGrid(entries, 600, { fontSize: 10, measure: m });
    expect(g.cols * g.colWidth).toBeLessThanOrEqual(600);
    expect(g.rows).toBe(Math.ceil(10 / g.cols));
    expect(legendGrid([], 600, { fontSize: 10, measure: m }).height).toBe(0);
  });
});

describe('PDF page layout', () => {
  it('keeps the drawn size at true scale on an A3 page', () => {
    const scale = chooseScale(1283, 1120);
    const l = pdfLayout(1283, 1120, scale);
    expect(l.pageWidthPt).toBe(1191);
    expect(l.pageHeightPt).toBe(842);
    expect(l.drawWidthPt).toBeLessThanOrEqual(l.pageWidthPt);
    expect(l.drawHeightPt).toBeLessThanOrEqual(l.pageHeightPt);
    expect(l.drawWidthPt / (72 / 2.54)).toBeCloseTo(1283 / scale.denominator, 4);
  });

  it('writes the page size it is given', () => {
    const l = pdfLayout(500, 700, chooseScale(500, 700));
    const pdf = jpegToPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 200, 300, l);
    const text = new TextDecoder('latin1').decode(pdf);
    expect(text).toContain(`/MediaBox [0 0 ${l.pageWidthPt} ${l.pageHeightPt}]`);
    expect(l.pageWidthPt).toBeLessThan(l.pageHeightPt);
  });
});

describe('room sheet model', () => {
  const P = (id, t, x, y, r = 0) => ({ id, furnitureTypeId: t, x, y, rotationDeg: r });

  it('lays out a furnished room with finite numbers and a title block inside the sheet', () => {
    const room = {
      name: 'Studio',
      widthCm: 560,
      depthCm: 440,
      doors: [{ id: 'd', wall: 'right', offsetCm: 300, widthCm: 80, swingDirection: 'outward' }],
      windows: [{ id: 'w', wall: 'top', offsetCm: 200, widthCm: 180 }],
      placedFurniture: [P('a', 'bed-queen', 100, 110), P('b', 'sofa-3seat', 300, 330)],
    };
    const model = buildRoomSheet(room, { date: new Date(2026, 10, 4) });
    expect(JSON.stringify(model)).not.toMatch(/NaN|Infinity/);
    expect(model.pieces).toHaveLength(2);
    expect(model.dims.top).toBe('5.60 m (560 cm)');
    const tb = model.titleBlock;
    expect(tb.title).toBe('Studio');
    expect(tb.y + tb.h).toBeLessThanOrEqual(model.height);
    expect(tb.x + tb.w).toBeLessThanOrEqual(model.width);
    expect(model.ox - model.dims.offset - 20).toBeGreaterThan(0);
    expect(model.scale.label).toMatch(/^1:\d+$/);
  });

  it('copes with an empty room and unknown furniture', () => {
    const model = buildRoomSheet({
      name: '',
      widthCm: 300,
      depthCm: 300,
      placedFurniture: [P('x', 'nope', 10, 10)],
    });
    expect(model.pieces).toHaveLength(0);
    expect(model.titleBlock.title).toBe('Room plan');
    expect(model.key).toBeNull();
  });

  it('draws every catalog item without losing a label', () => {
    let x = 20;
    let y = 20;
    let rowH = 0;
    const placed = [];
    for (const it of FURNITURE_CATALOG) {
      if (x + it.widthCm + 20 > 2000) {
        x = 20;
        y += rowH + 25;
        rowH = 0;
      }
      placed.push(P(`p-${it.id}`, it.id, x + it.widthCm / 2, y + it.depthCm / 2));
      x += it.widthCm + 25;
      rowH = Math.max(rowH, it.depthCm);
    }
    const model = buildRoomSheet({
      name: 'All',
      widthCm: 2000,
      depthCm: y + rowH + 20,
      placedFurniture: placed,
    });
    expect(model.pieces).toHaveLength(FURNITURE_CATALOG.length);
    expect(model.labels).toHaveLength(FURNITURE_CATALOG.length);
    const badges = model.labels.filter((l) => l.kind === 'badge');
    expect(model.key.entries).toHaveLength(badges.length);
    expect(new Set(badges.map((b) => b.n)).size).toBe(badges.length);
    expect(JSON.stringify(model)).not.toContain('NaN');
  });
});

describe('flat sheet model', () => {
  it('lays out a 2BHK floor with its rooms, openings and key', () => {
    const { flat, rooms } = buildPresetFlat('2bhk', { name: 'My 2BHK' });
    const model = buildFlatSheet(flat, rooms, flat.levels[0].id, { date: new Date(2026, 10, 4) });
    expect(JSON.stringify(model)).not.toMatch(/NaN|Infinity/);
    expect(model.spaces).toHaveLength(8);
    expect(model.roomLabels).toHaveLength(8);
    expect(model.openings.length).toBeGreaterThan(8);
    expect(model.pieces.length).toBeGreaterThan(0);
    expect(model.kindKey.entries.map((e) => e.kind)).toContain('passage');
    expect(model.titleBlock.title).toBe('My 2BHK');
    expect(model.titleBlock.subtitle).toContain('Ground floor');
    expect(model.titleBlock.subtitle).toContain('8 rooms');
    expect(model.empty).toBe(false);
    expect(model.ox + model.box.x0).toBeGreaterThan(0);
    expect(model.oy + model.box.y1).toBeLessThan(model.titleBlock.y);
  });

  it('keeps room names inside their rooms by shrinking or wrapping them', () => {
    const { flat, rooms } = buildPresetFlat('2bhk', {});
    const model = buildFlatSheet(flat, rooms, flat.levels[0].id);
    for (const l of model.roomLabels) {
      const space = flat.spaces.find((s) => s.id === l.id);
      const widest = Math.max(...l.lines.map((t) => measure(t, l.font, 700)));
      expect(widest).toBeLessThanOrEqual(space.widthCm);
    }
  });

  it('exports an empty floor as a sheet with a note', () => {
    const { flat, rooms } = buildPresetFlat('blank', {});
    const model = buildFlatSheet(flat, rooms, flat.levels[0].id);
    expect(model.empty).toBe(true);
    expect(model.titleBlock.subtitle).toContain('0 rooms');
  });
});
