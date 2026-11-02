/** 3D models: storage. Built from Three.js primitives; origin on the floor, centered on the footprint. */

export function WardrobeModel({ widthM, depthM, heightM, mainColor, handleColor }) {
  const plinthH = 0.08;
  const numDoors = widthM > 1.4 ? 3 : 2;
  const doorW = widthM / numDoors;

  return (
    <group>
      {/* Recessed Plinth Base */}
      <mesh position={[0, plinthH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.96, plinthH, depthM * 0.96]} />
        <meshStandardMaterial color="#2B2117" roughness={0.8} />
      </mesh>

      {/* Main Cabinet Body */}
      <mesh position={[0, plinthH + (heightM - plinthH) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM - plinthH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>

      {/* Vertical Door Divider Grooves */}
      {Array.from({ length: numDoors - 1 }).map((_, idx) => {
        const gx = -widthM / 2 + (idx + 1) * doorW;
        return (
          <mesh
            key={`groove-${idx}`}
            position={[gx, plinthH + (heightM - plinthH) / 2, depthM / 2 + 0.005]}
            receiveShadow
          >
            <boxGeometry args={[0.006, heightM - plinthH, 0.005]} />
            <meshStandardMaterial color="#1C1A17" roughness={0.5} />
          </mesh>
        );
      })}

      {/* Vertical Architectural Brass Handles for each door panel */}
      {Array.from({ length: numDoors }).map((_, idx) => {
        const hx = -widthM / 2 + idx * doorW + doorW / 2;
        return (
          <mesh
            key={`handle-${idx}`}
            position={[hx, heightM * 0.5, depthM / 2 + 0.02]}
            castShadow
          >
            <boxGeometry args={[0.012, 0.32, 0.018]} />
            <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

export function BookshelfModel({ widthM, depthM, heightM, mainColor }) {
  const frameThick = 0.03;
  const numShelves = 4;
  const shelfSpacing = (heightM - frameThick * 2) / numShelves;
  const shelfW = widthM - frameThick * 2;

  return (
    <group>
      {/* Left Side */}
      <mesh position={[-widthM / 2 + frameThick / 2, heightM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, heightM, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>

      {/* Right Side */}
      <mesh position={[widthM / 2 - frameThick / 2, heightM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, heightM, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>

      {/* Back Board */}
      <mesh position={[0, heightM / 2, -depthM / 2 + 0.01]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM, 0.015]} />
        <meshStandardMaterial color="#3D2A1C" roughness={0.8} />
      </mesh>

      {/* Shelves */}
      {Array.from({ length: numShelves + 1 }).map((_, idx) => (
        <mesh
          key={idx}
          position={[0, frameThick / 2 + idx * shelfSpacing, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[shelfW, frameThick, depthM]} />
          <meshStandardMaterial color={mainColor} roughness={0.7} />
        </mesh>
      ))}

      {/* Shelf 1 Books: Terracotta & Olive Cloth Volumes */}
      <mesh position={[-shelfW * 0.22, frameThick + 0.11, 0.02]} castShadow>
        <boxGeometry args={[0.22, 0.22, depthM * 0.7]} />
        <meshStandardMaterial color="#8B2635" roughness={0.8} />
      </mesh>
      <mesh position={[-shelfW * 0.05, frameThick + 0.1, 0.02]} castShadow>
        <boxGeometry args={[0.1, 0.2, depthM * 0.68]} />
        <meshStandardMaterial color="#22485E" roughness={0.8} />
      </mesh>

      {/* Shelf 2 Books: Brass Bookends & Warm Lokta Spines */}
      <mesh position={[shelfW * 0.15, frameThick + shelfSpacing + 0.12, 0.02]} castShadow>
        <boxGeometry args={[0.28, 0.24, depthM * 0.72]} />
        <meshStandardMaterial color="#C49746" roughness={0.5} />
      </mesh>
      <mesh position={[shelfW * 0.32, frameThick + shelfSpacing + 0.08, 0.02]} castShadow>
        <boxGeometry args={[0.04, 0.16, depthM * 0.6]} />
        <meshStandardMaterial color="#1A1615" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Shelf 3: Ceramic Sculptural Vessel & Stacked Folios */}
      <mesh position={[-shelfW * 0.25, frameThick + shelfSpacing * 2 + 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.05, 0.18, 16]} />
        <meshStandardMaterial color="#ECE5D8" roughness={0.6} />
      </mesh>
      <mesh position={[0.05, frameThick + shelfSpacing * 2 + 0.04, 0.02]} castShadow>
        <boxGeometry args={[0.24, 0.08, depthM * 0.75]} />
        <meshStandardMaterial color="#4A5D52" roughness={0.85} />
      </mesh>
    </group>
  );
}

export function ChestDrawersModel({ widthM, depthM, heightM, mainColor, legColor, handleColor }) {
  const bodyH = heightM - 0.08;
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.96, 0.08, depthM * 0.96]} />
        <meshStandardMaterial color={legColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.08 + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, bodyH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {[0.28, 0.56, 0.82].map((tierY, idx) => (
        <mesh key={idx} position={[0, tierY, depthM / 2 + 0.015]} castShadow>
          <boxGeometry args={[widthM * 0.35, 0.02, 0.02]} />
          <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function SideboardModel({ widthM, depthM, heightM, mainColor, legColor, handleColor }) {
  const bodyH = heightM - 0.16;
  return (
    <group>
      {/* 4 Brass Pin Legs */}
      {[
        [-widthM / 2 + 0.1, -depthM / 2 + 0.08],
        [widthM / 2 - 0.1, -depthM / 2 + 0.08],
        [-widthM / 2 + 0.1, depthM / 2 - 0.08],
        [widthM / 2 - 0.1, depthM / 2 - 0.08],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, 0.08, lz]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.16, 12]} />
          <meshStandardMaterial color={legColor} roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      {/* Buffet Cabinet Body */}
      <mesh position={[0, 0.16 + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, bodyH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {/* Vertical Door Divider Grooves & Brass Pulls */}
      {[-widthM * 0.28, 0, widthM * 0.28].map((hx, idx) => (
        <mesh key={idx} position={[hx, 0.16 + bodyH * 0.55, depthM / 2 + 0.015]} castShadow>
          <boxGeometry args={[0.02, 0.15, 0.02]} />
          <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function VanityDresserModel({ widthM, depthM, mainColor, legColor, handleColor }) {
  const mirrorRadius = widthM * 0.32;
  const bodyH = 0.75;
  return (
    <group>
      {/* Vanity Cabinet Body */}
      <mesh position={[0, 0.15 + (bodyH - 0.15) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, bodyH - 0.15, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {/* 4 Tapered Legs */}
      {[
        [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
        [widthM / 2 - 0.08, -depthM / 2 + 0.08],
        [-widthM / 2 + 0.08, depthM / 2 - 0.08],
        [widthM / 2 - 0.08, depthM / 2 - 0.08],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, 0.075, lz]} castShadow>
          <boxGeometry args={[0.035, 0.15, 0.035]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
      {/* Drawer Handles */}
      <mesh position={[-widthM * 0.22, bodyH - 0.12, depthM / 2 + 0.015]} castShadow>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[widthM * 0.22, bodyH - 0.12, depthM / 2 + 0.015]} castShadow>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Dual Brass Mirror Mounting Support Uprights from dresser top */}
      <mesh position={[-mirrorRadius * 0.55, bodyH + mirrorRadius * 0.55, -depthM / 2 + 0.04]} castShadow>
        <cylinderGeometry args={[0.012, 0.014, mirrorRadius * 1.1, 12]} />
        <meshStandardMaterial color={handleColor} metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[mirrorRadius * 0.55, bodyH + mirrorRadius * 0.55, -depthM / 2 + 0.04]} castShadow>
        <cylinderGeometry args={[0.012, 0.014, mirrorRadius * 1.1, 12]} />
        <meshStandardMaterial color={handleColor} metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Circular Mirror Outer Brass Frame Bezel (standing upright vertically) */}
      <mesh position={[0, bodyH + mirrorRadius * 0.95, -depthM / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[mirrorRadius, mirrorRadius, 0.024, 32]} />
        <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.8} />
      </mesh>
      {/* Luminous Silver-Ice Mirror Glass facing +Z into room */}
      <mesh position={[0, bodyH + mirrorRadius * 0.95, -depthM / 2 + 0.053]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[mirrorRadius * 0.93, mirrorRadius * 0.93, 0.006, 32]} />
        <meshStandardMaterial color="#E8F4F8" roughness={0.15} metalness={0.1} />
      </mesh>
      {/* Mirror Specular Diagonal Reflection Strip */}
      <mesh position={[-mirrorRadius * 0.15, bodyH + mirrorRadius * 1.05, -depthM / 2 + 0.058]} rotation={[0, 0, -0.45]}>
        <planeGeometry args={[mirrorRadius * 0.9, 0.03]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

export function CredenzaModel({ widthM, depthM, heightM, mainColor, legColor }) {
  return (
    <group>
      {/* Credenza Cabinet Body */}
      <mesh position={[0, 0.12 + (heightM - 0.12) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM - 0.12, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>

      {/* 4 Angled Small Legs */}
      {[
        [-widthM / 2 + 0.1, -depthM / 2 + 0.08],
        [widthM / 2 - 0.1, -depthM / 2 + 0.08],
        [-widthM / 2 + 0.1, depthM / 2 - 0.08],
        [widthM / 2 - 0.1, depthM / 2 - 0.08],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, 0.06, lz]} castShadow>
          <boxGeometry args={[0.035, 0.12, 0.035]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function PantryCabinetModel({ widthM, depthM, heightM, mainColor, handleColor }) {
  return (
    <group>
      {/* Tall Cabinet Body */}
      <mesh position={[0, heightM / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.75} />
      </mesh>
      {/* Center Door Division */}
      <mesh position={[0, heightM / 2, depthM / 2 + 0.005]}>
        <boxGeometry args={[0.008, heightM * 0.94, 0.01]} />
        <meshStandardMaterial color="#1C1C1C" />
      </mesh>
      {/* Long Brass Bar Handles */}
      <mesh position={[-0.04, heightM * 0.5, depthM / 2 + 0.025]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.35, 12]} />
        <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.04, heightM * 0.5, depthM / 2 + 0.025]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.35, 12]} />
        <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

export function TvModel({ widthM, heightM, mainColor }) {
  return (
    <group>
      <mesh position={[0, heightM * 0.41, 0]} castShadow receiveShadow><boxGeometry args={[widthM, heightM * 0.82, 0.06]} /><meshStandardMaterial color={mainColor} roughness={0.3} /></mesh>
      <mesh position={[0, heightM * 0.41, 0.035]}><boxGeometry args={[widthM * 0.92, heightM * 0.7, 0.008]} /><meshStandardMaterial color="#243A4C" roughness={0.2} metalness={0.1} /></mesh>
      <mesh position={[0, 0.02, 0]} castShadow><boxGeometry args={[widthM * 0.28, 0.04, 0.16]} /><meshStandardMaterial color={mainColor} roughness={0.4} /></mesh>
    </group>
  );
}
