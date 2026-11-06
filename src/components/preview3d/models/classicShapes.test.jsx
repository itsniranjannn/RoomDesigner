import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  scatterLayout,
  classicBackPlane,
  classicCrestRim,
  outlineTopAt,
  headboardOutline,
  headboardOrnaments,
} from './classicShapes.jsx';
import { pillowVertices, shade } from './shared.jsx';

// Classic sofa / loveseat / armchair at small, normal and large resized widths
const SEATS = [
  {
    name: 'armchair',
    widthM: 0.55,
    depthM: 0.7,
    heightM: 0.85,
    seatH: 0.42,
    arm: 0.17,
    cane: true,
  },
  {
    name: 'armchair',
    widthM: 0.8,
    depthM: 0.85,
    heightM: 0.95,
    seatH: 0.42,
    arm: 0.17,
    cane: false,
  },
  { name: 'armchair', widthM: 1.2, depthM: 1.0, heightM: 0.95, seatH: 0.42, arm: 0.17, cane: true },
  { name: 'loveseat', widthM: 1.1, depthM: 0.8, heightM: 0.95, seatH: 0.44, arm: 0.1, cane: false },
  { name: 'sofa', widthM: 2.1, depthM: 0.95, heightM: 1.05, seatH: 0.44, arm: 0.1, cane: false },
  { name: 'sofa', widthM: 3.4, depthM: 1.1, heightM: 1.1, seatH: 0.44, arm: 0.1, cane: true },
];

function seatGeometry(s) {
  const armW = Math.min(0.2, Math.max(0.08, s.widthM * s.arm));
  const innerW = s.widthM - armW * 2;
  const backT = s.depthM * (s.cane ? 0.14 : 0.2);
  const plane = classicBackPlane({
    seatH: s.seatH,
    heightM: s.heightM,
    depthM: s.depthM,
    backT,
  });
  return { innerW, backT, plane };
}

describe('classic seat scatter cushions', () => {
  for (const s of SEATS) {
    for (const count of [1, 2, 3, 5]) {
      it(`${s.name} ${s.widthM} m, ${count} cushion(s): rest on the seat, lean on the back, stay inside`, () => {
        const { innerW, plane } = seatGeometry(s);
        const size = Math.min(0.45, Math.max(0.3, (innerW / (s.name === 'sofa' ? 3 : 1)) * 0.5));
        const { w, n, items } = scatterLayout({
          count,
          widthM: innerW,
          seatTop: s.seatH,
          plane,
          size,
        });
        expect(n).toBe(items.length);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(w).toBeLessThanOrEqual(innerW);
        const normal = new THREE.Vector3(...plane.normal);
        const point = new THREE.Vector3(...plane.point);
        for (const item of items) {
          const verts = pillowVertices([w, w * 0.4, w], item.rotation).map((v) =>
            v.add(new THREE.Vector3(...item.position))
          );
          const minY = Math.min(...verts.map((v) => v.y));
          const maxY = Math.max(...verts.map((v) => v.y));
          // lowest point is on the seat (a hair sunk into the upholstery), never floating or buried
          expect(minY).toBeGreaterThan(s.seatH - 0.02);
          expect(minY).toBeLessThan(s.seatH + 0.001);
          // never above the top of the chair back
          expect(maxY).toBeLessThan(s.heightM);
          for (const v of verts) {
            // nothing behind the back cushion face
            expect(normal.dot(v.clone().sub(point))).toBeGreaterThan(-1e-6);
            // between the arms
            expect(Math.abs(v.x)).toBeLessThanOrEqual(innerW / 2 + 1e-6);
          }
          // leaning back, not standing upright or lying flat
          expect(item.rotation[0]).toBeGreaterThan(0.2);
          expect(item.rotation[0]).toBeLessThan(0.9);
        }
      });
    }
  }

  it('shrinks and reduces the cushions on a very narrow seat', () => {
    const plane = classicBackPlane({ seatH: 0.44, heightM: 0.9, depthM: 0.8, backT: 0.12 });
    const { w, n } = scatterLayout({ count: 5, widthM: 0.3, seatTop: 0.44, plane, size: 0.45 });
    expect(w).toBeLessThanOrEqual(0.28);
    expect(n).toBeLessThanOrEqual(2);
  });
});

describe('classic sofa crest finials', () => {
  for (const widthM of [0.8, 1.5, 2.1, 3.4])
    for (const heightM of [0.8, 1.05, 1.4]) {
      it(`sit on the crest outline at ${widthM} x ${heightM} m`, () => {
        const { rim, finials } = classicCrestRim({ widthM, heightM, footH: 0.2 });
        expect(finials).toHaveLength(2);
        for (const f of finials) {
          const top = outlineTopAt(rim, f.x);
          expect(Number.isFinite(top)).toBe(true);
          // bottom of the ornament is at (slightly into) the crest edge, not hovering above it
          expect(f.y - f.r).toBeLessThanOrEqual(top + 1e-9);
          expect(f.y - f.r).toBeGreaterThan(top - 0.03);
          // and never above the peak of the crest
          expect(f.y).toBeLessThanOrEqual(heightM + 0.012 + 1e-9);
        }
      });
    }

  it('finds the top edge of an outline', () => {
    const tri = [
      [-1, 0],
      [0, 2],
      [1, 0],
    ];
    expect(outlineTopAt(tri, 0)).toBeCloseTo(2, 6);
    expect(outlineTopAt(tri, 0.5)).toBeCloseTo(1, 6);
    expect(outlineTopAt(tri, 5)).toBe(-Infinity);
  });
});

describe('carved bed headboard ornaments', () => {
  for (const crest of [1, 2])
    for (const widthM of [0.9, 1.6, 2.2])
      for (const heightM of [1.1, 1.5]) {
        it(`stay inside the outline (crest ${crest}, ${widthM} x ${heightM} m)`, () => {
          const mattressTop = 0.5;
          const shoulderY = Math.min(
            heightM,
            Math.max(mattressTop + 0.12, mattressTop + (heightM - mattressTop) * 0.62)
          );
          const frame = headboardOutline(widthM + 0.04, shoulderY, heightM, crest, 0.1);
          for (const o of headboardOrnaments(frame, heightM)) {
            const y = o.y;
            expect(y + o.r).toBeLessThanOrEqual(outlineTopAt(frame, o.x) + 1e-9);
            expect(y - o.r).toBeGreaterThan(mattressTop);
          }
        });
      }
});

describe('shade', () => {
  it('keeps a dark colour recognisably coloured instead of going black', () => {
    const c = new THREE.Color(shade('#2c5c64', -0.08));
    expect(c.r + c.g + c.b).toBeGreaterThan(0.05);
    expect(c.b).toBeGreaterThan(c.r);
  });
});
