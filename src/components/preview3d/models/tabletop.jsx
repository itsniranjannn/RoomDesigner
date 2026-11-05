/** 3D models: tabletop and soft-goods pieces (cushion, vase, laptop, frame, speaker, kettle, bowl, towels). Origin on the base. */
import { Box, Cyl, Pad, Ball, Pillow, STEEL, clamp, shade } from './shared.jsx';

/** Scatter cushion or bed pillow: plump, softly pinched, with a centre button. */
export function CushionModel({ widthM, depthM, heightM, mainColor }) {
  return (
    <group name="cushion">
      <Pillow position={[0, heightM / 2, 0]} size={[widthM, heightM, depthM]} color={mainColor} />
      <Ball
        position={[0, heightM * 0.96, 0]}
        radius={0.007}
        color={shade(mainColor, -0.14)}
        castShadow={false}
      />
    </group>
  );
}

/** Ceramic vase with a short neck and a loose bunch of stems and flower heads. */
export function VaseModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const r = Math.min(widthM, depthM) / 2;
  const bodyH = heightM * 0.62;
  const stems = [
    [-0.3, 0.2, -0.12],
    [0.28, 0.1, 0.18],
    [0.02, 0.0, -0.3],
    [-0.1, 0.3, 0.2],
  ];
  const len = heightM - bodyH;
  return (
    <group name="vase">
      <Cyl
        position={[0, bodyH * 0.5, 0]}
        radiusTop={r * 0.45}
        radiusBottom={r * 0.55}
        height={bodyH}
        color={mainColor}
        roughness={0.18}
        segments={28}
      />
      <mesh position={[0, bodyH * 0.42, 0]} castShadow>
        <sphereGeometry args={[r * 0.98, 28, 18]} />
        <meshStandardMaterial color={mainColor} roughness={0.18} />
      </mesh>
      <Cyl
        position={[0, bodyH + 0.012, 0]}
        radiusTop={r * 0.5}
        radiusBottom={r * 0.4}
        height={0.026}
        color={shade(mainColor, -0.08)}
        roughness={0.2}
        segments={24}
      />
      {stems.map(([tx, ty, tz], i) => {
        const dx = tx * r * 0.9;
        const dz = tz * r * 0.9;
        const rise = len * (0.75 + ty * 0.2);
        const tip = [dx, bodyH + rise, dz];
        const stemLen = Math.hypot(dx, rise, dz);
        return (
          <group key={i}>
            <mesh
              position={[dx / 2, bodyH + rise / 2, dz / 2]}
              rotation={[Math.atan2(dz, rise), 0, -Math.atan2(dx, rise)]}
            >
              <cylinderGeometry args={[0.0025, 0.0025, stemLen, 6]} />
              <meshStandardMaterial color="#4F7A47" roughness={0.8} />
            </mesh>
            <Ball position={tip} radius={0.016} color={subColor || '#E7B94B'} roughness={0.8} />
            <Ball
              position={[tip[0], tip[1] + 0.004, tip[2]]}
              radius={0.007}
              color="#C0392B"
              castShadow={false}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Open laptop: aluminium deck, keys and trackpad, and a lid leaning back with a dark screen. */
export function LaptopModel({ widthM, depthM, heightM, mainColor }) {
  const tilt = 0.32;
  const lidL = (heightM - 0.014) / Math.cos(tilt);
  return (
    <group name="laptop">
      <Box
        position={[0, 0.007, 0]}
        size={[widthM, 0.014, depthM]}
        color={mainColor}
        roughness={0.3}
        metalness={0.5}
      />
      <Box
        position={[0, 0.0145, -depthM * 0.1]}
        size={[widthM * 0.88, 0.002, depthM * 0.42]}
        color="#202326"
        castShadow={false}
      />
      <Box
        position={[0, 0.0145, depthM * 0.28]}
        size={[widthM * 0.3, 0.0015, depthM * 0.22]}
        color={shade(mainColor, -0.08)}
        castShadow={false}
      />
      <group position={[0, 0.014, -depthM / 2 + 0.004]} rotation={[-tilt, 0, 0]}>
        <Box
          position={[0, lidL / 2, 0]}
          size={[widthM, lidL, 0.007]}
          color={mainColor}
          roughness={0.3}
          metalness={0.5}
        />
        <Box
          position={[0, lidL / 2, 0.0038]}
          size={[widthM - 0.014, lidL - 0.014, 0.001]}
          color="#0E1620"
          roughness={0.1}
          castShadow={false}
        />
      </group>
    </group>
  );
}

/** Photo frame on a stand: frame, mat, print and a rear leg, leaning back slightly. */
export function PhotoFrameModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const tilt = 0.14;
  const t = Math.min(0.018, depthM * 0.5);
  const bar = Math.min(0.018, widthM * 0.1);
  return (
    <group name="photo-frame">
      <group position={[0, 0, depthM * 0.1]} rotation={[-tilt, 0, 0]}>
        <Box
          position={[0, heightM / 2, 0]}
          size={[widthM, heightM, t]}
          color={mainColor}
          roughness={0.5}
        />
        <Box
          position={[0, heightM / 2, t / 2 + 0.0005]}
          size={[widthM - bar * 2, heightM - bar * 2, 0.001]}
          color="#F4EFE4"
          castShadow={false}
        />
        <Box
          position={[0, heightM / 2, t / 2 + 0.0012]}
          size={[widthM - bar * 4, heightM - bar * 4, 0.001]}
          color={subColor || '#8FA8B8'}
          roughness={0.6}
          castShadow={false}
        />
      </group>
      <Box
        position={[0, heightM * 0.36, -depthM * 0.28]}
        size={[widthM * 0.14, heightM * 0.7, 0.006]}
        color={shade(mainColor, -0.1)}
        rotation={[0.38, 0, 0]}
        castShadow={false}
      />
    </group>
  );
}

/** Bookshelf speaker: rounded cabinet, woofer, tweeter and a pair of feet. */
export function SpeakerModel({ widthM, depthM, heightM, mainColor }) {
  const front = depthM / 2;
  const wooferR = Math.min(widthM * 0.36, heightM * 0.26);
  return (
    <group name="speaker">
      <Pad
        position={[0, heightM / 2 + 0.004, 0]}
        size={[widthM, heightM - 0.008, depthM]}
        radius={0.01}
        color={mainColor}
        roughness={0.55}
      />
      {[-1, 1].map((s) => (
        <Cyl
          key={s}
          position={[s * (widthM / 2 - 0.02), 0.002, 0]}
          radiusTop={0.01}
          height={0.008}
          color="#1B1D20"
          segments={10}
          castShadow={false}
        />
      ))}
      <mesh position={[0, heightM * 0.34, front + 0.001]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wooferR, wooferR, 0.006, 28]} />
        <meshStandardMaterial color="#17191B" roughness={0.6} />
      </mesh>
      <mesh position={[0, heightM * 0.34, front + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wooferR * 0.4, wooferR * 0.4, 0.006, 20]} />
        <meshStandardMaterial color="#2B2D30" roughness={0.5} />
      </mesh>
      <mesh position={[0, heightM * 0.8, front + 0.001]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wooferR * 0.32, wooferR * 0.32, 0.005, 20]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
    </group>
  );
}

/** Electric kettle: tapered jug, domed lid, handle loop, spout and a dark base. */
export function KettleModel({ widthM, depthM, heightM, mainColor }) {
  const r = Math.min(widthM, depthM) * 0.36;
  const bodyH = heightM * 0.74;
  return (
    <group name="kettle">
      <Cyl
        position={[0, 0.01, 0]}
        radiusTop={r * 1.12}
        radiusBottom={r * 1.12}
        height={0.02}
        color="#1B1D20"
        segments={28}
      />
      <Cyl
        position={[0, 0.02 + bodyH / 2, 0]}
        radiusTop={r * 0.82}
        radiusBottom={r}
        height={bodyH}
        color={mainColor}
        roughness={0.25}
        metalness={0.5}
        segments={28}
      />
      <mesh position={[0, 0.02 + bodyH, 0]} castShadow>
        <sphereGeometry args={[r * 0.82, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={mainColor} roughness={0.25} metalness={0.5} />
      </mesh>
      <Ball
        position={[0, 0.02 + bodyH + r * 0.82 * 0.9, 0]}
        radius={0.011}
        color="#1B1D20"
        castShadow={false}
      />
      <mesh position={[0, 0.02 + bodyH * 0.5, -r * 0.9]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[bodyH * 0.34, 0.009, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#1B1D20" roughness={0.5} />
      </mesh>
      <Cyl
        position={[0, 0.02 + bodyH * 0.9, r * 0.98]}
        radiusTop={0.008}
        radiusBottom={0.022}
        height={0.05}
        color={mainColor}
        roughness={0.25}
        metalness={0.5}
        rotation={[-1.0, 0, 0]}
        segments={10}
      />
    </group>
  );
}

/** Fruit bowl: shallow tapered bowl with apples, an orange and a pear on top. */
export function BowlModel({ widthM, depthM, heightM, mainColor }) {
  const r = Math.min(widthM, depthM) / 2;
  const bowlH = heightM * 0.5;
  const fruit = [
    [-0.3, 0.2, '#C0392B'],
    [0.28, 0.3, '#E6A93B'],
    [0.02, 0.45, '#7BA34A'],
    [-0.02, 0.1, '#D9732B'],
  ];
  return (
    <group name="bowl">
      <Cyl
        position={[0, 0.008, 0]}
        radiusTop={r * 0.38}
        radiusBottom={r * 0.4}
        height={0.016}
        color={mainColor}
        roughness={0.3}
      />
      <Cyl
        position={[0, 0.016 + bowlH / 2, 0]}
        radiusTop={r}
        radiusBottom={r * 0.42}
        height={bowlH}
        color={mainColor}
        roughness={0.3}
        segments={32}
      />
      {fruit.map(([x, y, c], i) => (
        <Ball
          key={i}
          position={[
            x * r,
            0.016 + bowlH * 0.6 + y * (heightM - bowlH) * 0.9,
            (i % 2 ? 0.15 : -0.12) * r,
          ]}
          radius={r * 0.24}
          color={c}
          roughness={0.55}
        />
      ))}
    </group>
  );
}

/** Folded towels or throw: a neat stack of soft slabs with a contrast band. */
export function FoldedModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const layers = clamp(Math.round(heightM / 0.045), 1, 5);
  const t = heightM / layers;
  return (
    <group name="folded">
      {Array.from({ length: layers }).map((_, i) => (
        <group
          key={i}
          position={[(i % 2 ? 1 : -1) * widthM * 0.012, t * (i + 0.5), 0]}
          rotation={[0, ((i % 3) - 1) * 0.03, 0]}
        >
          <Pad
            position={[0, 0, 0]}
            size={[widthM, t * 0.96, depthM]}
            radius={Math.min(0.012, t * 0.4)}
            color={mainColor}
          />
          <Box
            position={[0, 0, 0]}
            size={[widthM + 0.002, t * 0.7, depthM * 0.2]}
            color={subColor || shade(mainColor, -0.08)}
            roughness={0.95}
            castShadow={false}
          />
        </group>
      ))}
    </group>
  );
}
