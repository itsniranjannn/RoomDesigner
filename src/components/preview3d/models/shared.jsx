/** Small mesh helpers shared by the newer 3D models (position is the box center, in meters). */
export function Box({ position, size, color, roughness = 0.8, metalness = 0, rotation, castShadow = true }) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Upright cylinder; radiusTop/radiusBottom allow tapered pots and baskets. */
export function Cyl({ position, radiusTop, radiusBottom = radiusTop, height, color, roughness = 0.7, metalness = 0, segments = 24, castShadow = true }) {
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, segments]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Four square legs placed inset from the corners of a widthM x depthM footprint. */
export function CornerLegs({ widthM, depthM, height, thick = 0.05, inset = 0.04, color, roughness = 0.6 }) {
  const lx = widthM / 2 - inset - thick / 2;
  const lz = depthM / 2 - inset - thick / 2;
  return [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], idx) => (
    <Box key={idx} position={[x, height / 2, z]} size={[thick, height, thick]} color={color} roughness={roughness} />
  ));
}
