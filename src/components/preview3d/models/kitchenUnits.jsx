import {
  Box,
  Cyl,
  Ball,
  Knob,
  Pull,
  Doors,
  Drawers,
  HoledSlab,
  SteelBowl,
  CutawayCarcass,
  GooseneckTap,
  CHROME,
  STEEL,
  DARK_GAP,
  clamp,
  shade,
} from './shared.jsx';

function Lit({ position, size, color }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** 3D models: floor-standing kitchen units. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function SinkUnitModel({ widthM, depthM, heightM, mainColor, accentColor, handleColor }) {
  const topT = 0.04;
  const bodyTop = heightM - topT;
  const plinth = 0.09;
  const bowlDepth = 0.17;
  const holeW = widthM * 0.3;
  const holeD = depthM * 0.64;
  const holeX = -widthM * 0.28;
  const holeZ = depthM * 0.02;
  const tapScale = clamp(Math.min(widthM, depthM * 2) / 1.2, 0.8, 1.2);
  const drainerX = widthM * 0.22;
  return (
    <group>
      <Box
        position={[0, plinth / 2, -0.03]}
        size={[widthM - 0.04, plinth, depthM - 0.08]}
        color="#1F1F1F"
        roughness={0.9}
      />
      <CutawayCarcass
        width={widthM}
        depth={depthM}
        bodyTop={bodyTop}
        plinth={plinth}
        bowlDepth={bowlDepth}
        hole={[holeX - holeW / 2, holeX + holeW / 2, holeZ - holeD / 2, holeZ + holeD / 2]}
        color={accentColor}
      />
      {/* False drawer front above a pair of doors */}
      <Drawers
        width={widthM - 0.04}
        height={0.13}
        y={bodyTop - 0.145}
        z={depthM / 2 - 0.02}
        rows={1}
        color={accentColor}
        handleColor={handleColor}
      />
      <Doors
        width={widthM - 0.04}
        height={bodyTop - plinth - 0.19}
        y={plinth + 0.01}
        z={depthM / 2 - 0.02}
        count={2}
        color={accentColor}
        handleColor={handleColor}
        handleY={bodyTop - 0.21}
      />
      {/* Worktop with the sink opening, steel bowl with drain, and a grooved drainer */}
      <HoledSlab
        position={[0, bodyTop, 0]}
        width={widthM}
        depth={depthM}
        thickness={topT}
        radius={0.01}
        hole="rect"
        holeW={holeW}
        holeD={holeD}
        holeX={holeX}
        holeZ={holeZ}
        holeRadius={0.02}
        color={mainColor}
        roughness={0.3}
      />
      <SteelBowl
        position={[holeX, heightM, holeZ]}
        width={holeW - 0.02}
        depth={holeD - 0.02}
        bowlDepth={bowlDepth}
      />
      <Box
        position={[drainerX, heightM + 0.001, holeZ]}
        size={[widthM * 0.34, 0.003, holeD]}
        {...STEEL}
        roughness={0.3}
        castShadow={false}
      />
      {[0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84].map((f) => (
        <Box
          key={f}
          position={[drainerX, heightM + 0.004, holeZ - holeD / 2 + holeD * f]}
          size={[widthM * 0.3, 0.004, 0.008]}
          color="#8E98A0"
          metalness={0.6}
          castShadow={false}
        />
      ))}
      <GooseneckTap position={[holeX, heightM, -depthM / 2 + 0.07]} scale={tapScale} />
      {/* Soap dispenser */}
      <Cyl
        position={[holeX + holeW / 2 + 0.04, heightM + 0.05, -depthM / 2 + 0.07]}
        radiusTop={0.015}
        height={0.1}
        {...CHROME}
        segments={10}
      />
      <Ball
        position={[holeX + holeW / 2 + 0.04, heightM + 0.1, -depthM / 2 + 0.07]}
        radius={0.017}
        {...CHROME}
      />
    </group>
  );
}

function Dishwasher({ widthM, depthM, heightM, mainColor, subColor, accentColor }) {
  const front = depthM / 2;
  const ctrlH = clamp(heightM * 0.1, 0.05, 0.1);
  return (
    <group>
      <Box
        position={[0, 0.04, 0]}
        size={[widthM * 0.96, 0.08, depthM * 0.9]}
        color="#1F1F1F"
        roughness={0.9}
      />
      <Box
        position={[0, 0.08 + (heightM - 0.08) / 2, 0]}
        size={[widthM, heightM - 0.08, depthM]}
        color={shade(mainColor, -0.12)}
        roughness={0.4}
        metalness={0.2}
      />
      {/* Door panel with seam, control strip, status lights and handle */}
      <Box
        position={[0, 0.09 + (heightM - 0.09 - ctrlH - 0.012) / 2, front + 0.004]}
        size={[widthM - 0.012, heightM - 0.09 - ctrlH - 0.012, 0.02]}
        color={mainColor}
        roughness={0.28}
        metalness={0.5}
      />
      <group name="control-panel" position={[0, heightM - ctrlH / 2 - 0.004, front + 0.004]}>
        <Box size={[widthM - 0.012, ctrlH, 0.02]} color={subColor} roughness={0.3} />
        <Box
          position={[-widthM * 0.2, 0, 0.011]}
          size={[widthM * 0.2, ctrlH * 0.5, 0.003]}
          color="#0D1013"
          roughness={0.2}
          castShadow={false}
        />
        <Lit position={[-widthM * 0.25, 0, 0.0135]} size={[0.012, 0.014, 0.001]} color="#4EA8FF" />
        <Lit position={[-widthM * 0.2, 0, 0.0135]} size={[0.012, 0.014, 0.001]} color="#4EA8FF" />
        <Lit position={[-widthM * 0.15, 0, 0.0135]} size={[0.012, 0.014, 0.001]} color="#4EA8FF" />
        {[0.02, 0.12, 0.22, 0.32].map((f) => (
          <Box
            key={f}
            position={[widthM * f, 0, 0.012]}
            size={[0.03, 0.014, 0.004]}
            {...STEEL}
            castShadow={false}
          />
        ))}
        <Knob position={[widthM * 0.4, 0, 0.022]} radius={0.02} depth={0.016} color="#D6D9DC" />
      </group>
      <Pull
        position={[0, heightM - ctrlH - 0.05, front + 0.014]}
        length={widthM * 0.72}
        vertical={false}
        stand={0.035}
        thick={0.016}
        color={accentColor}
        roughness={0.25}
        metalness={0.7}
      />
      <Box
        position={[0, 0.09, front + 0.016]}
        size={[widthM - 0.02, 0.004, 0.003]}
        color={DARK_GAP}
        castShadow={false}
      />
    </group>
  );
}

function OvenUnit({ widthM, depthM, heightM, mainColor, subColor, accentColor }) {
  const front = depthM / 2;
  const stripY = heightM - 0.1;
  const zones = [
    [-0.24, -0.22],
    [0.24, -0.22],
    [-0.24, 0.2],
    [0.24, 0.2],
  ];
  return (
    <group>
      <Box
        position={[0, 0.04, 0]}
        size={[widthM * 0.96, 0.08, depthM * 0.9]}
        color="#151618"
        roughness={0.9}
      />
      <Box
        position={[0, 0.08 + (heightM - 0.1) / 2, 0]}
        size={[widthM, heightM - 0.1, depthM]}
        color={mainColor}
        roughness={0.35}
        metalness={0.2}
      />
      {/* Ceramic hob with four zones */}
      <Box
        position={[0, heightM - 0.01, 0]}
        size={[widthM, 0.02, depthM]}
        color={subColor}
        roughness={0.1}
        metalness={0.2}
      />
      {zones.map(([zx, zz], i) => (
        <group key={i} name="hob-zone">
          <Cyl
            position={[zx * widthM, heightM + 0.0006, zz * depthM]}
            radiusTop={widthM * 0.14}
            height={0.0012}
            color={shade(subColor, 0.12)}
            roughness={0.3}
            segments={28}
            castShadow={false}
          />
          <Cyl
            position={[zx * widthM, heightM + 0.0012, zz * depthM]}
            radiusTop={widthM * 0.115}
            height={0.0012}
            color={subColor}
            roughness={0.15}
            segments={28}
            castShadow={false}
          />
        </group>
      ))}
      {/* Control strip with four knobs and a clock */}
      <Box
        position={[0, stripY, front + 0.002]}
        size={[widthM - 0.01, 0.1, 0.026]}
        color={shade(mainColor, 0.04)}
        roughness={0.35}
        metalness={0.2}
      />
      {[-0.36, -0.2, 0.2, 0.36].map((k) => (
        <Knob
          key={k}
          position={[k * widthM, stripY, front + 0.024]}
          radius={0.02}
          depth={0.024}
          color={accentColor}
        />
      ))}
      <Box
        position={[0, stripY, front + 0.016]}
        size={[widthM * 0.16, 0.038, 0.003]}
        color="#0D1013"
        castShadow={false}
      />
      <Lit
        position={[-0.015, stripY, front + 0.0185]}
        size={[0.012, 0.02, 0.001]}
        color="#FF8A3D"
      />
      <Lit position={[0.015, stripY, front + 0.0185]} size={[0.012, 0.02, 0.001]} color="#FF8A3D" />
      {/* Glass door with towel-bar handle, plus a warming drawer */}
      <group name="oven-door">
        <Box
          position={[0, 0.44, front + 0.002]}
          size={[widthM - 0.02, 0.58, 0.028]}
          color={mainColor}
          roughness={0.35}
          metalness={0.2}
        />
        <Box
          position={[0, 0.43, front + 0.017]}
          size={[widthM * 0.8, 0.4, 0.004]}
          color="#08090B"
          roughness={0.05}
          metalness={0.3}
        />
        <Pull
          position={[0, 0.7, front + 0.016]}
          length={widthM * 0.76}
          vertical={false}
          stand={0.04}
          thick={0.016}
          color={accentColor}
          roughness={0.2}
          metalness={0.7}
        />
      </group>
      <Box
        position={[0, 0.118, front + 0.002]}
        size={[widthM - 0.02, 0.07, 0.028]}
        color={mainColor}
        roughness={0.35}
        metalness={0.2}
      />
      <Box
        position={[0, 0.128, front + 0.017]}
        size={[widthM * 0.36, 0.008, 0.003]}
        color={DARK_GAP}
        castShadow={false}
      />
    </group>
  );
}

export function ApplianceModel({ def, ...props }) {
  return def?.id === 'oven-unit' ? <OvenUnit {...props} /> : <Dishwasher {...props} />;
}
