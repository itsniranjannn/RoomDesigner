/** 3D models: kitchen. Built from Three.js primitives; origin on the floor, centered on the footprint. */

export function KitchenIslandModel({ def, widthM, depthM, mainColor }) {
  return (
    <group>
      <mesh position={[0, 0.44, -depthM * 0.05]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.94, 0.88, depthM * 0.78]} />
        <meshStandardMaterial color={def.subColor || '#4E5F55'} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, 0.05, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
}

export function KitchenCounterModel({ def, widthM, depthM, heightM, mainColor }) {
  const topThick = 0.04;
  const bodyH = heightM - topThick;
  return (
    <group>
      {/* Base Cabinet Plinth & Body */}
      <mesh position={[0, bodyH / 2, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[widthM, bodyH, depthM - 0.04]} />
        <meshStandardMaterial color={def.subColor || '#38423B'} roughness={0.8} />
      </mesh>
      {/* Quartz Countertop Slab */}
      <mesh position={[0, heightM - topThick / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, topThick, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} />
      </mesh>
      {/* Inset Stainless Double Basin Sink */}
      <mesh position={[-widthM * 0.22, heightM + 0.005, 0]} castShadow>
        <boxGeometry args={[widthM * 0.44, 0.015, depthM * 0.65]} />
        <meshStandardMaterial color="#9AA3AA" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[-widthM * 0.32, heightM + 0.006, 0]}>
        <boxGeometry args={[widthM * 0.18, 0.016, depthM * 0.55]} />
        <meshStandardMaterial color="#6E767C" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[-widthM * 0.12, heightM + 0.006, 0]}>
        <boxGeometry args={[widthM * 0.18, 0.016, depthM * 0.55]} />
        <meshStandardMaterial color="#6E767C" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Gooseneck Chrome Faucet */}
      <mesh position={[-widthM * 0.22, heightM + 0.14, -depthM * 0.24]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.28, 12]} />
        <meshStandardMaterial color="#CCCCCC" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  );
}

export function KitchenStoveModel({ def, widthM, depthM, heightM }) {
  return (
    <group>
      {/* Stainless Oven Body */}
      <mesh position={[0, heightM / 2 - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM - 0.06, depthM]} />
        <meshStandardMaterial color={def.subColor || '#52575C'} roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Black Oven Glass Door Front */}
      <mesh position={[0, heightM * 0.42, depthM / 2 + 0.005]}>
        <boxGeometry args={[widthM * 0.82, heightM * 0.55, 0.01]} />
        <meshStandardMaterial color="#111111" roughness={0.1} />
      </mesh>
      {/* Oven Handle */}
      <mesh position={[0, heightM * 0.68, depthM / 2 + 0.03]} castShadow>
        <boxGeometry args={[widthM * 0.7, 0.02, 0.03]} />
        <meshStandardMaterial color="#E0E0E0" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Cooktop Surface Grate Plate */}
      <mesh position={[0, heightM - 0.015, 0]} castShadow>
        <boxGeometry args={[widthM, 0.03, depthM]} />
        <meshStandardMaterial color="#1C1C1C" roughness={0.8} />
      </mesh>
      {/* 4 Cast-iron Burners */}
      {[
        [-widthM * 0.26, -depthM * 0.24],
        [widthM * 0.26, -depthM * 0.24],
        [-widthM * 0.26, depthM * 0.24],
        [widthM * 0.26, depthM * 0.24],
      ].map(([bx, bz], idx) => (
        <mesh key={idx} position={[bx, heightM + 0.01, bz]} castShadow>
          <cylinderGeometry args={[0.075, 0.085, 0.02, 16]} />
          <meshStandardMaterial color="#111111" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function KitchenFridgeModel({ widthM, depthM, heightM, mainColor }) {
  return (
    <group>
      {/* Stainless Fridge Cabinet */}
      <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* French Door Seam */}
      <mesh position={[0, heightM * 0.62, depthM / 2 + 0.005]}>
        <boxGeometry args={[0.008, heightM * 0.68, 0.01]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Lower Freezer Drawer Seam */}
      <mesh position={[0, heightM * 0.28, depthM / 2 + 0.005]}>
        <boxGeometry args={[widthM * 0.94, 0.008, 0.01]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      {/* Handles */}
      <mesh position={[-0.04, heightM * 0.6, depthM / 2 + 0.025]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.65, 12]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.04, heightM * 0.6, depthM / 2 + 0.025]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.65, 12]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, heightM * 0.25, depthM / 2 + 0.025]} castShadow>
        <boxGeometry args={[widthM * 0.6, 0.02, 0.03]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

export function DiningNookModel({ widthM, depthM, mainColor, cushionColor }) {
  const benchH = 0.45;
  const seatD = 0.42;
  return (
    <group>
      {/* L-Bench Plinth Base & Cushion */}
      <mesh position={[0, benchH / 2, -depthM / 2 + seatD / 2]} castShadow receiveShadow>
        <boxGeometry args={[widthM, benchH, seatD]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>
      <mesh position={[-widthM / 2 + seatD / 2, benchH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[seatD, benchH, depthM]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>
      {/* Backrest along walls */}
      <mesh position={[0, benchH + 0.2, -depthM / 2 + 0.04]} castShadow>
        <boxGeometry args={[widthM, 0.38, 0.08]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      <mesh position={[-widthM / 2 + 0.04, benchH + 0.2, 0]} castShadow>
        <boxGeometry args={[0.08, 0.38, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
    </group>
  );
}
