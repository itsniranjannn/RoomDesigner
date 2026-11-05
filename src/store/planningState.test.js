import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from './roomStore.js';
import { usePlanningStore } from './planningStore.js';
import {
  encodeRoomToHash,
  decodeRoomFromHash,
  sanitizeImportedRoom,
  roomToJson,
} from '../engine/share.js';

const state = () => useRoomStore.getState();

describe('service points in the room store', () => {
  beforeEach(async () => {
    await state().createRoom('Plan', 500, 400);
  });

  it('adds wall points on the wall face and floor points where clicked', () => {
    const id = state().addService('socket', 200, 30);
    const sock = state().room.services.find((s) => s.id === id);
    expect(sock).toMatchObject({ kind: 'socket', x: 200, y: 8, rotationDeg: 0 });
    state().addService('drain', 120, 90);
    expect(state().room.services.at(-1)).toMatchObject({ kind: 'drain', x: 120, y: 90 });
    expect(state().addService('bogus', 1, 1)).toBeNull();
  });

  it('moves a wall point along the wall and keeps it on a wall', () => {
    const id = state().addService('socket', 200, 8);
    state().moveService(id, 320, 150);
    const s = state().room.services[0];
    // nearest wall from (320,150) is the top wall? no: 150 from top, 180 from right: top
    expect(s.y).toBe(8);
    expect(s.x).toBe(320);
  });

  it('removes, edits notes and rotates floor points', () => {
    const w = state().addService('water', 100, 5);
    const d = state().addService('drain', 100, 100);
    state().updateService(w, { note: '  sink  ' });
    expect(state().room.services[0].note).toBe('sink');
    state().updateService(w, { note: '' });
    expect(state().room.services[0].note).toBeUndefined();
    state().rotateService(w); // wall points follow their wall
    expect(state().room.services[0].rotationDeg).toBe(0);
    state().rotateService(d);
    expect(state().room.services[1].rotationDeg).toBe(90);
    state().removeService(w);
    expect(state().room.services.map((s) => s.id)).toEqual([d]);
  });

  it('undoes and redoes adding and removing points', () => {
    const id = state().addService('socket', 100, 8);
    expect(state().room.services).toHaveLength(1);
    state().undo();
    expect(state().room.services).toHaveLength(0);
    state().redo();
    expect(state().room.services).toHaveLength(1);
    state().removeService(id);
    state().undo();
    expect(state().room.services).toHaveLength(1);
  });

  it('leaves rooms that never had points without the field after undo of other edits', () => {
    state().addFurniture('armchair', 200, 200);
    state().undo();
    expect(state().room.services).toBeUndefined();
  });

  it('keeps hinge side and window swing through updateOpening', () => {
    const doorId = state().room.doors[0].id;
    state().updateOpening('door', doorId, { hingeSide: 'end' }, true);
    expect(state().room.doors[0].hingeSide).toBe('end');
    state().addOpening('window', 'top');
    const win = state().room.windows.at(-1);
    state().updateOpening('window', win.id, { swing: 'inward' }, true);
    expect(state().room.windows.at(-1).swing).toBe('inward');
    state().undo();
    expect(state().room.windows.at(-1).swing).toBeUndefined();
  });
});

describe('planning sharing', () => {
  const room = {
    id: 'r1',
    name: 'Flat kitchen',
    widthCm: 400,
    depthCm: 300,
    doors: [
      {
        id: 'd',
        wall: 'bottom',
        offsetCm: 50,
        widthCm: 90,
        hingeSide: 'end',
        swingDirection: 'outward',
      },
    ],
    windows: [{ id: 'w', wall: 'top', offsetCm: 100, widthCm: 120, swing: 'inward' }],
    placedFurniture: [],
    services: [
      { id: 's1', kind: 'socket', x: 200, y: 8, rotationDeg: 0, note: 'by the counter' },
      { id: 's2', kind: 'drain', x: 100, y: 100, rotationDeg: 90 },
      { id: 'bad', kind: 'nonsense', x: 1, y: 1 },
    ],
    finish: { floor: 'oak', wall: 'nope' },
  };

  it('carries points, swings and finish through a JSON file', () => {
    const back = sanitizeImportedRoom(JSON.parse(roomToJson(room)));
    expect(back.services.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(back.services[0].note).toBe('by the counter');
    expect(back.doors[0]).toMatchObject({ hingeSide: 'end', swingDirection: 'outward' });
    expect(back.windows[0].swing).toBe('inward');
    expect(back.finish).toEqual({ floor: 'oak' });
  });

  it('carries them through a share link', async () => {
    const back = await decodeRoomFromHash(await encodeRoomToHash(room));
    expect(back.services).toHaveLength(2);
    expect(back.finish).toEqual({ floor: 'oak' });
    expect(back.windows[0].swing).toBe('inward');
  });

  it('stays unchanged for older files without these fields', () => {
    const back = sanitizeImportedRoom({
      name: 'Old',
      widthCm: 400,
      depthCm: 300,
      doors: [{ wall: 'bottom' }],
    });
    expect(back.services).toBeUndefined();
    expect(back.finish).toBeUndefined();
    expect(back.doors[0].hingeSide).toBeUndefined();
    expect(roomToJson({ ...room, services: [], finish: undefined })).not.toMatch(
      /"services"|"finish"/
    );
  });

  it('drops unknown finish ids and out-of-room points', () => {
    const back = sanitizeImportedRoom({
      widthCm: 300,
      depthCm: 300,
      finish: { floor: 'lava', wall: 'x' },
      services: [{ kind: 'socket', x: 900, y: 10 }],
    });
    expect(back.finish).toBeUndefined();
    expect(back.services[0].x).toBe(300);
  });
});

describe('planning UI state', () => {
  it('steps back one level on Escape', () => {
    const s = usePlanningStore.getState();
    s.startPlacing('socket');
    s.selectService('x');
    expect(usePlanningStore.getState().placeKind).toBeNull();
    usePlanningStore.setState({ placeKind: 'socket' });
    expect(usePlanningStore.getState().escape()).toBe(true);
    expect(usePlanningStore.getState().placeKind).toBeNull();
    expect(usePlanningStore.getState().escape()).toBe(true);
    expect(usePlanningStore.getState().selectedServiceId).toBeNull();
    expect(usePlanningStore.getState().escape()).toBe(false);
  });
});
