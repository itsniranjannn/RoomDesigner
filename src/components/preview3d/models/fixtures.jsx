/** 3D models: fixtures. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import * as THREE from 'three';

export function FixtureToiletModel({ widthM, depthM, heightM, mainColor, subColor }) {
  return (
    <group>
      <mesh position={[0, 0.2, -depthM * 0.3]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.9, 0.4, depthM * 0.28]} />
        <meshStandardMaterial color={mainColor} roughness={0.25} />
      </mesh>
      <mesh position={[0, heightM * 0.75, -depthM * 0.4]} castShadow>
        <boxGeometry args={[widthM, heightM * 0.5, depthM * 0.2]} />
        <meshStandardMaterial color={mainColor} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.2, depthM * 0.08]} scale={[1, 1, 1.25]} castShadow>
        <cylinderGeometry args={[widthM * 0.46, widthM * 0.3, 0.4, 24]} />
        <meshStandardMaterial color={mainColor} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.41, depthM * 0.08]} scale={[1, 1, 1.25]}>
        <cylinderGeometry args={[widthM * 0.36, widthM * 0.36, 0.02, 24]} />
        <meshStandardMaterial color={subColor} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function FixtureBasinModel({ widthM, depthM, heightM, mainColor, subColor }) {
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.2, 0.8, depthM * 0.2]} />
        <meshStandardMaterial color={mainColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, heightM - 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, 0.14, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.25} />
      </mesh>
      <mesh position={[0, heightM + 0.005, 0.02]}>
        <cylinderGeometry args={[widthM * 0.34, widthM * 0.3, 0.02, 24]} />
        <meshStandardMaterial color={subColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, heightM + 0.1, -depthM * 0.36]}>
        <boxGeometry args={[0.03, 0.2, 0.03]} />
        <meshStandardMaterial color="#B7BCC0" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function FixtureShowerModel({ widthM, depthM, heightM, mainColor, subColor }) {
  return (
    <group>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[widthM, 0.1, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} />
      </mesh>
      {[[-1, 0], [1, 0], [0, 1]].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx * widthM / 2, heightM / 2, sz * depthM / 2]}
          rotation={[0, sx === 0 ? 0 : Math.PI / 2, 0]}
        >
          <planeGeometry args={[sx === 0 ? widthM : depthM, heightM]} />
          <meshStandardMaterial color={subColor} transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, heightM - 0.1, -depthM * 0.4]}>
        <cylinderGeometry args={[0.1, 0.1, 0.03, 16]} />
        <meshStandardMaterial color="#B7BCC0" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function FixtureBathtubModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const wall = 0.06;
  return (
    <group>
      <mesh position={[0, heightM / 2 - 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM - 0.1, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, heightM - 0.04, 0]}>
        <boxGeometry args={[widthM - wall * 2, 0.02, depthM - wall * 2]} />
        <meshStandardMaterial color={subColor} roughness={0.3} />
      </mesh>
      <mesh position={[widthM / 2 - 0.1, heightM + 0.08, 0]}>
        <boxGeometry args={[0.04, 0.16, 0.04]} />
        <meshStandardMaterial color="#B7BCC0" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function FixtureWasherModel({ widthM, depthM, heightM, mainColor, subColor }) {
  return (
    <group>
      <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.35} />
      </mesh>
      <mesh position={[0, heightM * 0.45, depthM / 2 + 0.003]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[widthM * 0.32, widthM * 0.32, 0.02, 24]} />
        <meshStandardMaterial color={subColor} roughness={0.2} />
      </mesh>
    </group>
  );
}
