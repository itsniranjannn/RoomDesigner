import { describe, it, expect } from 'vitest';
import { resizeSpan, moveSpan, clampOpening, isResizable, DOOR_WIDTH_CM } from './openings.js';

const wall = { lo: 15, hi: 485 };

describe('resizeSpan', () => {
  it('stretches a window from its end and snaps to the grid', () => {
    expect(resizeSpan({ side: 'end', start: 100, width: 120, pointer: 283, ...wall })).toEqual({
      start: 100,
      width: 180,
    });
  });

  it('stretches from the start while the end stays put', () => {
    expect(resizeSpan({ side: 'start', start: 100, width: 120, pointer: 52, ...wall })).toEqual({
      start: 50,
      width: 170,
    });
  });

  it('never gets narrower than 40 cm', () => {
    expect(resizeSpan({ side: 'end', start: 100, width: 120, pointer: 110, ...wall }).width).toBe(
      40
    );
    expect(resizeSpan({ side: 'start', start: 100, width: 120, pointer: 400, ...wall })).toEqual({
      start: 180,
      width: 40,
    });
  });

  it('stays inside the wall', () => {
    expect(resizeSpan({ side: 'end', start: 400, width: 60, pointer: 900, ...wall }).width).toBe(
      85
    );
    expect(resizeSpan({ side: 'start', start: 40, width: 60, pointer: -50, ...wall })).toEqual({
      start: 15,
      width: 85,
    });
  });

  it('stops at a neighbouring opening', () => {
    const others = [{ start: 300, width: 90 }];
    expect(
      resizeSpan({ side: 'end', start: 100, width: 100, pointer: 380, others, ...wall }).width
    ).toBe(200);
    const before = [{ start: 20, width: 80 }];
    expect(
      resizeSpan({ side: 'start', start: 200, width: 100, pointer: 40, others: before, ...wall })
    ).toEqual({ start: 100, width: 200 });
  });

  it('caps the width at the window maximum', () => {
    expect(resizeSpan({ side: 'end', start: 20, width: 100, pointer: 480, ...wall }).width).toBe(
      300
    );
  });

  it('leaves a window alone when it cannot move', () => {
    const others = [{ start: 130, width: 50 }];
    expect(
      resizeSpan({ side: 'end', start: 100, width: 30, pointer: 300, others, ...wall })
    ).toEqual({
      start: 100,
      width: 30,
    });
  });
});

describe('moveSpan', () => {
  it('snaps and clamps to the wall', () => {
    expect(moveSpan({ start: 100, width: 90, delta: 33, ...wall })).toBe(130);
    expect(moveSpan({ start: 100, width: 90, delta: -500, ...wall })).toBe(15);
    expect(moveSpan({ start: 100, width: 90, delta: 900, ...wall })).toBe(395);
  });

  it('does not overlap a neighbour', () => {
    const others = [{ start: 200, width: 120 }];
    const s = moveSpan({ start: 60, width: 90, delta: 100, others, ...wall });
    expect(s + 90 <= 200 || s >= 320).toBe(true);
    expect(s).toBe(110);
  });

  it('hops to the free side when dropped on a neighbour', () => {
    const others = [{ start: 200, width: 120 }];
    expect(moveSpan({ start: 60, width: 90, delta: 190, others, ...wall })).toBe(320);
  });
});

describe('door and window rules', () => {
  it('only windows stretch', () => {
    expect(isResizable('window')).toBe(true);
    expect(isResizable('door')).toBe(false);
  });

  it('forces the standard door width', () => {
    expect(clampOpening('door', 50, 150, 400).widthCm).toBe(DOOR_WIDTH_CM);
    expect(clampOpening('window', 50, 150, 400).widthCm).toBe(150);
  });
});
