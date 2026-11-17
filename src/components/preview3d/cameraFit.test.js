/**
 * The 3D view frames the whole room: the opening view, Reset view and the exported pictures all put the camera
 * far enough back for the near corner to be in shot and clear of the floating toolbar.
 */
import { describe, it, expect } from 'vitest';
import {
  fitRoomView,
  screenPoint,
  roomCorners,
  VIEW_DIRECTION,
  WALL_HEIGHT_M,
} from './cameraFit.js';

const cornersOf = (w, d, h) => roomCorners(w, d, h);
/** Where a corner lands on screen for a fitted view. */
const project = (corner, fit, fovDeg, aspect) =>
  screenPoint(corner, fit.spot, [0, fit.lookY, 0], fovDeg, aspect);

const ROOMS = [
  [3, 2.5],
  [4, 4],
  [6, 4.5],
  [10, 8],
  [2, 2],
  [12, 3],
];
const VIEWPORTS = [
  [1280, 800],
  [1106, 830],
  [900, 1100],
  [600, 900],
];

describe('where a point lands on screen', () => {
  // A camera above and in front of the origin, looking at it
  const eye = [0, 5, 5];
  const target = [0, 0, 0];
  const at = (p) => screenPoint(p, eye, target, 45, 1);

  it('puts +x to the right, higher points up and nearer points down', () => {
    expect(at([1, 0, 0]).x).toBeGreaterThan(0);
    expect(at([-1, 0, 0]).x).toBeLessThan(0);
    expect(at([0, 2, 0]).y).toBeGreaterThan(0);
    expect(at([0, 0, 3]).y).toBeLessThan(0); // towards the camera: the near corner of a room
    expect(at([0, 0, -3]).y).toBeGreaterThan(0);
    expect(at([0, 0, 0]).x).toBeCloseTo(0, 9);
    expect(at([0, 0, 0]).y).toBeCloseTo(0, 9);
  });

  it('reports what is behind the camera as being behind it', () => {
    expect(at([0, 12, 12]).depth).toBeLessThan(0);
  });
});

describe('framing the 3D room', () => {
  for (const mode of ['cutaway', 'full'])
    for (const [w, d] of ROOMS)
      for (const [vw, vh] of VIEWPORTS)
        it(`${mode}: a ${w} x ${d} m room is whole on a ${vw} x ${vh} screen`, () => {
          const heightM = WALL_HEIGHT_M[mode];
          const bottomPx = 96; // the floating toolbar
          const fit = fitRoomView({
            widthM: w,
            depthM: d,
            heightM,
            direction: VIEW_DIRECTION[mode],
            fovDeg: 45,
            aspect: vw / vh,
            viewportPx: vh,
            bottomPx,
            lookY: mode === 'full' ? 0.35 : 0.25,
          });
          const band = (2 * bottomPx) / vh; // in [-1, 1] screen units
          for (const corner of cornersOf(w, d, heightM)) {
            const p = project(corner, fit, 45, vw / vh);
            expect(p.depth, `${corner}`).toBeGreaterThan(0);
            expect(Math.abs(p.x), `across ${corner}`).toBeLessThanOrEqual(1);
            expect(p.y, `top ${corner}`).toBeLessThanOrEqual(1);
            // clear of the toolbar along the bottom
            expect(p.y, `bottom ${corner}`).toBeGreaterThanOrEqual(-1 + band);
          }
        });

  it('frames an exported picture without the toolbar band, so it sits closer', () => {
    const base = { widthM: 6, depthM: 4.5, heightM: 2.4, fovDeg: 45, aspect: 16 / 9 };
    const screen = fitRoomView({ ...base, viewportPx: 800, bottomPx: 96 });
    const picture = fitRoomView({ ...base, viewportPx: 0, bottomPx: 0 });
    expect(picture.dist).toBeLessThan(screen.dist);
  });

  it('keeps the whole room in an exported picture at every shape of frame', () => {
    for (const [w, d] of ROOMS)
      for (const aspect of [16 / 9, 4 / 3, 1, 3 / 4]) {
        const fit = fitRoomView({
          widthM: w,
          depthM: d,
          heightM: 2.4,
          direction: VIEW_DIRECTION.full,
          fovDeg: 45,
          aspect,
          viewportPx: 0,
          bottomPx: 0,
          lookY: 0.35,
        });
        for (const corner of cornersOf(w, d, 2.4)) {
          const p = project(corner, fit, 45, aspect);
          expect(Math.abs(p.x), `${w}x${d} @${aspect}`).toBeLessThanOrEqual(1);
          expect(Math.abs(p.y), `${w}x${d} @${aspect}`).toBeLessThanOrEqual(1);
        }
      }
  });

  it('stands further back for a bigger room', () => {
    const at = (w, d) =>
      fitRoomView({
        widthM: w,
        depthM: d,
        heightM: 2.4,
        aspect: 1.5,
        viewportPx: 800,
        bottomPx: 96,
      }).dist;
    expect(at(3, 3)).toBeLessThan(at(6, 6));
    expect(at(6, 6)).toBeLessThan(at(12, 12));
  });

  it('survives a silly viewport without dividing by nothing', () => {
    for (const args of [
      { widthM: 4, depthM: 3, heightM: 2.4, aspect: 0, viewportPx: 0, bottomPx: 0 },
      { widthM: 4, depthM: 3, heightM: 2.4, aspect: 0.01, viewportPx: 10, bottomPx: 400 },
      { widthM: 0.5, depthM: 0.5, heightM: 0, aspect: 1, viewportPx: 100, bottomPx: 0 },
    ]) {
      const fit = fitRoomView(args);
      expect(Number.isFinite(fit.dist)).toBe(true);
      expect(fit.dist).toBeGreaterThan(0);
      expect(Number.isFinite(fit.lookY)).toBe(true);
    }
  });
});
