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
    const start = Object.fromEntries(
      state().room.placedFurniture.map((i) => [i.id, { x: i.x, y: i.y }])
    );
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

  describe('resizing the room', () => {
    // The room from freshRoom is 600 x 500, with a door on the bottom wall and a window on the top

    it('holds to the size a room can be created at', () => {
      expect(state().resizeRoom(50, 9000)).toMatchObject({ widthCm: 200, depthCm: 1500 });
      expect(state().resizeRoom('not a number', null)).toBe(null);
      expect(state().room).toMatchObject({ widthCm: 200, depthCm: 1500 });
      // Nothing to do is not a step: it must not fill the undo stack with no-ops
      expect(state().resizeRoom(200, 1500)).toBe(null);
    });

    it('leaves a room that is not a rectangle to the walls it was drawn with', () => {
      const room = state().room;
      useRoomStore.setState({
        room: {
          ...room,
          outline: [
            [0, 0],
            [600, 0],
            [600, 500],
            [0, 500],
          ],
        },
      });
      expect(state().resizeRoom(300, 300)).toBe(null);
      expect(state().room).toMatchObject({ widthCm: 600, depthCm: 500 });
    });

    it('brings furniture and openings inside the new walls and says what moved', () => {
      state().addFurniture('nightstand', 560, 460);
      const item = () => state().room.placedFurniture[0];
      expect(state().room.windows[0].offsetCm).toBe(240);

      const result = state().resizeRoom(300, 300);
      expect(result).toMatchObject({ widthCm: 300, depthCm: 300, movedPieces: 1 });
      // The window was 240 cm along a 600 cm wall; on a 300 cm wall it goes as far as it fits
      expect(result.movedOpenings).toBe(1);
      expect(state().room.windows[0].offsetCm).toBe(165);
      expect(state().room.doors[0].offsetCm).toBe(50); // 50 cm along still fits: left alone
      expect(item().x).toBeLessThanOrEqual(300);
      expect(item().y).toBeLessThanOrEqual(300);
    });

    it('is one history step, so Undo gives the old room and its openings back', () => {
      state().resizeRoom(300, 300);
      expect(state().canUndo).toBe(true);
      state().undo();
      expect(state().room).toMatchObject({ widthCm: 600, depthCm: 500 });
      expect(state().room.windows[0].offsetCm).toBe(240);
      state().redo();
      expect(state().room).toMatchObject({ widthCm: 300, depthCm: 300 });
      expect(state().room.windows[0].offsetCm).toBe(165);
    });

    it('leaves a picture and a socket on the wall they were put on', () => {
      // The room is 600 x 500. A clock on the right-hand wall and a socket on the bottom one.
      state().addFurniture('wall-clock-round', 598, 250);
      state().addService('socket', 300, 498);
      const clock = () => state().room.placedFurniture[0];
      const socket = () => state().room.services[0];
      expect(clock().x).toBeGreaterThan(590);
      expect(socket().y).toBeGreaterThan(490);

      // Made 40 cm wider and 40 cm deeper: nothing was outside, so nothing had to be rescued --
      // but both walls they are on have moved, and they have to go with them. Re-snapping to
      // whatever wall is nearest afterwards used to re-hang the clock on the top wall.
      const result = state().resizeRoom(640, 540);
      expect(result).toMatchObject({ widthCm: 640, depthCm: 540 });
      expect(clock().x).toBeGreaterThan(630); // still on the right-hand wall
      expect(clock().y).toBeCloseTo(250, 0); // and at the same height along it
      expect(socket().y).toBeGreaterThan(530); // still on the bottom wall
      expect(socket().x).toBeCloseTo(300, 0);
      // Riding its own wall is not a move worth telling anyone about
      expect(result.movedPieces).toBe(0);
      expect(result.movedServices).toBe(0);
    });

    it('says a piece is still through a wall rather than calling it dealt with', () => {
      // A 270 x 170 corner sofa in a room shrunk to 200 x 200 cannot be brought inside
      state().addFurniture('sofa-l-shaped', 300, 250);
      const result = state().resizeRoom(200, 200);
      expect(result.stillOutside).toBeGreaterThan(0);
    });

    it('takes a piece standing on another along with it', () => {
      state().addFurniture('media-console', 400, 250); // 180 x 45, offers a top
      state().addFurniture('laptop', 400, 250); // 34 x 24, rests on it
      const find = (id) => state().room.placedFurniture.find((i) => i.furnitureTypeId === id);
      expect(find('laptop').elevationCm).toBeGreaterThan(0);

      // 480 cm is narrow enough to move the console but not the laptop sitting on it
      state().resizeRoom(480, 500);
      expect(find('media-console').x).toBeLessThan(400);
      expect(find('laptop').x).toBeCloseTo(find('media-console').x, 1);
      expect(find('laptop').elevationCm).toBeGreaterThan(0);
    });

    it('takes it along even when the room is shrunk far enough to move them both', () => {
      state().addFurniture('media-console', 500, 250); // 180 x 45, offers a top
      state().addFurniture('laptop', 500, 250); // 34 x 24, rests on it
      const find = (id) => state().room.placedFurniture.find((i) => i.furnitureTypeId === id);
      expect(find('laptop').elevationCm).toBeGreaterThan(0);

      // 300 cm is narrow enough that the laptop is outside the new wall too. Pulling it in first
      // looked to the stacking pass like someone having moved it by itself, which is the one case
      // where it is deliberately left behind -- so the console slid out from under it.
      state().resizeRoom(300, 500);
      expect(find('laptop').x).toBeCloseTo(find('media-console').x, 1);
      expect(find('laptop').y).toBeCloseTo(find('media-console').y, 1);
      expect(find('laptop').elevationCm).toBeGreaterThan(0);
    });
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
    state().applyLayout(
      [{ id: 'x1', furnitureTypeId: 'armchair', x: 200, y: 200, rotationDeg: 0 }],
      'add'
    );
    expect(state().room.placedFurniture).toHaveLength(2);
    state().applyLayout(
      [{ id: 'x2', furnitureTypeId: 'armchair', x: 200, y: 200, rotationDeg: 0 }],
      'replace'
    );
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

  // Deleting a photo-made piece deletes its photos and its model for good, so no undo may
  // bring a copy back: it would return as a nameless grey box that nothing can restore.
  it('never brings a deleted photo-made piece back with undo or redo', async () => {
    const typeId = 'custom-probe-chair';
    await state().addCustomFurniture({
      id: typeId,
      name: 'Probe chair',
      widthCm: 60,
      depthCm: 62,
      heightCm: 90,
      color: '#7a4b2a',
    });
    state().addFurniture(typeId, 200, 200);
    state().addFurniture('coffee-table', 400, 300);
    const types = () => state().room.placedFurniture.map((i) => i.furnitureTypeId);
    expect(types()).toContain(typeId);

    await state().removeCustomFurniture(typeId);
    expect(types()).toEqual(['coffee-table']);

    // Walk the whole history both ways: the chair must never come back
    const seen = [];
    for (let i = 0; i < 4; i += 1) {
      state().undo();
      seen.push(...types());
    }
    for (let i = 0; i < 4; i += 1) {
      state().redo();
      seen.push(...types());
    }
    expect(seen).not.toContain(typeId);
    expect(types()).toEqual(['coffee-table']);
  });
});
