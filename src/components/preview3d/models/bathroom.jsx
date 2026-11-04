import { Box, Cyl, CornerLegs } from './shared.jsx';

/** 3D models: bathroom and utility pieces. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function VanityModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  subColor,
  handleColor,
  legColor,
}) {
  const topT = 0.03;
  const basinR = Math.min(widthM * 0.28, depthM * 0.36);
  return (
    <group>
      <Box
        position={[0, 0.04, -0.01]}
        size={[widthM * 0.94, 0.08, depthM - 0.06]}
        color={legColor}
        roughness={0.8}
      />
      <Box
        position={[0, 0.08 + (heightM - 0.08 - topT) / 2, 0]}
        size={[widthM, heightM - 0.08 - topT, depthM]}
        color={mainColor}
        roughness={0.65}
      />
      <Box
        position={[0, heightM - topT / 2, 0]}
        size={[widthM + 0.02, topT, depthM + 0.02]}
        color={subColor}
        roughness={0.3}
      />
      {/* Door seam and pulls */}
      <Box
        position={[0, 0.08 + (heightM - 0.11) / 2, depthM / 2 + 0.002]}
        size={[0.005, heightM - 0.11, 0.004]}
        color="#1F1F1F"
        castShadow={false}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * 0.04, heightM * 0.7, depthM / 2 + 0.012]}
          size={[0.015, 0.12, 0.015]}
          color={handleColor}
          roughness={0.3}
          metalness={0.8}
        />
      ))}
      {/* Basin sitting in the top, with drain and tap */}
      <Cyl
        position={[0, heightM + 0.004, depthM * 0.04]}
        radiusTop={basinR}
        height={0.012}
        color="#F4F4F1"
        roughness={0.2}
        segments={32}
        castShadow={false}
      />
      <Cyl
        position={[0, heightM + 0.011, depthM * 0.04]}
        radiusTop={basinR * 0.78}
        height={0.004}
        color="#DDE1E3"
        roughness={0.3}
        segments={32}
        castShadow={false}
      />
      <Cyl
        position={[0, heightM + 0.014, depthM * 0.04]}
        radiusTop={0.012}
        height={0.004}
        color="#6B7075"
        metalness={0.8}
        segments={12}
        castShadow={false}
      />
      <Cyl
        position={[0, heightM + 0.09, -depthM * 0.36]}
        radiusTop={0.012}
        height={0.16}
        color="#CCCCCC"
        roughness={0.15}
        metalness={0.9}
        segments={12}
      />
      <Box
        position={[0, heightM + 0.17, -depthM * 0.28]}
        size={[0.02, 0.02, 0.16]}
        color="#CCCCCC"
        roughness={0.15}
        metalness={0.9}
      />
    </group>
  );
}

export function SquatToiletModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const slabH = heightM * 0.4;
  return (
    <group>
      <Box
        position={[0, slabH / 2, 0]}
        size={[widthM, slabH, depthM]}
        color={mainColor}
        roughness={0.25}
      />
      {/* Ribbed foot pads */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * widthM * 0.31, slabH + 0.006, depthM * 0.22]}
          size={[widthM * 0.26, 0.012, depthM * 0.4]}
          color="#E4E6E7"
          roughness={0.5}
          castShadow={false}
        />
      ))}
      {/* Pan and drain */}
      <Box
        position={[0, slabH + 0.002, -depthM * 0.08]}
        size={[widthM * 0.4, 0.006, depthM * 0.6]}
        color={subColor}
        roughness={0.3}
        castShadow={false}
      />
      <Cyl
        position={[0, slabH + 0.006, -depthM * 0.3]}
        radiusTop={widthM * 0.1}
        height={0.006}
        color="#3A3F44"
        segments={16}
        castShadow={false}
      />
      {/* Flush pipe running up the back */}
      <Cyl
        position={[0, heightM / 2, -depthM / 2 + 0.06]}
        radiusTop={0.022}
        height={heightM}
        color="#CFD3D6"
        roughness={0.3}
        segments={12}
      />
    </group>
  );
}

export function TankModel({ widthM, depthM, heightM, mainColor, subColor, accentColor, legColor }) {
  const r = (Math.min(widthM, depthM) / 2) * 0.96;
  const standH = heightM * 0.3;
  const tankH = heightM * 0.64;
  return (
    <group>
      <CornerLegs
        widthM={widthM}
        depthM={depthM}
        height={standH}
        thick={0.04}
        inset={0.02}
        color={legColor}
      />
      <Box
        position={[0, standH + 0.015, 0]}
        size={[widthM, 0.03, depthM]}
        color={legColor}
        roughness={0.5}
      />
      <Cyl
        position={[0, standH + 0.03 + tankH / 2, 0]}
        radiusTop={r}
        height={tankH}
        color={mainColor}
        roughness={0.3}
        metalness={0.3}
        segments={32}
      />
      <Cyl
        position={[0, standH + 0.03 + tankH * 0.5, 0]}
        radiusTop={r + 0.004}
        height={0.03}
        color={subColor}
        roughness={0.4}
        segments={32}
        castShadow={false}
      />
      <Cyl
        position={[0, standH + 0.03 + tankH + 0.01, 0]}
        radiusTop={r * 0.9}
        height={0.02}
        color={subColor}
        roughness={0.4}
        segments={32}
      />
      {/* Inlet and outlet pipes on top */}
      <Cyl
        position={[-r * 0.35, heightM - 0.02, -r * 0.1]}
        radiusTop={0.015}
        height={0.06}
        color={accentColor}
        metalness={0.7}
        roughness={0.3}
        segments={12}
      />
      <Cyl
        position={[r * 0.35, heightM - 0.02, -r * 0.1]}
        radiusTop={0.015}
        height={0.06}
        color="#B7BCC0"
        metalness={0.7}
        roughness={0.3}
        segments={12}
      />
    </group>
  );
}

export function BasketModel({ widthM, depthM, heightM, mainColor, accentColor }) {
  const r = Math.min(widthM, depthM) / 2;
  const rBottom = r * 0.8;
  const radiusAt = (y) => rBottom + (r - rBottom) * (y / heightM);
  return (
    <group>
      <Cyl
        position={[0, heightM / 2, 0]}
        radiusTop={r}
        radiusBottom={rBottom}
        height={heightM}
        color={mainColor}
        roughness={0.9}
        segments={28}
      />
      {/* Woven bands */}
      {[0.25, 0.5, 0.75].map((f, idx) => (
        <mesh key={idx} position={[0, heightM * f, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[radiusAt(heightM * f) + 0.002, 0.007, 8, 32]} />
          <meshStandardMaterial color={accentColor} roughness={0.9} />
        </mesh>
      ))}
      {/* Rim and dark interior */}
      <mesh position={[0, heightM, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[r, 0.012, 8, 32]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>
      <Cyl
        position={[0, heightM - 0.008, 0]}
        radiusTop={r * 0.96}
        height={0.004}
        color="#2A1D12"
        roughness={1}
        segments={28}
        castShadow={false}
      />
    </group>
  );
}
