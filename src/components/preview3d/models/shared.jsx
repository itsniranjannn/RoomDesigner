import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

/** Small mesh helpers shared by the 3D models (position is the center of the part, in meters). */
export function Box({
  position,
  size,
  color,
  roughness = 0.8,
  metalness = 0,
  rotation,
  castShadow = true,
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Box with softened edges for cushions, mattresses and padded seats. */
export function Pad({ position, size, radius = 0.025, color, roughness = 0.88, rotation }) {
  const r = Math.max(0.002, Math.min(radius, Math.min(...size) / 2 - 0.001));
  return (
    <RoundedBox
      position={position}
      rotation={rotation}
      args={size}
      radius={r}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={roughness} />
    </RoundedBox>
  );
}

/** Upright cylinder; radiusTop/radiusBottom allow tapered pots and baskets. */
export function Cyl({
  position,
  radiusTop,
  radiusBottom = radiusTop,
  height,
  color,
  roughness = 0.7,
  metalness = 0,
  segments = 24,
  castShadow = true,
  rotation,
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, segments]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Direction, midpoint and length of a rod between two points (used by Strut). */
export function strutTransform(from, to) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const length = dir.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    length > 0 ? dir.normalize() : new THREE.Vector3(0, 1, 0)
  );
  return { position: a.add(b).multiplyScalar(0.5).toArray(), quaternion, length };
}

/** Round rod running between two points, for frames, easels and splayed legs. */
export function Strut({ from, to, radius = 0.012, color, roughness = 0.5, metalness = 0 }) {
  const { position, quaternion, length } = strutTransform(from, to);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Four square legs placed inset from the corners of a widthM x depthM footprint. */
export function CornerLegs({
  widthM,
  depthM,
  height,
  thick = 0.05,
  inset = 0.04,
  color,
  roughness = 0.6,
}) {
  const lx = widthM / 2 - inset - thick / 2;
  const lz = depthM / 2 - inset - thick / 2;
  return [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ].map(([x, z], idx) => (
    <Box
      key={idx}
      position={[x, height / 2, z]}
      size={[thick, height, thick]}
      color={color}
      roughness={roughness}
    />
  ));
}

/** Corner positions [x, z] of a footprint inset by `inset` meters. */
export function corners(widthM, depthM, inset) {
  const x = widthM / 2 - inset;
  const z = depthM / 2 - inset;
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
}
