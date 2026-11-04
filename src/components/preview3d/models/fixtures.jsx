/** 3D models: fixtures. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import * as THREE from 'three';
import { Box, Cyl, Pad } from './shared.jsx';

const CHROME = '#C9CDD0';

function Chrome({ position, size, rotation }) {
  return (
    <Box
      position={position}
      size={size}
      rotation={rotation}
      color={CHROME}
      roughness={0.15}
      metalness={0.9}
    />
  );
}

export function FixtureToiletModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const tankD = depthM * 0.22;
  const tankH = heightM - 0.4;
  const bowlRx = widthM * 0.46;
  const bowlRz = depthM * 0.34;
  const bowlZ = depthM / 2 - bowlRz - 0.01;
  return (
    <group>
      {/* Pedestal and bowl */}
      <Box
        position={[0, 0.11, bowlZ - bowlRz * 0.2]}
        size={[widthM * 0.5, 0.22, depthM * 0.5]}
        color={mainColor}
        roughness={0.25}
      />
      <mesh position={[0, 0.3, bowlZ]} scale={[1, 1, bowlRz / bowlRx]} castShadow receiveShadow>
        <cylinderGeometry args={[bowlRx, bowlRx * 0.62, 0.2, 32]} />
        <meshStandardMaterial color={mainColor} roughness={0.2} />
      </mesh>
      {/* Seat ring and closed lid */}
      <mesh
        position={[0, 0.405, bowlZ]}
        scale={[1, 1, bowlRz / bowlRx]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[bowlRx * 0.86, bowlRx * 0.12, 10, 36]} />
        <meshStandardMaterial color={subColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.415, bowlZ]} scale={[1, 1, bowlRz / bowlRx]} castShadow>
        <cylinderGeometry args={[bowlRx * 0.84, bowlRx * 0.84, 0.014, 32]} />
        <meshStandardMaterial color={subColor} roughness={0.3} />
      </mesh>
      {/* Cistern with flush button and a hinge bar */}
      <Pad
        position={[0, 0.4 + tankH / 2, -depthM / 2 + tankD / 2]}
        size={[widthM * 0.9, tankH, tankD]}
        radius={0.02}
        color={mainColor}
        roughness={0.25}
      />
      <Cyl
        position={[0, heightM + 0.008, -depthM / 2 + tankD / 2]}
        radiusTop={0.025}
        height={0.016}
        color={CHROME}
        roughness={0.15}
        metalness={0.9}
        segments={16}
      />
      <Box
        position={[0, 0.43, -depthM / 2 + tankD + 0.012]}
        size={[widthM * 0.5, 0.02, 0.024]}
        color={CHROME}
        roughness={0.2}
        metalness={0.8}
      />
    </group>
  );
}

export function FixtureBasinModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const rimH = 0.16;
  const bowlR = Math.min(widthM * 0.36, depthM * 0.4);
  return (
    <group>
      {/* Pedestal column and foot */}
      <Cyl
        position={[0, (heightM - rimH) / 2, -depthM * 0.1]}
        radiusTop={widthM * 0.14}
        radiusBottom={widthM * 0.2}
        height={heightM - rimH}
        color={mainColor}
        roughness={0.25}
        segments={24}
      />
      <Cyl
        position={[0, 0.02, -depthM * 0.1]}
        radiusTop={widthM * 0.22}
        radiusBottom={widthM * 0.24}
        height={0.04}
        color={mainColor}
        roughness={0.25}
        segments={24}
      />
      {/* Basin with raised back splash */}
      <Pad
        position={[0, heightM - rimH / 2, 0]}
        size={[widthM, rimH, depthM]}
        radius={0.05}
        color={mainColor}
        roughness={0.22}
      />
      <Box
        position={[0, heightM + 0.015, -depthM / 2 + 0.015]}
        size={[widthM, 0.04, 0.03]}
        color={mainColor}
        roughness={0.22}
      />
      <mesh position={[0, heightM + 0.002, depthM * 0.04]} scale={[1, 1, 0.9]} receiveShadow>
        <cylinderGeometry args={[bowlR, bowlR * 0.9, 0.012, 32]} />
        <meshStandardMaterial color={subColor} roughness={0.25} />
      </mesh>
      <Cyl
        position={[0, heightM + 0.009, depthM * 0.04]}
        radiusTop={0.016}
        height={0.004}
        color="#4A4F54"
        metalness={0.7}
        segments={12}
        castShadow={false}
      />
      {/* Mixer tap */}
      <Cyl
        position={[0, heightM + 0.065, -depthM / 2 + 0.05]}
        radiusTop={0.013}
        height={0.07}
        color={CHROME}
        roughness={0.15}
        metalness={0.9}
        segments={12}
      />
      <Chrome position={[0, heightM + 0.095, -depthM / 2 + 0.085]} size={[0.02, 0.018, 0.08]} />
      <Cyl
        position={[0.032, heightM + 0.05, -depthM / 2 + 0.05]}
        radiusTop={0.008}
        height={0.04}
        color={CHROME}
        roughness={0.15}
        metalness={0.9}
        segments={10}
      />
    </group>
  );
}

export function FixtureShowerModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const trayH = 0.07;
  const frame = 0.025;
  return (
    <group>
      {/* Tray with a slightly dished floor and drain */}
      <Box
        position={[0, trayH / 2, 0]}
        size={[widthM, trayH, depthM]}
        color={mainColor}
        roughness={0.35}
      />
      <Box
        position={[0, trayH + 0.001, 0]}
        size={[widthM - 0.1, 0.004, depthM - 0.1]}
        color={subColor}
        roughness={0.4}
        castShadow={false}
      />
      <Cyl
        position={[0, trayH + 0.005, 0]}
        radiusTop={0.045}
        height={0.004}
        color={CHROME}
        roughness={0.2}
        metalness={0.8}
        segments={20}
        castShadow={false}
      />

      {/* Glass screens on the front and right sides, framed in aluminium */}
      {[
        { pos: [0, 0, depthM / 2 - frame / 2], size: [widthM, frame] },
        { pos: [widthM / 2 - frame / 2, 0, 0], size: [frame, depthM] },
      ].map(({ pos, size }, i) => {
        const w = size[0];
        const d = size[1];
        return (
          <group key={i} position={[pos[0], 0, pos[2]]}>
            <mesh position={[0, trayH + (heightM - trayH) / 2, 0]}>
              <boxGeometry args={[w, heightM - trayH, d]} />
              <meshStandardMaterial
                color="#BFD9E4"
                transparent
                opacity={0.2}
                roughness={0.05}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Box
              position={[0, heightM - 0.01, 0]}
              size={[w, 0.02, d]}
              color={CHROME}
              roughness={0.3}
              metalness={0.7}
            />
            <Box
              position={[0, trayH + 0.01, 0]}
              size={[w, 0.02, d]}
              color={CHROME}
              roughness={0.3}
              metalness={0.7}
            />
          </group>
        );
      })}
      <Box
        position={[widthM / 2 - frame / 2, trayH + (heightM - trayH) / 2, depthM / 2 - frame / 2]}
        size={[frame, heightM - trayH, frame]}
        color={CHROME}
        roughness={0.3}
        metalness={0.7}
      />

      {/* Rain head on a wall pipe at the back-left corner */}
      <Chrome
        position={[-widthM * 0.3, heightM * 0.5, -depthM / 2 + 0.03]}
        size={[0.025, heightM * 0.9, 0.025]}
      />
      <Chrome
        position={[-widthM * 0.3, heightM - 0.1, -depthM / 2 + 0.1]}
        size={[0.02, 0.02, 0.18]}
      />
      <Cyl
        position={[-widthM * 0.3, heightM - 0.11, -depthM / 2 + 0.2]}
        radiusTop={0.09}
        height={0.02}
        color={CHROME}
        roughness={0.2}
        metalness={0.85}
        segments={24}
      />
    </group>
  );
}

export function FixtureBathtubModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const wall = 0.07;
  return (
    <group>
      <Pad
        position={[0, heightM / 2, 0]}
        size={[widthM, heightM, depthM]}
        radius={0.08}
        color={mainColor}
        roughness={0.25}
      />
      {/* Sunken, slightly narrower inner basin */}
      <Pad
        position={[0.02, heightM - 0.005, 0]}
        size={[widthM - wall * 2.2, 0.03, depthM - wall * 2]}
        radius={0.12}
        color={subColor}
        roughness={0.25}
      />
      {/* Tap set on the right end */}
      <Cyl
        position={[widthM / 2 - 0.1, heightM + 0.05, 0]}
        radiusTop={0.018}
        height={0.1}
        color={CHROME}
        roughness={0.15}
        metalness={0.9}
        segments={12}
      />
      <Chrome position={[widthM / 2 - 0.15, heightM + 0.095, 0]} size={[0.1, 0.02, 0.02]} />
      <Cyl
        position={[widthM / 2 - 0.1, heightM + 0.015, depthM * 0.14]}
        radiusTop={0.015}
        height={0.03}
        color={CHROME}
        roughness={0.2}
        metalness={0.8}
        segments={12}
      />
      <Cyl
        position={[widthM / 2 - 0.1, heightM + 0.015, -depthM * 0.14]}
        radiusTop={0.015}
        height={0.03}
        color={CHROME}
        roughness={0.2}
        metalness={0.8}
        segments={12}
      />
    </group>
  );
}

export function FixtureWasherModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const doorR = Math.min(widthM, heightM) * 0.32;
  const doorY = heightM * 0.45;
  return (
    <group>
      <Pad
        position={[0, heightM / 2 + 0.01, 0]}
        size={[widthM, heightM - 0.02, depthM]}
        radius={0.015}
        color={mainColor}
        roughness={0.3}
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cyl
            key={`${sx}${sz}`}
            position={[sx * (widthM / 2 - 0.05), 0.01, sz * (depthM / 2 - 0.05)]}
            radiusTop={0.02}
            height={0.02}
            color="#2A2D30"
            roughness={0.7}
            segments={10}
          />
        ))
      )}
      {/* Porthole door: chrome ring around a dark glass drum */}
      <mesh position={[0, doorY, depthM / 2 + 0.004]} castShadow>
        <torusGeometry args={[doorR, doorR * 0.12, 10, 36]} />
        <meshStandardMaterial color={CHROME} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, doorY, depthM / 2 + 0.002]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[doorR * 0.95, doorR * 0.95, 0.012, 32]} />
        <meshStandardMaterial color={subColor} roughness={0.12} metalness={0.2} />
      </mesh>
      {/* Control strip along the top with a dial and display */}
      <Box
        position={[0, heightM - 0.07, depthM / 2 + 0.002]}
        size={[widthM - 0.06, 0.1, 0.004]}
        color="#E4E6E7"
        roughness={0.35}
        castShadow={false}
      />
      <Cyl
        position={[-widthM * 0.28, heightM - 0.07, depthM / 2 + 0.014]}
        radiusTop={0.03}
        height={0.022}
        color="#9AA0A6"
        roughness={0.3}
        metalness={0.5}
        segments={20}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <Box
        position={[widthM * 0.2, heightM - 0.07, depthM / 2 + 0.006]}
        size={[0.1, 0.035, 0.004]}
        color="#1B2A33"
        roughness={0.2}
        castShadow={false}
      />
    </group>
  );
}
