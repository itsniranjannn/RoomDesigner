/** 3D models: tables. Built from Three.js primitives; origin on the floor, centered on the footprint. */

export function TableModel({ widthM, depthM, mainColor, legColor }) {
  // Dining Table: tabletop + 4 distinct legs
  const topH = 0.04;
  const tableH = 0.74;
  const legThick = 0.06;

  return (
    <group>
      {/* Tabletop */}
      <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, topH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>

      {/* 4 Legs at corners */}
      {[
        [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
        [widthM / 2 - 0.08, -depthM / 2 + 0.08],
        [-widthM / 2 + 0.08, depthM / 2 - 0.08],
        [widthM / 2 - 0.08, depthM / 2 - 0.08],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, (tableH - topH) / 2, lz]} castShadow receiveShadow>
          <boxGeometry args={[legThick, tableH - topH, legThick]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function TableRoundModel({ widthM, depthM, mainColor, legColor }) {
  const radius = Math.min(widthM, depthM) / 2;
  const topH = 0.04;
  const tableH = 0.74;
  return (
    <group>
      <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, topH, 32]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>
      <mesh position={[0, (tableH - topH) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.16, tableH - topH, 16]} />
        <meshStandardMaterial color={legColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 0.65, radius * 0.7, 0.03, 32]} />
        <meshStandardMaterial color={legColor} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function CoffeeTableModel({ widthM, depthM, mainColor, legColor }) {
  const topH = 0.035;
  const tableH = 0.42;

  return (
    <group>
      {/* Stone / Wood Top */}
      <mesh position={[0, tableH - topH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, topH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.6} />
      </mesh>

      {/* 4 Wooden Legs */}
      {[
        [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
        [widthM / 2 - 0.08, -depthM / 2 + 0.08],
        [-widthM / 2 + 0.08, depthM / 2 - 0.08],
        [widthM / 2 - 0.08, depthM / 2 - 0.08],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, (tableH - topH) / 2, lz]} castShadow receiveShadow>
          <boxGeometry args={[0.045, tableH - topH, 0.045]} />
          <meshStandardMaterial color={legColor} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function SideTableModel({ widthM, depthM, heightM, mainColor, legColor }) {
  const radius = Math.min(widthM, depthM) / 2;
  return (
    <group>
      {/* Fluted Pedestal Column Base */}
      <mesh position={[0, (heightM - 0.03) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.45, radius * 0.65, heightM - 0.03, 24]} />
        <meshStandardMaterial color={legColor} roughness={0.6} />
      </mesh>
      {/* Travertine Stone Tabletop */}
      <mesh position={[0, heightM - 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.03, 32]} />
        <meshStandardMaterial color={mainColor} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function DeskModel({ widthM, depthM, mainColor, legColor }) {
  const topH = 0.04;
  const deskH = 0.74;
  const pedestalW = widthM * 0.28;

  return (
    <group>
      {/* Desktop */}
      <mesh position={[0, deskH - topH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, topH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>

      {/* Desk Pad */}
      <mesh position={[-0.05, deskH + 0.002, 0.05]} receiveShadow>
        <boxGeometry args={[widthM * 0.48, 0.004, depthM * 0.52]} />
        <meshStandardMaterial color="#323639" roughness={0.8} />
      </mesh>

      {/* Right Drawer Pedestal Unit */}
      <mesh
        position={[widthM / 2 - pedestalW / 2 - 0.02, (deskH - topH) / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[pedestalW, deskH - topH, depthM * 0.92]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {/* Drawer Brass Handle */}
      <mesh
        position={[widthM / 2 - pedestalW / 2 - 0.02, deskH * 0.55, depthM * 0.46 + 0.01]}
        castShadow
      >
        <boxGeometry args={[0.1, 0.016, 0.02]} />
        <meshStandardMaterial color="#C49746" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Left Hollow Architectural Steel Sled Loop Frame (Front leg, back leg, floor runner, top rail) */}
      <group position={[-widthM / 2 + 0.06, 0, 0]}>
        {/* Front Leg */}
        <mesh position={[0, (deskH - topH) / 2, depthM * 0.42]} castShadow>
          <boxGeometry args={[0.035, deskH - topH, 0.035]} />
          <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Back Leg */}
        <mesh position={[0, (deskH - topH) / 2, -depthM * 0.42]} castShadow>
          <boxGeometry args={[0.035, deskH - topH, 0.035]} />
          <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Floor Runner */}
        <mesh position={[0, 0.018, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.035, 0.035, depthM * 0.86]} />
          <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

export function NightstandModel({ widthM, depthM, mainColor, legColor }) {
  const bodyH = 0.44;

  return (
    <group>
      {/* Cabinet Body */}
      <mesh position={[0, 0.08 + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, bodyH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>

      {/* Brass Knob */}
      <mesh position={[0, 0.08 + bodyH / 2, depthM / 2 + 0.015]} castShadow>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* 4 Small Legs */}
      {[
        [-widthM / 2 + 0.04, -depthM / 2 + 0.04],
        [widthM / 2 - 0.04, -depthM / 2 + 0.04],
        [-widthM / 2 + 0.04, depthM / 2 - 0.04],
        [widthM / 2 - 0.04, depthM / 2 - 0.04],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, 0.04, lz]} castShadow>
          <boxGeometry args={[0.03, 0.08, 0.03]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
