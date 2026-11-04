import { Box, Cyl, Ball, CHROME, clamp, shade } from './shared.jsx';

/** 3D models: planters, round rugs and screens. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function PlanterModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const r = Math.min(widthM, depthM) / 2;
  const potH = heightM * 0.4;
  const foliageH = heightM - potH;
  const leafCount = Math.round(clamp(14 + heightM * 10, 14, 28));
  const leafL = clamp(foliageH * 0.5, 0.14, 0.5);
  // Leaves vary towards lighter greens: darker shades of a deep green read as black blobs
  const darker = shade(mainColor, 0.1);
  const leafGreen = shade(mainColor, 0.03);
  return (
    <group>
      {/* Saucer, tapered pot with a rolled rim and a band, soil and mulch stones */}
      <Cyl
        position={[0, 0.01, 0]}
        radiusTop={r * 0.7}
        radiusBottom={r * 0.76}
        height={0.02}
        color={shade(subColor, -0.1)}
        roughness={0.6}
        segments={24}
      />
      <Cyl
        position={[0, 0.02 + (potH - 0.02) / 2, 0]}
        radiusTop={r * 0.9}
        radiusBottom={r * 0.68}
        height={potH - 0.02}
        color={subColor}
        roughness={0.55}
      />
      <mesh position={[0, potH - 0.008, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[r * 0.9, 0.014, 8, 28]} />
        <meshStandardMaterial color={shade(subColor, 0.04)} roughness={0.5} />
      </mesh>
      <Cyl
        position={[0, potH * 0.55, 0]}
        radiusTop={r * 0.83}
        radiusBottom={r * 0.8}
        height={0.015}
        color={shade(subColor, -0.14)}
        roughness={0.6}
        segments={24}
        castShadow={false}
      />
      <Cyl
        position={[0, potH - 0.03, 0]}
        radiusTop={r * 0.82}
        height={0.03}
        color="#2E1C12"
        roughness={0.95}
        castShadow={false}
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Ball
          key={`st${i}`}
          position={[Math.cos(i * 2.1) * r * 0.5, potH - 0.012, Math.sin(i * 2.1) * r * 0.5]}
          radius={0.01 + (i % 3) * 0.004}
          scale={[1, 0.6, 1]}
          color={i % 2 ? '#B8AFA2' : '#8E877C'}
          segments={6}
          castShadow={false}
        />
      ))}
      {/* Central stems and leaves of several sizes fanning out and up */}
      {[0, 1, 2].map((i) => (
        <Cyl
          key={`s${i}`}
          position={[Math.cos(i * 2.1) * 0.02, potH + foliageH * 0.3, Math.sin(i * 2.1) * 0.02]}
          radiusTop={0.008}
          radiusBottom={0.012}
          height={foliageH * 0.6}
          color="#4A3A28"
          roughness={0.9}
          segments={6}
          castShadow={false}
        />
      ))}
      {Array.from({ length: leafCount }).map((_, i) => {
        const t = i / (leafCount - 1);
        const y = potH + foliageH * (0.18 + 0.72 * t);
        const L = leafL * (1.0 - 0.45 * t) * (0.8 + (0.4 * ((i * 5) % 4)) / 3);
        const tilt = 0.25 + 1.0 * t;
        return (
          <group key={i} position={[0, y, 0]} rotation={[0, i * 2.4, 0]}>
            <mesh
              position={[(L / 2) * Math.cos(tilt) + r * 0.1, (L / 2) * Math.sin(tilt), 0]}
              rotation={[0, 0, tilt]}
              scale={[L / 2, 0.01, L * 0.2]}
              castShadow
            >
              <sphereGeometry args={[1, 10, 6]} />
              <meshStandardMaterial color={i % 3 === 0 ? darker : leafGreen} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
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
      <mesh position={[0, heightM / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, heightM / 2, 6, 48]} />
        <meshStandardMaterial color={shade(mainColor, -0.1)} roughness={0.95} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => (
        <Box
          key={`m${i}`}
          position={[
            Math.cos((i * Math.PI) / 8) * r * 0.78,
            heightM + 0.0014,
            Math.sin((i * Math.PI) / 8) * r * 0.78,
          ]}
          rotation={[0, -(i * Math.PI) / 8, 0]}
          size={[r * 0.1, 0.0008, r * 0.035]}
          color={i % 2 ? subColor : accentColor}
          roughness={0.95}
          castShadow={false}
        />
      ))}
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
            {idx > 0 &&
              [0.12, 0.5, 0.88].map((hf) => (
                <group key={hf} name="screen-hinge" position={[-chord / 2, heightM * hf, 0]}>
                  <Cyl radiusTop={0.01} height={0.06} {...CHROME} segments={8} />
                </group>
              ))}
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
            {[-0.3, -0.1, 0.1, 0.3].map((f) => (
              <Box
                key={f}
                position={[chord * f, heightM / 2, 0.019]}
                size={[0.008, heightM * 0.84, 0.004]}
                color={mainColor}
                castShadow={false}
              />
            ))}
            <Box
              position={[0, heightM / 2, 0.018]}
              size={[chord * 0.82, 0.012, 0.004]}
              color={mainColor}
              castShadow={false}
            />
            <Box
              position={[0, heightM - 0.01, 0]}
              size={[chord + 0.004, 0.025, 0.035]}
              color={mainColor}
              roughness={0.6}
            />
            <Box
              position={[0, 0.02, 0]}
              size={[chord, 0.04, 0.03]}
              color={shade(mainColor, -0.1)}
              roughness={0.7}
            />
            <Box
              position={[0, 0.006, 0]}
              size={[chord * 0.9, 0.012, 0.07]}
              color={shade(mainColor, -0.18)}
              roughness={0.8}
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
