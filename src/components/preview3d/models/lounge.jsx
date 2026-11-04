import { Box, Cyl, Pad, Ball, Pillow, EdgePiping, BRASS, clamp, shade } from './shared.jsx';

/** 3D models: lounge seating. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function SofaLModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  const mainD = depthM * 0.55;
  const chaiseW = widthM * 0.34;
  const armW = Math.min(widthM, depthM) * 0.09;
  const backThick = mainD * 0.27;
  const seatY = 0.4;
  const mainZ = -depthM / 2 + mainD / 2;
  const chaiseD = depthM - mainD;
  const chaiseZ = -depthM / 2 + mainD + chaiseD / 2;
  const chaiseX = widthM / 2 - chaiseW / 2;
  const seatsW = widthM - chaiseW - armW;
  const seatCount = clamp(Math.round(seatsW / 0.75), 1, 3);
  const seatW = seatsW / seatCount;
  const welt = shade(cushionColor, -0.1);
  const seatStart = -widthM / 2 + armW;
  return (
    <group>
      {/* Base of the main run and the chaise */}
      <Pad
        position={[0, 0.2, mainZ]}
        size={[widthM, 0.18, mainD]}
        radius={0.03}
        color={mainColor}
        roughness={0.85}
      />
      <Pad
        position={[chaiseX, 0.2, chaiseZ]}
        size={[chaiseW, 0.18, chaiseD]}
        radius={0.03}
        color={mainColor}
        roughness={0.85}
      />
      {/* Seat cushions: separate loose cushions with welting */}
      {Array.from({ length: seatCount }).map((_, i) => {
        const cx = seatStart + seatW * (i + 0.5);
        const cz = mainZ + backThick / 2;
        return (
          <group key={i} name="seat-cushion">
            <Pad
              position={[cx, seatY, cz]}
              size={[seatW - 0.012, 0.14, mainD - backThick - 0.01]}
              radius={0.05}
              color={cushionColor}
              roughness={0.95}
            />
            <EdgePiping
              position={[cx, seatY + 0.07, cz]}
              width={seatW - 0.012}
              depth={mainD - backThick - 0.01}
              color={welt}
            />
          </group>
        );
      })}
      <group name="seat-cushion">
        <Pad
          position={[chaiseX - armW / 2, seatY, -depthM / 2 + backThick + (depthM - backThick) / 2]}
          size={[chaiseW - armW, 0.14, depthM - backThick]}
          radius={0.05}
          color={cushionColor}
          roughness={0.95}
        />
        <EdgePiping
          position={[
            chaiseX - armW / 2,
            seatY + 0.07,
            -depthM / 2 + backThick + (depthM - backThick) / 2,
          ]}
          width={chaiseW - armW}
          depth={depthM - backThick}
          color={welt}
        />
      </group>
      {/* Backrest with loose, buttoned back cushions */}
      <Pad
        position={[0, heightM / 2 + 0.05, -depthM / 2 + backThick / 2]}
        size={[widthM, heightM - 0.1, backThick]}
        radius={0.05}
        color={mainColor}
        roughness={0.85}
      />
      {Array.from({ length: seatCount + 1 }).map((_, i) => {
        const w = (widthM - armW - 0.06) / (seatCount + 1);
        const cx = -widthM / 2 + armW + 0.03 + w * (i + 0.5);
        return (
          <group
            key={i}
            position={[cx, seatY + 0.2, -depthM / 2 + backThick + 0.05]}
            rotation={[-0.2, 0, 0]}
          >
            <Pad
              size={[w - 0.015, 0.36, 0.12]}
              radius={0.05}
              color={cushionColor}
              roughness={0.95}
            />
            <Ball
              position={[0, 0.02, 0.063]}
              radius={0.011}
              color={welt}
              segments={8}
              castShadow={false}
            />
            <Box
              position={[0, 0.02, 0.0615]}
              size={[w - 0.1, 0.004, 0.003]}
              color={welt}
              castShadow={false}
            />
          </group>
        );
      })}
      {/* Arms and the long arm along the chaise, with top welting */}
      <Pad
        position={[-widthM / 2 + armW / 2, 0.34, mainZ]}
        size={[armW, 0.42, mainD]}
        radius={0.04}
        color={mainColor}
        roughness={0.85}
      />
      <Pad
        position={[widthM / 2 - armW / 2, 0.34, 0]}
        size={[armW, 0.42, depthM]}
        radius={0.04}
        color={mainColor}
        roughness={0.85}
      />
      <Box
        position={[-widthM / 2 + armW / 2, 0.552, mainZ]}
        size={[armW - 0.05, 0.005, mainD - 0.1]}
        color={shade(mainColor, -0.04)}
        castShadow={false}
      />
      <Box
        position={[widthM / 2 - armW / 2, 0.552, 0]}
        size={[armW - 0.05, 0.005, depthM - 0.1]}
        color={shade(mainColor, -0.04)}
        castShadow={false}
      />
      {/* Scatter cushions */}
      <Pillow
        position={[-widthM * 0.3, seatY + 0.2, -depthM / 2 + backThick + 0.16]}
        size={[0.4, 0.1, 0.4]}
        color={shade(mainColor, 0.2)}
        rotation={[-0.45, 0.3, 0]}
      />
      <Pillow
        position={[widthM * 0.02, seatY + 0.18, -depthM / 2 + backThick + 0.16]}
        size={[0.36, 0.1, 0.36]}
        color="#EADFCB"
        rotation={[-0.45, -0.25, 0]}
      />
      {/* Tapered legs with brass ferrules */}
      {[
        [-widthM / 2 + 0.07, -depthM / 2 + 0.07],
        [widthM / 2 - 0.07, -depthM / 2 + 0.07],
        [-widthM / 2 + 0.07, -depthM / 2 + mainD - 0.07],
        [widthM / 2 - chaiseW + 0.07, -depthM / 2 + mainD - 0.07],
        [widthM / 2 - chaiseW + 0.07, depthM / 2 - 0.07],
        [widthM / 2 - 0.07, depthM / 2 - 0.07],
      ].map(([fx, fz], idx) => (
        <group key={idx}>
          <Cyl
            position={[fx, 0.05, fz]}
            radiusTop={0.028}
            radiusBottom={0.018}
            height={0.1}
            color={legColor}
            roughness={0.5}
            segments={12}
          />
          <Cyl
            position={[fx, 0.008, fz]}
            radiusTop={0.02}
            height={0.016}
            {...BRASS}
            segments={10}
            castShadow={false}
          />
        </group>
      ))}
    </group>
  );
}

export function BeanBagModel({ widthM, depthM, heightM, mainColor, cushionColor }) {
  const seam = shade(mainColor, -0.14);
  return (
    <group>
      {/* Squashed, slumped body */}
      <mesh
        position={[0, heightM * 0.46, 0]}
        scale={[widthM / 2, heightM * 0.46, depthM / 2]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 28, 20]} />
        <meshStandardMaterial color={mainColor} roughness={0.95} />
      </mesh>
      {/* Stitched panel seams running over the top */}
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={k}
          position={[0, heightM * 0.46, 0]}
          rotation={[0, (k * Math.PI) / 4, 0]}
          scale={[(widthM / 2) * 1.004, heightM * 0.46 * 1.004, (depthM / 2) * 1.004]}
        >
          <torusGeometry args={[1, 0.007, 4, 40, Math.PI]} />
          <meshStandardMaterial color={seam} roughness={0.9} />
        </mesh>
      ))}
      {/* Seat dimple, back lump and a carry handle */}
      <mesh
        position={[0, heightM * 0.7, depthM * 0.08]}
        scale={[widthM * 0.3, heightM * 0.2, depthM * 0.3]}
        castShadow
      >
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={cushionColor} roughness={0.95} />
      </mesh>
      <mesh
        position={[0, heightM * 0.62, -depthM * 0.28]}
        scale={[widthM * 0.34, heightM * 0.36, depthM * 0.2]}
        castShadow
      >
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={mainColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, heightM * 0.88, -depthM * 0.3]} rotation={[0.3, 0, 0]} castShadow>
        <torusGeometry args={[0.07, 0.014, 6, 14, Math.PI]} />
        <meshStandardMaterial color={seam} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function BenchModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const seatT = 0.04;
  const slats = Math.max(2, Math.round(depthM / 0.14));
  const slatD = depthM / slats;
  return (
    <group>
      {/* Seat slats with small gaps and a lighter chamfer line */}
      {Array.from({ length: slats }).map((_, idx) => (
        <group key={idx}>
          <Box
            position={[0, heightM - seatT / 2, -depthM / 2 + slatD * (idx + 0.5)]}
            size={[widthM, seatT, slatD - 0.012]}
            color={mainColor}
            roughness={0.7}
          />
          <Box
            position={[
              0,
              heightM + 0.0005,
              -depthM / 2 + slatD * (idx + 0.5) - (slatD - 0.012) / 2 + 0.004,
            ]}
            size={[widthM - 0.01, 0.001, 0.003]}
            color={shade(mainColor, 0.08)}
            castShadow={false}
          />
        </group>
      ))}
      {/* End frames: two legs joined by a top rail, with pegged joints */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * (widthM / 2 - 0.05), (heightM - seatT) / 2, 0]}
            size={[0.05, heightM - seatT, depthM * 0.85]}
            color={subColor}
            roughness={0.7}
          />
          <Box
            position={[s * (widthM / 2 - 0.05), 0.012, 0]}
            size={[0.056, 0.024, depthM * 0.88]}
            color={legColor}
            roughness={0.8}
            castShadow={false}
          />
          {[-0.3, 0.3].map((f) => (
            <Ball
              key={f}
              position={[s * (widthM / 2 - 0.022), heightM - seatT - 0.04, depthM * f]}
              radius={0.009}
              color={shade(subColor, 0.12)}
              segments={8}
              castShadow={false}
            />
          ))}
        </group>
      ))}
      <Box
        position={[0, heightM * 0.3, 0]}
        size={[widthM - 0.1, 0.04, 0.04]}
        color={legColor}
        roughness={0.7}
      />
      <Box
        position={[0, heightM - seatT - 0.025, 0]}
        size={[widthM - 0.1, 0.03, 0.03]}
        color={subColor}
        roughness={0.7}
        castShadow={false}
      />
    </group>
  );
}
