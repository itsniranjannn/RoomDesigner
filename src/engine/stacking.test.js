import { describe, it, expect, beforeEach } from 'vitest';
import {
  findSupport,
  ridersOf,
  settleStacking,
  reconcileStacking,
  supportOf,
  surfaceHeightOf,
  pickDefaultSupport,
} from './stacking.js';
import { evaluateAllCollisions } from './collision.js';
import { getFurnitureType } from '../data/furnitureCatalog.js';
import { suggestLayout } from './layout.js';
import { useRoomStore } from '../store/roomStore.js';

const piece = (id, furnitureTypeId, x, y, extra = {}) => ({
  id,
  furnitureTypeId,
  x,
  y,
  rotationDeg: 0,
  elevationCm: 0,
  ...extra,
});

describe('stacking engine', () => {
  it('flags small pieces and supports in the catalog', () => {
    expect(getFurnitureType('tv-43').restsOnTop).toBe(true);
    expect(getFurnitureType('media-console').supportsTop).toBe(true);
    expect(getFurnitureType('nightstand').supportsTop).toBe(true);
    expect(getFurnitureType('sofa-3seat').supportsTop).toBeUndefined();
    expect(surfaceHeightOf(getFurnitureType('vanity-dresser'))).toBe(75);
    expect(surfaceHeightOf(getFurnitureType('media-console'))).toBe(50);
  });

  it('puts a piece on the support under its centre, at the support top', () => {
    const items = [piece('c', 'media-console', 200, 100), piece('t', 'tv-43', 230, 100)];
    expect(findSupport(items[1], items).item.id).toBe('c');
    const settled = settleStacking(items);
    expect(settled[1].elevationCm).toBe(50);
    expect(supportOf(settled[1], settled).item.id).toBe('c');
    expect(ridersOf(settled[0], settled).map((i) => i.id)).toEqual(['t']);
  });

  it('ignores supports the centre is not over and drops back to the floor', () => {
    const items = [
      piece('c', 'media-console', 200, 100),
      piece('t', 'tv-43', 400, 100, { elevationCm: 50 }),
    ];
    expect(findSupport(items[1], items)).toBeNull();
    expect(settleStacking(items)[1].elevationCm).toBe(0);
  });

  it('uses a lowered surface height for pieces with a mirror above the top', () => {
    const items = [piece('d', 'vanity-dresser', 100, 100), piece('p', 'planter-small', 100, 100)];
    expect(settleStacking(items)[1].elevationCm).toBe(75);
  });

  it('prefers the highest support when supports overlap', () => {
    const items = [
      piece('a', 'coffee-table', 100, 100),
      piece('b', 'bookshelf', 100, 100),
      piece('p', 'planter-small', 100, 100),
    ];
    expect(findSupport(items[2], items).item.id).toBe('b');
  });

  it('does not stack pieces that cannot rest on top', () => {
    const items = [
      piece('c', 'media-console', 200, 100),
      piece('s', 'sofa-3seat', 200, 100, { elevationCm: 0 }),
    ];
    expect(settleStacking(items)).toBe(items);
  });

  it('carries riders when the support moves and turns', () => {
    const before = settleStacking([
      piece('c', 'media-console', 200, 100),
      piece('t', 'tv-43', 230, 100),
    ]);
    const moved = before.map((i) => (i.id === 'c' ? { ...i, x: 300, y: 150 } : i));
    const after = reconcileStacking(before, moved);
    expect(after[1].x).toBeCloseTo(330);
    expect(after[1].y).toBeCloseTo(150);
    expect(after[1].elevationCm).toBe(50);

    const turned = after.map((i) => (i.id === 'c' ? { ...i, rotationDeg: 90 } : i));
    const rotated = reconcileStacking(after, turned);
    // 30 cm to the right of the centre becomes 30 cm below it
    expect(rotated[1].x).toBeCloseTo(300);
    expect(rotated[1].y).toBeCloseTo(180);
    expect(rotated[1].rotationDeg).toBe(90);
    expect(rotated[1].elevationCm).toBe(50);
  });

  it('leaves a rider that was moved in the same edit where it was put', () => {
    const before = settleStacking([
      piece('c', 'media-console', 200, 100),
      piece('t', 'tv-43', 230, 100),
    ]);
    const edited = before.map((i) => ({ ...i, x: i.x + 40 }));
    const after = reconcileStacking(before, edited);
    expect(after[1].x).toBe(270);
  });

  it('drops riders to the floor when the support is deleted', () => {
    const before = settleStacking([
      piece('c', 'media-console', 200, 100),
      piece('t', 'tv-43', 200, 100),
    ]);
    const after = reconcileStacking(
      before,
      before.filter((i) => i.id !== 'c')
    );
    expect(after[0].id).toBe('t');
    expect(after[0].elevationCm).toBe(0);
  });

  it('lifts a piece dropped on a support and lowers it when dragged off', () => {
    const before = [piece('c', 'media-console', 200, 100), piece('l', 'planter-small', 400, 300)];
    const dropped = reconcileStacking(
      before,
      before.map((i) => (i.id === 'l' ? { ...i, x: 190, y: 100 } : i))
    );
    expect(dropped[1].elevationCm).toBe(50);
    const off = reconcileStacking(
      dropped,
      dropped.map((i) => (i.id === 'l' ? { ...i, x: 400, y: 300 } : i))
    );
    expect(off[1].elevationCm).toBe(0);
  });

  it('picks a free support, preferring the types a piece lists', () => {
    const items = [
      piece('n', 'nightstand', 50, 50),
      piece('c', 'media-console', 200, 100),
      piece('t', 'tv-43', 200, 100, { elevationCm: 50 }),
    ];
    expect(pickDefaultSupport(getFurnitureType('tv-43'), items.slice(0, 2)).id).toBe('c');
    // the console already carries a TV, and a TV does not belong on a nightstand
    expect(pickDefaultSupport(getFurnitureType('tv-43'), items)).toBeNull();
    expect(pickDefaultSupport(getFurnitureType('planter-small'), items).id).toBe('n');
    expect(pickDefaultSupport(getFurnitureType('tv-43'), [])).toBeNull();
  });
});

describe('stacking and collisions', () => {
  it('does not report a piece resting on its support as a collision', () => {
    const items = settleStacking([
      piece('c', 'media-console', 200, 100),
      piece('t', 'tv-43', 200, 100),
    ]);
    const { collidingIds } = evaluateAllCollisions(items, 600, 500);
    expect(collidingIds.size).toBe(0);
  });

  it('does not report a lamp on a mirrored dresser, whose body is taller than its top', () => {
    const items = settleStacking([
      piece('d', 'vanity-dresser', 200, 100),
      piece('p', 'planter-small', 200, 100),
    ]);
    expect(items[1].elevationCm).toBe(75);
    expect(evaluateAllCollisions(items, 600, 500).collidingIds.size).toBe(0);
  });

  it('still reports two pieces on the same level that overlap', () => {
    const items = settleStacking([
      piece('c', 'media-console', 200, 100),
      piece('t1', 'tv-43', 200, 100),
      piece('t2', 'tv-43', 210, 100),
    ]);
    const { collidingIds } = evaluateAllCollisions(items, 600, 500);
    expect(collidingIds.has('t1')).toBe(true);
    expect(collidingIds.has('t2')).toBe(true);
    expect(collidingIds.has('c')).toBe(false);
  });

  it('still reports a floor piece that overlaps a support at floor level', () => {
    const items = [piece('c', 'media-console', 200, 100), piece('s', 'sofa-3seat', 200, 110)];
    expect(evaluateAllCollisions(items, 600, 500).collidingIds.has('c')).toBe(true);
  });
});

describe('layout suggestions', () => {
  it('places the TV on its console at the console top', () => {
    const room = { widthCm: 500, depthCm: 400, doors: [], windows: [], placedFurniture: [] };
    const { placed } = suggestLayout(room, ['tv-43', 'media-console']);
    const tv = placed.find((p) => p.furnitureTypeId === 'tv-43');
    const console_ = placed.find((p) => p.furnitureTypeId === 'media-console');
    expect(tv.elevationCm).toBe(50);
    expect(tv.x).toBe(console_.x);
  });
});

describe('roomStore stacking', () => {
  const state = () => useRoomStore.getState();
  const get = (type) => state().room.placedFurniture.find((i) => i.furnitureTypeId === type);

  beforeEach(async () => {
    await state().createRoom('Stack', 600, 500);
  });

  it('lifts a dropped TV onto the console, carries it along, and drops it when the console goes', () => {
    state().addFurniture('media-console', 300, 200);
    state().addFurniture('tv-43', 300, 200);
    expect(get('tv-43').elevationCm).toBe(50);
    expect(state().collidingItemIds.size).toBe(0);

    state().updateFurniturePosition(get('media-console').id, 400, 250);
    expect(get('tv-43').x).toBe(400);
    expect(get('tv-43').y).toBe(250);
    expect(get('tv-43').elevationCm).toBe(50);

    state().nudgeFurniture(get('media-console').id, 10, 0);
    expect(get('tv-43').x).toBe(410);

    state().removeFurniture(get('media-console').id);
    expect(get('tv-43').elevationCm).toBe(0);
  });

  it('returns a piece to the floor when it is dragged off the support', () => {
    state().addFurniture('nightstand', 100, 100);
    state().addFurniture('planter-small', 100, 100);
    expect(get('planter-small').elevationCm).toBe(52);
    state().updateFurniturePosition(get('planter-small').id, 300, 300);
    expect(get('planter-small').elevationCm).toBe(0);
  });

  it('carries stacked pieces along with a group drag of the support only', () => {
    state().addFurniture('nightstand', 100, 100);
    state().addFurniture('planter-small', 100, 100);
    const stand = get('nightstand');
    state().selectMany([stand.id]);
    state().moveSelectionFrom({ [stand.id]: { x: stand.x, y: stand.y } }, 50, 30);
    expect(get('planter-small').x).toBe(150);
    expect(get('planter-small').y).toBe(130);
  });
});
