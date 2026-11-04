import { describe, it, expect } from 'vitest';
import { sanitizeImportedRoom, roomToJson } from './share.js';

const L = [
  [0, 0],
  [300, 0],
  [300, 100],
  [100, 100],
  [100, 300],
  [0, 300],
];

describe('sharing a room with an outline', () => {
  it('keeps the outline, open edges and edge openings through a round trip', () => {
    const room = {
      id: 'r',
      name: 'Hall',
      widthCm: 300,
      depthCm: 300,
      outline: L,
      openEdges: [2],
      doors: [{ id: 'd', edge: 5, offsetCm: 10, widthCm: 90 }],
      windows: [{ id: 'w', edge: 0, offsetCm: 50, widthCm: 120 }],
      placedFurniture: [],
    };
    const back = sanitizeImportedRoom(JSON.parse(roomToJson(room)));
    expect(back.outline).toEqual(L);
    expect(back.openEdges).toEqual([2]);
    expect(back.doors[0].edge).toBe(5);
    expect(back.doors[0].wall).toBeUndefined();
  });

  it('drops a broken outline and edge numbers, so the room is a plain rectangle', () => {
    const back = sanitizeImportedRoom({
      widthCm: 400,
      depthCm: 300,
      outline: [
        [0, 0],
        ['x', 1],
        [5, 5],
      ],
      doors: [{ id: 'd', edge: 3, offsetCm: 10, widthCm: 90 }],
    });
    expect(back.outline).toBeUndefined();
    expect(back.doors[0].edge).toBeUndefined();
    expect(back.doors[0].wall).toBe('bottom');
  });

  it('ignores open edges that do not exist and pulls corners inside the room box', () => {
    const back = sanitizeImportedRoom({
      widthCm: 300,
      depthCm: 300,
      outline: [
        [0, 0],
        [900, 0],
        [900, 300],
        [0, 300],
      ],
      openEdges: [1, 99, -2, 'a'],
    });
    expect(back.outline[1]).toEqual([300, 0]);
    expect(back.openEdges).toEqual([1]);
  });
});
