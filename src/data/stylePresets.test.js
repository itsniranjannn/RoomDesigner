import { describe, it, expect } from 'vitest';
import {
  STYLE_PRESETS,
  getStyle,
  styleSwatches,
  roleOf,
  recolourFor,
  applyStyleToRoom,
  resetStyleOnRoom,
  applyStyleToRooms,
  resetStyleOnRooms,
  dominantFinish,
  sharedStyle,
  styleOfRoom,
} from './stylePresets.js';
import { getFurnitureType, resolveItemDef, isColorLocked } from './furnitureCatalog.js';
import { getFloor, getWall } from '../components/preview3d/materials.js';
import { isPatternId, patternKindOf } from '../components/preview3d/patterns.js';

const HEX = /^#[0-9A-F]{6}$/i;

const room = (items, extra = {}) => ({
  id: 'r1',
  name: 'Lounge',
  widthCm: 500,
  depthCm: 400,
  placedFurniture: items,
  ...extra,
});

const piece = (id, type, extra = {}) => ({ id, furnitureTypeId: type, x: 100, y: 100, ...extra });

const SAMPLE = [
  piece('sofa', 'sofa-3seat'),
  piece('table', 'coffee-table', { overrides: { widthCm: 120 } }),
  piece('rug', 'rug-living'),
  piece('lamp', 'floor-lamp'),
  piece('tv', 'tv-43'),
  piece('art', 'wall-art-landscape'),
  piece('mirror', 'wall-mirror'),
  piece('curtain', 'curtain-sheer-closed'),
  piece('bed', 'bed-queen', { overrides: { color: '#112233' } }),
  piece('round', 'rug-round'),
  piece('cushion', 'cushion-square'),
  piece('vase', 'vase-ceramic'),
];

describe('style preset definitions', () => {
  it('has the six requested styles with unique ids', () => {
    const ids = STYLE_PRESETS.map((s) => s.id);
    expect(ids).toEqual(['modern', 'minimal', 'nepali', 'scandinavian', 'industrial', 'boho']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses real floors, walls, hex colours and valid patterns', () => {
    for (const s of STYLE_PRESETS) {
      expect(getFloor(s.floor), `${s.id} floor`).toBeTruthy();
      expect(getWall(s.wall), `${s.id} wall`).toBeTruthy();
      const p = s.palette;
      for (const c of [p.seating, p.bed, p.wood, p.accent, p.curtain]) expect(c, s.id).toMatch(HEX);
      for (const c of [p.rug.color, p.rug.sub, p.rug.accent]) expect(c, s.id).toMatch(HEX);
      expect(isPatternId('rug', p.rug.pattern), `${s.id} rug`).toBe(true);
      expect(isPatternId('curtain', p.curtainPattern), `${s.id} curtain`).toBe(true);
      expect(s.label && s.note).toBeTruthy();
      expect(styleSwatches(s)).toHaveLength(6);
    }
  });

  it('finds styles by id', () => {
    expect(getStyle('boho').label).toBe('Warm boho');
    expect(getStyle('nope')).toBeNull();
    expect(styleSwatches(null)).toEqual([]);
  });
});

describe('which pieces a style recolours', () => {
  it('never touches colour-locked pieces, small objects or custom furniture', () => {
    for (const id of [
      'floor-lamp',
      'tv-43',
      'wall-art-landscape',
      'wall-mirror',
      'mirror-wall-round',
    ]) {
      expect(isColorLocked(getFurnitureType(id)), id).toBe(true);
      expect(roleOf(getFurnitureType(id)), id).toBeNull();
    }
    expect(roleOf(getFurnitureType('vase-ceramic'))).toBeNull();
    expect(roleOf({ shapeType: 'custom-mesh', category: 'custom' })).toBeNull();
    expect(roleOf(null)).toBeNull();
  });

  it('assigns palette roles by kind of piece', () => {
    expect(roleOf(getFurnitureType('sofa-3seat'))).toBe('seating');
    expect(roleOf(getFurnitureType('bed-queen'))).toBe('bed');
    expect(roleOf(getFurnitureType('coffee-table'))).toBe('wood');
    expect(roleOf(getFurnitureType('rug-living'))).toBe('rug');
    expect(roleOf(getFurnitureType('curtain-heavy-open'))).toBe('curtain');
    expect(roleOf(getFurnitureType('cushion-square'))).toBe('accent');
  });

  it('gives a round rug rings and a sheer curtain a lighter shade', () => {
    const style = getStyle('nepali');
    expect(recolourFor(style, getFurnitureType('rug-round')).pattern).toBe('rings');
    expect(recolourFor(style, getFurnitureType('rug-living')).pattern).toBe('dhaka');
    const heavy = recolourFor(style, getFurnitureType('curtain-heavy-open')).color;
    const sheer = recolourFor(style, getFurnitureType('curtain-sheer-open')).color;
    expect(heavy).toBe(style.palette.curtain);
    expect(sheer).not.toBe(heavy);
    expect(recolourFor(style, getFurnitureType('floor-lamp'))).toBeNull();
  });
});

describe('applying a style to a room', () => {
  const base = room(SAMPLE);

  it('sets the floor and wall and recolours only recolourable pieces', () => {
    const next = applyStyleToRoom(base, 'nepali');
    const style = getStyle('nepali');
    expect(next.finish).toEqual({ floor: style.floor, wall: style.wall });
    const by = Object.fromEntries(next.placedFurniture.map((i) => [i.id, i]));
    expect(by.sofa.overrides.color).toBe(style.palette.seating);
    expect(by.table.overrides.color).toBe(style.palette.wood);
    expect(by.bed.overrides.color).toBe(style.palette.bed);
    expect(by.rug.overrides).toMatchObject({
      color: style.palette.rug.color,
      subColor: style.palette.rug.sub,
      accentColor: style.palette.rug.accent,
      pattern: 'dhaka',
    });
    expect(by.curtain.overrides.pattern).toBe(style.palette.curtainPattern);
    // Locked and small pieces are untouched, identical objects
    for (const id of ['lamp', 'tv', 'art', 'mirror', 'vase'])
      expect(by[id]).toBe(base.placedFurniture.find((i) => i.id === id));
  });

  it('keeps the sizes a person set and lets companion colours follow', () => {
    const next = applyStyleToRoom(base, 'modern');
    const table = next.placedFurniture.find((i) => i.id === 'table');
    expect(table.overrides.widthCm).toBe(120);
    const def = resolveItemDef(table);
    expect(def.widthCm).toBe(120);
    expect(def.color).toBe(getStyle('modern').palette.wood);
    const sofa = resolveItemDef(next.placedFurniture.find((i) => i.id === 'sofa'));
    expect(sofa.color).toBe(getStyle('modern').palette.seating);
    expect(sofa.cushionColor).not.toBe(getFurnitureType('sofa-3seat').cushionColor);
  });

  it('returns the same room when the style is already on and nothing would change', () => {
    const once = applyStyleToRoom(base, 'boho');
    const again = applyStyleToRoom(once, 'boho');
    expect(again.placedFurniture).toEqual(once.placedFurniture);
    expect(again.finish).toEqual(once.finish);
    expect(styleOfRoom(again)).toBe('boho');
    expect(applyStyleToRoom(base, 'does-not-exist')).toBe(base);
  });

  it('can leave the walls alone (one room of a flat)', () => {
    const r = room(SAMPLE, { finish: { wall: 'sage' } });
    const next = applyStyleToRoom(r, 'industrial', { wall: false });
    expect(next.finish).toEqual({ floor: 'concrete', wall: 'sage' });
  });
});

describe('Reset to original', () => {
  const original = room(SAMPLE, { finish: { floor: 'tile' } });

  it('puts every piece and the finish back exactly', () => {
    const styled = applyStyleToRoom(original, 'scandinavian');
    expect(styled.styleApplied.id).toBe('scandinavian');
    const reset = resetStyleOnRoom(styled);
    expect(reset.placedFurniture).toEqual(original.placedFurniture);
    expect(reset.finish).toEqual({ floor: 'tile' });
    expect('styleApplied' in reset).toBe(false);
  });

  it('goes back to the very first look after several styles', () => {
    let r = applyStyleToRoom(original, 'modern');
    r = applyStyleToRoom(r, 'nepali');
    r = applyStyleToRoom(r, 'boho');
    expect(styleOfRoom(r)).toBe('boho');
    const reset = resetStyleOnRoom(r);
    expect(reset.placedFurniture).toEqual(original.placedFurniture);
    expect(reset.finish).toEqual({ floor: 'tile' });
  });

  it('removes the finish when the room had none, and keeps pieces added since', () => {
    const plain = room(SAMPLE);
    const styled = applyStyleToRoom(plain, 'minimal');
    const withNew = {
      ...styled,
      placedFurniture: [...styled.placedFurniture, piece('new', 'armchair', { x: 5 })],
    };
    const reset = resetStyleOnRoom(withNew);
    expect('finish' in reset).toBe(false);
    expect(reset.placedFurniture.find((i) => i.id === 'new')).toBeTruthy();
    expect(reset.placedFurniture.filter((i) => i.id !== 'new')).toEqual(plain.placedFurniture);
  });

  it('leaves a room that never had a style unchanged', () => {
    expect(resetStyleOnRoom(original)).toBe(original);
  });
});

describe('styling flats', () => {
  const rooms = {
    a: room([piece('s', 'sofa-3seat')], { id: 'a' }),
    b: room([piece('t', 'bed-queen')], { id: 'b' }),
    c: room([], { id: 'c' }),
  };

  it('applies to all rooms or to the chosen ones only', () => {
    const all = applyStyleToRooms(rooms, 'modern');
    expect(Object.values(all).every((r) => styleOfRoom(r) === 'modern')).toBe(true);
    const some = applyStyleToRooms(rooms, 'modern', ['b']);
    expect(some.a).toBe(rooms.a);
    expect(some.c).toBe(rooms.c);
    expect(styleOfRoom(some.b)).toBe('modern');
    expect(sharedStyle(Object.values(some))).toBeNull();
    expect(sharedStyle(Object.values(all))).toBe('modern');
  });

  it('resets some or all of them', () => {
    const all = applyStyleToRooms(rooms, 'boho');
    const part = resetStyleOnRooms(all, ['a']);
    expect(styleOfRoom(part.a)).toBeNull();
    expect(part.a.placedFurniture).toEqual(rooms.a.placedFurniture);
    expect(styleOfRoom(part.b)).toBe('boho');
    const none = resetStyleOnRooms(all);
    expect(Object.values(none).every((r) => !r.styleApplied)).toBe(true);
  });

  it('works out the flat wall from what its rooms were given', () => {
    const all = applyStyleToRooms(rooms, 'industrial');
    expect(dominantFinish(Object.values(all), 'wall')).toBe('brick');
    expect(dominantFinish(Object.values(all), 'floor')).toBe('concrete');
    expect(dominantFinish(Object.values(rooms), 'wall')).toBeNull();
    const mixed = { ...all, a: applyStyleToRoom(rooms.a, 'boho') };
    expect(dominantFinish(Object.values(mixed), 'wall')).toBe('brick');
  });

  it('keeps patterns valid for every piece a style writes', () => {
    for (const s of STYLE_PRESETS) {
      const styled = applyStyleToRoom(room(SAMPLE), s.id);
      for (const it of styled.placedFurniture) {
        const base = getFurnitureType(it.furnitureTypeId);
        if (it.overrides?.pattern)
          expect(isPatternId(patternKindOf(base), it.overrides.pattern), `${s.id} ${it.id}`).toBe(
            true
          );
      }
    }
  });
});
