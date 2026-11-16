import { describe, it, expect } from 'vitest';
import { addSegment, edgesToRuns } from './flatWalls.js';
import { reconcile, setLevelWalls } from './flatPlan.js';
import { createFlat } from './flat.js';
import { insideRoom } from './planning.js';
import { runPlanChecks } from './planningChecks.js';

const rectEdges = (x, y, w, d) => {
  let e = new Set();
  e = addSegment(e, x, y, x + w, y);
  e = addSegment(e, x, y + d, x + w, y + d);
  e = addSegment(e, x, y, x, y + d);
  e = addSegment(e, x + w, y, x + w, y + d);
  return e;
};
const union = (...sets) => new Set(sets.flatMap((s) => [...s]));

/** A flat with one room of the given size, and the room record that backs it. */
function oneRoomFlat(w, d) {
  const blank = createFlat('Services');
  const levelId = blank.levels[0].id;
  const state = reconcile(
    { ...blank, walls: { [levelId]: edgesToRuns(rectEdges(0, 0, w, d)) } },
    {}
  );
  const roomId = state.flat.spaces[0].roomId;
  return { ...state, levelId, roomId };
}

const withServices = (state, roomId, services) => ({
  ...state.rooms,
  [roomId]: { ...state.rooms[roomId], services },
});

describe('service points when a room shrinks', () => {
  it('pulls a wall point back inside and onto the new wall', () => {
    const start = oneRoomFlat(400, 300);
    const rooms = withServices(start, start.roomId, [
      { id: 'svc-1', kind: 'socket', x: 392, y: 150, rotationDeg: 90 },
    ]);

    // The right wall moves in by a metre
    const next = setLevelWalls(start.flat, rooms, start.levelId, rectEdges(0, 0, 300, 300));
    const room = next.rooms[start.roomId];
    expect(room.widthCm).toBe(300);

    const socket = room.services[0];
    expect(socket.id).toBe('svc-1');
    expect(socket.x).toBeLessThanOrEqual(300);
    expect(insideRoom(room, socket.x, socket.y)).toBe(true);
    // Back on the inner face of the new right wall, still facing into the room
    expect(socket).toMatchObject({ x: 292, y: 150, rotationDeg: 90 });
  });

  it('pulls a floor point back inside', () => {
    const start = oneRoomFlat(400, 300);
    const rooms = withServices(start, start.roomId, [
      { id: 'svc-drain', kind: 'drain', x: 360, y: 280, rotationDeg: 0 },
    ]);

    const next = setLevelWalls(start.flat, rooms, start.levelId, rectEdges(0, 0, 200, 200));
    const room = next.rooms[start.roomId];
    expect(room).toMatchObject({ widthCm: 200, depthCm: 200 });
    const drain = room.services[0];
    expect(insideRoom(room, drain.x, drain.y)).toBe(true);
    expect(drain).toMatchObject({ id: 'svc-drain', kind: 'drain', x: 200, y: 200 });
  });

  it('leaves points that still fit exactly where they were', () => {
    const start = oneRoomFlat(400, 300);
    const kept = [
      { id: 'svc-1', kind: 'socket', x: 8, y: 150, rotationDeg: 270 },
      { id: 'svc-2', kind: 'drain', x: 120, y: 90, rotationDeg: 0 },
    ];
    const rooms = withServices(start, start.roomId, kept);

    // A window-sized change to the far wall: nothing about these two points changes
    const next = setLevelWalls(start.flat, rooms, start.levelId, rectEdges(0, 0, 380, 300));
    expect(next.rooms[start.roomId].services).toEqual(kept);
  });

  it('pulls a point out of the notch when the room becomes L-shaped', () => {
    const start = oneRoomFlat(400, 300);
    const rooms = withServices(start, start.roomId, [
      { id: 'svc-drain', kind: 'drain', x: 350, y: 250, rotationDeg: 0 },
    ]);

    // Bite a 100 x 100 corner out of the bottom right
    const notched = union(
      rectEdges(0, 0, 400, 300),
      addSegment(new Set(), 300, 200, 400, 200),
      addSegment(new Set(), 300, 200, 300, 300)
    );
    const next = setLevelWalls(start.flat, rooms, start.levelId, notched);
    const room = next.rooms[start.roomId];
    expect(room.outline?.length).toBeGreaterThanOrEqual(5);
    const drain = room.services[0];
    expect(insideRoom(room, drain.x, drain.y)).toBe(true);
  });

  it('a shrunk room raises no "not on a wall" complaint about its own points', () => {
    const start = oneRoomFlat(400, 300);
    const rooms = withServices(start, start.roomId, [
      { id: 'svc-1', kind: 'socket', x: 392, y: 150, rotationDeg: 90 },
      { id: 'svc-2', kind: 'switch', x: 300, y: 8, rotationDeg: 0 },
    ]);
    const next = setLevelWalls(start.flat, rooms, start.levelId, rectEdges(0, 0, 250, 300));
    const room = next.rooms[start.roomId];
    const { issues } = runPlanChecks(room);
    expect(issues.filter((i) => i.code === 'service-off-wall')).toEqual([]);
  });
});
