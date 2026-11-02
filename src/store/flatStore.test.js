import { describe, it, expect, beforeEach } from 'vitest';
import { useFlatStore } from './flatStore.js';
import { buildTemplateFlat, rectsOverlap } from '../engine/flat.js';

const flatState = () => useFlatStore.getState();

describe('flatStore', () => {
  beforeEach(async () => {
    await flatState().createNewFlat('Test flat');
  });

  it('starts empty on a ground floor', () => {
    expect(flatState().mode).toBe('flat');
    expect(flatState().flat.spaces).toHaveLength(0);
    expect(flatState().flat.levels).toHaveLength(1);
  });

  it('adds rooms, bathrooms and corridors with their own room records', async () => {
    for (const kind of ['living', 'bathroom', 'corridor']) await flatState().addSpace(kind);
    const { flat, rooms } = flatState();
    expect(flat.spaces).toHaveLength(3);
    for (const space of flat.spaces) expect(rooms[space.roomId].flatId).toBe(flat.id);
    const bath = flat.spaces.find((s) => s.kind === 'bathroom');
    expect(rooms[bath.roomId].placedFurniture.map((f) => f.furnitureTypeId).sort()).toEqual(['shower-tray', 'toilet', 'wash-basin']);
    const corridor = flat.spaces.find((s) => s.kind === 'corridor');
    expect(rooms[corridor.roomId].doors).toHaveLength(2);
  });

  it('keeps spaces from overlapping when moved', async () => {
    const a = await flatState().addSpace('living');
    const b = await flatState().addSpace('bedroom');
    expect(flatState().moveSpace(b.id, a.x + 50, a.y + 50)).toBe(false);
    const moved = flatState().flat.spaces.find((s) => s.id === b.id);
    expect(rectsOverlap(moved, flatState().flat.spaces.find((s) => s.id === a.id))).toBe(false);
    // Flush to the right edge of the living room
    expect(flatState().moveSpace(b.id, a.x + a.widthCm + 6, a.y)).toBe(true);
    expect(flatState().flat.spaces.find((s) => s.id === b.id).x).toBe(a.x + a.widthCm);
  });

  it('resizes a space and refits its room', async () => {
    const s = await flatState().addSpace('bedroom');
    expect(await flatState().resizeSpace(s.id, 250, 260)).toBe(true);
    const room = flatState().rooms[s.roomId];
    expect(room.widthCm).toBe(250);
    expect(room.depthCm).toBe(260);
    for (const d of room.doors) expect(d.offsetCm + d.widthCm).toBeLessThanOrEqual(250);
  });

  it('refuses a resize that would hit a neighbour', async () => {
    const a = await flatState().addSpace('living');
    await flatState().addSpace('bedroom');
    expect(await flatState().resizeSpace(a.id, a.widthCm + 600, a.depthCm)).toBe(false);
  });

  it('moves a door to another wall', async () => {
    const s = await flatState().addSpace('bedroom');
    await flatState().setSpaceDoorWall(s.id, 'left');
    expect(flatState().rooms[s.roomId].doors[0].wall).toBe('left');
  });

  it('renames spaces and removes them with their rooms', async () => {
    const s = await flatState().addSpace('kitchen');
    await flatState().renameSpace(s.id, '  Cook room ');
    expect(flatState().rooms[s.roomId].name).toBe('Cook room');
    await flatState().removeSpace(s.id);
    expect(flatState().flat.spaces).toHaveLength(0);
    expect(flatState().rooms[s.roomId]).toBeUndefined();
  });

  it('adds, rotates and edits stairs on a level', () => {
    const stair = flatState().addStair('U');
    expect(flatState().flat.stairs).toHaveLength(1);
    expect(flatState().updateStair(stair.id, { rotationDeg: 100 })).toBe(true);
    expect(flatState().flat.stairs[0].rotationDeg).toBe(90);
    flatState().updateStair(stair.id, { widthCm: 5 });
    expect(flatState().flat.stairs[0].widthCm).toBe(70);
    flatState().updateStair(stair.id, { riseCm: 9999 });
    expect(flatState().flat.stairs[0].riseCm).toBe(450);
    flatState().removeStair(stair.id);
    expect(flatState().flat.stairs).toHaveLength(0);
  });

  it('supports several floors and drops a floor with its rooms', async () => {
    flatState().addLevel();
    expect(flatState().flat.levels).toHaveLength(2);
    const upper = flatState().levelId;
    await flatState().addSpace('bedroom');
    expect(flatState().flat.spaces[0].levelId).toBe(upper);
    await flatState().removeLevel(upper);
    expect(flatState().flat.levels).toHaveLength(1);
    expect(flatState().flat.spaces).toHaveLength(0);
  });

  it('stays on the plan when a space cannot be opened', async () => {
    const s = await flatState().addSpace('bedroom');
    // Rooms load from IndexedDB, which does not exist under test
    await flatState().openSpace(s.id);
    expect(flatState().mode).toBe('flat');
  });

  it('builds the two-bedroom template without overlaps', async () => {
    const { flat, rooms } = buildTemplateFlat('T');
    expect(flat.spaces).toHaveLength(6);
    expect(rooms).toHaveLength(6);
    for (let i = 0; i < flat.spaces.length; i++) {
      for (let j = i + 1; j < flat.spaces.length; j++) {
        expect(rectsOverlap(flat.spaces[i], flat.spaces[j])).toBe(false);
      }
    }
    await flatState().createNewFlat('Template', '2bhk');
    expect(flatState().flat.spaces).toHaveLength(6);
    expect(Object.keys(flatState().rooms)).toHaveLength(6);
  });
});
