import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TOUR_DISABLED_KEY,
  initialTourState,
  hasSeenTour,
  isTourDisabled,
  markTourSeen,
  resetTour,
  shouldAutoStart,
  tourReducer,
} from './tourState.js';
import { TOUR_STEPS } from './tourSteps.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('location', { search: '' });
});
afterEach(() => vi.unstubAllGlobals());

describe('tour persistence', () => {
  it('starts on a first visit, then remembers it per tour', () => {
    expect(shouldAutoStart('room')).toBe(true);
    markTourSeen('room');
    expect(hasSeenTour('room')).toBe(true);
    expect(shouldAutoStart('room')).toBe(false);
    expect(shouldAutoStart('flat')).toBe(true);
  });

  it('can be reset so it shows again', () => {
    markTourSeen('flat');
    resetTour('flat');
    expect(shouldAutoStart('flat')).toBe(true);
  });

  it('is disabled by ?tour=0 or the localStorage flag', () => {
    expect(isTourDisabled('?tour=0')).toBe(true);
    expect(isTourDisabled('?x=1&tour=0')).toBe(true);
    expect(isTourDisabled('?tour=1')).toBe(false);
    localStorage.setItem(TOUR_DISABLED_KEY, '1');
    expect(isTourDisabled('')).toBe(true);
    expect(shouldAutoStart('room')).toBe(false);
  });

  it('does not throw when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => markTourSeen('room')).not.toThrow();
    expect(hasSeenTour('room')).toBe(false);
    expect(isTourDisabled('')).toBe(false);
    expect(() => resetTour('room')).not.toThrow();
  });
});

describe('tour reducer', () => {
  const started = tourReducer(initialTourState, { type: 'start', count: 3 });

  it('opens at the first step', () => {
    expect(started).toEqual({ open: true, index: 0, count: 3, finished: false });
    expect(tourReducer(initialTourState, { type: 'start', count: 0 }).open).toBe(false);
  });

  it('moves with next and prev and clamps at the start', () => {
    const second = tourReducer(started, { type: 'next' });
    expect(second.index).toBe(1);
    expect(tourReducer(second, { type: 'prev' }).index).toBe(0);
    expect(tourReducer(started, { type: 'prev' }).index).toBe(0);
  });

  it('finishes after the last step', () => {
    let s = started;
    s = tourReducer(s, { type: 'next' });
    s = tourReducer(s, { type: 'next' });
    expect(s.open).toBe(true);
    s = tourReducer(s, { type: 'next' });
    expect(s).toMatchObject({ open: false, finished: true });
  });

  it('skip closes and counts as finished; actions on a closed tour do nothing', () => {
    const closed = tourReducer(started, { type: 'close' });
    expect(closed).toMatchObject({ open: false, finished: true });
    expect(tourReducer(closed, { type: 'next' })).toBe(closed);
    expect(tourReducer(closed, { type: 'close' })).toBe(closed);
  });
});

describe('tour content', () => {
  it('has 4 to 6 steps per tour, each with a title and text', () => {
    for (const kind of ['room', 'flat']) {
      const steps = TOUR_STEPS[kind];
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps.length).toBeLessThanOrEqual(6);
      for (const step of steps) {
        expect(step.title).toBeTruthy();
        expect(step.body).toBeTruthy();
      }
    }
  });
});
