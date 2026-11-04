/** 3D models: nepali. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import {
  Box,
  Cyl,
  Ball,
  Pad,
  XCyl,
  DARK_GAP,
  EdgePiping,
  Buttons,
  corners,
  clamp,
  shade,
} from './shared.jsx';

/** Brass colour for fittings; accentColor from the catalog is used where given. */
const brassProps = (color) => ({ color, roughness: 0.32, metalness: 0.65 });

/** Turned leg: tapered shaft with swelling collars, built from stacked cylinders. */
function TurnedLeg({ position, height, radius, color }) {
  const rings = [0.18, 0.5, 0.82];
  return (
    <group position={position}>
      <Cyl
        position={[0, height / 2, 0]}
        radiusTop={radius * 0.82}
        radiusBottom={radius}
        height={height}
        color={color}
        roughness={0.7}
        segments={14}
      />
      {rings.map((f) => (
        <Cyl
          key={f}
          position={[0, height * f, 0]}
          radiusTop={radius * 1.18}
          radiusBottom={radius * 1.18}
          height={height * 0.05}
          color={shade(color, 0.05)}
          roughness={0.65}
          segments={14}
          castShadow={false}
        />
      ))}
      <Cyl
        position={[0, height * 0.02, 0]}
        radiusTop={radius * 1.1}
        height={height * 0.04}
        color={shade(color, -0.1)}
        roughness={0.8}
        segments={14}
        castShadow={false}
      />
    </group>
  );
}

export function NepaliChowkiModel({ def, widthM, depthM, heightM, mainColor, accentColor }) {
  const topT = 0.07;
  const legH = heightM - topT;
  const apronH = Math.min(0.07, legH * 0.18);
  const pooja = def?.id === 'nepali-pooja-table';
  const brass = brassProps(accentColor);
  const medR = Math.min(widthM, depthM) * 0.2;
  return (
    <group>
      <Box
        position={[0, heightM - topT / 2, 0]}
        size={[widthM, topT, depthM]}
        color={mainColor}
        roughness={0.6}
      />
      <Box
        position={[0, heightM - topT - 0.006, 0]}
        size={[widthM - 0.03, 0.012, depthM - 0.03]}
        color={shade(mainColor, -0.12)}
        roughness={0.75}
        castShadow={false}
      />
      {/* Brass inlay border and a lotus medallion inlaid in the top */}
      {[-1, 1].map((s) => (
        <Box
          key={`bz${s}`}
          position={[0, heightM + 0.0015, (s * (depthM * 0.58)) / 2]}
          size={[widthM * 0.72, 0.003, 0.008]}
          {...brass}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={`bx${s}`}
          position={[(s * (widthM * 0.72)) / 2, heightM + 0.0015, 0]}
          size={[0.008, 0.003, depthM * 0.58]}
          {...brass}
          castShadow={false}
        />
      ))}
      <Box
        position={[0, heightM + 0.003, 0]}
        size={[widthM * 0.7, 0.004, depthM * 0.56]}
        color={accentColor}
        roughness={0.55}
        castShadow={false}
      />
      <Box
        position={[0, heightM + 0.0045, 0]}
        size={[widthM * 0.66, 0.004, depthM * 0.52]}
        color={mainColor}
        roughness={0.6}
        castShadow={false}
      />
      <mesh position={[0, heightM + 0.008, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[medR, 0.004, 4, 28]} />
        <meshStandardMaterial {...brass} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Ball
          key={i}
          position={[
            Math.cos((i * Math.PI) / 4) * medR,
            heightM + 0.009,
            Math.sin((i * Math.PI) / 4) * medR,
          ]}
          radius={0.007}
          scale={[1, 0.5, 1]}
          {...brass}
          segments={6}
          castShadow={false}
        />
      ))}
      {/* Carved apron boards with panel recesses, turned legs */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[0, legH - apronH / 2, s * (depthM / 2 - 0.07)]}
            size={[widthM - 0.14, apronH, 0.02]}
            color={mainColor}
            roughness={0.7}
          />
          <Box
            position={[0, legH - apronH / 2, s * (depthM / 2 - 0.058)]}
            size={[widthM * 0.5, apronH * 0.55, 0.004]}
            color={shade(mainColor, -0.1)}
            roughness={0.7}
            castShadow={false}
          />
          <Box
            position={[s * (widthM / 2 - 0.07), legH - apronH / 2, 0]}
            size={[0.02, apronH, depthM - 0.14]}
            color={mainColor}
            roughness={0.7}
          />
        </group>
      ))}
      {corners(widthM, depthM, 0.07).map(([x, z], i) => (
        <TurnedLeg key={i} position={[x, 0, z]} height={legH} radius={0.032} color={mainColor} />
      ))}
      {/* Offering set on the pooja table */}
      {pooja && (
        <group name="pooja-set" position={[0, heightM + 0.012, 0]}>
          <Cyl
            position={[0, 0.006, 0]}
            radiusTop={Math.min(widthM, depthM) * 0.28}
            radiusBottom={Math.min(widthM, depthM) * 0.25}
            height={0.012}
            {...brass}
            segments={28}
          />
          <Cyl
            position={[-0.07, 0.03, 0.02]}
            radiusTop={0.025}
            radiusBottom={0.016}
            height={0.03}
            {...brass}
            segments={12}
          />
          <mesh position={[-0.07, 0.056, 0.02]}>
            <coneGeometry args={[0.007, 0.028, 8]} />
            <meshBasicMaterial color="#FFB347" />
          </mesh>
          <Cyl
            position={[0.08, 0.03, -0.01]}
            radiusTop={0.012}
            radiusBottom={0.02}
            height={0.06}
            {...brass}
            segments={10}
          />
          {[-1, 0, 1].map((k) => (
            <Cyl
              key={k}
              position={[0.08 + k * 0.006, 0.09, -0.01]}
              radiusTop={0.0015}
              height={0.07}
              color="#8B5A2B"
              segments={4}
              castShadow={false}
            />
          ))}
          <Ball
            position={[0.02, 0.014, -0.06]}
            radius={0.016}
            color="#F28C28"
            roughness={0.9}
            segments={8}
          />
          <Ball
            position={[0.05, 0.014, -0.075]}
            radius={0.014}
            color="#E34234"
            roughness={0.9}
            segments={8}
          />
        </group>
      )}
    </group>
  );
}

export function NepaliPatukaChestModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  accentColor,
  subColor,
}) {
  const lidH = 0.07;
  const bodyH = heightM - lidH;
  const brass = brassProps(accentColor);
  const front = depthM / 2;
  return (
    <group>
      <Box
        position={[0, bodyH / 2 + 0.03, 0]}
        size={[widthM, bodyH - 0.06, depthM]}
        color={mainColor}
        roughness={0.7}
      />
      {/* Plinth */}
      <Box
        position={[0, 0.03, 0]}
        size={[widthM - 0.04, 0.06, depthM - 0.04]}
        color={shade(mainColor, -0.1)}
        roughness={0.8}
      />
      {/* Lid with a brass band and a raised panel */}
      <Pad
        position={[0, bodyH + lidH / 2 - 0.01, 0]}
        size={[widthM + 0.02, lidH, depthM + 0.02]}
        radius={0.03}
        color={subColor}
        roughness={0.6}
      />
      <Box
        position={[0, bodyH + 0.0, 0]}
        size={[widthM + 0.022, 0.012, depthM + 0.022]}
        {...brass}
      />
      <Box
        position={[0, bodyH + lidH - 0.005, 0]}
        size={[widthM - 0.1, 0.004, depthM - 0.1]}
        color={shade(subColor, 0.08)}
        roughness={0.55}
        castShadow={false}
      />
      {/* Carved front panels with brass borders and a boss */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * widthM * 0.25, bodyH * 0.5 + 0.02, front + 0.004]}
            size={[widthM * 0.36, bodyH * 0.62, 0.008]}
            color={shade(mainColor, -0.12)}
            roughness={0.7}
          />
          <Box
            position={[s * widthM * 0.25, bodyH * 0.5 + 0.02, front + 0.01]}
            size={[widthM * 0.3, bodyH * 0.5, 0.006]}
            color={shade(mainColor, 0.04)}
            roughness={0.6}
          />
          {[-1, 1].map((k) => (
            <Box
              key={`h${k}`}
              position={[
                s * widthM * 0.25,
                bodyH * 0.5 + 0.02 + (k * bodyH * 0.56) / 2,
                front + 0.013,
              ]}
              size={[widthM * 0.32, 0.005, 0.004]}
              {...brass}
              castShadow={false}
            />
          ))}
          {[-1, 1].map((k) => (
            <Box
              key={`v${k}`}
              position={[
                s * widthM * 0.25 + (k * widthM * 0.32) / 2,
                bodyH * 0.5 + 0.02,
                front + 0.013,
              ]}
              size={[0.005, bodyH * 0.56, 0.004]}
              {...brass}
              castShadow={false}
            />
          ))}
          <Ball
            position={[s * widthM * 0.25, bodyH * 0.5 + 0.02, front + 0.018]}
            radius={0.016}
            scale={[1, 1, 0.5]}
            {...brass}
            segments={10}
          />
        </group>
      ))}
      {/* Central hasp, padlock, corner fittings and side ring handles */}
      <Box
        position={[0, bodyH * 0.62, front + 0.012]}
        size={[0.035, bodyH * 0.55, 0.008]}
        {...brass}
      />
      <Box position={[0, bodyH - 0.01, front + 0.016]} size={[0.07, 0.08, 0.01]} {...brass} />
      <Cyl
        position={[0, bodyH * 0.45, front + 0.024]}
        radiusTop={0.017}
        height={0.012}
        rotation={[Math.PI / 2, 0, 0]}
        {...brass}
        segments={12}
      />
      <Box
        position={[0, bodyH * 0.45 - 0.005, front + 0.031]}
        size={[0.004, 0.014, 0.002]}
        color={DARK_GAP}
        castShadow={false}
      />
      {corners(widthM, depthM, 0.012).map(([x, z], i) => (
        <Box key={i} position={[x, bodyH - 0.03, z]} size={[0.05, 0.08, 0.05]} {...brass} />
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (widthM / 2 + 0.008), bodyH * 0.62, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        >
          <torusGeometry args={[0.03, 0.005, 6, 16]} />
          <meshStandardMaterial {...brass} />
        </mesh>
      ))}
    </group>
  );
}

export function NepaliBrassDiyaModel({ widthM, heightM, mainColor, accentColor }) {
  const brass = brassProps(mainColor);
  return (
    <group>
      <Cyl
        position={[0, 0.035, 0]}
        radiusTop={widthM * 0.42}
        radiusBottom={widthM * 0.5}
        height={0.07}
        {...brass}
        segments={24}
      />
      <Cyl
        position={[0, 0.1, 0]}
        radiusTop={widthM * 0.12}
        radiusBottom={widthM * 0.18}
        height={heightM * 0.45}
        {...brass}
        segments={16}
      />
      <Ball position={[0, heightM * 0.35, 0]} radius={widthM * 0.2} {...brass} segments={16} />
      <mesh position={[0.02, heightM * 0.62, 0]} castShadow>
        <coneGeometry args={[0.05, 0.12, 12]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function NepaliPirkaModel({ widthM, depthM, heightM, mainColor, accentColor }) {
  // Traditional low sal-wood stool: plank top with chamfered edge, arched end cleats, inlay line
  const plankH = 0.035;
  const cleatH = heightM - plankH;
  const dark = '#422517';
  return (
    <group>
      <Box
        position={[0, heightM - plankH / 2, 0]}
        size={[widthM, plankH, depthM]}
        color={mainColor}
        roughness={0.6}
      />
      <Box
        position={[0, heightM - plankH + 0.002, 0]}
        size={[widthM + 0.012, 0.01, depthM + 0.012]}
        color={shade(mainColor, -0.06)}
        roughness={0.7}
        castShadow={false}
      />
      <Box
        position={[0, heightM + 0.001, 0]}
        size={[widthM * 0.7, 0.002, 0.006]}
        color={accentColor}
        castShadow={false}
      />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * (widthM / 2 - 0.06), cleatH / 2, 0]}
            size={[0.04, cleatH, depthM - 0.04]}
            color={dark}
            roughness={0.7}
          />
          {/* Arched cut-out between the feet */}
          <Box
            position={[s * (widthM / 2 - 0.06), cleatH * 0.3, 0]}
            size={[0.042, cleatH * 0.5, depthM * 0.4]}
            color={shade(mainColor, -0.1)}
            roughness={0.8}
            castShadow={false}
          />
        </group>
      ))}
    </group>
  );
}

export function NepaliCharpaiModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  fabricColor,
  cushionColor,
}) {
  // Handwoven khat daybed: turned corner legs, rope webbing woven over and under, bolster
  const legR = 0.04;
  const frameTop = heightM - 0.04;
  const frameThick = 0.06;
  const bolsterR = 0.06;
  const ropeY = frameTop - 0.02;
  const innerW = widthM - 0.12;
  const innerD = depthM - 0.12;
  const nAlong = Math.max(6, Math.round(innerD / 0.045));
  const nAcross = Math.max(10, Math.round(innerW / 0.045));
  const rope = shade(fabricColor, -0.05);
  const rails = [
    [0, -depthM / 2 + 0.03, widthM - 0.08, 0.05],
    [0, depthM / 2 - 0.03, widthM - 0.08, 0.05],
    [-widthM / 2 + 0.03, 0, 0.05, depthM - 0.08],
    [widthM / 2 - 0.03, 0, 0.05, depthM - 0.08],
  ];
  return (
    <group>
      {[
        [-widthM / 2 + legR, -depthM / 2 + legR],
        [widthM / 2 - legR, -depthM / 2 + legR],
        [-widthM / 2 + legR, depthM / 2 - legR],
        [widthM / 2 - legR, depthM / 2 - legR],
      ].map(([lx, lz], idx) => (
        <TurnedLeg
          key={idx}
          position={[lx, 0, lz]}
          height={frameTop}
          radius={legR}
          color={mainColor}
        />
      ))}
      {rails.map(([rx, rz, rw, rd], idx) => (
        <Box
          key={idx}
          position={[rx, frameTop - frameThick / 2, rz]}
          size={[rw, frameThick, rd]}
          color={mainColor}
          roughness={0.7}
        />
      ))}
      {/* Rope weave: ropes along the length, then ropes across, alternating over and under */}
      <group name="rope-weave">
        {Array.from({ length: nAlong }).map((_, i) => (
          <XCyl
            key={`a${i}`}
            position={[0, ropeY + (i % 2 ? 0.006 : 0), -innerD / 2 + (innerD * (i + 0.5)) / nAlong]}
            radius={0.0095}
            length={innerW}
            color={i % 3 ? fabricColor : rope}
            roughness={0.95}
            segments={6}
            castShadow={false}
          />
        ))}
        {Array.from({ length: nAcross }).map((_, i) => (
          <Cyl
            key={`c${i}`}
            position={[
              -innerW / 2 + (innerW * (i + 0.5)) / nAcross,
              ropeY + (i % 2 ? 0 : 0.012),
              0,
            ]}
            radiusTop={0.0095}
            height={innerD}
            rotation={[Math.PI / 2, 0, 0]}
            color={i % 3 ? rope : fabricColor}
            roughness={0.95}
            segments={6}
            castShadow={false}
          />
        ))}
      </group>
      {/* Rope wrappings round the rails */}
      {[-1, 1].map((s) =>
        [-0.35, 0, 0.35].map((f) => (
          <Cyl
            key={`${s}${f}`}
            position={[widthM * f, frameTop - 0.005, (s * (depthM - 0.06)) / 2]}
            radiusTop={0.03}
            height={0.012}
            color={fabricColor}
            roughness={0.95}
            segments={8}
            castShadow={false}
          />
        ))
      )}
      {/* Cylindrical bolster with embroidered end discs and tie bands */}
      <group position={[-widthM / 2 + 0.2, frameTop + bolsterR, 0]}>
        <Cyl
          rotation={[Math.PI / 2, 0, 0]}
          radiusTop={bolsterR}
          height={depthM - 0.16}
          color={cushionColor}
          roughness={0.85}
          segments={18}
        />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Cyl
              position={[0, 0, (s * (depthM - 0.16)) / 2]}
              rotation={[Math.PI / 2, 0, 0]}
              radiusTop={bolsterR * 0.75}
              height={0.004}
              color="#C49746"
              roughness={0.6}
              segments={14}
              castShadow={false}
            />
            <Cyl
              position={[0, 0, (s * (depthM - 0.16)) / 2 - s * 0.03]}
              rotation={[Math.PI / 2, 0, 0]}
              radiusTop={bolsterR * 1.03}
              height={0.012}
              color={shade(cushionColor, -0.15)}
              roughness={0.85}
              segments={18}
              castShadow={false}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

export function NepaliGaddaModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  cushionColor,
  accentColor,
}) {
  // Floor mattress seating with piped border, tufting and twin takiya bolsters
  const matH = heightM * 0.38;
  const bolsterR = (heightM - matH) / 2;
  const tuft = shade(mainColor, -0.15);
  const gold = accentColor || '#C49746';
  const cols = clamp(Math.round(widthM / 0.22), 4, 10);
  const rows = clamp(Math.round(depthM / 0.22), 2, 5);
  return (
    <group>
      <Pad
        position={[0, matH / 2, 0]}
        size={[widthM, matH, depthM]}
        radius={0.04}
        color={mainColor}
        roughness={0.9}
      />
      <EdgePiping position={[0, matH, 0]} width={widthM} depth={depthM} color={gold} inset={0.07} />
      {/* Gold border band running round the top face */}
      {[-1, 1].map((s) => (
        <Box
          key={`gz${s}`}
          position={[0, matH + 0.0015, (s * (depthM - 0.12)) / 2]}
          size={[widthM - 0.16, 0.002, 0.02]}
          color={gold}
          roughness={0.7}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={`gx${s}`}
          position={[(s * (widthM - 0.12)) / 2, matH + 0.0015, 0]}
          size={[0.02, 0.002, depthM - 0.16]}
          color={gold}
          roughness={0.7}
          castShadow={false}
        />
      ))}
      <Buttons
        y={matH + 0.003}
        width={widthM - 0.3}
        depth={depthM - 0.3}
        cols={cols}
        rows={rows}
        color={tuft}
      />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (widthM / 2 - bolsterR - 0.04), matH + bolsterR, 0]}>
          <Cyl
            rotation={[Math.PI / 2, 0, 0]}
            radiusTop={bolsterR}
            height={depthM - 0.1}
            color={cushionColor}
            roughness={0.85}
            segments={18}
          />
          {[-1, 1].map((e) => (
            <group key={e}>
              <Cyl
                position={[0, 0, (e * (depthM - 0.1)) / 2]}
                rotation={[Math.PI / 2, 0, 0]}
                radiusTop={bolsterR * 0.7}
                height={0.004}
                color={gold}
                roughness={0.6}
                segments={14}
                castShadow={false}
              />
              <Cyl
                position={[0, 0, (e * (depthM - 0.1)) / 2 - e * 0.025]}
                rotation={[Math.PI / 2, 0, 0]}
                radiusTop={bolsterR * 1.02}
                height={0.01}
                color={gold}
                roughness={0.6}
                segments={18}
                castShadow={false}
              />
              <Cyl
                position={[0, -bolsterR * 0.6, (e * (depthM - 0.1)) / 2 + e * 0.02]}
                radiusTop={0.006}
                height={0.05}
                color={gold}
                segments={6}
                castShadow={false}
              />
              <Ball
                position={[0, -bolsterR * 0.6 - 0.03, (e * (depthM - 0.1)) / 2 + e * 0.02]}
                radius={0.01}
                color={gold}
                segments={6}
                castShadow={false}
              />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

export function NepaliDhokaDividerModel({ def, widthM, heightM, mainColor, accentColor }) {
  // 3-panel carved Jali screen with architectural open lattice cutouts and brass hinge knuckles
  const panelW = widthM / 3;
  const frameThick = 0.045;
  const stileW = 0.04;
  const railH = 0.06;
  const latticeH = heightM - railH * 2;
  const latticeW = panelW - stileW * 2;

  return (
    <group>
      {[0, 1, 2].map((idx) => {
        const px = -widthM / 2 + panelW / 2 + idx * panelW;
        const angle = (idx - 1) * 0.16; // Organic zigzag folding
        return (
          <group key={idx} position={[px, 0, 0]} rotation={[0, angle, 0]}>
            {/* Left Stile */}
            <mesh position={[-panelW / 2 + stileW / 2, heightM / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[stileW, heightM, frameThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* Right Stile */}
            <mesh position={[panelW / 2 - stileW / 2, heightM / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[stileW, heightM, frameThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* Bottom Rail / Plinth */}
            <mesh position={[0, railH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[latticeW, railH, frameThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* Top Crown Rail */}
            <mesh position={[0, heightM - railH / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[latticeW, railH, frameThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>
            {/* Middle Lock Rail */}
            <mesh position={[0, heightM * 0.42, 0]} castShadow receiveShadow>
              <boxGeometry args={[latticeW, 0.04, frameThick]} />
              <meshStandardMaterial color={mainColor} roughness={0.7} />
            </mesh>

            {/* Architectural Jali Fretwork: Multiple Vertical & Diagonal Cutout Slats */}
            {[-latticeW * 0.3, -latticeW * 0.1, latticeW * 0.1, latticeW * 0.3].map((sx, si) => (
              <mesh key={`v-slat-${si}`} position={[sx, heightM / 2, 0]} castShadow>
                <boxGeometry args={[0.016, latticeH - 0.02, 0.02]} />
                <meshStandardMaterial color={def.subColor || '#5C3524'} roughness={0.65} />
              </mesh>
            ))}
            {/* Horizontal Cross Muntins */}
            {[heightM * 0.22, heightM * 0.62, heightM * 0.82].map((sy, hi) => (
              <mesh key={`h-slat-${hi}`} position={[0, sy, 0]} castShadow>
                <boxGeometry args={[latticeW - 0.01, 0.016, 0.02]} />
                <meshStandardMaterial color={def.subColor || '#5C3524'} roughness={0.65} />
              </mesh>
            ))}

            {/* Brass Hinges on Adjacent Edges */}
            {idx < 2 &&
              [0.35, 0.85, 1.45].map((hy, hi) => (
                <mesh key={`hinge-${hi}`} position={[panelW / 2, hy, 0]} castShadow>
                  <cylinderGeometry args={[0.012, 0.012, 0.04, 12]} />
                  <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.25} />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

export function NepaliPujaMandirModel({ def, widthM, depthM, heightM, mainColor, accentColor }) {
  // Traditional tiered wooden shrine with pagoda roofs, columns, and Kalasha/Gajur finial
  const baseH = heightM * 0.2;
  const columnH = heightM * 0.4;
  const tier1H = heightM * 0.12;
  const tier2H = heightM * 0.1;
  return (
    <group>
      {/* Lower Base Cabinet Plinth */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, baseH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {/* Incense Drawer Front Inset */}
      <mesh position={[0, baseH / 2, depthM / 2 + 0.005]} castShadow>
        <boxGeometry args={[widthM * 0.75, baseH * 0.65, 0.012]} />
        <meshStandardMaterial color="#422213" roughness={0.6} />
      </mesh>
      {/* Twin Brass Drawer Knobs */}
      <mesh
        position={[-widthM * 0.2, baseH / 2, depthM / 2 + 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
        <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.2} />
      </mesh>
      <mesh
        position={[widthM * 0.2, baseH / 2, depthM / 2 + 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
        <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.2} />
      </mesh>

      {/* Sanctum Floor with Crimson Velvet Cloth */}
      <mesh position={[0, baseH + 0.006, 0]}>
        <boxGeometry args={[widthM - 0.04, 0.012, depthM - 0.04]} />
        <meshStandardMaterial color={def.subColor || '#8B2635'} roughness={0.85} />
      </mesh>
      {/* Deep Enclosed Back Wall */}
      <mesh position={[0, baseH + columnH / 2, -depthM / 2 + 0.025]} castShadow>
        <boxGeometry args={[widthM - 0.04, columnH, 0.04]} />
        <meshStandardMaterial color="#3D1F12" roughness={0.7} />
      </mesh>
      {/* Left Wall Wing */}
      <mesh position={[-widthM / 2 + 0.025, baseH + columnH / 2, 0]} castShadow>
        <boxGeometry args={[0.04, columnH, depthM - 0.05]} />
        <meshStandardMaterial color="#3D1F12" roughness={0.7} />
      </mesh>
      {/* Right Wall Wing */}
      <mesh position={[widthM / 2 - 0.025, baseH + columnH / 2, 0]} castShadow>
        <boxGeometry args={[0.04, columnH, depthM - 0.05]} />
        <meshStandardMaterial color="#3D1F12" roughness={0.7} />
      </mesh>

      {/* Twin Turned Front Columns with Capital Blocks */}
      {[-widthM / 2 + 0.07, widthM / 2 - 0.07].map((cx, ci) => (
        <group key={`col-${ci}`} position={[cx, baseH, depthM / 2 - 0.07]}>
          {/* Column Base */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.06, 0.04, 0.06]} />
            <meshStandardMaterial color="#542E1B" roughness={0.65} />
          </mesh>
          {/* Turned Column Shaft */}
          <mesh position={[0, columnH / 2, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.026, columnH - 0.08, 16]} />
            <meshStandardMaterial color="#6B3820" roughness={0.6} />
          </mesh>
          {/* Carved Bracket Capital */}
          <mesh position={[0, columnH - 0.02, 0]} castShadow>
            <boxGeometry args={[0.07, 0.04, 0.07]} />
            <meshStandardMaterial color="#542E1B" roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* Shrine contents: brass deity on a lotus seat, ghee lamp, hanging bell, incense, garland */}
      <group name="shrine-contents" position={[0, baseH + 0.012, -depthM * 0.12]}>
        <Cyl
          position={[0, 0.02, 0]}
          radiusTop={0.06}
          radiusBottom={0.07}
          height={0.04}
          color={accentColor}
          roughness={0.32}
          metalness={0.65}
          segments={16}
        />
        <Cyl
          position={[0, 0.09, 0]}
          radiusTop={0.025}
          radiusBottom={0.04}
          height={0.1}
          color={accentColor}
          roughness={0.32}
          metalness={0.65}
          segments={14}
        />
        <mesh position={[0, 0.17, 0]} castShadow>
          <sphereGeometry args={[0.03, 12, 10]} />
          <meshStandardMaterial color={accentColor} roughness={0.32} metalness={0.65} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <coneGeometry args={[0.022, 0.04, 10]} />
          <meshStandardMaterial color={accentColor} roughness={0.32} metalness={0.65} />
        </mesh>
        <group name="shrine-lamp" position={[widthM * 0.2, 0, depthM * 0.22]}>
          <Cyl
            position={[0, 0.012, 0]}
            radiusTop={0.03}
            radiusBottom={0.02}
            height={0.024}
            color={accentColor}
            roughness={0.32}
            metalness={0.65}
            segments={14}
          />
          <mesh position={[0, 0.05, 0]}>
            <coneGeometry args={[0.008, 0.035, 8]} />
            <meshBasicMaterial color="#FFB347" />
          </mesh>
        </group>
        <Cyl
          position={[-widthM * 0.2, 0.03, depthM * 0.22]}
          radiusTop={0.012}
          radiusBottom={0.02}
          height={0.06}
          color={accentColor}
          roughness={0.32}
          metalness={0.65}
          segments={10}
        />
      </group>
      <group name="shrine-bell" position={[widthM * 0.2, baseH + columnH, depthM * 0.1]}>
        <Cyl
          position={[0, -0.04, 0]}
          radiusTop={0.002}
          height={0.08}
          color="#C9C9C9"
          segments={4}
          castShadow={false}
        />
        <mesh position={[0, -0.1, 0]} castShadow>
          <sphereGeometry args={[0.032, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={accentColor} roughness={0.32} metalness={0.65} side={2} />
        </mesh>
        <mesh position={[0, -0.112, 0]}>
          <sphereGeometry args={[0.008, 8, 6]} />
          <meshStandardMaterial color={accentColor} roughness={0.32} metalness={0.65} />
        </mesh>
      </group>
      {/* Marigold garland draped along the front lintel */}
      {Array.from({ length: 12 }).map((_, i) => {
        const t = i / 11;
        return (
          <mesh
            key={`mg${i}`}
            position={[
              -widthM / 2 + 0.06 + (widthM - 0.12) * t,
              baseH + columnH - 0.025 - Math.sin(t * Math.PI) * 0.035,
              depthM / 2 - 0.03,
            ]}
            castShadow
          >
            <sphereGeometry args={[0.014, 8, 6]} />
            <meshStandardMaterial color={i % 2 ? '#F28C28' : '#E8A317'} roughness={0.9} />
          </mesh>
        );
      })}

      {/* Lower Tier Pagoda Roof Eave (Flared outward) */}
      <mesh position={[0, baseH + columnH + tier1H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, tier1H, depthM]} />
        <meshStandardMaterial color="#30180D" roughness={0.65} />
      </mesh>
      {/* Flared Eave Cornice Molding */}
      <mesh position={[0, baseH + columnH + tier1H, 0]} castShadow>
        <boxGeometry args={[widthM, 0.02, depthM]} />
        <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.3} />
      </mesh>

      {/* Upper Tier Pagoda Roof (Stepped inwards with pitched slope) */}
      <mesh position={[0, baseH + columnH + tier1H + tier2H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.72, tier2H, depthM * 0.72]} />
        <meshStandardMaterial color="#2B140A" roughness={0.65} />
      </mesh>

      {/* Ornate Patan Brass Gajur / Kalasha Finial Assemblage */}
      <group position={[0, baseH + columnH + tier1H + tier2H, 0]} scale={heightM * 1.2}>
        {/* Stepped Brass Base Plinth */}
        <mesh position={[0, 0.015, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.08, 0.03, 16]} />
          <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.2} />
        </mesh>
        {/* Sacred Kalasha Spherical Urn */}
        <mesh position={[0, 0.055, 0]} castShadow>
          <sphereGeometry args={[0.038, 16, 16]} />
          <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.18} />
        </mesh>
        {/* Pointed Spire Cone (Gajur Tip) */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <coneGeometry args={[0.024, 0.11, 16]} />
          <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
}

export function NepaliLotaDisplayModel({ widthM, heightM, mainColor, accentColor }) {
  // Turned wooden tripod stand with polished brass Karuwa vessel
  const standH = heightM - 0.28;
  return (
    <group>
      {/* Tripod Stand Top Disc */}
      <mesh position={[0, standH, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[widthM / 2, widthM / 2, 0.03, 24]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {/* 3 Turned Legs */}
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((rad, idx) => {
        const lx = (widthM / 2 - 0.05) * Math.cos(rad);
        const lz = (widthM / 2 - 0.05) * Math.sin(rad);
        return (
          <mesh
            key={idx}
            position={[lx, standH / 2, lz]}
            rotation={[0.08 * Math.sin(rad), 0, -0.08 * Math.cos(rad)]}
            castShadow
          >
            <cylinderGeometry args={[0.02, 0.025, standH, 12]} />
            <meshStandardMaterial color={mainColor} roughness={0.7} />
          </mesh>
        );
      })}
      {/* Polished Brass Karuwa Vessel Body */}
      <mesh position={[0, standH + 0.1, 0]} castShadow>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.2} />
      </mesh>
      {/* Karuwa Neck & Fluted Rim */}
      <mesh position={[0, standH + 0.21, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.025, 0.08, 16]} />
        <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.2} />
      </mesh>
      {/* Lid with a finial knob, body bands and a tripod brace ring */}
      <mesh position={[0, standH + 0.255, 0]} castShadow>
        <sphereGeometry args={[0.032, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={accentColor} roughness={0.32} metalness={0.65} />
      </mesh>
      <mesh position={[0, standH + 0.29, 0]} castShadow>
        <sphereGeometry args={[0.012, 8, 6]} />
        <meshStandardMaterial color={accentColor} roughness={0.32} metalness={0.65} />
      </mesh>
      {[0.08, 0.12].map((dy) => (
        <mesh key={dy} position={[0, standH + dy, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.088 - Math.abs(0.1 - dy) * 0.6, 0.004, 6, 24]} />
          <meshStandardMaterial color="#8A6A2B" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, standH * 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[widthM * 0.33, 0.006, 6, 24]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {/* Karuwa Curved Spout */}
      <mesh position={[0.07, standH + 0.15, 0]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.12, 12]} />
        <meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.2} />
      </mesh>
    </group>
  );
}
