import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from './roomStore.js';
import { useFlatStore } from './flatStore.js';
import { getStyle, styleOfRoom } from '../data/stylePresets.js';
import { resolveItemDef } from '../data/furnitureCatalog.js';

const rs = () => useRoomStore.getState();
const fs = () => useFlatStore.getState();

describe('wall pieces in the room store', () => {
  beforeEach(async () => {
    await rs().createRoom('Wall test', 500, 400);
  });

  it('hangs a new curtain on the window, flush to the wall, at its default height', () => {
    rs().addFurniture('curtain-heavy-open');
    const [c] = rs().room.placedFurniture;
    const win = rs().room.windows[0];
    expect(c.rotationDeg).toBe(win.wall === 'top' ? 0 : c.rotationDeg);
    expect(c.elevationCm).toBe(0);
    if (win.wall === 'top') {
      expect(c.y).toBe(8);
      expect(c.x).toBe(win.offsetCm + win.widthCm / 2);
    }
    expect(rs().collidingItemIds.size).toBe(0);
  });

  it('adds a picture at its hanging height and snaps it to the nearest wall when moved', () => {
    rs().addFurniture('wall-art-landscape');
    const id = rs().room.placedFurniture[0].id;
    expect(rs().room.placedFurniture[0].elevationCm).toBe(135);
    rs().updateFurniturePosition(id, 480, 200);
    const moved = rs().room.placedFurniture[0];
    expect(moved).toMatchObject({ x: 498, y: 200, rotationDeg: 90, elevationCm: 135 });
  });

  it('does not collide with a sofa standing under it', () => {
    rs().addFurniture('sofa-3seat', 250, 60);
    rs().addFurniture('wall-art-landscape', 250, 1);
    expect(rs().collidingItemIds.size).toBe(0);
  });

  it('changes the hanging height, clamped, as one undo step', () => {
    rs().addFurniture('wall-art-landscape');
    const id = rs().room.placedFurniture[0].id;
    rs().setItemElevation(id, 160);
    expect(rs().room.placedFurniture[0].elevationCm).toBe(160);
    rs().setItemElevation(id, 999);
    expect(rs().room.placedFurniture[0].elevationCm).toBe(185);
    rs().undo();
    expect(rs().room.placedFurniture[0].elevationCm).toBe(160);
    // A floor piece ignores the call
    rs().addFurniture('sofa-3seat', 250, 250);
    const sofa = rs().room.placedFurniture[1];
    rs().setItemElevation(sofa.id, 100);
    expect(rs().room.placedFurniture[1].elevationCm).toBe(0);
  });

  it('puts a small piece on a floating shelf at the right height', () => {
    rs().addFurniture('wall-shelf-floating', 250, 1);
    const shelf = rs().room.placedFurniture[0];
    rs().addFurniture('candle-set', shelf.x, shelf.y);
    const candle = rs().room.placedFurniture[1];
    expect(candle.elevationCm).toBe(shelf.elevationCm + 4);
    // Lifting the shelf lifts what stands on it
    rs().setItemElevation(shelf.id, 100);
    expect(rs().room.placedFurniture[1].elevationCm).toBe(104);
  });

  it('keeps the colour override working and stores a rug pattern', () => {
    rs().addFurniture('rug-persian', 250, 200);
    const id = rs().room.placedFurniture[0].id;
    rs().updateItemOverrides(id, { color: '#224466' });
    rs().updateItemOverrides(id, { pattern: 'kilim' });
    const def = resolveItemDef(rs().room.placedFurniture[0]);
    expect(def.color).toBe('#224466');
    expect(def.pattern).toBe('kilim');
    rs().updateItemOverrides(id, { pattern: null });
    expect(resolveItemDef(rs().room.placedFurniture[0]).pattern).toBe('persian');
  });
});

describe('styles in the room store', () => {
  beforeEach(async () => {
    await rs().createRoom('Style test', 500, 400);
    rs().addFurniture('sofa-3seat', 250, 250);
    rs().addFurniture('rug-living', 250, 200);
    rs().addFurniture('floor-lamp', 60, 60);
  });

  it('applies a style as one undo step and resets it exactly', () => {
    const before = JSON.parse(JSON.stringify(rs().room.placedFurniture));
    const undoDepth = rs().undoStack.length;
    rs().applyStyle('nepali');
    expect(rs().undoStack.length).toBe(undoDepth + 1);
    expect(styleOfRoom(rs().room)).toBe('nepali');
    expect(rs().room.finish).toEqual({ floor: 'walnut', wall: 'terracotta' });
    const sofa = rs().room.placedFurniture.find((i) => i.furnitureTypeId === 'sofa-3seat');
    expect(sofa.overrides.color).toBe(getStyle('nepali').palette.seating);
    const lamp = rs().room.placedFurniture.find((i) => i.furnitureTypeId === 'floor-lamp');
    expect(lamp.overrides).toBeUndefined();

    rs().resetStyle();
    expect(rs().room.styleApplied).toBeUndefined();
    expect(rs().room.finish).toBeUndefined();
    expect(rs().room.placedFurniture).toEqual(before);
  });

  it('undo takes the floor, walls and colours back together, and redo reapplies them', () => {
    const before = JSON.parse(JSON.stringify(rs().room.placedFurniture));
    rs().applyStyle('industrial');
    rs().undo();
    expect(rs().room.finish).toBeUndefined();
    expect(rs().room.styleApplied).toBeUndefined();
    expect(rs().room.placedFurniture).toEqual(before);
    rs().redo();
    expect(rs().room.finish).toEqual({ floor: 'concrete', wall: 'brick' });
    expect(styleOfRoom(rs().room)).toBe('industrial');
    rs().undo();
    expect(rs().room.finish).toBeUndefined();
  });

  it('undoing an ordinary edit after a style does not touch the finish', () => {
    rs().applyStyle('boho');
    rs().addFurniture('armchair', 100, 300);
    rs().undo();
    expect(rs().room.finish).toEqual({ floor: 'plank', wall: 'cream' });
    expect(rs().room.placedFurniture.some((i) => i.furnitureTypeId === 'armchair')).toBe(false);
  });

  it('does nothing without a style to reset', () => {
    const depth = rs().undoStack.length;
    rs().resetStyle();
    expect(rs().undoStack.length).toBe(depth);
  });
});

describe('styles in the flat store', () => {
  beforeEach(async () => {
    await fs().createNewFlat('Style flat', '1bhk');
  });

  it('styles all rooms in one undo step and resets them', () => {
    const rooms = Object.keys(fs().rooms);
    expect(rooms.length).toBeGreaterThan(2);
    const before = fs().rooms;
    fs().applyStyle('scandinavian');
    expect(Object.values(fs().rooms).every((r) => styleOfRoom(r) === 'scandinavian')).toBe(true);
    expect(Object.values(fs().rooms).every((r) => r.finish?.floor === 'oak')).toBe(true);
    fs().undo();
    expect(fs().rooms).toBe(before);
    fs().redo();
    fs().resetStyle();
    expect(Object.values(fs().rooms).every((r) => !r.styleApplied && !r.finish)).toBe(true);
  });

  it('styles one room only, leaving its walls and the other rooms alone', () => {
    const [first, second] = Object.keys(fs().rooms);
    fs().applyStyle('industrial', [first], { wall: false });
    expect(fs().rooms[first].finish).toEqual({ floor: 'concrete' });
    expect(styleOfRoom(fs().rooms[first])).toBe('industrial');
    expect(fs().rooms[second].styleApplied).toBeUndefined();
    expect(fs().applyStyle('industrial', [first], { wall: false })).toBe(false);
  });
});
