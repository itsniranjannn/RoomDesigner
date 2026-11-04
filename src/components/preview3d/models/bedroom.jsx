import { Box, CornerLegs } from './shared.jsx';

/** 3D models: bedroom pieces. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function DressingTableModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  subColor,
  handleColor,
  legColor,
}) {
  const topY = 0.76;
  const mirrorH = heightM - topY;
  const mirrorW = widthM * 0.7;
  const drawerW = widthM * 0.28;
  return (
    <group>
      <CornerLegs
        widthM={widthM}
        depthM={depthM}
        height={topY - 0.04}
        thick={0.045}
        inset={0.015}
        color={legColor}
      />
      <Box
        position={[0, topY - 0.02, 0]}
        size={[widthM, 0.04, depthM]}
        color={mainColor}
        roughness={0.6}
      />
      {/* Drawer banks either side of the knee space */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * (widthM / 2 - drawerW / 2 - 0.02), topY - 0.04 - 0.17, 0]}
            size={[drawerW, 0.34, depthM - 0.04]}
            color={subColor}
            roughness={0.7}
          />
          <Box
            position={[s * (widthM / 2 - drawerW / 2 - 0.02), topY - 0.17, depthM / 2 - 0.01]}
            size={[0.08, 0.015, 0.015]}
            color={handleColor}
            roughness={0.3}
            metalness={0.7}
          />
          <Box
            position={[s * (widthM / 2 - drawerW / 2 - 0.02), topY - 0.3, depthM / 2 - 0.01]}
            size={[0.08, 0.015, 0.015]}
            color={handleColor}
            roughness={0.3}
            metalness={0.7}
          />
        </group>
      ))}
      {/* Upright mirror along the back edge */}
      <Box
        position={[0, topY + mirrorH / 2, -depthM / 2 + 0.02]}
        size={[mirrorW, mirrorH, 0.03]}
        color={mainColor}
        roughness={0.6}
      />
      <Box
        position={[0, topY + mirrorH / 2, -depthM / 2 + 0.04]}
        size={[mirrorW - 0.06, mirrorH - 0.06, 0.006]}
        color="#B0D3E2"
        roughness={0.05}
        metalness={0.6}
        castShadow={false}
      />
      {/* Perfume bottles on the top */}
      <Box
        position={[-widthM * 0.12, topY + 0.05, -depthM * 0.1]}
        size={[0.05, 0.1, 0.05]}
        color="#E8D5E0"
        roughness={0.2}
      />
      <Box
        position={[widthM * 0.1, topY + 0.035, -depthM * 0.08]}
        size={[0.06, 0.07, 0.06]}
        color={handleColor}
        roughness={0.3}
        metalness={0.6}
      />
    </group>
  );
}

export function CribModel({ widthM, depthM, heightM, mainColor, fabricColor, accentColor }) {
  const baseY = 0.3;
  const slatCount = Math.max(6, Math.floor((widthM - 0.1) / 0.075));
  const slatSpan = widthM - 0.12;
  const railTop = heightM - 0.02;
  return (
    <group>
      {/* Corner posts */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], idx) => (
        <Box
          key={idx}
          position={[sx * (widthM / 2 - 0.025), heightM / 2, sz * (depthM / 2 - 0.025)]}
          size={[0.05, heightM, 0.05]}
          color={mainColor}
          roughness={0.6}
        />
      ))}
      {/* Base board, mattress and blanket */}
      <Box
        position={[0, baseY, 0]}
        size={[widthM - 0.06, 0.03, depthM - 0.06]}
        color={mainColor}
        roughness={0.7}
      />
      <Box
        position={[0, baseY + 0.07, 0]}
        size={[widthM - 0.1, 0.1, depthM - 0.1]}
        color={fabricColor}
        roughness={0.9}
      />
      <Box
        position={[0, baseY + 0.125, depthM * 0.12]}
        size={[widthM - 0.14, 0.015, depthM * 0.55]}
        color={accentColor}
        roughness={0.9}
      />
      {/* Slatted long sides with top rails */}
      {[-1, 1].map((sz) => (
        <group key={sz}>
          <Box
            position={[0, railTop, sz * (depthM / 2 - 0.025)]}
            size={[widthM, 0.04, 0.04]}
            color={mainColor}
            roughness={0.6}
          />
          {Array.from({ length: slatCount }).map((_, idx) => (
            <Box
              key={idx}
              position={[
                -slatSpan / 2 + (idx * slatSpan) / (slatCount - 1),
                (baseY + railTop) / 2,
                sz * (depthM / 2 - 0.025),
              ]}
              size={[0.016, railTop - baseY, 0.016]}
              color={mainColor}
              roughness={0.6}
              castShadow={false}
            />
          ))}
        </group>
      ))}
      {/* Solid head and foot boards */}
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          position={[sx * (widthM / 2 - 0.015), (baseY + heightM) / 2 - 0.02, 0]}
          size={[0.03, heightM - baseY - 0.04, depthM - 0.06]}
          color={mainColor}
          roughness={0.65}
        />
      ))}
    </group>
  );
}

export function TrunkModel({ widthM, depthM, heightM, mainColor, accentColor, subColor }) {
  const bodyH = heightM * 0.62;
  const lidH = heightM - bodyH;
  return (
    <group>
      <Box
        position={[0, bodyH / 2, 0]}
        size={[widthM, bodyH, depthM]}
        color={mainColor}
        roughness={0.75}
      />
      <Box
        position={[0, bodyH + lidH / 2, 0]}
        size={[widthM + 0.01, lidH, depthM + 0.01]}
        color={subColor}
        roughness={0.75}
      />
      {/* Metal straps wrapping over the lid and front */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * widthM * 0.3, heightM / 2, 0]}
          size={[0.045, heightM + 0.004, depthM + 0.016]}
          color={accentColor}
          roughness={0.35}
          metalness={0.7}
        />
      ))}
      {/* Lock plate */}
      <Box
        position={[0, bodyH, depthM / 2 + 0.012]}
        size={[0.06, 0.07, 0.012]}
        color={accentColor}
        roughness={0.3}
        metalness={0.8}
      />
      {/* Short feet */}
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          position={[sx * (widthM / 2 - 0.03), 0.01, 0]}
          size={[0.05, 0.02, depthM * 0.9]}
          color={subColor}
        />
      ))}
    </group>
  );
}
