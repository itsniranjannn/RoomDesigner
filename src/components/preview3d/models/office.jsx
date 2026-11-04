import {
  Box,
  Cyl,
  Ball,
  Pad,
  Drawers,
  STEEL,
  BRASS,
  CHROME,
  BLACK_PLASTIC,
  clamp,
  shade,
} from './shared.jsx';

/** Flat monitor on a stand, keyboard and mouse, shared by the desk models. */
function DeskTop({ x, z, topY, widthM, subColor }) {
  const w = clamp(widthM, 0.3, 0.6);
  const h = w * 0.58;
  const screenY = topY + 0.1 + h / 2;
  return (
    <group name="monitor">
      <Cyl
        position={[x, topY + 0.006, z]}
        radiusTop={0.09}
        radiusBottom={0.1}
        height={0.012}
        color={subColor}
        roughness={0.4}
        segments={20}
      />
      <Box
        position={[x, topY + 0.06, z - 0.01]}
        size={[0.035, 0.1, 0.03]}
        color={subColor}
        roughness={0.4}
      />
      <Box position={[x, screenY, z]} size={[w, h, 0.022]} color={subColor} roughness={0.3} />
      <Box
        position={[x, screenY, z + 0.0125]}
        size={[w - 0.02, h - 0.02, 0.002]}
        color="#10202E"
        roughness={0.08}
        metalness={0.2}
        castShadow={false}
      />
      <mesh position={[x + w * 0.4, screenY - h / 2 + 0.006, z + 0.0135]}>
        <sphereGeometry args={[0.0035, 6, 4]} />
        <meshBasicMaterial color="#38D26B" />
      </mesh>
      {/* Keyboard with key rows, and a mouse */}
      <Box
        position={[x, topY + 0.008, z + 0.26]}
        size={[Math.min(0.44, w * 1.1), 0.014, 0.13]}
        color="#2B2D30"
        roughness={0.5}
      />
      {[-0.04, 0, 0.04].map((dz) => (
        <Box
          key={dz}
          position={[x, topY + 0.0165, z + 0.26 + dz]}
          size={[Math.min(0.4, w * 1.0), 0.003, 0.025]}
          color="#4A4E53"
          roughness={0.6}
          castShadow={false}
        />
      ))}
      <Pad
        position={[x + Math.min(0.44, w * 1.1) / 2 + 0.07, topY + 0.015, z + 0.27]}
        size={[0.06, 0.03, 0.1]}
        radius={0.015}
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
  const mainZ = -depthM / 2 + mainD / 2;
  const pedW = Math.min(0.42, widthM * 0.26);
  return (
    <group>
      {/* L-shaped worktop made of two slabs with edge banding and cable grommets */}
      <Box
        position={[0, topY - topT / 2, mainZ]}
        size={[widthM, topT, mainD]}
        color={mainColor}
        roughness={0.5}
      />
      <Box
        position={[
          widthM / 2 - returnW / 2,
          topY - topT / 2,
          -depthM / 2 + mainD + (depthM - mainD) / 2,
        ]}
        size={[returnW, topT, depthM - mainD]}
        color={mainColor}
        roughness={0.5}
      />
      <Box
        position={[0, topY - topT - 0.004, mainZ]}
        size={[widthM - 0.03, 0.008, mainD - 0.03]}
        color={shade(mainColor, -0.12)}
        roughness={0.7}
        castShadow={false}
      />
      {[-0.1, 0.12].map((fx) => (
        <group key={fx}>
          <Cyl
            position={[widthM * fx, topY + 0.0015, -depthM / 2 + 0.08]}
            radiusTop={0.03}
            height={0.003}
            {...STEEL}
            segments={20}
            castShadow={false}
          />
          <Cyl
            position={[widthM * fx, topY + 0.0032, -depthM / 2 + 0.08]}
            radiusTop={0.02}
            height={0.002}
            color="#16181A"
            segments={16}
            castShadow={false}
          />
        </group>
      ))}
      {/* Panel legs, modesty panel and a three-drawer pedestal under the main run */}
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
      <Box
        position={[0, legH * 0.72, -depthM / 2 + 0.03]}
        size={[widthM * 0.5, legH * 0.35, 0.02]}
        color={shade(mainColor, -0.08)}
        roughness={0.7}
      />
      <Box
        position={[-widthM / 2 + pedW / 2 + 0.01, legH / 2 + 0.02, mainZ]}
        size={[pedW, legH - 0.04, mainD * 0.92]}
        color={shade(mainColor, -0.04)}
        roughness={0.6}
      />
      <Box
        position={[-widthM / 2 + pedW / 2 + 0.01, 0.02, mainZ]}
        size={[pedW - 0.03, 0.04, mainD * 0.86]}
        color="#1E1B18"
        roughness={0.9}
      />
      <Drawers
        width={pedW - 0.02}
        height={legH - 0.1}
        x={-widthM / 2 + pedW / 2 + 0.01}
        y={0.05}
        z={mainZ + mainD * 0.46}
        rows={3}
        color={shade(mainColor, -0.04)}
        handleColor={BRASS.color}
        thick={0.014}
      />
      <DeskTop
        x={-widthM * 0.02}
        z={-depthM / 2 + 0.16}
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
        roughness={0.45}
      />
      <Box
        position={[0, heightM - topT - 0.005, 0]}
        size={[widthM - 0.03, 0.01, depthM - 0.03]}
        color={shade(mainColor, -0.1)}
        roughness={0.7}
        castShadow={false}
      />
      {/* Telescopic column legs with a sleeve joint, long feet and rubber pads */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * colX, (heightM - topT) * 0.62, 0]}
            size={[0.06, (heightM - topT) * 0.76, 0.06]}
            color={legColor}
            roughness={0.4}
            metalness={0.3}
          />
          <Box
            position={[s * colX, (heightM - topT) * 0.2, 0]}
            size={[0.072, (heightM - topT) * 0.4, 0.072]}
            color={shade(legColor, 0.04)}
            roughness={0.4}
            metalness={0.3}
          />
          <Box
            position={[s * colX, 0.025, 0]}
            size={[0.07, 0.05, depthM * 0.8]}
            color={legColor}
            roughness={0.4}
            metalness={0.3}
          />
          {[-1, 1].map((e) => (
            <Box
              key={e}
              position={[s * colX, 0.005, e * depthM * 0.38]}
              size={[0.074, 0.01, 0.05]}
              {...BLACK_PLASTIC}
              color="#101010"
              castShadow={false}
            />
          ))}
        </group>
      ))}
      <Box
        position={[0, heightM - topT - 0.03, 0]}
        size={[colX * 2, 0.04, 0.05]}
        color={legColor}
        roughness={0.4}
        metalness={0.3}
      />
      {/* Motor housings and a cable tray */}
      {[-1, 1].map((s) => (
        <Box
          key={`m${s}`}
          position={[s * colX, heightM - topT - 0.06, 0]}
          size={[0.1, 0.07, 0.09]}
          {...BLACK_PLASTIC}
        />
      ))}
      <Box
        position={[0, heightM - topT - 0.12, -depthM * 0.3]}
        size={[widthM * 0.6, 0.04, 0.1]}
        color="#2B2D30"
        roughness={0.6}
        castShadow={false}
      />
      {/* Height controller on the front edge: display and up / down buttons */}
      <group
        name="height-control"
        position={[widthM / 2 - 0.22, heightM - topT - 0.012, depthM / 2 - 0.045]}
      >
        <Box size={[0.13, 0.024, 0.06]} color="#202225" roughness={0.4} />
        <Box
          position={[-0.03, 0.0, 0.031]}
          size={[0.04, 0.012, 0.002]}
          color="#0B0E10"
          castShadow={false}
        />
        <mesh position={[-0.03, 0.0, 0.0325]}>
          <planeGeometry args={[0.028, 0.007]} />
          <meshBasicMaterial color={accentColor || '#7FD1B9'} />
        </mesh>
        <Box
          position={[0.03, 0.004, 0.031]}
          size={[0.018, 0.008, 0.003]}
          color={accentColor || '#7FD1B9'}
          castShadow={false}
        />
        <Box
          position={[0.03, -0.006, 0.031]}
          size={[0.018, 0.008, 0.003]}
          {...STEEL}
          castShadow={false}
        />
      </group>
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
  const flutes = clamp(Math.round(widthM / 0.06), 8, 40);
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
        roughness={0.3}
      />
      {/* Raised transaction ledge along the visitor side with a brass edge */}
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
        roughness={0.3}
      />
      <Box
        position={[0, heightM - 0.03, depthM / 2 + 0.01]}
        size={[widthM + 0.02, 0.008, 0.008]}
        {...BRASS}
      />
      {/* Fluted front panel, logo plate, lit strip and toe kick */}
      <Box
        position={[0, lowH * 0.5, depthM / 2 + 0.004]}
        size={[widthM * 0.9, lowH * 0.7, 0.01]}
        color={subColor}
        roughness={0.5}
        castShadow={false}
      />
      {Array.from({ length: flutes }).map((_, i) => (
        <Box
          key={i}
          position={[
            -widthM * 0.45 + 0.01 + ((widthM * 0.9 - 0.02) * (i + 0.5)) / flutes,
            lowH * 0.5,
            depthM / 2 + 0.012,
          ]}
          size={[((widthM * 0.9) / flutes) * 0.55, lowH * 0.7, 0.008]}
          color={shade(subColor, 0.04)}
          roughness={0.5}
          castShadow={false}
        />
      ))}
      <Box position={[0, lowH * 0.82, depthM / 2 + 0.018]} size={[0.2, 0.05, 0.004]} {...BRASS} />
      <mesh position={[0, lowH * 0.9, depthM / 2 + 0.006]}>
        <boxGeometry args={[widthM * 0.88, 0.006, 0.004]} />
        <meshBasicMaterial color="#FFE2A8" />
      </mesh>
      <Box
        position={[0, 0.04, depthM / 2 - 0.02]}
        size={[widthM * 0.96, 0.08, 0.02]}
        color={subColor}
        roughness={0.8}
        castShadow={false}
      />
      {/* Service bell on the ledge */}
      <group position={[-widthM * 0.3, heightM, depthM / 2 - ledgeD / 2]}>
        <Cyl position={[0, 0.006, 0]} radiusTop={0.04} height={0.012} {...CHROME} segments={16} />
        <mesh position={[0, 0.012, 0]} scale={[1, 0.6, 1]} castShadow>
          <sphereGeometry args={[0.035, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <Ball position={[0, 0.04, 0]} radius={0.007} {...BRASS} />
      </group>
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
