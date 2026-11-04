/** 3D models: fixtures. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import {
  Box,
  Cyl,
  Pad,
  Ball,
  ZCyl,
  XCyl,
  Knob,
  Pull,
  Tap,
  Drain,
  Dish,
  HoledSlab,
  GlassPane,
  CHROME,
  STEEL,
  BLACK_PLASTIC,
  RUBBER,
  DARK_GAP,
  clamp,
  shade,
} from './shared.jsx';

/** Flush button glowing display segment etc: unlit colour so it reads as lit. */
function Lit({ position, size, color }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

export function FixtureToiletModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const tankD = depthM * 0.22;
  const tankH = heightM - 0.4;
  const bowlRx = widthM * 0.46;
  const bowlRz = depthM * 0.34;
  const bowlZ = depthM / 2 - bowlRz - 0.01;
  const ratio = bowlRz / bowlRx;
  const tankZ = -depthM / 2 + tankD / 2;
  const seat = shade(subColor, 0.02);
  return (
    <group>
      {/* Floor plate with bolt caps, pedestal and the back skirt joining bowl and cistern */}
      <Pad
        position={[0, 0.004, bowlZ - bowlRz * 0.1]}
        size={[widthM * 0.62, 0.008, depthM * 0.56]}
        radius={0.003}
        color={mainColor}
        roughness={0.3}
      />
      {[-1, 1].map((s) => (
        <Ball
          key={s}
          position={[s * widthM * 0.27, 0.012, bowlZ + bowlRz * 0.15]}
          radius={0.014}
          scale={[1, 0.6, 1]}
          color="#F2F2EF"
          roughness={0.3}
          segments={10}
        />
      ))}
      <Pad
        position={[0, 0.11, bowlZ - bowlRz * 0.2]}
        size={[widthM * 0.5, 0.22, depthM * 0.5]}
        radius={0.04}
        color={mainColor}
        roughness={0.2}
      />
      <Pad
        position={[0, 0.2, -depthM / 2 + (tankD + 0.08) / 2]}
        size={[widthM * 0.55, 0.4, tankD + 0.08]}
        radius={0.03}
        color={mainColor}
        roughness={0.2}
      />
      {/* Bowl, outer rim, seat ring, closed lid and hinges */}
      <mesh position={[0, 0.3, bowlZ]} scale={[1, 1, ratio]} castShadow receiveShadow>
        <cylinderGeometry args={[bowlRx, bowlRx * 0.62, 0.2, 32]} />
        <meshStandardMaterial color={mainColor} roughness={0.16} />
      </mesh>
      <mesh
        position={[0, 0.398, bowlZ]}
        scale={[1, 1, ratio]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[bowlRx * 0.97, 0.012, 8, 36]} />
        <meshStandardMaterial color={mainColor} roughness={0.16} />
      </mesh>
      <mesh
        name="toilet-seat"
        position={[0, 0.408, bowlZ + 0.005]}
        scale={[1, 1, ratio]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[bowlRx * 0.85, bowlRx * 0.13, 10, 36]} />
        <meshStandardMaterial color={seat} roughness={0.22} />
      </mesh>
      <group name="toilet-lid" position={[0, 0, 0]}>
        <mesh position={[0, 0.422, bowlZ + 0.005]} scale={[1, 1, ratio]} castShadow>
          <cylinderGeometry args={[bowlRx * 0.82, bowlRx * 0.84, 0.016, 32]} />
          <meshStandardMaterial color={seat} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.432, bowlZ + 0.005]} scale={[1, 1, ratio]}>
          <cylinderGeometry args={[bowlRx * 0.72, bowlRx * 0.76, 0.006, 32]} />
          <meshStandardMaterial color={shade(subColor, -0.025)} roughness={0.3} />
        </mesh>
      </group>
      {[-1, 1].map((s) => (
        <group key={s} name="toilet-hinge">
          <XCyl
            position={[s * widthM * 0.2, 0.43, bowlZ - bowlRz * 0.9]}
            radius={0.011}
            length={0.04}
            {...CHROME}
            segments={10}
          />
          <Box
            position={[s * widthM * 0.2, 0.41, bowlZ - bowlRz * 0.85]}
            size={[0.04, 0.012, 0.03]}
            {...CHROME}
          />
        </group>
      ))}
      {[-1, 1].map((s) => (
        <Cyl
          key={s}
          position={[s * widthM * 0.22, 0.396, bowlZ + bowlRz * 0.78]}
          radiusTop={0.008}
          height={0.008}
          {...RUBBER}
          segments={8}
          castShadow={false}
        />
      ))}
      {/* Cistern with overhanging lid, dual flush button and angle valve */}
      <Pad
        position={[0, 0.4 + (tankH - 0.02) / 2, tankZ]}
        size={[widthM * 0.9, tankH - 0.02, tankD]}
        radius={0.025}
        color={mainColor}
        roughness={0.16}
      />
      <Pad
        position={[0, heightM - 0.01, tankZ + 0.004]}
        size={[widthM * 0.94, 0.022, tankD + 0.012]}
        radius={0.008}
        color={mainColor}
        roughness={0.16}
      />
      <group name="flush-button" position={[0, heightM + 0.002, tankZ]}>
        <Box
          position={[0, 0, 0]}
          size={[widthM * 0.3, 0.005, tankD * 0.5]}
          {...CHROME}
          castShadow={false}
        />
        <Box
          position={[-widthM * 0.055, 0.005, 0]}
          size={[widthM * 0.1, 0.006, tankD * 0.34]}
          color="#F4F4F2"
          roughness={0.2}
        />
        <Box
          position={[widthM * 0.075, 0.005, 0]}
          size={[widthM * 0.06, 0.006, tankD * 0.34]}
          color="#F4F4F2"
          roughness={0.2}
        />
      </group>
      <XCyl
        position={[-widthM * 0.5 - 0.01, 0.52, tankZ]}
        radius={0.009}
        length={0.04}
        {...CHROME}
        segments={10}
      />
      <Ball position={[-widthM * 0.5 - 0.032, 0.52, tankZ]} radius={0.011} {...CHROME} />
    </group>
  );
}

export function FixtureBasinModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const T = 0.1;
  const holeW = widthM * 0.74;
  const holeD = depthM * 0.66;
  const holeZ = depthM * 0.06;
  const dishDepth = T - 0.004;
  const topY = heightM;
  const tapScale = clamp(Math.min(widthM, depthM * 1.33) / 0.6, 0.8, 1.25);
  const basinShade = shade(subColor, -0.03);
  return (
    <group>
      {/* Pedestal column and foot */}
      <Cyl
        position={[0, (heightM - T - 0.09) / 2, -depthM * 0.1]}
        radiusTop={widthM * 0.13}
        radiusBottom={widthM * 0.19}
        height={heightM - T - 0.09}
        color={mainColor}
        roughness={0.2}
        segments={24}
      />
      <Cyl
        position={[0, 0.02, -depthM * 0.1]}
        radiusTop={widthM * 0.22}
        radiusBottom={widthM * 0.24}
        height={0.04}
        color={mainColor}
        roughness={0.2}
        segments={24}
      />
      {/* Basin: rim slab with a real opening, sloped dish below it */}
      <Pad
        position={[0, topY - T - 0.045, 0]}
        size={[widthM * 0.9, 0.09, depthM * 0.92]}
        radius={0.04}
        color={mainColor}
        roughness={0.2}
      />
      <HoledSlab
        position={[0, topY - T, 0]}
        width={widthM}
        depth={depthM}
        thickness={T}
        radius={0.05}
        hole="ellipse"
        holeW={holeW}
        holeD={holeD}
        holeZ={holeZ}
        color={mainColor}
        roughness={0.14}
      />
      <Dish
        position={[0, topY - 0.002, holeZ]}
        rx={holeW / 2 - 0.002}
        rz={holeD / 2 - 0.002}
        depth={dishDepth}
        color={basinShade}
        roughness={0.12}
      />
      <Drain position={[0, topY - 0.002 - dishDepth, holeZ]} radius={0.024} />
      {/* Overflow slot on the back wall of the bowl */}
      <group name="overflow" position={[0, topY - 0.03, holeZ - holeD * 0.46]}>
        <Box
          position={[0, 0, 0]}
          size={[0.04, 0.014, 0.006]}
          color={DARK_GAP}
          rotation={[0.5, 0, 0]}
          castShadow={false}
        />
        <Box
          position={[0, 0.009, 0.002]}
          size={[0.046, 0.003, 0.006]}
          {...CHROME}
          rotation={[0.5, 0, 0]}
          castShadow={false}
        />
      </group>
      {/* Raised back splash and deck-mounted mixer tap */}
      <Box
        position={[0, topY + 0.02, -depthM / 2 + 0.014]}
        size={[widthM, 0.04, 0.028]}
        color={mainColor}
        roughness={0.14}
      />
      <Tap position={[0, topY, -depthM / 2 + 0.07]} scale={tapScale} reach={0.11} />
    </group>
  );
}

function FramedGlass({ position, width, height, depth = 0.008, frame = 0.02, metal = STEEL }) {
  return (
    <group position={position}>
      <GlassPane position={[0, height / 2, 0]} size={[width, height, depth]} opacity={0.22} />
      <Box position={[0, 0.01, 0]} size={[width, frame, frame]} {...metal} />
      <Box position={[0, height - 0.01, 0]} size={[width, frame, frame]} {...metal} />
    </group>
  );
}

export function FixtureShowerModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const trayH = 0.07;
  const post = 0.024;
  const glassH = heightM - trayH - 0.03;
  const gy = trayH + 0.015;
  const wallZ = -depthM / 2;
  const headR = clamp(Math.min(widthM, depthM) * 0.11, 0.06, 0.13);
  const railX = -widthM * 0.26;
  const frontZ = depthM / 2 - post / 2;
  const doorW = widthM * 0.6;
  const fixedW = widthM - doorW;
  const doorX = -widthM / 2 + doorW / 2;
  const fixedX = widthM / 2 - fixedW / 2;
  return (
    <group>
      {/* Tray: raised lip, sunken floor with grooves and a drain */}
      <HoledSlab
        thickness={trayH}
        width={widthM}
        depth={depthM}
        radius={0.01}
        hole="rect"
        holeW={widthM - 0.1}
        holeD={depthM - 0.1}
        holeRadius={0.02}
        color={mainColor}
        roughness={0.3}
      />
      <Box
        position={[0, 0.012, 0]}
        size={[widthM - 0.1, 0.024, depthM - 0.1]}
        color={shade(subColor, -0.02)}
        roughness={0.35}
        castShadow={false}
      />
      {[-0.3, -0.15, 0.15, 0.3].map((f) => (
        <Box
          key={f}
          position={[0, 0.025, depthM * f]}
          size={[widthM - 0.16, 0.002, 0.004]}
          color={shade(subColor, -0.12)}
          castShadow={false}
        />
      ))}
      <Drain position={[0, 0.024, 0]} radius={0.045} />

      {/* Front: sliding-style door on the left (hinged, with handle) and a fixed panel */}
      <group name="shower-door">
        <FramedGlass position={[doorX, gy, frontZ]} width={doorW - 0.01} height={glassH} />
        <Pull
          position={[doorX + doorW / 2 - 0.07, trayH + glassH * 0.5, frontZ + 0.004]}
          length={0.32}
          color={CHROME.color}
          roughness={CHROME.roughness}
          metalness={CHROME.metalness}
          stand={0.035}
        />
        {[0.2, glassH - 0.2].map((hy) => (
          <Box
            key={hy}
            position={[-widthM / 2 + 0.012, gy + hy, frontZ]}
            size={[0.024, 0.05, 0.024]}
            {...CHROME}
          />
        ))}
      </group>
      <FramedGlass position={[fixedX, gy, frontZ]} width={fixedW} height={glassH} />
      {/* Right side panel */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <FramedGlass
          position={[0, gy, widthM / 2 - post / 2]}
          width={depthM - post}
          height={glassH}
        />
      </group>
      {/* Vertical frame posts: door edge, divider, corner */}
      {[-widthM / 2 + 0.012, widthM / 2 - fixedW, widthM / 2 - post / 2].map((px, i) => (
        <Box
          key={i}
          position={[px, gy + glassH / 2, i === 2 ? frontZ : frontZ]}
          size={[post, glassH, post]}
          {...STEEL}
        />
      ))}
      <Box
        position={[widthM / 2 - post / 2, gy + glassH / 2, wallZ + post / 2]}
        size={[post, glassH, post]}
        {...STEEL}
      />
      {/* Magnetic seal between door and fixed panel */}
      <Box
        position={[widthM / 2 - fixedW - 0.008, gy + glassH / 2, frontZ]}
        size={[0.006, glassH - 0.02, 0.01]}
        {...BLACK_PLASTIC}
        castShadow={false}
      />

      {/* Rain head on a wall arm */}
      <group name="shower-head">
        <ZCyl
          position={[0, heightM - 0.1, wallZ + 0.14]}
          radius={0.011}
          length={0.28}
          {...CHROME}
          segments={10}
        />
        <Cyl
          position={[0, heightM - 0.1, wallZ + 0.006]}
          radiusTop={0.03}
          height={0.012}
          rotation={[Math.PI / 2, 0, 0]}
          {...CHROME}
          segments={16}
        />
        <Cyl
          position={[0, heightM - 0.11, wallZ + 0.28]}
          radiusTop={headR}
          radiusBottom={headR * 0.96}
          height={0.018}
          {...CHROME}
          segments={28}
        />
        <Cyl
          position={[0, heightM - 0.121, wallZ + 0.28]}
          radiusTop={headR * 0.86}
          height={0.004}
          color="#3B4044"
          roughness={0.6}
          segments={24}
          castShadow={false}
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Cyl
            key={i}
            position={[
              Math.cos((i * Math.PI) / 3) * headR * 0.5,
              heightM - 0.124,
              wallZ + 0.28 + Math.sin((i * Math.PI) / 3) * headR * 0.5,
            ]}
            radiusTop={headR * 0.1}
            height={0.002}
            {...CHROME}
            segments={8}
            castShadow={false}
          />
        ))}
      </group>

      {/* Hand shower on a slide rail with its hose looping to the wall outlet */}
      <group name="hand-shower">
        <Cyl
          position={[railX, 1.4, wallZ + 0.04]}
          radiusTop={0.008}
          height={0.9}
          {...CHROME}
          segments={10}
        />
        {[0.95, 1.85].map((y) => (
          <Box key={y} position={[railX, y, wallZ + 0.02]} size={[0.03, 0.03, 0.04]} {...CHROME} />
        ))}
        <Box position={[railX, 1.5, wallZ + 0.062]} size={[0.034, 0.05, 0.03]} {...CHROME} />
        <Cyl
          position={[railX, 1.44, wallZ + 0.085]}
          radiusTop={0.014}
          radiusBottom={0.011}
          height={0.17}
          {...CHROME}
          segments={10}
        />
        <Cyl
          position={[railX, 1.55, wallZ + 0.085]}
          radiusTop={0.042}
          radiusBottom={0.026}
          height={0.024}
          {...CHROME}
          segments={20}
        />
        <Cyl
          position={[railX, 1.563, wallZ + 0.085]}
          radiusTop={0.036}
          height={0.004}
          color="#3B4044"
          segments={16}
          castShadow={false}
        />
        <Cyl
          position={[railX, 1.255, wallZ + 0.085]}
          radiusTop={0.007}
          height={0.17}
          {...BLACK_PLASTIC}
          segments={8}
        />
        <mesh position={[railX + 0.07, 1.17, wallZ + 0.085]} rotation={[0, 0, Math.PI]} castShadow>
          <torusGeometry args={[0.07, 0.007, 8, 18, Math.PI]} />
          <meshStandardMaterial {...BLACK_PLASTIC} />
        </mesh>
        <Cyl
          position={[railX + 0.14, 1.235, wallZ + 0.085]}
          radiusTop={0.007}
          height={0.13}
          {...BLACK_PLASTIC}
          segments={8}
        />
        <ZCyl
          position={[railX + 0.14, 1.3, wallZ + 0.04]}
          radius={0.02}
          length={0.04}
          {...CHROME}
          segments={12}
        />
      </group>

      {/* Thermostatic mixer valve and diverter on the wall */}
      <group name="mixer-valve">
        <ZCyl
          position={[widthM * 0.22, 1.0, wallZ + 0.006]}
          radius={0.06}
          length={0.012}
          {...CHROME}
          segments={24}
        />
        <Knob
          position={[widthM * 0.22, 1.0, wallZ + 0.03]}
          radius={0.028}
          depth={0.03}
          {...CHROME}
        />
        <Knob
          position={[widthM * 0.22, 1.1, wallZ + 0.02]}
          radius={0.014}
          depth={0.018}
          {...CHROME}
        />
      </group>
    </group>
  );
}

export function FixtureBathtubModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const T = 0.3;
  const holeW = widthM - 0.28;
  const holeD = depthM - 0.18;
  const holeX = -0.07;
  const rimY = heightM;
  const floorY = heightM - T;
  const skirtH = heightM - T - 0.04;
  return (
    <group>
      {/* Kick plinth, panelled skirt and the rim slab with a real opening */}
      <Box
        position={[0, 0.02, 0]}
        size={[widthM - 0.08, 0.04, depthM - 0.08]}
        color="#3B3F43"
        roughness={0.8}
      />
      <Pad
        position={[0, 0.04 + skirtH / 2, 0]}
        size={[widthM, skirtH, depthM]}
        radius={0.03}
        color={mainColor}
        roughness={0.2}
      />
      <Box
        position={[0, 0.04 + skirtH / 2, depthM / 2 + 0.002]}
        size={[widthM * 0.84, skirtH * 0.7, 0.004]}
        color={shade(mainColor, -0.04)}
        roughness={0.3}
        castShadow={false}
      />
      <HoledSlab
        position={[0, floorY, 0]}
        width={widthM}
        depth={depthM}
        thickness={T}
        radius={0.1}
        hole="rect"
        holeW={holeW}
        holeD={holeD}
        holeX={holeX}
        holeRadius={0.22}
        color={mainColor}
        roughness={0.14}
      />
      {/* Inner floor */}
      <Pad
        position={[holeX, floorY + 0.004, 0]}
        size={[holeW - 0.002, 0.012, holeD - 0.002]}
        radius={0.22}
        color={shade(subColor, -0.03)}
        roughness={0.12}
      />
      <Drain position={[holeX + holeW / 2 - 0.14, floorY + 0.012, 0]} radius={0.028} />
      {/* Overflow plate on the front inner wall near the taps */}
      <group name="overflow" position={[holeX + holeW / 2 - 0.4, rimY - 0.1, holeD / 2 - 0.004]}>
        <ZCyl position={[0, 0, 0]} radius={0.03} length={0.006} {...CHROME} segments={18} />
        <Box
          position={[0, 0, 0.004]}
          size={[0.034, 0.008, 0.003]}
          color={DARK_GAP}
          castShadow={false}
        />
      </group>
      {/* Deck-mounted bath mixer on the right-hand end, spout over the tub */}
      <group position={[widthM / 2 - 0.105, rimY, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Tap position={[0, 0, 0]} scale={1.15} lever="double" reach={0.16} rise={0.1} />
      </group>
    </group>
  );
}

export function FixtureWasherModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const doorR = clamp(Math.min(widthM, heightM) * 0.32, 0.1, 0.3);
  const doorY = heightM * 0.43;
  const front = depthM / 2;
  const panelY = heightM - 0.075;
  const dots = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  return (
    <group>
      <Pad
        position={[0, heightM / 2 + 0.01, 0]}
        size={[widthM, heightM - 0.02, depthM]}
        radius={0.015}
        color={mainColor}
        roughness={0.3}
      />
      <Pad
        position={[0, heightM - 0.005, 0]}
        size={[widthM + 0.006, 0.014, depthM + 0.006]}
        radius={0.005}
        color={shade(mainColor, 0.02)}
        roughness={0.28}
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cyl
            key={`${sx}${sz}`}
            position={[sx * (widthM / 2 - 0.05), 0.01, sz * (depthM / 2 - 0.05)]}
            radiusTop={0.02}
            height={0.02}
            {...BLACK_PLASTIC}
            segments={10}
          />
        ))
      )}
      {/* Porthole: chrome ring, rubber gasket, glass dome over a perforated drum */}
      <group name="washer-door" position={[0, doorY, front]}>
        <mesh position={[0, 0, 0.012]} castShadow>
          <torusGeometry args={[doorR, doorR * 0.11, 10, 40]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
        <mesh position={[0, 0, 0.002]} castShadow>
          <torusGeometry args={[doorR * 0.84, doorR * 0.07, 8, 36]} />
          <meshStandardMaterial {...RUBBER} />
        </mesh>
        <ZCyl
          position={[0, 0, -0.01]}
          radius={doorR * 0.82}
          length={0.012}
          color="#171D22"
          roughness={0.7}
          segments={32}
          castShadow={false}
        />
        {dots.map((a, i) => (
          <ZCyl
            key={i}
            position={[Math.cos(a) * doorR * 0.55, Math.sin(a) * doorR * 0.55, -0.002]}
            radius={0.005}
            length={0.004}
            color="#4B565E"
            segments={6}
            castShadow={false}
          />
        ))}
        <mesh position={[0, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.3, 1]}>
          <sphereGeometry args={[doorR * 0.84, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={subColor}
            transparent
            opacity={0.45}
            roughness={0.05}
            metalness={0.3}
            depthWrite={false}
          />
        </mesh>
        <Box position={[-doorR - 0.02, 0.1, 0.006]} size={[0.018, 0.05, 0.014]} {...CHROME} />
        <Box position={[-doorR - 0.02, -0.1, 0.006]} size={[0.018, 0.05, 0.014]} {...CHROME} />
        <Box position={[doorR + 0.018, 0, 0.008]} size={[0.014, 0.05, 0.016]} {...BLACK_PLASTIC} />
      </group>
      {/* Control panel: soap drawer, display with buttons and the programme dial */}
      <Box
        position={[0, panelY, front + 0.002]}
        size={[widthM - 0.05, 0.11, 0.004]}
        color={shade(mainColor, -0.04)}
        roughness={0.35}
        castShadow={false}
      />
      <group name="soap-drawer" position={[-widthM * 0.26, panelY, front + 0.004]}>
        <Box
          position={[0, 0, 0]}
          size={[widthM * 0.26, 0.075, 0.004]}
          color={DARK_GAP}
          castShadow={false}
        />
        <Box
          position={[0, 0, 0.003]}
          size={[widthM * 0.24, 0.066, 0.004]}
          color={shade(mainColor, 0.02)}
          roughness={0.3}
        />
        <Box
          position={[0, 0.012, 0.006]}
          size={[widthM * 0.12, 0.008, 0.003]}
          color={DARK_GAP}
          castShadow={false}
        />
      </group>
      <group name="washer-display" position={[widthM * 0.0, panelY + 0.012, front + 0.005]}>
        <Box
          position={[0, 0, 0]}
          size={[0.11, 0.04, 0.004]}
          color="#12181D"
          roughness={0.2}
          castShadow={false}
        />
        <Lit position={[-0.025, 0, 0.003]} size={[0.014, 0.022, 0.001]} color="#FF6B4A" />
        <Lit position={[0, 0, 0.003]} size={[0.014, 0.022, 0.001]} color="#FF6B4A" />
        <Lit position={[0.025, 0, 0.003]} size={[0.014, 0.022, 0.001]} color="#FF6B4A" />
      </group>
      {[-1, 0, 1].map((s) => (
        <Box
          key={s}
          position={[s * 0.036, panelY - 0.028, front + 0.006]}
          size={[0.026, 0.012, 0.006]}
          {...BLACK_PLASTIC}
        />
      ))}
      <Knob
        position={[widthM * 0.28, panelY, front + 0.018]}
        radius={0.032}
        depth={0.028}
        color="#D7DBDE"
        metalness={0.4}
      />
    </group>
  );
}
