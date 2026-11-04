import { Box, Cyl } from './shared.jsx';

/** 3D models: floor-standing kitchen units. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function SinkUnitModel({ widthM, depthM, heightM, mainColor, accentColor, handleColor }) {
  const topT = 0.04;
  const bowlW = widthM * 0.22;
  const boardW = widthM * 0.4;
  return (
    <group>
      {/* Cabinet carcass with plinth and door seams */}
      <Box
        position={[0, (heightM - topT) / 2, -0.01]}
        size={[widthM, heightM - topT, depthM - 0.03]}
        color={accentColor}
        roughness={0.75}
      />
      <Box
        position={[0, 0.04, depthM / 2 - 0.03]}
        size={[widthM * 0.98, 0.08, 0.02]}
        color="#1F1F1F"
        roughness={0.9}
        castShadow={false}
      />
      <Box
        position={[0, (heightM - topT) / 2 + 0.03, depthM / 2 - 0.004]}
        size={[0.006, heightM - topT - 0.12, 0.004]}
        color="#1F1F1F"
        castShadow={false}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * (widthM * 0.25), heightM - topT - 0.12, depthM / 2 + 0.008]}
          size={[0.14, 0.015, 0.015]}
          color={handleColor}
          roughness={0.3}
          metalness={0.8}
        />
      ))}
      {/* Countertop slab */}
      <Box
        position={[0, heightM - topT / 2, 0]}
        size={[widthM, topT, depthM]}
        color={mainColor}
        roughness={0.4}
      />
      {/* Twin bowls recessed look, drainer ribs and tap */}
      {[-0.34, -0.1].map((f, idx) => (
        <Box
          key={idx}
          position={[widthM * f, heightM + 0.002, -depthM * 0.02]}
          size={[bowlW, 0.008, depthM * 0.62]}
          color="#9AA3AA"
          roughness={0.3}
          metalness={0.8}
          castShadow={false}
        />
      ))}
      {[0.25, 0.4, 0.55, 0.7, 0.85].map((f, idx) => (
        <Box
          key={idx}
          position={[widthM * 0.26, heightM + 0.004, -depthM / 2 + depthM * (0.12 + 0.76 * f)]}
          size={[boardW * 0.84, 0.004, 0.008]}
          color="#8E98A0"
          metalness={0.6}
          castShadow={false}
        />
      ))}
      <Cyl
        position={[-widthM * 0.23, heightM + 0.14, -depthM * 0.4]}
        radiusTop={0.014}
        height={0.28}
        color="#CCCCCC"
        roughness={0.15}
        metalness={0.9}
        segments={12}
      />
      <Box
        position={[-widthM * 0.23, heightM + 0.27, -depthM * 0.31]}
        size={[0.025, 0.025, 0.2]}
        color="#CCCCCC"
        roughness={0.15}
        metalness={0.9}
      />
    </group>
  );
}

export function ApplianceModel({ widthM, depthM, heightM, mainColor, subColor, accentColor }) {
  return (
    <group>
      <Box
        position={[0, heightM / 2, 0]}
        size={[widthM, heightM, depthM]}
        color={mainColor}
        roughness={0.35}
        metalness={0.45}
      />
      {/* Door panel, control strip and handle on the front face */}
      <Box
        position={[0, heightM * 0.43, depthM / 2 + 0.004]}
        size={[widthM * 0.94, heightM * 0.78, 0.01]}
        color={mainColor}
        roughness={0.25}
        metalness={0.6}
        castShadow={false}
      />
      <Box
        position={[0, heightM * 0.91, depthM / 2 + 0.005]}
        size={[widthM * 0.94, heightM * 0.14, 0.012]}
        color={subColor}
        roughness={0.4}
        castShadow={false}
      />
      <Box
        position={[0, heightM * 0.8, depthM / 2 + 0.03]}
        size={[widthM * 0.7, 0.02, 0.02]}
        color={accentColor}
        roughness={0.2}
        metalness={0.9}
      />
      <Box
        position={[-widthM * 0.28, heightM * 0.91, depthM / 2 + 0.016]}
        size={[0.025, 0.025, 0.012]}
        color={accentColor}
        roughness={0.3}
        metalness={0.8}
        castShadow={false}
      />
      <Box
        position={[widthM * 0.28, heightM * 0.91, depthM / 2 + 0.016]}
        size={[0.025, 0.025, 0.012]}
        color={accentColor}
        roughness={0.3}
        metalness={0.8}
        castShadow={false}
      />
      <Box
        position={[0, 0.025, depthM / 2 - 0.02]}
        size={[widthM * 0.94, 0.05, 0.02]}
        color="#1F1F1F"
        roughness={0.9}
        castShadow={false}
      />
    </group>
  );
}
