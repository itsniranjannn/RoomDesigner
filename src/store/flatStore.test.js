import { describe, it, expect, beforeEach } from 'vitest';
import { useFlatStore } from './flatStore.js';
import { edgeKey } from '../engine/flatWalls.js';
import { levelEdges, openingsOf, exteriorDoors } from '../engine/flatPlan.js';

const st = () => useFlatStore.getState();

describe('flatStore', () => {
  beforeEach(async () => {
    await st().createNewFlat('Test flat');
  });

  it('starts blank on a ground floor', () => {
    expect(st().mode).toBe('flat');
    expect(st().flat.spaces).toHaveLength(0);
    expect(st().flat.levels).toHaveLength(1);
    expect(st().canUndo).toBe(false);
  });

  it('draws walls into a room, splits it, and undoes and redoes each step', () => {
    st().addWall(0, 0, 400, 0);
    st().addWall(400, 0, 400, 300);
    st().addWall(400, 300, 0, 300);
    expect(st().flat.spaces).toHaveLength(0);
    st().addWall(0, 300, 0, 0);
    expect(st().flat.spaces).toHaveLength(1);
    const space = st().flat.spaces[0];
    expect(space).toMatchObject({ widthCm: 400, depthCm: 300, furnishable: true });
    expect(st().rooms[space.roomId]).toMatchObject({ widthCm: 400, flatId: st().flat.id });

    st().addWall(200, 0, 200, 300);
    expect(st().flat.spaces).toHaveLength(2);
    expect(Object.keys(st().rooms)).toHaveLength(2);

    st().undo();
    expect(st().flat.spaces).toHaveLength(1);
    expect(Object.keys(st().rooms)).toHaveLength(1);
    expect(st().canRedo).toBe(true);
    st().redo();
    expect(st().flat.spaces).toHaveLength(2);
    // a repeated wall changes nothing and is not an undo step
    const depth = st().past.length;
    expect(st().addWall(200, 0, 200, 300)).toBe(false);
    expect(st().past.length).toBe(depth);
  });

  it('erases a wall run to merge two rooms and keeps the name of the larger one', () => {
    st().applyPreset('shell', { widthCm: 600, depthCm: 400 });
    expect(st().flat.spaces).toHaveLength(1);
    const id = st().flat.spaces[0].id;
    st().setSpaceMeta(id, { name: 'Hall', kind: 'living' });
    st().addWall(400, 0, 400, 400);
    expect(st().flat.spaces).toHaveLength(2);
    expect(st().eraseWall(edgeKey('v', 40, 5))).toBe(true);
    expect(st().flat.spaces).toHaveLength(1);
    expect(st().flat.spaces[0]).toMatchObject({ name: 'Hall', kind: 'living', id });
  });

  it('places and removes doors and windows and sets room kind, name and furniture', () => {
    st().applyPreset('shell', { widthCm: 500, depthCm: 400 });
    const id = st().flat.spaces[0].id;
    const levelId = st().levelId;
    const doorsBefore = openingsOf(st().flat, levelId).length;
    const placed = st().placeOpening({ type: 'door', axis: 'v', line: 0, start: 100, widthCm: 90 });
    expect(placed).not.toBeNull();
    expect(openingsOf(st().flat, levelId)).toHaveLength(doorsBefore + 1);
    expect(st().rooms[st().flat.spaces[0].roomId].doors.some((d) => d.wall === 'left')).toBe(true);
    expect(
      st().placeOpening({ type: 'window', axis: 'v', line: 100, start: 100, widthCm: 90 })
    ).toBeNull();
    expect(st().removeOpening(placed.id)).toBe(true);
    expect(openingsOf(st().flat, levelId)).toHaveLength(doorsBefore);

    st().setSpaceMeta(id, { name: 'Master', kind: 'bedroom' });
    expect(st().rooms[st().flat.spaces[0].roomId]).toMatchObject({
      name: 'Master',
      kind: 'bedroom',
    });
    st().furnishSpace(id);
    expect(st().rooms[st().flat.spaces[0].roomId].placedFurniture.length).toBeGreaterThan(0);
  });

  it('fills an empty plan from a preset only once', () => {
    expect(st().applyPreset('2bhk')).toBe(true);
    expect(st().flat.spaces.length).toBeGreaterThanOrEqual(8);
    for (const room of Object.values(st().rooms)) expect(room.flatId).toBe(st().flat.id);
    expect(st().applyPreset('3bhk')).toBe(false);
    st().undo();
    expect(st().flat.spaces).toHaveLength(0);
    expect(Object.keys(st().rooms)).toHaveLength(0);
  });

  it('adds, rotates and edits stairs on a floor', () => {
    const stair = st().addStair('U', 100, 100);
    expect(st().flat.stairs).toHaveLength(1);
    expect(st().updateStair(stair.id, { rotationDeg: 100 })).toBe(true);
    expect(st().flat.stairs[0].rotationDeg).toBe(90);
    st().updateStair(stair.id, { widthCm: 5 });
    expect(st().flat.stairs[0].widthCm).toBe(70);
    st().updateStair(stair.id, { riseCm: 9999 });
    expect(st().flat.stairs[0].riseCm).toBe(1200);
    st().updateStair(stair.id, { x: 233, y: 41 });
    expect(st().flat.stairs[0]).toMatchObject({ x: 230, y: 40 });
    st().removeStair(stair.id);
    expect(st().flat.stairs).toHaveLength(0);
  });

  it('supports several floors, each with its own walls, and drops a floor with its rooms', () => {
    st().applyPreset('shell', { widthCm: 400, depthCm: 300 });
    st().addLevel();
    expect(st().flat.levels).toHaveLength(2);
    const upper = st().levelId;
    st().addWall(0, 0, 300, 0);
    expect(levelEdges(st().flat, upper).size).toBe(30);
    st().addWall(300, 0, 300, 200);
    st().addWall(300, 200, 0, 200);
    st().addWall(0, 200, 0, 0);
    expect(st().flat.spaces.filter((s) => s.levelId === upper)).toHaveLength(1);
    const roomId = st().flat.spaces.find((s) => s.levelId === upper).roomId;
    st().removeLevel(upper);
    expect(st().flat.levels).toHaveLength(1);
    expect(st().flat.spaces.every((s) => s.levelId !== upper)).toBe(true);
    expect(st().rooms[roomId]).toBeUndefined();
  });

  it('deletes the selected wall run, opening or stair', () => {
    st().applyPreset('shell', { widthCm: 400, depthCm: 300 });
    st().select({ type: 'wall', id: edgeKey('h', 5, 0) });
    expect(st().deleteSelected()).toBe(true);
    expect(st().flat.spaces).toHaveLength(0); // the outer shell is open, so no room remains
    st().undo();
    expect(st().flat.spaces).toHaveLength(1);
    const stair = st().addStair('straight', 50, 50);
    st().select({ type: 'stair', id: stair.id });
    expect(st().deleteSelected()).toBe(true);
    expect(st().flat.stairs).toHaveLength(0);
  });

  it('stays on the plan when a room cannot be opened', async () => {
    st().applyPreset('shell', { widthCm: 400, depthCm: 300 });
    // Rooms load from IndexedDB, which does not exist under test
    await st().openSpace(st().flat.spaces[0].id);
    expect(st().mode).toBe('flat');
  });

  it('builds each starting point', async () => {
    for (const [preset, rooms] of [
      ['studio', 3],
      ['1bhk', 5],
      ['2bhk', 8],
      ['3bhk', 10],
    ]) {
      await st().createNewFlat(`p-${preset}`, preset);
      expect(st().flat.spaces).toHaveLength(rooms);
      expect(Object.keys(st().rooms)).toHaveLength(rooms);
    }
  });

  it('places, edits and rotates a passage, undoing and redoing each step', () => {
    const spec = { x: 200, y: 200, lengthCm: 300, widthCm: 120, heading: 0 };
    const placed = st().placePassage(spec);
    expect(placed.ok).toBe(true);
    expect(st().selected).toEqual({ type: 'space', id: placed.spaceId });
    expect(st().flat.spaces[0]).toMatchObject({ kind: 'passage', name: 'Passage 1', widthCm: 300 });

    expect(st().editPassage(placed.spaceId, { widthCm: 150 }).ok).toBe(true);
    expect(st().flat.spaces[0]).toMatchObject({ depthCm: 150 });
    const turned = st().editPassage(placed.spaceId, { turns: 1 });
    expect(turned.ok).toBe(true);
    expect(st().flat.spaces[0]).toMatchObject({ heading: 90, widthCm: 150, depthCm: 300 });

    st().undo();
    expect(st().flat.spaces[0]).toMatchObject({ heading: 0, widthCm: 300, depthCm: 150 });
    st().undo();
    st().undo();
    expect(st().flat.spaces).toHaveLength(0);
    st().redo();
    expect(st().flat.spaces[0]).toMatchObject({ kind: 'passage', depthCm: 120 });
  });

  it('refuses a passage on top of a room and leaves the history alone', () => {
    st().applyPreset('shell', { widthCm: 600, depthCm: 400 });
    const depth = st().past.length;
    const res = st().placePassage({ x: 100, y: 100, lengthCm: 300, widthCm: 120, heading: 0 });
    expect(res.error).toMatch(/overlaps/);
    expect(st().past.length).toBe(depth);
  });
});

describe('main entrance and staircases of the user choice', () => {
  beforeEach(async () => {
    await st().createNewFlat('Test flat');
  });

  it('sets, replaces and clears the main entrance, refusing inner doors', () => {
    st().applyPreset('2bhk');
    const levelId = st().levelId;
    const doors = openingsOf(st().flat, levelId).filter((o) => o.type === 'door');
    const outer = exteriorDoors(st().flat);
    expect(outer.length).toBeGreaterThan(0);
    const inner = doors.find((d) => !outer.some((o) => o.opening.id === d.id));
    expect(st().setEntrance(inner.id).error).toMatch(/outer wall/);
    expect(st().flat.entranceId).toBeUndefined();
    expect(st().setEntrance(outer[0].opening.id)).toEqual({ ok: true });
    expect(st().flat.entranceId).toBe(outer[0].opening.id);
    expect(st().canUndo).toBe(true);
    st().undo();
    expect(st().flat.entranceId).toBeUndefined();
    st().redo();
    expect(st().setEntrance(null)).toEqual({ ok: true });
    expect(st().flat.entranceId).toBeUndefined();
  });

  it('forgets the entrance when its door is removed', () => {
    st().applyPreset('shell', { widthCm: 400, depthCm: 300 });
    const door = openingsOf(st().flat, st().levelId).find((o) => o.type === 'door');
    st().setEntrance(door.id);
    expect(st().flat.entranceId).toBe(door.id);
    st().removeOpening(door.id);
    expect(st().flat.entranceId).toBeUndefined();
  });

  it('places a staircase between chosen floors and edits steps and destination', () => {
    st().applyPreset('shell', { widthCm: 600, depthCm: 400 });
    const ground = st().levelId;
    st().addLevel();
    st().addLevel();
    const [, f1, f2] = st().flat.levels.map((l) => l.id);
    st().setLevel(ground);
    const stair = st().addStair('L', 100, 100, 90, { widthCm: 90, toLevelId: f2, steps: 30 });
    expect(stair).toMatchObject({ widthCm: 90, toLevelId: f2, riseCm: 560, rotationDeg: 90 });
    expect(st().flat.stairs[0].steps).toBe(30);
    st().updateStair(stair.id, { toLevelId: f1 });
    expect(st().flat.stairs[0]).toMatchObject({ toLevelId: f1, riseCm: 280 });
    st().updateStair(stair.id, { steps: 3 });
    expect(st().flat.stairs[0].steps).toBeGreaterThanOrEqual(2);
    st().updateStair(stair.id, { steps: null });
    expect(st().flat.stairs[0].steps).toBeUndefined();
    // a floor that is not above cannot be the destination: it falls back to the floor above
    st().updateStair(stair.id, { toLevelId: ground });
    expect(st().flat.stairs[0]).toMatchObject({ toLevelId: f1, riseCm: 280 });
    st().undo();
    st().undo();
    expect(st().flat.stairs).toHaveLength(1);
    st().deleteSelected();
    st().select({ type: 'stair', id: stair.id });
    expect(st().deleteSelected()).toBe(true);
    expect(st().flat.stairs).toHaveLength(0);
  });
});
