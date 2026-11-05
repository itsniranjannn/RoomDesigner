import { describe, it, expect } from 'vitest';
import {
  WALK_SPEED,
  RUN_SPEED,
  wishDirection,
  stepWalker,
  nearestFree,
  circleHitsBox,
  clearAhead,
  clearestYaw,
} from './walkMove.js';
import { buildPresetFlat } from './flatPresets.js';
import { flatWalkStart, levelObstacles, isFlatBlocked } from './flatWalk.js';
import { PLAYER_RADIUS } from './walk.js';

const open = () => true;
const rest = { x: 0, z: 0, vx: 0, vz: 0 };

/** Walk for `seconds` at 60 fps with a constant input. */
function walk(state, input, yaw, seconds, isFree = open) {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60) s = stepWalker(s, input, yaw, 1 / 60, isFree);
  return s;
}

describe('walking direction', () => {
  it('forward is -z at yaw 0, +x when turned right a quarter, and A/D sidestep', () => {
    const f = wishDirection(1, 0, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(-1);
    const r = wishDirection(1, 0, -Math.PI / 2);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
    const right = wishDirection(0, 1, 0);
    expect(right.x).toBeCloseTo(1);
    expect(right.z).toBeCloseTo(0);
    expect(wishDirection(0, 0, 1)).toEqual({ x: 0, z: 0 });
  });

  it('does not walk faster on a diagonal', () => {
    const d = wishDirection(1, 1, 0.7);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
  });
});

describe('speed', () => {
  it('walks about 1.4 m in a second and runs faster', () => {
    const w = walk(rest, { forward: 1, strafe: 0 }, 0, 2);
    // 2 s: the first tenth of a second is spent getting up to speed
    expect(w.z).toBeLessThan(-2.5);
    expect(w.z).toBeGreaterThan(-2 * WALK_SPEED);
    const r = walk(rest, { forward: 1, strafe: 0, run: true }, 0, 2);
    expect(-r.z).toBeGreaterThan(-w.z * 1.5);
    expect(-r.z).toBeLessThan(2 * RUN_SPEED);
  });

  it('is the same distance at 30 and 120 frames a second', () => {
    const run = (fps) => {
      let s = rest;
      for (let i = 0; i < fps * 2; i++)
        s = stepWalker(s, { forward: 1, strafe: 0 }, 0, 1 / fps, open);
      return s.z;
    };
    expect(run(30)).toBeCloseTo(run(120), 1);
  });

  it('simulates a long frame in slices and never more than a quarter second', () => {
    const s = stepWalker(rest, { forward: 1, strafe: 0 }, 0, 5, open);
    expect(-s.z).toBeLessThan(WALK_SPEED * 0.25 + 1e-6);
    expect(s.z).toBeLessThan(0);
  });

  it('stops within a tenth of a second or so when the key is released', () => {
    let s = walk(rest, { forward: 1, strafe: 0 }, 0, 1);
    const z0 = s.z;
    s = walk(s, { forward: 0, strafe: 0 }, 0, 1);
    expect(z0 - s.z).toBeLessThan(0.2);
    expect(Math.hypot(s.vx, s.vz)).toBeLessThan(0.01);
  });
});

describe('walls and furniture', () => {
  const wallAhead = (x, z) => z > -2; // everything beyond z = -2 is free, but x is always free

  it('stops at a wall that is straight ahead', () => {
    const s = walk(rest, { forward: 1, strafe: 0 }, 0, 4, (x, z) => z > -1);
    expect(s.z).toBeGreaterThan(-1);
    expect(s.z).toBeLessThan(-0.9);
  });

  it('slides along a wall instead of stopping dead', () => {
    // A wall at x = 1 (blocked for x >= 1); walking diagonally into it keeps going along z
    const yaw = -Math.PI / 4; // forward is +x and -z
    const s = walk(rest, { forward: 1, strafe: 0 }, yaw, 3, (x) => x < 1);
    expect(s.x).toBeLessThan(1);
    expect(s.z).toBeLessThan(-1.5);
    expect(wallAhead(0, 0)).toBe(true);
  });

  it('glides round the corner of a table nearly ahead rather than catching on it', () => {
    const table = (x, z) => !circleHitsBox(x, z, PLAYER_RADIUS, 0.7, -1.6, 0.55, 0.3, 0);
    const s = walk(rest, { forward: 1, strafe: 0 }, 0, 6, table);
    expect(s.z).toBeLessThan(-2.5); // got past it
  });

  it('can start walking when it already stands inside something', () => {
    const inside = (x, z) => Math.hypot(x, z) > 0.3;
    const s = walk(rest, { forward: 1, strafe: 0 }, 0, 1, inside);
    expect(Math.hypot(s.x, s.z)).toBeGreaterThan(0.3);
  });

  it('passes through a 90 cm door gap with the body radius of 22 cm', () => {
    // Walls at z = 0 with a gap of 0.9 m centred on x = 0.1 (not perfectly centred)
    const gap = (x, z) => {
      const wall = { x0: -3, x1: 3, z0: -0.06, z1: 0.06 };
      const inGap = x - 0.1 > -0.45 + 0 && x - 0.1 < 0.45;
      if (inGap) return true;
      const nx = Math.max(wall.x0, Math.min(wall.x1, x));
      const nz = Math.max(wall.z0, Math.min(wall.z1, z));
      return (x - nx) ** 2 + (z - nz) ** 2 >= PLAYER_RADIUS ** 2;
    };
    const s = walk({ x: 0.1, z: 1.5, vx: 0, vz: 0 }, { forward: 1, strafe: 0 }, 0, 3, gap);
    expect(s.z).toBeLessThan(-0.5);
  });
});

describe('start position', () => {
  it('finds the nearest clear spot, or none', () => {
    const blockedNear = (x, z) => Math.hypot(x - 1, z - 1) > 0.5;
    const p = nearestFree(1, 1, blockedNear);
    expect(Math.hypot(p.x - 1, p.z - 1)).toBeLessThan(0.7);
    expect(blockedNear(p.x, p.z)).toBe(true);
    expect(nearestFree(0, 0, () => true)).toEqual({ x: 0, z: 0 });
    expect(nearestFree(0, 0, () => false)).toBeNull();
  });

  it('turns the start a little when furniture stands straight ahead', () => {
    const blocked = (x, z) => !(Math.abs(x) < 0.4 && z < -0.8 && z > -1.4); // a table ahead
    const free = (x, z) => blocked(x, z);
    expect(clearAhead(0, 0, 0, free)).toBeLessThan(1);
    const yaw = clearestYaw(0, 0, 0, free);
    expect(yaw).not.toBe(0);
    expect(clearAhead(0, 0, yaw, free)).toBeGreaterThanOrEqual(2);
    // already clear: unchanged
    expect(clearestYaw(0, 0, 0, open)).toBe(0);
  });

  it('lets the visitor of the 2BHK preset walk straight in from the front door', () => {
    const { flat, rooms } = buildPresetFlat('2bhk', {});
    const start = flatWalkStart(flat, rooms);
    const obstacles = levelObstacles(flat, rooms, start.levelId);
    const free = (x, z) => !isFlatBlocked(x, z, obstacles);
    expect(free(start.x, start.z)).toBe(true);
    // two metres of clear floor in front of the first step
    expect(clearAhead(start.x, start.z, start.yaw, free)).toBeGreaterThanOrEqual(2);
    // and W really takes the visitor forward
    const s = walk(
      { x: start.x, z: start.z, vx: 0, vz: 0 },
      { forward: 1, strafe: 0 },
      start.yaw,
      3,
      free
    );
    expect(Math.hypot(s.x - start.x, s.z - start.z)).toBeGreaterThan(2);
  });
});

describe('rounded furniture corners', () => {
  it('lets a body pass a box corner that a square test would block', () => {
    // box half sizes 0.5; body of radius 0.22 at the diagonal 0.17 off the corner
    expect(circleHitsBox(0.5 + 0.17, 0.5 + 0.17, 0.22, 0, 0, 0.5, 0.5, 0)).toBe(false);
    expect(circleHitsBox(0.5 + 0.1, 0.2, 0.22, 0, 0, 0.5, 0.5, 0)).toBe(true);
  });

  it('respects the rotation of the box', () => {
    // a long thin box turned a quarter: now it is long in z
    expect(circleHitsBox(0, 1.25, 0.2, 0, 0, 1.0, 0.1, Math.PI / 2)).toBe(false);
    expect(circleHitsBox(0, 1.1, 0.2, 0, 0, 1.0, 0.1, Math.PI / 2)).toBe(true);
    expect(circleHitsBox(0.35, 0, 0.2, 0, 0, 1.0, 0.1, Math.PI / 2)).toBe(false);
  });
});
