/** 3D models: bathroom and utility pieces. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import {
  Box,
  Cyl,
  Ball,
  XCyl,
  Knob,
  Tap,
  Drain,
  Dish,
  HoledSlab,
  Doors,
  Drawers,
  CHROME,
  STEEL,
  BRASS,
  BLACK_PLASTIC,
  DARK_GAP,
  clamp,
  shade,
} from './shared.jsx';

export function VanityModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  subColor,
  handleColor,
  legColor,
}) {
  const plinth = 0.08;
  const slabT = 0.05;
  const bodyTop = heightM - slabT;
  const holeW = widthM * 0.56;
  const holeD = depthM * 0.62;
  const holeZ = depthM * 0.06;
  const drawerH = 0.15;
  const front = depthM / 2;
  const tapScale = clamp(Math.min(widthM, depthM * 1.6) / 0.8, 0.8, 1.25);
  return (
    <group>
      <Box
        position={[0, plinth / 2, -0.01]}
        size={[widthM * 0.94, plinth, depthM - 0.06]}
        color={legColor}
        roughness={0.8}
      />
      <Box
        position={[0, plinth + (bodyTop - plinth) / 2, 0]}
        size={[widthM, bodyTop - plinth, depthM]}
        color={mainColor}
        roughness={0.65}
      />
      {/* Drawer above two doors, brass pulls and knobs */}
      <Drawers
        width={widthM - 0.04}
        height={drawerH}
        y={bodyTop - drawerH - 0.015}
        z={front}
        rows={1}
        color={mainColor}
        handleColor={handleColor}
      />
      <Doors
        width={widthM - 0.04}
        height={bodyTop - plinth - drawerH - 0.05}
        y={plinth + 0.01}
        z={front}
        count={2}
        color={mainColor}
        handleColor={handleColor}
        handle="knob"
        handleY={bodyTop - drawerH - 0.07}
        hinges={false}
      />
      {/* Stone top with an undermount basin, drain, overflow and mixer tap */}
      <HoledSlab
        position={[0, bodyTop, 0]}
        width={widthM + 0.03}
        depth={depthM + 0.03}
        thickness={slabT}
        radius={0.012}
        hole="ellipse"
        holeW={holeW}
        holeD={holeD}
        holeZ={holeZ}
        color={subColor}
        roughness={0.28}
      />
      <Dish
        position={[0, heightM - 0.002, holeZ]}
        rx={holeW / 2 - 0.002}
        rz={holeD / 2 - 0.002}
        depth={slabT - 0.004}
        color="#EDEFEE"
        roughness={0.12}
      />
      <Drain position={[0, heightM - slabT + 0.002, holeZ]} radius={0.022} />
      <group name="overflow" position={[0, heightM - 0.014, holeZ - holeD * 0.46]}>
        <Box
          size={[0.035, 0.01, 0.005]}
          color={DARK_GAP}
          rotation={[0.5, 0, 0]}
          castShadow={false}
        />
      </group>
      <Box
        position={[0, heightM + 0.012, -depthM / 2 + 0.008]}
        size={[widthM + 0.03, 0.024, 0.016]}
        color={subColor}
        roughness={0.28}
      />
      <Tap position={[0, heightM, -depthM / 2 + 0.075]} scale={tapScale} reach={0.1} rise={0.075} />
    </group>
  );
}

export function SquatToiletModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const slabH = heightM * 0.4;
  const holeW = widthM * 0.36;
  const holeD = depthM * 0.66;
  const holeZ = -depthM * 0.04;
  const ribs = [0.12, 0.3, 0.48, 0.66, 0.84];
  const padW = widthM * 0.26;
  const padD = depthM * 0.34;
  const pipeZ = -depthM / 2 + 0.05;
  return (
    <group>
      <HoledSlab
        width={widthM}
        depth={depthM}
        thickness={slabH}
        radius={0.04}
        hole="ellipse"
        holeW={holeW}
        holeD={holeD}
        holeZ={holeZ}
        color={mainColor}
        roughness={0.2}
      />
      {/* Sloped pan, rim and drain mouth at the back */}
      <Dish
        position={[0, slabH - 0.002, holeZ]}
        rx={holeW / 2 - 0.002}
        rz={holeD / 2 - 0.002}
        depth={slabH - 0.004}
        color={subColor}
        roughness={0.15}
      />
      <Cyl
        position={[0, 0.01, holeZ - holeD * 0.32]}
        radiusTop={holeW * 0.14}
        height={0.004}
        color="#2B2E31"
        roughness={0.6}
        segments={14}
        castShadow={false}
      />
      {/* Ribbed non-slip foot pads */}
      {[-1, 1].map((s) => (
        <group key={s} name="foot-pad">
          <Box
            position={[s * widthM * 0.33, slabH + 0.005, depthM * 0.24]}
            size={[padW, 0.01, padD]}
            color="#E9EBEC"
            roughness={0.45}
          />
          {ribs.map((f) => (
            <Box
              key={f}
              position={[s * widthM * 0.33, slabH + 0.0115, depthM * 0.24 - padD / 2 + padD * f]}
              size={[padW * 0.9, 0.003, 0.006]}
              color="#B9BEC2"
              castShadow={false}
            />
          ))}
        </group>
      ))}
      {/* Flush pipe up the back wall with collar rings, elbow into the pan and a stop valve */}
      <Cyl
        name="flush-pipe"
        position={[0, heightM / 2, pipeZ]}
        radiusTop={0.022}
        height={heightM}
        color="#D8DBDD"
        roughness={0.3}
        segments={14}
      />
      {[0.2, 0.85].map((f) => (
        <Cyl
          key={f}
          position={[0, heightM * f, pipeZ]}
          radiusTop={0.03}
          height={0.012}
          {...CHROME}
          segments={14}
        />
      ))}
      <Box
        position={[0, slabH + 0.05, pipeZ + 0.03]}
        size={[0.05, 0.05, 0.05]}
        color="#D8DBDD"
        roughness={0.3}
      />
      <XCyl
        position={[0.05, heightM - 0.02, pipeZ]}
        radius={0.008}
        length={0.07}
        {...CHROME}
        segments={10}
      />
      <Ball position={[0.09, heightM - 0.02, pipeZ]} radius={0.016} {...CHROME} />
    </group>
  );
}

export function TankModel({ widthM, depthM, heightM, mainColor, subColor, accentColor, legColor }) {
  const r = (Math.min(widthM, depthM) / 2) * 0.96;
  const standH = heightM * 0.3;
  const tankH = heightM * 0.64;
  const bodyY = standH + 0.03;
  const topY = bodyY + tankH;
  const leg = 0.04;
  const lx = widthM / 2 - 0.02 - leg / 2;
  const lz = depthM / 2 - 0.02 - leg / 2;
  const pipeX = r * 0.42;
  return (
    <group>
      {/* Stand: four steel legs, shelf and cross braces */}
      {[
        [-lx, -lz],
        [lx, -lz],
        [-lx, lz],
        [lx, lz],
      ].map(([x, z], i) => (
        <Box
          key={i}
          position={[x, standH / 2, z]}
          size={[leg, standH, leg]}
          color={legColor}
          roughness={0.5}
          metalness={0.2}
        />
      ))}
      <Box
        position={[0, standH + 0.015, 0]}
        size={[widthM, 0.03, depthM]}
        color={legColor}
        roughness={0.5}
      />
      <Box
        position={[0, standH * 0.45, lz]}
        size={[widthM - 0.06, 0.02, 0.02]}
        color={legColor}
        roughness={0.5}
      />
      {/* Cylinder, shell seam bands, domed top and base ring */}
      <Cyl
        position={[0, bodyY + tankH / 2, 0]}
        radiusTop={r}
        height={tankH}
        color={mainColor}
        roughness={0.25}
        metalness={0.1}
        segments={32}
      />
      <Cyl
        position={[0, bodyY + 0.01, 0]}
        radiusTop={r + 0.004}
        height={0.02}
        color={subColor}
        roughness={0.4}
        segments={32}
        castShadow={false}
      />
      {[0.35, 0.7].map((f) => (
        <Cyl
          key={f}
          position={[0, bodyY + tankH * f, 0]}
          radiusTop={r + 0.002}
          height={0.006}
          color={shade(mainColor, -0.08)}
          segments={32}
          castShadow={false}
        />
      ))}
      <mesh position={[0, topY, 0]} scale={[1, 0.22, 1]} castShadow>
        <sphereGeometry args={[r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={mainColor} roughness={0.25} metalness={0.1} />
      </mesh>
      {/* Rating label and control cover with thermostat dial and indicator light */}
      <Box
        position={[0, bodyY + tankH * 0.62, r + 0.001]}
        size={[r * 0.9, tankH * 0.16, 0.003]}
        color="#F4F1E6"
        roughness={0.6}
        castShadow={false}
      />
      <Box
        position={[0, bodyY + tankH * 0.62, r + 0.004]}
        size={[r * 0.7, 0.006, 0.002]}
        color="#C0392B"
        castShadow={false}
      />
      <group name="thermostat" position={[0, bodyY + tankH * 0.25, r]}>
        <Box
          position={[0, 0, 0.004]}
          size={[r * 0.8, tankH * 0.2, 0.012]}
          {...BLACK_PLASTIC}
          roughness={0.45}
        />
        <Knob position={[-r * 0.14, 0, 0.026]} radius={0.027} depth={0.024} color="#D6D9DC" />
        <mesh position={[r * 0.22, 0.02, 0.012]}>
          <sphereGeometry args={[0.007, 8, 6]} />
          <meshBasicMaterial color="#38D26B" />
        </mesh>
        <Box
          position={[r * 0.22, -0.016, 0.011]}
          size={[0.026, 0.01, 0.003]}
          {...STEEL}
          castShadow={false}
        />
      </group>
      {/* Cold (blue) inlet and hot (red) outlet with brass unions, plus relief valve */}
      {[
        [-pipeX, '#2F6DB5'],
        [pipeX, '#B5352B'],
      ].map(([x, c]) => (
        <group key={c} name="heater-pipe">
          <Cyl
            position={[x, topY + 0.07, 0]}
            radiusTop={0.014}
            height={0.12}
            color={c}
            roughness={0.5}
            segments={12}
          />
          <Cyl
            position={[x, topY + 0.015, 0]}
            radiusTop={0.022}
            height={0.03}
            {...BRASS}
            segments={6}
          />
          <XCyl
            position={[x * 1.3, topY + 0.125, 0]}
            radius={0.014}
            length={Math.abs(x) * 0.6 + 0.0001}
            color={c}
            roughness={0.5}
            segments={12}
          />
        </group>
      ))}
      <group position={[r * 0.82, bodyY + tankH * 0.85, r * 0.5]}>
        <XCyl position={[0.03, 0, 0]} radius={0.012} length={0.06} {...BRASS} segments={8} />
        <Box
          position={[0.07, -0.02, 0]}
          size={[0.012, 0.05, 0.01]}
          {...CHROME}
          rotation={[0, 0, 0.3]}
        />
      </group>
      <Cyl
        position={[0, topY + 0.003, 0]}
        radiusTop={r * 0.12}
        height={0.006}
        color={accentColor}
        metalness={0.5}
        segments={14}
        castShadow={false}
      />
    </group>
  );
}

export function BasketModel({ widthM, depthM, heightM, mainColor, accentColor }) {
  const r = Math.min(widthM, depthM) / 2;
  const rBottom = r * 0.8;
  const lidH = 0.05;
  const bodyH = heightM - lidH;
  const radiusAt = (y) => rBottom + (r - rBottom) * (y / bodyH);
  const tilt = Math.atan((r - rBottom) / bodyH);
  const stakes = Array.from({ length: 18 }, (_, i) => (i * Math.PI * 2) / 18);
  const dark = shade(mainColor, -0.1);
  return (
    <group>
      <Cyl
        position={[0, bodyH / 2, 0]}
        radiusTop={r}
        radiusBottom={rBottom}
        height={bodyH}
        color={dark}
        roughness={0.95}
        segments={28}
      />
      {/* Vertical stakes and horizontal weave bands */}
      {stakes.map((a, i) => (
        <group key={i} rotation={[0, -a, 0]}>
          <mesh
            position={[(r + rBottom) / 2 + 0.003, bodyH / 2, 0]}
            rotation={[0, 0, -tilt]}
            castShadow
          >
            <boxGeometry args={[0.012, bodyH * 0.97, 0.014]} />
            <meshStandardMaterial color={mainColor} roughness={0.95} />
          </mesh>
        </group>
      ))}
      {[0.12, 0.28, 0.44, 0.6, 0.76, 0.92].map((f, idx) => (
        <mesh key={idx} position={[0, bodyH * f, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[radiusAt(bodyH * f) + 0.007, 0.007, 6, 32]} />
          <meshStandardMaterial
            color={idx % 2 ? accentColor : shade(mainColor, 0.04)}
            roughness={0.95}
          />
        </mesh>
      ))}
      {/* Rolled rim, carry handles and a domed woven lid with a knob */}
      <mesh position={[0, bodyH, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[r + 0.004, 0.014, 8, 32]} />
        <meshStandardMaterial color={accentColor} roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          name="basket-handle"
          position={[s * (r + 0.008), bodyH * 0.84, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        >
          <torusGeometry args={[0.035, 0.007, 6, 14, Math.PI]} />
          <meshStandardMaterial color={accentColor} roughness={0.85} />
        </mesh>
      ))}
      <group name="basket-lid" position={[0, bodyH, 0]}>
        <Cyl
          position={[0, lidH * 0.4, 0]}
          radiusTop={r * 0.9}
          radiusBottom={r * 1.01}
          height={lidH * 0.8}
          color={mainColor}
          roughness={0.95}
          segments={28}
        />
        <mesh position={[0, lidH * 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * 0.5, 0.006, 6, 28]} />
          <meshStandardMaterial color={accentColor} roughness={0.9} />
        </mesh>
        <Ball position={[0, lidH * 0.95, 0]} radius={0.022} color={accentColor} roughness={0.8} />
      </group>
    </group>
  );
}
