import { Box, Cyl } from './shared.jsx';

/** 3D models: planters, round rugs and screens. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function PlanterModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const r = Math.min(widthM, depthM) / 2;
  const potH = heightM * 0.4;
  const foliageH = heightM - potH;
  const blobs = [
    { x: 0, z: 0, y: 0.5, s: 1, tone: mainColor },
    { x: 0.45, z: 0.1, y: 0.35, s: 0.55, tone: '#4B6B52' },
    { x: -0.4, z: -0.2, y: 0.4, s: 0.55, tone: '#4B6B52' },
    { x: 0.05, z: -0.45, y: 0.55, s: 0.5, tone: mainColor },
    { x: -0.1, z: 0.45, y: 0.3, s: 0.5, tone: mainColor },
  ];
  return (
    <group>
      <Cyl
        position={[0, potH / 2, 0]}
        radiusTop={r * 0.9}
        radiusBottom={r * 0.68}
        height={potH}
        color={subColor}
        roughness={0.55}
      />
      <Cyl
        position={[0, potH - 0.01, 0]}
        radiusTop={r * 0.82}
        height={0.02}
        color="#2E1C12"
        roughness={0.95}
        castShadow={false}
      />
      {/* Bushy foliage built from overlapping ellipsoids */}
      {blobs.map((b, idx) => (
        <mesh
          key={idx}
          position={[b.x * r * 0.7, potH + foliageH * b.y, b.z * r * 0.7]}
          scale={[
            r * 0.8 * b.s + r * 0.15,
            foliageH * 0.45 * b.s + foliageH * 0.1,
            r * 0.8 * b.s + r * 0.15,
          ]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color={b.tone} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

export function RugRoundModel({ widthM, depthM, heightM, mainColor, subColor, accentColor }) {
  const r = Math.min(widthM, depthM) / 2;
  const rings = [
    [0.92, subColor],
    [0.86, mainColor],
    [0.72, accentColor],
    [0.64, mainColor],
    [0.26, accentColor],
    [0.14, subColor],
  ];
  return (
    <group>
      <Cyl
        position={[0, heightM / 2, 0]}
        radiusTop={r}
        height={heightM}
        color={mainColor}
        roughness={0.95}
        segments={48}
        castShadow={false}
      />
      {rings.map(([f, color], idx) => (
        <Cyl
          key={idx}
          position={[0, heightM + 0.0006 * (idx + 1), 0]}
          radiusTop={r * f}
          height={0.0008}
          color={color}
          roughness={0.95}
          segments={48}
          castShadow={false}
        />
      ))}
    </group>
  );
}

export function ScreenModel({ widthM, depthM, heightM, mainColor, accentColor }) {
  const panels = Math.min(6, Math.max(3, Math.round((widthM * 100) / 50)));
  const step = widthM / panels;
  return (
    <group>
      {Array.from({ length: panels }).map((_, idx) => {
        const z0 = idx % 2 === 0 ? -depthM / 2 : depthM / 2;
        const z1 = idx % 2 === 0 ? depthM / 2 : -depthM / 2;
        const chord = Math.hypot(step, z1 - z0);
        const angle = -Math.atan2(z1 - z0, step);
        const cx = -widthM / 2 + step * (idx + 0.5);
        return (
          <group key={idx} position={[cx, 0, (z0 + z1) / 2]} rotation={[0, angle, 0]}>
            <Box
              position={[0, heightM / 2, 0]}
              size={[chord, heightM, 0.025]}
              color={mainColor}
              roughness={0.7}
            />
            {/* Inset lattice panel */}
            <Box
              position={[0, heightM / 2, 0]}
              size={[chord * 0.82, heightM * 0.84, 0.032]}
              color={accentColor}
              roughness={0.9}
            />
            <Box
              position={[0, heightM / 2, 0.018]}
              size={[chord * 0.82, 0.012, 0.004]}
              color={mainColor}
              castShadow={false}
            />
            <Box
              position={[0, heightM * 0.3, 0.018]}
              size={[chord * 0.82, 0.012, 0.004]}
              color={mainColor}
              castShadow={false}
            />
            <Box
              position={[0, heightM * 0.7, 0.018]}
              size={[chord * 0.82, 0.012, 0.004]}
              color={mainColor}
              castShadow={false}
            />
          </group>
        );
      })}
    </group>
  );
}
