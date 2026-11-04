/** 3D models: kitchen. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import {
  Box,
  Cyl,
  Pad,
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

/** Bar stool tucked under an island overhang. */
function Stool({ position, color }) {
  const legs = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4);
  return (
    <group name="stool" position={position}>
      {legs.map((a, i) => (
        <Box
          key={i}
          position={[Math.cos(a) * 0.1, 0.32, Math.sin(a) * 0.1]}
          size={[0.022, 0.64, 0.022]}
          color="#2A2A2C"
          roughness={0.5}
          metalness={0.2}
        />
      ))}
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.007, 6, 20]} />
        <meshStandardMaterial color="#2A2A2C" roughness={0.5} metalness={0.2} />
      </mesh>
      <Cyl
        position={[0, 0.665, 0]}
        radiusTop={0.15}
        radiusBottom={0.14}
        height={0.05}
        color={color}
        roughness={0.8}
        segments={24}
      />
    </group>
  );
}

export function KitchenIslandModel({ def, widthM, depthM, heightM, mainColor, legColor }) {
  const body = def.subColor || '#4E5F55';
  const bodyW = widthM * 0.94;
  const bodyD = depthM * 0.78;
  const bodyZ = -depthM * 0.05;
  const plinth = 0.09;
  const topT = 0.05;
  const topY = heightM - topT;
  const bodyH = topY - plinth;
  const bankW = bodyW * 0.34;
  const doorW = (bodyW - bankW) / 2;
  const frontZ = bodyD / 2;
  const stoolCount = widthM > 1.1 ? 2 : 1;
  return (
    <group>
      {/* Plinth, carcass and worktop with a seating overhang */}
      <Box
        position={[0, plinth / 2, bodyZ]}
        size={[bodyW - 0.06, plinth, bodyD - 0.06]}
        color={legColor || '#3A4840'}
        roughness={0.85}
      />
      <Box
        position={[0, plinth + bodyH / 2, bodyZ]}
        size={[bodyW, bodyH, bodyD]}
        color={body}
        roughness={0.75}
      />
      <Pad
        position={[0, topY + topT / 2, 0]}
        size={[widthM, topT, depthM]}
        radius={0.012}
        color={mainColor}
        roughness={0.3}
      />
      <Box
        position={[0, topY - 0.006, 0]}
        size={[widthM - 0.02, 0.012, depthM - 0.02]}
        color={shade(mainColor, -0.1)}
        roughness={0.5}
        castShadow={false}
      />
      {/* Corbels carrying the overhang */}
      {[-0.3, 0.3].map((f) => (
        <group key={f} name="corbel">
          <Box
            position={[widthM * f, topY - 0.06, bodyZ + bodyD / 2 + 0.025]}
            size={[0.03, 0.12, 0.05]}
            {...STEEL}
          />
          <Box
            position={[widthM * f, topY - 0.015, depthM / 2 - 0.06]}
            size={[0.03, 0.02, 0.12]}
            {...STEEL}
          />
        </group>
      ))}
      {/* Work side (back): door pair and a central drawer bank, with panels and pulls */}
      <group position={[0, 0, bodyZ]} rotation={[0, Math.PI, 0]}>
        <Doors
          width={doorW}
          height={bodyH - 0.02}
          x={-(bankW / 2 + doorW / 2)}
          y={plinth + 0.01}
          z={frontZ}
          count={1}
          color={body}
          handleColor={STEEL.color}
          handleY={topY - 0.1}
        />
        <Drawers
          width={bankW}
          height={bodyH - 0.02}
          y={plinth + 0.01}
          z={frontZ}
          rows={3}
          color={body}
          handleColor={STEEL.color}
        />
        <Doors
          width={doorW}
          height={bodyH - 0.02}
          x={bankW / 2 + doorW / 2}
          y={plinth + 0.01}
          z={frontZ}
          count={1}
          color={body}
          handleColor={STEEL.color}
          handleY={topY - 0.1}
        />
      </group>
      {/* Seating side: panelled end boards and tucked-in stools under the overhang */}
      <Box
        position={[0, plinth + bodyH / 2, bodyZ + bodyD / 2 + 0.003]}
        size={[bodyW - 0.04, bodyH - 0.06, 0.006]}
        color={shade(body, -0.04)}
        roughness={0.7}
        castShadow={false}
      />
      {Array.from({ length: stoolCount }).map((_, i) => (
        <Stool
          key={i}
          position={[(i - (stoolCount - 1) / 2) * widthM * 0.4, 0, depthM / 2 - 0.03]}
          color={shade(mainColor, -0.35)}
        />
      ))}
    </group>
  );
}

export function KitchenCounterModel({ def, widthM, depthM, heightM, mainColor }) {
  const body = def.subColor || '#38423B';
  const metal = def.metalColor || '#A4ADB4';
  const topT = 0.04;
  const bodyTop = heightM - topT;
  const plinth = 0.09;
  const bowlDepth = 0.17;
  const holeW = widthM * 0.4;
  const holeD = depthM * 0.62;
  const holeX = -widthM * 0.18;
  const holeZ = depthM * 0.04;
  const n = widthM > 1.3 ? 4 : widthM > 0.9 ? 3 : 2;
  const tapScale = clamp(Math.min(widthM, depthM * 2) / 1.2, 0.8, 1.2);
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
        color={body}
      />
      <Doors
        width={widthM - 0.04}
        height={bodyTop - plinth - 0.02}
        y={plinth + 0.01}
        z={depthM / 2 - 0.02}
        count={n}
        color={body}
        handleColor={metal}
        handleY={bodyTop - 0.14}
      />
      {/* Worktop with a double-bowl opening and a drainer */}
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
        roughness={0.28}
      />
      <SteelBowl
        position={[holeX - holeW * 0.25, heightM, holeZ]}
        width={holeW * 0.48}
        depth={holeD - 0.02}
        bowlDepth={bowlDepth}
      />
      <SteelBowl
        position={[holeX + holeW * 0.25, heightM, holeZ]}
        width={holeW * 0.48}
        depth={holeD - 0.02}
        bowlDepth={bowlDepth * 0.8}
      />
      {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((f) => (
        <Box
          key={f}
          position={[widthM * 0.26, heightM + 0.003, -depthM / 2 + depthM * (0.1 + 0.8 * f) * 1]}
          size={[widthM * 0.22, 0.006, 0.01]}
          {...STEEL}
          castShadow={false}
        />
      ))}
      <GooseneckTap position={[holeX, heightM, -depthM / 2 + 0.07]} scale={tapScale} />
    </group>
  );
}

function Burner({ position, r }) {
  const bars = [0, Math.PI / 2];
  const feet = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];
  return (
    <group name="burner" position={position}>
      <Cyl
        position={[0, 0.006, 0]}
        radiusTop={r}
        radiusBottom={r * 1.04}
        height={0.012}
        color="#3A3D40"
        roughness={0.45}
        metalness={0.5}
        segments={22}
      />
      <Cyl
        position={[0, 0.02, 0]}
        radiusTop={r * 0.66}
        radiusBottom={r * 0.7}
        height={0.016}
        color="#16171A"
        roughness={0.6}
        segments={20}
      />
      <Cyl
        position={[0, 0.032, 0]}
        radiusTop={r * 0.32}
        height={0.012}
        {...STEEL}
        color="#444"
        segments={14}
      />
      {/* Cast-iron pan support: crossed bars on four feet */}
      {bars.map((a) => (
        <Box
          key={a}
          position={[0, 0.045, 0]}
          rotation={[0, a, 0]}
          size={[r * 2.5, 0.012, 0.014]}
          color="#1C1C1E"
          roughness={0.55}
          metalness={0.3}
        />
      ))}
      {feet.map(([sx, sz]) => (
        <Cyl
          key={`${sx}${sz}`}
          position={[sx * r * 0.88, 0.026, sz * r * 0.88]}
          radiusTop={0.01}
          height={0.04}
          color="#1C1C1E"
          roughness={0.55}
          segments={8}
          castShadow={false}
        />
      ))}
    </group>
  );
}

export function KitchenStoveModel({ def, widthM, depthM, heightM }) {
  const steel = shade(def.subColor || '#52575C', 0.12);
  const glass = def.color || '#26292B';
  const front = depthM / 2;
  const br = clamp(Math.min(widthM, depthM) * 0.1, 0.04, 0.085);
  const knobR = clamp(widthM * 0.032, 0.014, 0.026);
  const stripY = heightM - 0.1;
  const burners = [
    [-0.25, -0.2, 0.9],
    [0.25, -0.2, 0.8],
    [-0.25, 0.2, 1.1],
    [0.25, 0.2, 0.9],
  ];
  const knobXs = [-0.36, -0.2, 0.2, 0.36];
  return (
    <group>
      {/* Body, recessed kick, hob glass and trim */}
      <Box
        position={[0, 0.035, 0]}
        size={[widthM * 0.96, 0.07, depthM * 0.92]}
        color="#151618"
        roughness={0.9}
      />
      <Box
        position={[0, 0.07 + (heightM - 0.12) / 2, 0]}
        size={[widthM, heightM - 0.12, depthM]}
        color={steel}
        roughness={0.4}
        metalness={0.2}
      />
      <Box
        position={[0, heightM - 0.025, 0]}
        size={[widthM, 0.05, depthM]}
        color={glass}
        roughness={0.12}
        metalness={0.15}
      />
      {[-1, 1].map((s) => (
        <Box
          key={`tz${s}`}
          position={[0, heightM + 0.002, (s * (depthM - 0.01)) / 2]}
          size={[widthM, 0.006, 0.012]}
          {...STEEL}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={`tx${s}`}
          position={[(s * (widthM - 0.01)) / 2, heightM + 0.002, 0]}
          size={[0.012, 0.006, depthM]}
          {...STEEL}
          castShadow={false}
        />
      ))}
      <Box
        position={[0, heightM + 0.04, -depthM / 2 + 0.015]}
        size={[widthM, 0.08, 0.03]}
        color={steel}
        roughness={0.4}
        metalness={0.2}
      />
      {/* Four burners with grates */}
      {burners.map(([bx, bz, k], i) => (
        <Burner key={i} position={[bx * widthM, heightM + 0.003, bz * depthM]} r={br * k} />
      ))}
      {/* Control strip: four burner knobs and a clock display */}
      <Box
        position={[0, stripY, front + 0.002]}
        size={[widthM - 0.01, 0.1, 0.03]}
        color={shade(steel, -0.06)}
        roughness={0.4}
        metalness={0.2}
      />
      {knobXs.map((k) => (
        <Knob
          key={k}
          position={[k * widthM, stripY, front + 0.027]}
          radius={knobR}
          depth={0.026}
          color="#16171A"
          roughness={0.45}
          metalness={0.2}
        />
      ))}
      <group name="stove-display" position={[0, stripY, front + 0.019]}>
        <Box
          size={[widthM * 0.14, 0.04, 0.004]}
          color="#101315"
          roughness={0.2}
          castShadow={false}
        />
        <Lit position={[-0.018, 0, 0.003]} size={[0.012, 0.02, 0.001]} color="#4EE0B0" />
        <Lit position={[0.0, 0, 0.003]} size={[0.012, 0.02, 0.001]} color="#4EE0B0" />
        <Lit position={[0.018, 0, 0.003]} size={[0.012, 0.02, 0.001]} color="#4EE0B0" />
      </group>
      {/* Oven door: steel frame, black glass window, tubular handle */}
      <group name="oven-door">
        <Box
          position={[0, 0.43, front + 0.002]}
          size={[widthM - 0.02, 0.58, 0.03]}
          color={steel}
          roughness={0.4}
          metalness={0.2}
        />
        <Box
          position={[0, 0.42, front + 0.018]}
          size={[widthM * 0.8, 0.42, 0.004]}
          color="#0B0C0E"
          roughness={0.06}
          metalness={0.3}
        />
        <Box
          position={[0, 0.42, front + 0.0215]}
          size={[widthM * 0.7, 0.3, 0.002]}
          color="#2B3138"
          roughness={0.3}
          castShadow={false}
        />
        {[0.34, 0.42, 0.5].map((y) => (
          <Box
            key={y}
            position={[0, y, front + 0.0225]}
            size={[widthM * 0.66, 0.006, 0.002]}
            color="#8A9096"
            castShadow={false}
          />
        ))}
        <Box
          position={[0, 0.42, front + 0.016]}
          size={[widthM * 0.84, 0.46, 0.002]}
          {...STEEL}
          color="#6A7076"
          castShadow={false}
        />
        <Pull
          position={[0, 0.69, front + 0.017]}
          length={widthM * 0.72}
          vertical={false}
          stand={0.04}
          thick={0.016}
          color={CHROME.color}
          roughness={CHROME.roughness}
          metalness={CHROME.metalness}
        />
      </group>
      {/* Storage drawer under the oven */}
      <Box
        position={[0, 0.105, front + 0.002]}
        size={[widthM - 0.02, 0.07, 0.03]}
        color={steel}
        roughness={0.4}
        metalness={0.2}
      />
      <Box
        position={[0, 0.118, front + 0.019]}
        size={[widthM * 0.4, 0.008, 0.004]}
        color={DARK_GAP}
        castShadow={false}
      />
    </group>
  );
}

export function KitchenFridgeModel({ widthM, depthM, heightM, mainColor, subColor, handleColor }) {
  const front = depthM / 2;
  const door = shade(mainColor, 0.02);
  const drawerTop = heightM * 0.3;
  const doorH = heightM - drawerTop - 0.03;
  const handle = handleColor || '#1C1D1F';
  return (
    <group>
      <Box
        position={[0, 0.03, 0]}
        size={[widthM * 0.94, 0.06, depthM * 0.9]}
        color="#161718"
        roughness={0.9}
      />
      <Box
        position={[0, 0.06 + (heightM - 0.06) / 2, -0.01]}
        size={[widthM, heightM - 0.06, depthM - 0.02]}
        color={subColor || '#5E646A'}
        roughness={0.45}
        metalness={0.2}
      />
      {/* Toe grille with vent slots */}
      <group name="fridge-vent">
        <Box
          position={[0, 0.06 + 0.04, front - 0.012]}
          size={[widthM - 0.04, 0.08, 0.01]}
          color="#17181A"
          roughness={0.8}
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Box
            key={i}
            position={[0, 0.07 + i * 0.012, front - 0.005]}
            size={[widthM * 0.7, 0.004, 0.002]}
            color="#3A3D40"
            castShadow={false}
          />
        ))}
      </group>
      {/* Two French doors above, one freezer drawer below */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[(s * widthM) / 4, drawerTop + 0.03 + doorH / 2, front - 0.01]}
          size={[widthM / 2 - 0.006, doorH, 0.026]}
          color={door}
          roughness={0.35}
          metalness={0.2}
        />
      ))}
      <Box
        position={[0, 0.14 + (drawerTop - 0.14) / 2 + 0.01, front - 0.01]}
        size={[widthM - 0.004, drawerTop - 0.15, 0.026]}
        color={door}
        roughness={0.35}
        metalness={0.2}
      />
      <Box
        position={[0, drawerTop + 0.015, front + 0.003]}
        size={[widthM, 0.006, 0.004]}
        color={DARK_GAP}
        castShadow={false}
      />
      <Box
        position={[0, drawerTop + 0.03 + doorH / 2, front + 0.004]}
        size={[0.006, doorH, 0.004]}
        color={DARK_GAP}
        castShadow={false}
      />
      {/* Tall bar handles at the door seam, wide pull on the drawer */}
      {[-1, 1].map((s) => (
        <Pull
          key={s}
          position={[s * 0.04, drawerTop + 0.03 + doorH * 0.45, front + 0.003]}
          length={clamp(heightM * 0.3, 0.3, 0.7)}
          color={handle}
          roughness={0.35}
          metalness={0.6}
          stand={0.03}
          thick={0.016}
        />
      ))}
      <Pull
        position={[0, drawerTop - 0.02, front + 0.003]}
        length={widthM * 0.62}
        vertical={false}
        color={handle}
        roughness={0.35}
        metalness={0.6}
        stand={0.03}
        thick={0.016}
      />
      {/* Ice and water dispenser on the left door */}
      <group name="dispenser" position={[-widthM * 0.26, heightM * 0.7, front + 0.003]}>
        <Box size={[0.17, 0.25, 0.006]} color="#0E1114" roughness={0.2} metalness={0.3} />
        <Box
          position={[0, -0.03, 0.006]}
          size={[0.11, 0.16, 0.004]}
          color="#1B2026"
          roughness={0.3}
        />
        <Box position={[0, -0.08, 0.016]} size={[0.07, 0.014, 0.022]} {...STEEL} />
        <Box
          position={[0, 0.085, 0.006]}
          size={[0.1, 0.03, 0.003]}
          color="#0A0D10"
          castShadow={false}
        />
        <Lit position={[-0.02, 0.085, 0.0085]} size={[0.012, 0.012, 0.001]} color="#58C8FF" />
        <Lit position={[0.015, 0.085, 0.0085]} size={[0.012, 0.012, 0.001]} color="#58C8FF" />
      </group>
      {/* Hinge caps and badge */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[(s * (widthM - 0.05)) / 2, heightM - 0.006, front - 0.03]}
          size={[0.05, 0.012, 0.04]}
          color="#17181A"
          roughness={0.7}
        />
      ))}
      <Box
        position={[widthM * 0.2, heightM - 0.12, front + 0.003]}
        size={[0.07, 0.014, 0.003]}
        {...CHROME}
        castShadow={false}
      />
    </group>
  );
}

export function DiningNookModel({ widthM, depthM, heightM, mainColor, cushionColor }) {
  const benchH = 0.38;
  const seatD = 0.42;
  const seatT = 0.07;
  const trim = shade(mainColor, -0.08);
  const innerW = widthM - seatD;
  const innerD = depthM - seatD;
  const tableR = clamp(Math.min(innerW, innerD) * 0.4, 0.2, 0.4);
  const tableH = clamp(heightM - 0.1, 0.5, 0.78);
  const backZ = -depthM / 2;
  const backX = -widthM / 2;
  const pillars = (axis) => (axis === 'z' ? [0.2, 0.5, 0.8] : [0.25, 0.7]);
  return (
    <group>
      {/* Bench bases with a plinth, recessed front panels and a top trim */}
      {[
        { pos: [0, benchH / 2, backZ + seatD / 2], size: [widthM, benchH, seatD], front: 'z' },
        {
          pos: [backX + seatD / 2, benchH / 2, seatD / 2],
          size: [seatD, benchH, depthM - seatD],
          front: 'x',
        },
      ].map(({ pos, size, front }, i) => (
        <group key={i}>
          <Box position={pos} size={size} color={mainColor} roughness={0.7} />
          <Box
            position={[pos[0], 0.04, pos[2]]}
            size={[size[0] - 0.04, 0.08, size[2] - 0.04]}
            color={trim}
            roughness={0.8}
          />
          {front === 'z' ? (
            <>
              {[-0.25, 0.25].map((f) => (
                <Box
                  key={f}
                  position={[widthM * f, benchH / 2 + 0.02, backZ + seatD + 0.002]}
                  size={[widthM * 0.42, benchH - 0.14, 0.006]}
                  color={trim}
                  roughness={0.6}
                  castShadow={false}
                />
              ))}
            </>
          ) : (
            <Box
              position={[backX + seatD + 0.002, benchH / 2 + 0.02, seatD / 2]}
              size={[0.006, benchH - 0.14, (depthM - seatD) * 0.8]}
              color={trim}
              roughness={0.6}
              castShadow={false}
            />
          )}
        </group>
      ))}
      {/* Seat cushions with seams, piping and buttons */}
      <Pad
        position={[0, benchH + seatT / 2, backZ + seatD / 2]}
        size={[widthM - 0.01, seatT, seatD - 0.01]}
        radius={0.025}
        color={cushionColor}
        roughness={0.95}
      />
      <Pad
        position={[backX + seatD / 2, benchH + seatT / 2, seatD / 2]}
        size={[seatD - 0.01, seatT, depthM - seatD - 0.01]}
        radius={0.025}
        color={cushionColor}
        roughness={0.95}
      />
      <Box
        position={[widthM * 0.05, benchH + seatT + 0.001, backZ + seatD / 2]}
        size={[0.006, 0.003, seatD - 0.06]}
        color={shade(cushionColor, -0.1)}
        castShadow={false}
      />
      <Box
        position={[backX + seatD / 2, benchH + seatT + 0.001, seatD / 2 + 0.05]}
        size={[seatD - 0.06, 0.003, 0.006]}
        color={shade(cushionColor, -0.1)}
        castShadow={false}
      />
      {/* Wooden back panels with padded, buttoned back cushions */}
      <Box
        position={[0, benchH + 0.22, backZ + 0.02]}
        size={[widthM, 0.44, 0.04]}
        color={mainColor}
        roughness={0.65}
      />
      <Box
        position={[backX + 0.02, benchH + 0.22, 0]}
        size={[0.04, 0.44, depthM]}
        color={mainColor}
        roughness={0.65}
      />
      <Pad
        position={[0, benchH + seatT + 0.17, backZ + 0.075]}
        size={[widthM - 0.06, 0.3, 0.07]}
        radius={0.03}
        color={cushionColor}
        roughness={0.95}
      />
      <Pad
        position={[backX + 0.075, benchH + seatT + 0.17, 0]}
        size={[0.07, 0.3, depthM - 0.06]}
        radius={0.03}
        color={cushionColor}
        roughness={0.95}
      />
      {pillars('z').map((f) => (
        <Ball
          key={`bz${f}`}
          position={[-widthM / 2 + widthM * f, benchH + seatT + 0.17, backZ + 0.114]}
          radius={0.01}
          color={shade(cushionColor, -0.15)}
          segments={8}
        />
      ))}
      {pillars('x').map((f) => (
        <Ball
          key={`bx${f}`}
          position={[backX + 0.114, benchH + seatT + 0.17, -depthM / 2 + depthM * f]}
          radius={0.01}
          color={shade(cushionColor, -0.15)}
          segments={8}
        />
      ))}
      {/* Pedestal table in the corner of the nook */}
      <group name="nook-table" position={[seatD / 2 + 0.02, 0, seatD / 2 + 0.02]}>
        <Cyl
          position={[0, 0.01, 0]}
          radiusTop={tableR * 0.6}
          radiusBottom={tableR * 0.65}
          height={0.02}
          color="#2A2523"
          roughness={0.6}
          segments={24}
        />
        <Cyl
          position={[0, tableH / 2, 0]}
          radiusTop={0.04}
          radiusBottom={0.05}
          height={tableH}
          color="#2A2523"
          roughness={0.5}
          segments={14}
        />
        <Cyl
          position={[0, tableH - 0.015, 0]}
          radiusTop={tableR}
          height={0.03}
          color={shade(mainColor, 0.08)}
          roughness={0.45}
          segments={32}
        />
        <Cyl
          position={[0, tableH - 0.036, 0]}
          radiusTop={tableR * 0.94}
          height={0.014}
          color={trim}
          roughness={0.7}
          segments={32}
        />
      </group>
    </group>
  );
}
