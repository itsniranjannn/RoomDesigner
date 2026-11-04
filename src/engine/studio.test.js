import { describe, it, expect } from 'vitest';
import { evaluateClearance, getClearanceZones } from './clearance.js';
import { suggestLayout } from './layout.js';
import { evaluateAllCollisions } from './collision.js';
import { encodeRoomToHash, decodeRoomFromHash, sanitizeImportedRoom } from './share.js';
import { getWallDistances, formatCm } from './measure.js';
import { jpegToPdf } from './pdf.js';
import { getWalkStart, buildBlockers, isBlocked } from './walk.js';
import { resolveItemDef, registerCustomFurniture, getFurnitureType } from '../data/furnitureCatalog.js';

const room = {
  id: 'r1',
  name: 'Test',
  widthCm: 520,
  depthCm: 420,
  doors: [{ id: 'd1', wall: 'bottom', offsetCm: 60, widthCm: 90, swingDirection: 'inward-left' }],
  windows: [{ id: 'w1', wall: 'top', offsetCm: 190, widthCm: 140 }],
  placedFurniture: [],
};

describe('overrides and custom furniture', () => {
  it('applies per-item overrides over the catalog definition', () => {
    const def = resolveItemDef({ furnitureTypeId: 'bed-queen', overrides: { widthCm: 200, color: '#112233' } });
    expect(def.widthCm).toBe(200);
    expect(def.color).toBe('#112233');
    expect(def.depthCm).toBeGreaterThan(0);
  });

  it('resolves registered custom furniture', () => {
    registerCustomFurniture({ id: 'custom-x', name: 'X', widthCm: 50, depthCm: 40, heightCm: 60, color: '#999' });
    expect(getFurnitureType('custom-x').category).toBe('custom');
  });
});

describe('clearance', () => {
  it('flags furniture blocking a door swing', () => {
    const r = { ...room, placedFurniture: [{ id: 'a', furnitureTypeId: 'wardrobe-3door', x: 105, y: 380, rotationDeg: 0 }] };
    const issues = evaluateClearance(r);
    expect(issues.some((i) => i.itemId === 'a' && i.kind === 'door-swing')).toBe(true);
  });

  it('does not flag furniture away from openings', () => {
    const r = { ...room, placedFurniture: [{ id: 'a', furnitureTypeId: 'bed-queen', x: 400, y: 210, rotationDeg: 0 }] };
    expect(evaluateClearance(r).filter((i) => i.kind === 'door-swing')).toHaveLength(0);
  });

  it('builds a zone per opening', () => {
    expect(getClearanceZones(room)).toHaveLength(2);
  });
});

describe('layout suggestion', () => {
  it('places items without collisions or door blocking', () => {
    const ids = ['bed-queen', 'nightstand', 'wardrobe-3door', 'sofa-3seat', 'coffee-table'];
    const { placed, unplaced } = suggestLayout(room, ids);
    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(ids.length);
    const { collidingIds } = evaluateAllCollisions(placed, room.widthCm, room.depthCm);
    expect(collidingIds.size).toBe(0);
    const issues = evaluateClearance({ ...room, placedFurniture: placed });
    expect(issues.filter((i) => i.kind === 'door-swing')).toHaveLength(0);
  });
});

describe('share', () => {
  it('round-trips a room through a link hash', async () => {
    const r = { ...room, placedFurniture: [{ id: 'a', furnitureTypeId: 'bed-queen', x: 100, y: 120, rotationDeg: 90 }] };
    const hash = await encodeRoomToHash(r);
    const back = await decodeRoomFromHash('#' + hash);
    expect(back.name).toBe('Test');
    expect(back.placedFurniture[0]).toMatchObject({ furnitureTypeId: 'bed-queen', x: 100, rotationDeg: 90 });
  });

  it('sanitizes hostile import data', () => {
    const clean = sanitizeImportedRoom({
      name: 'x'.repeat(500),
      widthCm: 99999,
      depthCm: -5,
      placedFurniture: [{ furnitureTypeId: 'bed-queen', x: 1e9, y: 'abc' }, { nope: true }],
    });
    expect(clean.name.length).toBe(80);
    expect(clean.widthCm).toBe(1500);
    expect(clean.depthCm).toBe(200);
    expect(clean.placedFurniture).toHaveLength(1);
    expect(clean.placedFurniture[0].x).toBe(2000);
  });

  it('survives null entries, bad overrides and repeated ids', () => {
    const clean = sanitizeImportedRoom({
      doors: [null, 'x', { wall: 'left', offsetCm: 10, widthCm: 90 }],
      windows: [7],
      placedFurniture: [
        null,
        { id: 'same', furnitureTypeId: 'bed-queen', x: 10, y: 10, overrides: { widthCm: 9999, colour: 'url(x)', fill: '#ff0000', evil: {} } },
        { id: 'same', furnitureTypeId: 'bed-queen', x: 50, y: 50 },
      ],
    });
    expect(clean.doors).toHaveLength(1);
    expect(clean.windows).toHaveLength(0);
    expect(clean.placedFurniture).toHaveLength(2);
    expect(new Set(clean.placedFurniture.map((f) => f.id)).size).toBe(2);
    expect(clean.placedFurniture[0].overrides).toEqual({ widthCm: 600, fill: '#ff0000' });
  });
});

describe('measure and pdf', () => {
  it('computes wall distances', () => {
    const d = getWallDistances({ x: 100, y: 100, rotationDeg: 0 }, 100, 60, 500, 400);
    expect(d).toMatchObject({ left: 50, top: 70, right: 350, bottom: 270 });
    expect(formatCm(250)).toBe('2.50 m');
  });

  it('writes a valid PDF envelope', () => {
    const pdf = jpegToPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 200, 100);
    const text = new TextDecoder('latin1').decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/DCTDecode');
  });
});

describe('layout suggestion with existing furniture', () => {
  it('avoids pieces already in the room and returns only new ones', () => {
    const existing = [{ id: 'e1', furnitureTypeId: 'bed-queen', x: 400, y: 120, rotationDeg: 0 }];
    const r = { ...room, placedFurniture: existing };
    const { placed } = suggestLayout(r, ['wardrobe-2door', 'sofa-3seat']);
    expect(placed).toHaveLength(2);
    const all = [...existing, ...placed];
    expect(evaluateAllCollisions(all, room.widthCm, room.depthCm).collidingIds.size).toBe(0);
  });
});

describe('clearance noise control', () => {
  it('ignores tiny gaps between neighbours but flags walk-through gaps', () => {
    const mk = (gap) => ({
      ...room,
      placedFurniture: [
        { id: 'a', furnitureTypeId: 'wardrobe-2door', x: 150, y: 100, rotationDeg: 0 },
        { id: 'b', furnitureTypeId: 'wardrobe-2door', x: 150, y: 100 + 60 + gap, rotationDeg: 0 },
      ],
    });
    expect(evaluateClearance(mk(10)).filter((i) => i.kind === 'tight-passage')).toHaveLength(0);
    expect(evaluateClearance(mk(40)).filter((i) => i.kind === 'tight-passage')).toHaveLength(2);
    expect(evaluateClearance(mk(80)).filter((i) => i.kind === 'tight-passage')).toHaveLength(0);
  });

  it('suggested layouts leave no tight passages in a normal room', () => {
    const ids = ['bed-queen', 'nightstand', 'nightstand', 'wardrobe-2door', 'chest-drawers', 'rug-living'];
    const { placed } = suggestLayout(room, ids);
    const issues = evaluateClearance({ ...room, placedFurniture: placed });
    expect(issues).toEqual([]);
  });
});

describe('walkthrough helpers', () => {
  it('starts just inside the first door facing the room', () => {
    const start = getWalkStart(room);
    expect(start.z).toBeLessThan(room.depthCm / 200);
    expect(start.z).toBeGreaterThan(0);
    expect(Math.abs(start.yaw - Math.atan2(start.x, start.z))).toBeLessThan(1e-9);
  });

  it('blocks walking through furniture but not rugs', () => {
    const r = {
      ...room,
      placedFurniture: [
        { id: 'a', furnitureTypeId: 'sofa-3seat', x: 260, y: 210, rotationDeg: 0 },
        { id: 'b', furnitureTypeId: 'rug-living', x: 100, y: 100, rotationDeg: 0 },
      ],
    };
    const blockers = buildBlockers(r);
    expect(blockers).toHaveLength(1);
    expect(isBlocked(0, 0, blockers)).toBe(true);
    expect(isBlocked(-2.4, -1.9, blockers)).toBe(false);
  });
});
