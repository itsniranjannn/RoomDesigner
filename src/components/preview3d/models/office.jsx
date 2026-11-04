import { Box } from './shared.jsx';

/** Flat monitor on a stand plus a keyboard, shared by the desk models. */
function DeskTop({ x, z, topY, widthM, subColor }) {
  return (
    <group>
      <Box
        position={[x, topY + 0.22, z]}
        size={[widthM, 0.3, 0.02]}
        color={subColor}
        roughness={0.3}
      />
      <Box
        position={[x, topY + 0.07, z]}
        size={[0.04, 0.14, 0.04]}
        color={subColor}
        roughness={0.4}
      />
      <Box
        position={[x, topY + 0.005, z + 0.02]}
        size={[0.2, 0.01, 0.14]}
        color={subColor}
        roughness={0.4}
      />
      <Box
        position={[x, topY + 0.008, z + 0.26]}
        size={[widthM * 0.9, 0.015, 0.13]}
        color="#2B2D30"
        roughness={0.5}
      />
    </group>
  );
}

/** 3D models: office pieces. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function DeskLModel({ widthM, depthM, mainColor, subColor, legColor }) {
  const topY = 0.74;
  const topT = 0.04;
  const mainD = depthM * 0.45;
  const returnW = widthM * 0.38;
  const legH = topY - topT;
  return (
    <group>
      {/* L-shaped worktop made of two slabs */}
      <Box
        position={[0, topY - topT / 2, -depthM / 2 + mainD / 2]}
        size={[widthM, topT, mainD]}
        color={mainColor}
        roughness={0.55}
      />
      <Box
        position={[
          widthM / 2 - returnW / 2,
          topY - topT / 2,
          -depthM / 2 + mainD + (depthM - mainD) / 2,
        ]}
        size={[returnW, topT, depthM - mainD]}
        color={mainColor}
        roughness={0.55}
      />
      {/* Panel legs at the two free ends and a post at the inner corner */}
      <Box
        position={[-widthM / 2 + 0.03, legH / 2, -depthM / 2 + mainD / 2]}
        size={[0.04, legH, mainD * 0.9]}
        color={legColor}
        roughness={0.6}
      />
      <Box
        position={[widthM / 2 - 0.03, legH / 2, 0]}
        size={[0.04, legH, depthM * 0.92]}
        color={legColor}
        roughness={0.6}
      />
      <Box
        position={[widthM / 2 - returnW + 0.05, legH / 2, depthM / 2 - 0.05]}
        size={[0.05, legH, 0.05]}
        color={legColor}
        roughness={0.6}
      />
      <DeskTop
        x={-widthM * 0.2}
        z={-depthM / 2 + 0.14}
        topY={topY}
        widthM={widthM * 0.22}
        subColor={subColor}
      />
    </group>
  );
}

export function StandingDeskModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  subColor,
  accentColor,
  legColor,
}) {
  const topT = 0.03;
  const colX = widthM / 2 - 0.1;
  return (
    <group>
      <Box
        position={[0, heightM - topT / 2, 0]}
        size={[widthM, topT, depthM]}
        color={mainColor}
        roughness={0.5}
      />
      {/* Telescopic column legs on long feet */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * colX, (heightM - topT) / 2, 0]}
            size={[0.06, heightM - topT, 0.06]}
            color={legColor}
            roughness={0.4}
            metalness={0.5}
          />
          <Box
            position={[s * colX, 0.025, 0]}
            size={[0.07, 0.05, depthM * 0.8]}
            color={legColor}
            roughness={0.4}
            metalness={0.5}
          />
        </group>
      ))}
      <Box
        position={[0, heightM - topT - 0.03, 0]}
        size={[colX * 2, 0.04, 0.05]}
        color={legColor}
        roughness={0.4}
        metalness={0.5}
      />
      {/* Height controller on the front edge */}
      <Box
        position={[widthM / 2 - 0.22, heightM - topT - 0.01, depthM / 2 - 0.04]}
        size={[0.12, 0.02, 0.05]}
        color={accentColor}
        roughness={0.4}
      />
      <DeskTop
        x={0}
        z={-depthM / 2 + 0.14}
        topY={heightM}
        widthM={widthM * 0.28}
        subColor={subColor}
      />
    </group>
  );
}

export function ReceptionCounterModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  subColor,
  accentColor,
}) {
  const lowH = heightM * 0.78;
  const ledgeD = depthM * 0.34;
  return (
    <group>
      <Box
        position={[0, lowH / 2, 0]}
        size={[widthM, lowH, depthM]}
        color={mainColor}
        roughness={0.6}
      />
      {/* Work surface at desk height behind the raised ledge */}
      <Box
        position={[0, lowH + 0.015, -depthM / 2 + (depthM - ledgeD) / 2]}
        size={[widthM + 0.02, 0.03, depthM - ledgeD]}
        color={accentColor}
        roughness={0.35}
      />
      {/* Raised transaction ledge along the visitor side */}
      <Box
        position={[0, lowH + (heightM - lowH - 0.03) / 2, depthM / 2 - ledgeD / 2]}
        size={[widthM, heightM - lowH - 0.03, ledgeD]}
        color={mainColor}
        roughness={0.6}
      />
      <Box
        position={[0, heightM - 0.015, depthM / 2 - ledgeD / 2]}
        size={[widthM + 0.02, 0.03, ledgeD + 0.02]}
        color={accentColor}
        roughness={0.35}
      />
      {/* Inset front panel and toe kick */}
      <Box
        position={[0, lowH * 0.5, depthM / 2 + 0.004]}
        size={[widthM * 0.9, lowH * 0.7, 0.01]}
        color={subColor}
        roughness={0.5}
        castShadow={false}
      />
      <Box
        position={[0, 0.04, depthM / 2 - 0.02]}
        size={[widthM * 0.96, 0.08, 0.02]}
        color={subColor}
        roughness={0.8}
        castShadow={false}
      />
      <DeskTop
        x={widthM * 0.2}
        z={-depthM / 2 + 0.16}
        topY={lowH + 0.03}
        widthM={widthM * 0.14}
        subColor={subColor}
      />
    </group>
  );
}
