/**
 * Channel tufting, fluting and reeding: rows of rounded ribs swept along a path, all merged into one mesh so a
 * channel-tufted sofa or a fluted door costs a single draw call however many channels it has.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Samples a path through 2D corner points (u, v), rounding every inner corner with radius `radius`.
 * Returns points with their unit outward normals; `flip` picks which side of the path is "out".
 */
export function roundedPath(corners, radius, flip = false, arc = 6) {
  const out = [];
  const push = (u, v, nu, nv) => out.push({ p: [u, v], n: [nu, nv] });
  const normalOf = (du, dv) => {
    const len = Math.hypot(du, dv) || 1;
    // left normal of the travel direction (or the right one when flipped)
    return flip ? [dv / len, -du / len] : [-dv / len, du / len];
  };
  for (let i = 0; i < corners.length; i++) {
    const [u, v] = corners[i];
    if (i === 0 || i === corners.length - 1) {
      const [a, b] = i === 0 ? [corners[0], corners[1]] : [corners[i - 1], corners[i]];
      const [nu, nv] = normalOf(b[0] - a[0], b[1] - a[1]);
      push(u, v, nu, nv);
      continue;
    }
    const [pu, pv] = corners[i - 1];
    const [qu, qv] = corners[i + 1];
    const inLen = Math.hypot(u - pu, v - pv) || 1;
    const outLen = Math.hypot(qu - u, qv - v) || 1;
    const d1 = [(u - pu) / inLen, (v - pv) / inLen];
    const d2 = [(qu - u) / outLen, (qv - v) / outLen];
    const n1 = normalOf(d1[0], d1[1]);
    const n2 = normalOf(d2[0], d2[1]);
    const turn = Math.abs(Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]));
    // Distance from the corner to where the round starts, kept within both edges
    const tan = Math.tan(turn / 2);
    const r =
      tan > 1e-6 ? Math.max(0, Math.min(radius, (Math.min(inLen, outLen) * 0.49) / tan)) : 0;
    if (r === 0) {
      push(u, v, (n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2);
      continue;
    }
    const a = [u - d1[0] * r * tan, v - d1[1] * r * tan];
    // The corner circle's centre is on the inside of the turn
    const side = Math.sign(n1[0] * d2[0] + n1[1] * d2[1]) || 1;
    const c = [a[0] + n1[0] * r * side, a[1] + n1[1] * r * side];
    const steps = Math.max(1, Math.round((arc * turn) / (Math.PI / 2)));
    const a1 = Math.atan2(n1[1], n1[0]);
    let a2 = Math.atan2(n2[1], n2[0]);
    while (a2 - a1 > Math.PI) a2 -= Math.PI * 2;
    while (a2 - a1 < -Math.PI) a2 += Math.PI * 2;
    for (let s = 0; s <= steps; s++) {
      const ang = a1 + ((a2 - a1) * s) / steps;
      const nn = [Math.cos(ang), Math.sin(ang)];
      push(c[0] - nn[0] * r * side, c[1] - nn[1] * r * side, nn[0], nn[1]);
    }
  }
  return out;
}

/**
 * Geometry for side-by-side ribs (channels). Each rib is a half-tube of width `width` standing `depth` proud
 * of the surface, swept along `path` (from roundedPath) and capped at both ends. `profile` below 1 flattens the
 * crest of each rib (a padded channel) and 1 keeps it a half-round (a reed).
 * - `centres`: rib centres along the lateral axis
 * - axes: `u`, `v` map the path into 3D and `lateral` runs across the ribs (unit vectors); `origin` offsets it
 */
export function channelRibsGeometry({
  path,
  centres,
  width,
  depth,
  u = [0, 0, 1],
  v = [0, 1, 0],
  lateral = [1, 0, 0],
  origin = [0, 0, 0],
  segments = 8,
  profile = 1,
}) {
  const U = new THREE.Vector3(...u);
  const V = new THREE.Vector3(...v);
  const L = new THREE.Vector3(...lateral);
  const O = new THREE.Vector3(...origin);
  const K = Math.max(3, segments);
  const row = K + 1;
  const positions = [];
  const index = [];
  const at = (p) => O.clone().addScaledVector(U, p[0]).addScaledVector(V, p[1]);
  const dir3 = (d) => U.clone().multiplyScalar(d[0]).addScaledVector(V, d[1]);
  // Which winding makes the swept surface face out: compare (tangent x lateral) with the outward normal
  const mid = Math.max(1, Math.floor(path.length / 2));
  const tangent = at(path[mid].p).sub(at(path[mid - 1].p));
  const outward = tangent.clone().cross(L).dot(dir3(path[mid].n)) > 0;
  const tri = (a, b, c) => (outward ? index.push(a, b, c) : index.push(a, c, b));
  for (const cx of centres) {
    const base = positions.length / 3;
    for (const { p, n } of path) {
      const pos = at(p);
      const nn = dir3(n);
      for (let k = 0; k <= K; k++) {
        const th = (Math.PI * k) / K;
        const c = Math.cos(th);
        const vtx = pos
          .clone()
          .addScaledVector(L, cx - (width / 2) * Math.sign(c) * Math.abs(c) ** profile)
          .addScaledVector(nn, depth * Math.sin(th) ** profile);
        positions.push(vtx.x, vtx.y, vtx.z);
      }
    }
    for (let j = 0; j + 1 < path.length; j++) {
      for (let k = 0; k < K; k++) {
        const a = base + j * row + k;
        tri(a, a + row, a + 1);
        tri(a + 1, a + row, a + row + 1);
      }
    }
    // Flat caps at both ends, fanned from the middle of the base line, facing along the path
    for (const j of [0, path.length - 1]) {
      const centre = positions.length / 3;
      const c = at(path[j].p).addScaledVector(L, cx);
      positions.push(c.x, c.y, c.z);
      const other = j === 0 ? 1 : path.length - 2;
      const away = at(path[j].p).sub(at(path[other].p));
      for (let k = 0; k < K; k++) {
        const a = base + j * row + k;
        const pa = new THREE.Vector3().fromArray(positions, a * 3);
        const pb = new THREE.Vector3().fromArray(positions, (a + 1) * 3);
        const facing = pa.sub(c).cross(pb.sub(c)).dot(away);
        if (facing >= 0) index.push(centre, a, a + 1);
        else index.push(centre, a + 1, a);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Rib centres filling `span` (from -span/2 to span/2 around `at`) with ribs close to `target` wide. */
export function ribCentres(span, target, at = 0, min = 2) {
  const count = Math.max(min, Math.round(span / target));
  const width = span / count;
  return {
    width,
    centres: Array.from({ length: count }, (_, i) => at - span / 2 + width * (i + 0.5)),
  };
}

/** One mesh of channel ribs (see channelRibsGeometry), in one colour. */
export function ChannelRibs({ color, roughness = 0.9, metalness = 0, castShadow = true, ...spec }) {
  // The spec is plain numbers, so its JSON is a stable cache key for the merged geometry
  const key = JSON.stringify(spec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => channelRibsGeometry(spec), [key]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name="channels" geometry={geometry} castShadow={castShadow} receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}
