import { describe, it, expect } from 'vitest';
import { suggestLayout } from './layout.js';
import { evaluateAllCollisions, checkRoomBoundaryCollision } from './collision.js';
import { clampInsideRoom, applySnapping } from './snapping.js';
import { getClearanceZones } from './clearance.js';
import { buildBlockers, isBlocked, getWalkStart } from './walk.js';
import { getWallDistances } from './measure.js';
import { pieceOutsideOutline } from './roomShape.js';
import { resolveItemDef } from '../data/furnitureCatalog.js';

// An L: 500 x 200 along the top, 200 x 200 more down the left
const L = [
  [0, 0],
  [500, 0],
  [500, 200],
  [200, 200],
  [200, 400],
  [0, 400],
];
const room = (extra = {}) => ({
  id: 'r',
  widthCm: 500,
  depthCm: 400,
  outline: L,
  doors: [{ id: 'd', edge: 5, offsetCm: 20, widthCm: 90 }],
  windows: [{ id: 'w', edge: 0, offsetCm: 100, widthCm: 120 }],
  placedFurniture: [],
  ...extra,
});

describe('furniture in an L-shaped room', () => {
  it('flags a piece standing in the missing corner but not one inside', () => {
    const inside = { id: 'a', furnitureTypeId: 'coffee-table', x: 100, y: 300, rotationDeg: 0 };
    const notch = { id: 'b', furnitureTypeId: 'sofa-3seat', x: 380, y: 320, rotationDeg: 0 };
    const { boundaryCollidingIds } = evaluateAllCollisions([inside, notch], 500, 400, L);
    expect(boundaryCollidingIds.has('a')).toBe(false);
    expect(boundaryCollidingIds.has('b')).toBe(true);
    // Without the outline the bounding box lets the second one through
    expect(evaluateAllCollisions([notch], 500, 400).boundaryCollidingIds.has('b')).toBe(false);
  });

  it('checks the boundary against the outline too', () => {
    const piece = { x: 400, y: 320, widthCm: 100, depthCm: 80, rotationDeg: 0 };
    expect(checkRoomBoundaryCollision(piece, 500, 400, 0.1, L)).toBe(true);
    expect(checkRoomBoundaryCollision({ ...piece, x: 100 }, 500, 400, 0.1, L)).toBe(false);
  });

  it('clamps a dragged piece back inside the outline', () => {
    const piece = { x: 400, y: 330, widthCm: 100, depthCm: 80, rotationDeg: 0 };
    const spot = clampInsideRoom(piece, 500, 400, L);
    expect(pieceOutsideOutline({ ...piece, ...spot }, L)).toBe(false);
    const snapped = applySnapping(piece, 500, 400, { outline: L });
    expect(pieceOutsideOutline({ ...piece, x: snapped.x, y: snapped.y }, L)).toBe(false);
  });

  it('snaps a piece flush to a wall of the outline', () => {
    const piece = { x: 53, y: 100, widthCm: 100, depthCm: 80, rotationDeg: 0 };
    const snapped = applySnapping(piece, 500, 400, { outline: L });
    expect(snapped.snappedToWall).toBe(true);
    expect(snapped.x).toBe(50); // left edge on the wall at x = 0
  });

  it('measures the gap to the walls round a piece in the arm', () => {
    const d = getWallDistances({ x: 100, y: 300, rotationDeg: 0 }, 100, 60, 500, 400, L);
    expect(d.left).toBe(50);
    expect(d.right).toBe(50);
    expect(d.bottom).toBe(70);
  });
});

describe('layout suggestions in an L-shaped room', () => {
  it('places every piece inside the outline and clear of doors', () => {
    const r = room();
    const { placed, unplaced } = suggestLayout(r, [
      'sofa-3seat',
      'coffee-table',
      'media-console',
      'dining-table-4',
    ]);
    expect(unplaced).toEqual([]);
    expect(placed.length).toBe(4);
    for (const item of placed) {
      const def = resolveItemDef(item);
      expect(
        pieceOutsideOutline(
          {
            x: item.x,
            y: item.y,
            widthCm: def.widthCm,
            depthCm: def.depthCm,
            rotationDeg: item.rotationDeg,
          },
          L
        )
      ).toBe(false);
    }
  });
});

describe('door and window zones and the walkthrough', () => {
  it('puts clearance zones in front of openings on their edges', () => {
    const zones = getClearanceZones(room());
    expect(zones).toHaveLength(2);
    const door = zones.find((z) => z.kind === 'door');
    // Edge 5 runs north up the left side, so the zone is to its right (into the room)
    const xs = door.corners.map((c) => c.x);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(90);
  });

  it('skips openings on open edges', () => {
    const zones = getClearanceZones(room({ openEdges: [5] }));
    expect(zones.find((z) => z.kind === 'door')).toBeUndefined();
  });

  it('starts just inside the door and blocks the missing corner', () => {
    const r = room();
    const start = getWalkStart(r);
    const blockers = buildBlockers(r);
    expect(isBlocked(start.x, start.z, blockers)).toBe(false);
    // The notch, at plan (400, 300): metres from the centre
    expect(isBlocked((400 - 250) / 100, (300 - 200) / 100, blockers)).toBe(true);
    expect(isBlocked((100 - 250) / 100, (300 - 200) / 100, blockers)).toBe(false);
  });
});
