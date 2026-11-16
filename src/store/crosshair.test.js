import { describe, it, expect, beforeEach } from 'vitest';
import {
  CROSSHAIR_BIG_STEP_CM,
  CROSSHAIR_STEP_CM,
  clampCrosshair,
  crosshairHome,
  crosshairWords,
  isCrosshairKey,
  nudgeCrosshair,
  usePlanningStore,
} from './planningStore.js';

const ROOM = { minX: 0, minY: 0, maxX: 500, maxY: 400 };

describe('keyboard crosshair arithmetic', () => {
  it('answers to the four arrows and nothing else', () => {
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
      expect(isCrosshairKey(key)).toBe(true);
    for (const key of ['Enter', 'Escape', ' ', 'a', 'Tab', 'constructor', 'toString'])
      expect(isCrosshairKey(key)).toBe(false);
  });

  it('starts in the middle of the plan, on the step grid', () => {
    expect(crosshairHome(ROOM)).toEqual({ x: 250, y: 200 });
    // 620 x 430: the middle is 310, 215, and 215 is moved onto the 10 cm grid
    expect(crosshairHome({ minX: 0, minY: 0, maxX: 620, maxY: 430 })).toEqual({ x: 310, y: 220 });
    // A plan that does not start at the origin still starts the crosshair in its middle
    expect(crosshairHome({ minX: 100, minY: 200, maxX: 300, maxY: 400 })).toEqual({
      x: 200,
      y: 300,
    });
  });

  it('moves 10 cm a step and 50 cm with Shift', () => {
    expect(CROSSHAIR_STEP_CM).toBe(10);
    expect(CROSSHAIR_BIG_STEP_CM).toBe(50);
    const home = crosshairHome(ROOM);
    expect(nudgeCrosshair(home, 'ArrowRight', false, ROOM)).toEqual({ x: 260, y: 200 });
    expect(nudgeCrosshair(home, 'ArrowLeft', false, ROOM)).toEqual({ x: 240, y: 200 });
    expect(nudgeCrosshair(home, 'ArrowUp', false, ROOM)).toEqual({ x: 250, y: 190 });
    expect(nudgeCrosshair(home, 'ArrowDown', false, ROOM)).toEqual({ x: 250, y: 210 });
    expect(nudgeCrosshair(home, 'ArrowRight', true, ROOM)).toEqual({ x: 300, y: 200 });
    expect(nudgeCrosshair(home, 'ArrowDown', true, ROOM)).toEqual({ x: 250, y: 250 });
  });

  it('stops at the walls instead of running off the plan', () => {
    expect(nudgeCrosshair({ x: 0, y: 0 }, 'ArrowLeft', true, ROOM)).toEqual({ x: 0, y: 0 });
    expect(nudgeCrosshair({ x: 0, y: 0 }, 'ArrowUp', false, ROOM)).toEqual({ x: 0, y: 0 });
    expect(nudgeCrosshair({ x: 500, y: 400 }, 'ArrowRight', true, ROOM)).toEqual({
      x: 500,
      y: 400,
    });
    expect(nudgeCrosshair({ x: 470, y: 400 }, 'ArrowRight', true, ROOM)).toEqual({
      x: 500,
      y: 400,
    });
  });

  it('reaches every wall exactly from its starting point', () => {
    let at = crosshairHome(ROOM);
    for (let i = 0; i < 40; i += 1) at = nudgeCrosshair(at, 'ArrowLeft', false, ROOM);
    expect(at).toEqual({ x: 0, y: 200 });
    for (let i = 0; i < 60; i += 1) at = nudgeCrosshair(at, 'ArrowRight', false, ROOM);
    expect(at).toEqual({ x: 500, y: 200 });
  });

  it('clamps and rounds a point from anywhere, whichever way the bounds are given', () => {
    expect(clampCrosshair({ x: -40, y: 10.4 }, ROOM)).toEqual({ x: 0, y: 10 });
    expect(clampCrosshair({ x: 712.6, y: 900 }, ROOM)).toEqual({ x: 500, y: 400 });
    expect(clampCrosshair({ x: 250, y: 200 }, { minX: 500, maxX: 0, minY: 400, maxY: 0 })).toEqual({
      x: 250,
      y: 200,
    });
  });

  it('reads a position out in plain words', () => {
    expect(crosshairWords({ x: 250, y: 200 })).toBe('250 cm across, 200 cm down');
  });

  it('ignores a key it does not know but still clamps the point', () => {
    expect(nudgeCrosshair({ x: 900, y: 10 }, 'Enter', false, ROOM)).toEqual({ x: 500, y: 10 });
  });
});

describe('the crosshair in the planning store', () => {
  beforeEach(() => {
    usePlanningStore.setState({
      panel: null,
      placeKind: null,
      selectedServiceId: null,
      crosshair: null,
      crosshairStatus: '',
    });
  });

  it('holds the crosshair with the line read out about it', () => {
    usePlanningStore.getState().setCrosshair({ x: 10, y: 20 }, 'Crosshair at 10 cm across');
    expect(usePlanningStore.getState().crosshair).toEqual({ x: 10, y: 20 });
    expect(usePlanningStore.getState().crosshairStatus).toBe('Crosshair at 10 cm across');
    usePlanningStore.getState().sayCrosshair('Socket placed');
    expect(usePlanningStore.getState().crosshair).toEqual({ x: 10, y: 20 });
    expect(usePlanningStore.getState().crosshairStatus).toBe('Socket placed');
  });

  it('clears the crosshair without a pointless state change', () => {
    let changes = 0;
    const stop = usePlanningStore.subscribe(() => {
      changes += 1;
    });
    usePlanningStore.getState().clearCrosshair();
    expect(changes).toBe(0);
    usePlanningStore.getState().setCrosshair({ x: 1, y: 2 }, 'here');
    usePlanningStore.getState().clearCrosshair();
    expect(usePlanningStore.getState().crosshair).toBeNull();
    expect(usePlanningStore.getState().crosshairStatus).toBe('');
    stop();
  });

  it('drops the crosshair when placing starts, stops or is escaped', () => {
    usePlanningStore.getState().startPlacing('socket');
    usePlanningStore.getState().setCrosshair({ x: 30, y: 40 }, 'here');
    usePlanningStore.getState().stopPlacing();
    expect(usePlanningStore.getState().crosshair).toBeNull();

    usePlanningStore.getState().startPlacing('socket');
    usePlanningStore.getState().setCrosshair({ x: 30, y: 40 }, 'here');
    // One Escape clears the mark and leaves placing, as one click of Done would
    expect(usePlanningStore.getState().escape()).toBe(true);
    expect(usePlanningStore.getState().placeKind).toBeNull();
    expect(usePlanningStore.getState().crosshair).toBeNull();
    expect(usePlanningStore.getState().crosshairStatus).toBe('');

    usePlanningStore.getState().selectService('svc-1');
    usePlanningStore.getState().setCrosshair({ x: 30, y: 40 }, 'here');
    expect(usePlanningStore.getState().escape()).toBe(true);
    expect(usePlanningStore.getState().crosshair).toBeNull();

    usePlanningStore.getState().setCrosshair({ x: 30, y: 40 }, 'here');
    usePlanningStore.getState().closePanel();
    expect(usePlanningStore.getState().crosshair).toBeNull();
  });
});
