/**
 * An exported picture frames the whole room itself instead of keeping the screen's crop, and puts the camera
 * back exactly as it was afterwards.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { framePicture } from './SnapshotBridge.jsx';
import { roomBox, roomCorners, screenPoint, WALL_HEIGHT_M } from './cameraFit.js';

const ROOMS = [
  [5, 4],
  [3, 3],
  [9, 6],
  [12, 3],
];
const ASPECTS = [16 / 9, 4 / 3, 1, 0.75];

describe('framing an exported picture', () => {
  for (const [w, d] of ROOMS)
    for (const aspect of ASPECTS)
      it(`a ${w} x ${d} m room fits a ${aspect.toFixed(2)} frame`, () => {
        const camera = new THREE.PerspectiveCamera(45, 1.4, 0.1, 100);
        camera.position.set(2, 2, 2.4); // the person has zoomed right in
        camera.lookAt(0, 0.25, 0);
        const box = roomBox(w, d, WALL_HEIGHT_M.full);
        const restore = framePicture(camera, { ...box, lookY: 0.35 }, aspect);
        const eye = [camera.position.x, camera.position.y, camera.position.z];
        const target = [0, 0.35, 0];
        for (const corner of roomCorners(box.widthM, box.depthM, box.heightM)) {
          const p = screenPoint(corner, eye, target, camera.fov, aspect);
          expect(p.depth, `${corner}`).toBeGreaterThan(0);
          expect(Math.abs(p.x), `across ${corner}`).toBeLessThanOrEqual(1);
          expect(Math.abs(p.y), `up ${corner}`).toBeLessThanOrEqual(1);
        }
        expect(camera.aspect).toBe(aspect);
        restore();
        expect(camera.position.toArray()).toEqual([2, 2, 2.4]);
        expect(camera.aspect).toBe(1.4);
      });

  it('keeps the angle the person is looking from', () => {
    const camera = new THREE.PerspectiveCamera(45, 1.4, 0.1, 100);
    camera.position.set(-3, 4, 0.5);
    const before = camera.position
      .clone()
      .sub(new THREE.Vector3(0, 0.35, 0))
      .normalize();
    framePicture(camera, { ...roomBox(5, 4, WALL_HEIGHT_M.full), lookY: 0.35 }, 1.5);
    const after = camera.position
      .clone()
      .sub(new THREE.Vector3(0, 0.35, 0))
      .normalize();
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(after.z).toBeCloseTo(before.z, 6);
  });

  it('stands back from a zoomed-in view rather than keeping its crop', () => {
    const camera = new THREE.PerspectiveCamera(45, 1.4, 0.1, 100);
    camera.position.set(1, 1.2, 1.4);
    const near = camera.position.length();
    framePicture(camera, { ...roomBox(6, 5, WALL_HEIGHT_M.full), lookY: 0.35 }, 1.6);
    expect(camera.position.length()).toBeGreaterThan(near * 2);
  });
});
