import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from './roomStore.js';

const state = () => useRoomStore.getState();

async function freshRoom() {
  await state().createRoom('Test', 600, 500);
}

describe('roomStore', () => {
  beforeEach(async () => {
    await freshRoom();
  });

  it('adds furniture and flags collisions', () => {
    state().addFurniture('bed-queen', 200, 200);
    state().addFurniture('bed-queen', 210, 200);
    expect(state().room.placedFurniture).toHaveLength(2);
    expect(state().collidingItemIds.size).toBe(2);
  });

  it('supports additive multi-select and select all', () => {
    state().addFurniture('nightstand', 100, 100);
    state().addFurniture('nightstand', 300, 300);
    const [a, b] = state().room.placedFurniture.map((i) => i.id);
    state().selectItem(a);
    state().selectItem(b, true);
    expect(state().selectedItemIds).toEqual([a, b]);
    state().selectItem(a, true);
    expect(state().selectedItemIds).toEqual([b]);
    state().selectAll();
    expect(state().selectedItemIds).toHaveLength(2);
  });

  it('copies and pastes a group with new ids, then undoes it', () => {
    state().addFurniture('nightstand', 100, 100);
    state().addFurniture('armchair', 300, 300);
    state().selectAll();
    state().copySelection();
    state().pasteClipboard();
    const items = state().room.placedFurniture;
    expect(items).toHaveLength(4);
    expect(new Set(items.map((i) => i.id)).size).toBe(4);
    expect(state().selectedItemIds).toHaveLength(2);
    state().undo();
    expect(state().room.placedFurniture).toHaveLength(2);
  });

  it('moves and removes a selected group', () => {
    state().addFurniture('nightstand', 100, 100);
    state().addFurniture('armchair', 300, 300);
    state().selectAll();
    const start = Object.fromEntries(state().room.placedFurniture.map((i) => [i.id, { x: i.x, y: i.y }]));
    state().moveSelectionFrom(start, 40, 20);
    for (const item of state().room.placedFurniture) {
      expect(item.x).toBe(start[item.id].x + 40);
      expect(item.y).toBe(start[item.id].y + 20);
    }
    state().removeSelection();
    expect(state().room.placedFurniture).toHaveLength(0);
    expect(state().selectedItemIds).toEqual([]);
  });

  it('applies and resets per-item overrides', () => {
    state().addFurniture('desk-executive', 300, 250);
    const id = state().room.placedFurniture[0].id;
    state().updateItemOverrides(id, { widthCm: 200, color: '#102030', bogus: 'x' });
    const item = state().room.placedFurniture[0];
    expect(item.overrides).toEqual({ widthCm: 200, color: '#102030' });
    state().updateItemOverrides(id, { widthCm: null, color: null });
    expect(state().room.placedFurniture[0].overrides).toBeUndefined();
  });

  it('caps resizing to a believable range of the catalog size', () => {
    state().addFurniture('desk-executive', 300, 250);
    const id = state().room.placedFurniture[0].id;
    state().updateItemOverrides(id, { widthCm: 5, depthCm: 9999 });
    const { widthCm: baseW, depthCm: baseD } = { widthCm: 140, depthCm: 70 };
    const o = state().room.placedFurniture[0].overrides;
    expect(o.widthCm).toBeGreaterThanOrEqual(20);
    expect(o.widthCm).toBeLessThanOrEqual(Math.floor(baseW * 2.5));
    expect(o.depthCm).toBeLessThanOrEqual(Math.floor(baseD * 2.5));
  });

  it('keeps an enlarged item inside the room', () => {
    state().addFurniture('desk-executive', 590, 250);
    const id = state().room.placedFurniture[0].id;
    state().updateItemOverrides(id, { widthCm: 300 });
    const item = state().room.placedFurniture[0];
    expect(item.x + 150).toBeLessThanOrEqual(600 + 0.5);
  });

  it('stores and clears a trace image', () => {
    state().setTraceImage({ dataUrl: 'data:image/png;base64,AAAA', aspect: 1.5 });
    expect(state().room.traceImage.opacity).toBeGreaterThan(0);
    state().updateTraceImage({ opacity: 0.8 });
    expect(state().room.traceImage.opacity).toBe(0.8);
    state().setTraceImage(null);
    expect(state().room.traceImage).toBeUndefined();
  });

  it('applies a suggested layout in replace and add modes', () => {
    state().addFurniture('nightstand', 100, 100);
    state().applyLayout([{ id: 'x1', furnitureTypeId: 'armchair', x: 200, y: 200, rotationDeg: 0 }], 'add');
    expect(state().room.placedFurniture).toHaveLength(2);
    state().applyLayout([{ id: 'x2', furnitureTypeId: 'armchair', x: 200, y: 200, rotationDeg: 0 }], 'replace');
    expect(state().room.placedFurniture).toHaveLength(1);
  });

  it('imports a sanitized room', async () => {
    const room = await state().importRoomData({
      name: 'Imported',
      widthCm: 400,
      depthCm: 400,
      placedFurniture: [{ furnitureTypeId: 'sofa-3seat', x: 200, y: 100, rotationDeg: 0 }],
    });
    expect(state().room.id).toBe(room.id);
    expect(state().room.placedFurniture).toHaveLength(1);
  });
});
