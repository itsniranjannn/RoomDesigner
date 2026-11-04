/** 3D models: decor. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import { Box, Cyl, Ball, Strut, Knob, RoundKnob, CHROME, BLACK_PLASTIC, shade } from './shared.jsx';

const BRASS = '#C49746';

export function PlantModel({ def, widthM, depthM, heightM, mainColor }) {
  const span = Math.min(widthM, depthM);
  const potRadius = span * 0.27;
  const potH = Math.min(0.42, heightM * 0.3);
  const trunkH = heightM - potH;
  const leafL = 0.1 + heightM * 0.05;
  const leafW = leafL * 0.62;
  const spread = span / 2 - leafL * 0.8;
  const leafCount = 18;
  return (
    <group>
      {/* Saucer, pebbles on the soil, glazed planter with a brass rim */}
      <Cyl
        position={[0, 0.008, 0]}
        radiusTop={potRadius * 0.85}
        radiusBottom={potRadius * 0.9}
        height={0.016}
        color={shade(def.subColor || '#DDD6C9', -0.08)}
        roughness={0.5}
        segments={28}
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Ball
          key={`pb${i}`}
          position={[
            Math.cos(i * 2.4) * potRadius * 0.6,
            potH - 0.012,
            Math.sin(i * 2.4) * potRadius * 0.6,
          ]}
          radius={0.012 + (i % 3) * 0.004}
          scale={[1, 0.6, 1]}
          color={i % 2 ? '#B8AFA2' : '#8E877C'}
          roughness={0.9}
          segments={6}
          castShadow={false}
        />
      ))}
      <Cyl
        position={[0, potH / 2, 0]}
        radiusTop={potRadius}
        radiusBottom={potRadius * 0.72}
        height={potH}
        color={def.subColor || '#DDD6C9'}
        roughness={0.45}
        segments={28}
      />
      <mesh position={[0, potH - 0.008, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[potRadius * 0.99, 0.01, 8, 32]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} />
      </mesh>
      <Cyl
        position={[0, potH - 0.025, 0]}
        radiusTop={potRadius * 0.93}
        height={0.02}
        color="#2E1C12"
        roughness={0.95}
        segments={24}
      />

      {/* Woody stem */}
      <Cyl
        position={[0, potH + trunkH * 0.42, 0]}
        radiusTop={0.014}
        radiusBottom={0.022}
        height={trunkH * 0.84}
        color="#3E2C1E"
        roughness={0.85}
        segments={10}
      />

      {/* Broad fig leaves spiralling up the stem, shorter towards the top */}
      {Array.from({ length: leafCount }).map((_, i) => {
        const t = i / (leafCount - 1);
        const y = potH + 0.12 + (trunkH - 0.12 - leafL * 0.55) * (0.2 + 0.8 * t);
        const reach = spread * (1 - 0.6 * t) * (0.75 + 0.25 * ((i % 3) / 2));
        return (
          <group key={i} position={[0, y, 0]} rotation={[0, i * 2.4, 0]}>
            <mesh
              position={[0, 0, reach]}
              rotation={[-0.55, 0, 0]}
              scale={[
                leafW * (0.8 + (0.4 * ((i * 7) % 5)) / 4),
                0.006,
                leafL * (1 - 0.25 * t) * (0.85 + (0.3 * ((i * 3) % 4)) / 3),
              ]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[1, 14, 8]} />
              <meshStandardMaterial color={i % 2 === 0 ? mainColor : '#4B6B52'} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Arc floor lamp: weighted base at the back, pole rising and arcing forward over a hanging dome shade. */
export function LampModel({ def, widthM, depthM, heightM, mainColor }) {
  const span = Math.min(widthM, depthM);
  const baseR = span * 0.38;
  const shadeR = span * 0.24;
  const z0 = depthM / 2 - baseR;
  const shadeZ = -depthM / 2 + shadeR + 0.02;
  const points = [
    [0, 0.04, z0],
    [0, heightM * 0.8, z0],
    [0, heightM * 0.95, z0 - (z0 - shadeZ) * 0.3],
    [0, heightM * 0.96, z0 - (z0 - shadeZ) * 0.7],
    [0, heightM * 0.9, shadeZ],
  ];
  const shadeY = heightM * 0.9 - 0.05;
  return (
    <group>
      <Cyl
        position={[0, 0.02, z0]}
        radiusTop={baseR}
        radiusBottom={baseR * 1.04}
        height={0.04}
        color={mainColor}
        roughness={0.35}
        metalness={0.7}
        segments={36}
      />
      <Cyl
        position={[0, 0.045, z0]}
        radiusTop={baseR * 0.4}
        height={0.012}
        color={BRASS}
        roughness={0.25}
        metalness={0.85}
        segments={24}
      />
      {points.slice(0, -1).map((p, i) => (
        <Strut
          key={i}
          from={p}
          to={points[i + 1]}
          radius={0.013}
          color={mainColor}
          roughness={0.35}
          metalness={0.7}
        />
      ))}
      <group name="lamp-switch">
        <Cyl
          position={[0, heightM * 0.45, z0]}
          radiusTop={0.019}
          height={0.07}
          {...BLACK_PLASTIC}
          segments={12}
        />
        <Knob
          position={[0, heightM * 0.45, z0 + 0.02]}
          radius={0.01}
          depth={0.012}
          color="#D8D8D8"
        />
      </group>
      <Cyl
        position={[0, 0.006, z0 - baseR * 0.5 - 0.1]}
        radiusTop={0.004}
        height={baseR + 0.2}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
        roughness={0.8}
        segments={6}
        castShadow={false}
      />
      <mesh position={[0, heightM * 0.8, z0]} castShadow>
        <sphereGeometry args={[0.024, 14, 12]} />
        <meshStandardMaterial color={BRASS} metalness={0.88} roughness={0.2} />
      </mesh>
      <mesh position={[0, shadeY + 0.01, shadeZ]} castShadow>
        <sphereGeometry args={[shadeR, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={def.subColor || '#FAF6EE'} roughness={0.85} side={2} />
      </mesh>
      <mesh position={[0, shadeY - 0.01, shadeZ]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshBasicMaterial color="#FFF5DF" />
      </mesh>
    </group>
  );
}

/** Tripod floor lamp: three splayed timber legs carrying a drum shade. */
export function LampTripodModel({ def, widthM, depthM, heightM, mainColor }) {
  const span = Math.min(widthM, depthM);
  const footR = span * 0.55;
  const apexY = heightM * 0.68;
  const shadeH = heightM * 0.26;
  const shadeR = span * 0.4;
  return (
    <group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        return (
          <Strut
            key={i}
            from={[0, apexY, 0]}
            to={[Math.cos(a) * footR, 0.012, Math.sin(a) * footR]}
            radius={0.018}
            color={mainColor}
            roughness={0.55}
          />
        );
      })}
      <Cyl
        position={[0, apexY + 0.03, 0]}
        radiusTop={0.025}
        height={0.07}
        color={BRASS}
        roughness={0.25}
        metalness={0.85}
        segments={14}
      />
      <Cyl
        position={[0, apexY + 0.08 + shadeH / 2, 0]}
        radiusTop={shadeR * 0.8}
        radiusBottom={shadeR}
        height={shadeH}
        color={def.subColor || '#F2E8D5'}
        roughness={0.85}
        segments={32}
      />
      <mesh position={[0, apexY + 0.12, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#FFF5DF" />
      </mesh>
      {[0, 1].map((k) => (
        <mesh
          key={k}
          position={[0, apexY + 0.08 + (k ? shadeH : 0), 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[shadeR * (k ? 0.8 : 1), 0.005, 6, 32]} />
          <meshStandardMaterial color={shade(def.subColor || '#F2E8D5', -0.2)} roughness={0.7} />
        </mesh>
      ))}
      <Ball
        position={[0, apexY + 0.08 + shadeH + 0.02, 0]}
        radius={0.017}
        color={BRASS}
        metalness={0.8}
        roughness={0.25}
      />
      <Cyl
        position={[0, 0.006, footR * 0.5]}
        radiusTop={0.004}
        height={footR}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
        roughness={0.8}
        segments={6}
        castShadow={false}
      />
    </group>
  );
}

/** Torchiere floor lamp: weighted disc base, slim stem and an upward-facing bowl shade. */
export function LampTorchiereModel({ def, widthM, depthM, heightM, mainColor }) {
  const span = Math.min(widthM, depthM);
  const bowlH = heightM * 0.14;
  return (
    <group>
      <Cyl
        position={[0, 0.015, 0]}
        radiusTop={span * 0.45}
        radiusBottom={span * 0.5}
        height={0.03}
        color={mainColor}
        roughness={0.35}
        metalness={0.7}
        segments={32}
      />
      <Cyl
        position={[0, (heightM - bowlH) / 2, 0]}
        radiusTop={0.013}
        height={heightM - bowlH}
        color={mainColor}
        roughness={0.35}
        metalness={0.7}
        segments={12}
      />
      <Cyl
        position={[0, heightM * 0.5, 0]}
        radiusTop={0.022}
        height={0.04}
        color={BRASS}
        roughness={0.25}
        metalness={0.85}
        segments={12}
      />
      <Cyl
        position={[0, heightM - bowlH / 2, 0]}
        radiusTop={span * 0.5}
        radiusBottom={span * 0.14}
        height={bowlH}
        color={def.subColor || '#FAF6EE'}
        roughness={0.8}
        segments={32}
      />
      <mesh position={[0, heightM - bowlH * 0.6, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#FFF5DF" />
      </mesh>
      <mesh position={[0, heightM - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[span * 0.5, 0.006, 6, 32]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.6} />
      </mesh>
      <group name="lamp-switch" position={[0, heightM * 0.4, 0]}>
        <Cyl position={[0, 0, 0]} radiusTop={0.02} height={0.06} {...BLACK_PLASTIC} segments={12} />
        <Knob position={[0, 0, 0.022]} radius={0.01} depth={0.012} color="#D8D8D8" />
      </group>
      <Cyl
        position={[0, 0.036, span * 0.35]}
        radiusTop={0.004}
        height={span * 0.7}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
        roughness={0.8}
        segments={6}
        castShadow={false}
      />
    </group>
  );
}

/** Leaning mirror in a timber frame, propped by a rear easel; the lean is limited so it stays inside the footprint. */
function MirrorCabinet({ widthM, depthM, heightM, mainColor }) {
  const door = 0.02;
  const frame = 0.025;
  return (
    <group name="mirror-cabinet">
      <Box
        position={[0, heightM / 2, 0]}
        size={[widthM, heightM, depthM - door]}
        color={mainColor}
        roughness={0.5}
      />
      <Box
        position={[0, heightM / 2, depthM / 2 - door / 2]}
        size={[widthM, heightM, door]}
        color={shade(mainColor, 0.03)}
        roughness={0.45}
      />
      <Box
        position={[0, heightM / 2, depthM / 2 + 0.001]}
        size={[widthM - frame * 2, heightM - frame * 2, 0.004]}
        color="#DCEBF0"
        roughness={0.04}
        metalness={0.5}
        castShadow={false}
      />
      <Box
        position={[0, heightM / 2, depthM / 2 - 0.001]}
        size={[widthM - frame * 1.4, heightM - frame * 1.4, 0.004]}
        {...CHROME}
        castShadow={false}
      />
      {[0.25, 0.4].map((f) => (
        <mesh
          key={f}
          position={[widthM * (f - 0.3), heightM * 0.62, depthM / 2 + 0.0035]}
          rotation={[0, 0, -0.5]}
        >
          <planeGeometry args={[widthM * 0.7, 0.025]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
        </mesh>
      ))}
      {/* Hinges on the left edge, finger pull on the right and a lit strip at the top */}
      {[0.15, 0.85].map((f) => (
        <Box
          key={f}
          position={[-widthM / 2 + 0.004, heightM * f, depthM / 2]}
          size={[0.012, 0.05, 0.016]}
          {...CHROME}
        />
      ))}
      <RoundKnob
        position={[widthM / 2 - 0.035, heightM * 0.5, depthM / 2 - 0.006]}
        radius={0.012}
        color="#D8D8D8"
      />
      <mesh position={[0, heightM - 0.03, depthM / 2 + 0.002]}>
        <boxGeometry args={[widthM * 0.6, 0.008, 0.003]} />
        <meshBasicMaterial color="#FFF1CC" />
      </mesh>
      <Box
        position={[0, heightM + 0.005, 0]}
        size={[widthM + 0.01, 0.01, depthM + 0.01]}
        color={shade(mainColor, -0.06)}
        roughness={0.5}
      />
    </group>
  );
}

/** Cheval mirror: a tilting mirror between two posts with swivel knobs and sled feet. */
function ChevalMirror({ widthM, depthM, heightM, mainColor }) {
  const postX = widthM / 2 - 0.025;
  const frameW = widthM - 0.12;
  const pivotY = heightM * 0.58;
  const mirrorH = heightM * 0.72;
  return (
    <group name="cheval-mirror">
      {[-1, 1].map((sg) => (
        <group key={sg}>
          <Box
            position={[sg * postX, heightM * 0.43, 0]}
            size={[0.045, heightM * 0.86, 0.045]}
            color={mainColor}
            roughness={0.5}
          />
          <Ball
            position={[sg * postX, heightM * 0.88, 0]}
            radius={0.032}
            color={mainColor}
            roughness={0.45}
          />
          <Box
            position={[sg * postX, 0.02, 0]}
            size={[0.05, 0.04, depthM - 0.04]}
            color={shade(mainColor, -0.08)}
            roughness={0.55}
          />
          <Cyl
            position={[sg * (postX - 0.04), pivotY, 0]}
            radiusTop={0.012}
            height={0.05}
            rotation={[0, 0, Math.PI / 2]}
            {...CHROME}
            segments={10}
          />
          <Ball
            position={[sg * (postX + 0.03), pivotY, 0]}
            radius={0.02}
            color="#C49746"
            metalness={0.8}
            roughness={0.25}
          />
        </group>
      ))}
      <Box
        position={[0, 0.2, 0]}
        size={[widthM - 0.05, 0.03, 0.03]}
        color={mainColor}
        roughness={0.55}
      />
      <group position={[0, pivotY, 0]} rotation={[-0.1, 0, 0]}>
        <Box
          position={[0, 0, 0]}
          size={[frameW, mirrorH, 0.035]}
          color={mainColor}
          roughness={0.5}
        />
        <Box
          position={[0, 0, 0.019]}
          size={[frameW - 0.07, mirrorH - 0.07, 0.004]}
          color="#DCEBF0"
          roughness={0.04}
          metalness={0.5}
          castShadow={false}
        />
        <Box
          position={[0, 0, 0.0165]}
          size={[frameW - 0.05, mirrorH - 0.05, 0.002]}
          color="#C49746"
          metalness={0.7}
          roughness={0.3}
          castShadow={false}
        />
        <mesh position={[0, mirrorH * 0.12, 0.0215]} rotation={[0, 0, -0.45]}>
          <planeGeometry args={[frameW * 0.8, 0.04]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

export function WallMirrorModel({ def, widthM, depthM, heightM, mainColor, legColor }) {
  if (def?.id === 'mirror-cabinet') {
    return (
      <MirrorCabinet widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} />
    );
  }
  if (def?.id === 'cheval-mirror') {
    return <ChevalMirror widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} />;
  }
  const frameW = Math.min(0.055, widthM * 0.12);
  const frameT = Math.min(0.04, depthM * 0.5);
  const tilt = Math.asin(Math.min(0.14, (depthM * 0.35) / heightM));
  const baseZ = depthM / 2 - frameT / 2;
  const glassW = widthM - frameW * 2;
  const glassH = heightM - frameW * 2;
  const hingeY = heightM * 0.8;
  const hinge = [0, hingeY * Math.cos(tilt), baseZ - hingeY * Math.sin(tilt) - frameT / 2];
  const foot = [0, 0, -depthM / 2 + 0.012];
  return (
    <group>
      <group position={[0, 0, baseZ]} rotation={[-tilt, 0, 0]}>
        <Box
          position={[0, heightM - frameW / 2, 0]}
          size={[widthM, frameW, frameT]}
          color={mainColor}
          roughness={0.55}
        />
        <Box
          position={[0, frameW / 2, 0]}
          size={[widthM, frameW, frameT]}
          color={mainColor}
          roughness={0.55}
        />
        {[-1, 1].map((s) => (
          <Box
            key={s}
            position={[s * (widthM / 2 - frameW / 2), heightM / 2, 0]}
            size={[frameW, heightM, frameT]}
            color={mainColor}
            roughness={0.55}
          />
        ))}
        <Box
          position={[0, heightM / 2, -frameT / 2 + 0.005]}
          size={[glassW, glassH, 0.01]}
          color="#2B1F13"
          roughness={0.8}
          castShadow={false}
        />
        <mesh position={[0, heightM / 2, frameT / 2 - 0.012]}>
          <boxGeometry args={[glassW, glassH, 0.008]} />
          <meshStandardMaterial color="#DCEBF0" roughness={0.1} metalness={0.35} />
        </mesh>
        {/* Soft diagonal reflections */}
        <mesh position={[0, heightM * 0.58, frameT / 2 - 0.007]} rotation={[0, 0, -0.42]}>
          <planeGeometry args={[glassW * 0.8, 0.04]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.55} />
        </mesh>
        <mesh
          position={[-glassW * 0.12, heightM * 0.42, frameT / 2 - 0.007]}
          rotation={[0, 0, -0.42]}
        >
          <planeGeometry args={[glassW * 0.55, 0.022]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
        </mesh>
      </group>
      {/* Rear easel leg */}
      {[-1, 1].map((s) => (
        <Strut
          key={s}
          from={[s * widthM * 0.12, hinge[1], hinge[2]]}
          to={[s * widthM * 0.12, foot[1], foot[2]]}
          radius={0.01}
          color={legColor || '#2B1F13'}
          roughness={0.6}
        />
      ))}
      <Strut
        from={[-widthM * 0.12, hinge[1], hinge[2]]}
        to={[widthM * 0.12, hinge[1], hinge[2]]}
        radius={0.01}
        color={legColor || '#2B1F13'}
        roughness={0.6}
      />
    </group>
  );
}
