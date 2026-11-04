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
          <mesh key={`handle-${idx}`} position={[hx, heightM * 0.5, depthM / 2 + 0.02]} castShadow>
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
  const plinthH = 0.07;
  const bodyH = heightM - plinthH;
  const drawers = heightM > 0.9 ? 4 : 3;
  const frontH = (bodyH - 0.04) / drawers;
  return (
    <group>
      <mesh position={[0, plinthH / 2, -0.01]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.96, plinthH, depthM * 0.94]} />
        <meshStandardMaterial color={legColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, plinthH + bodyH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, bodyH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {Array.from({ length: drawers }).map((_, idx) => {
        const y = plinthH + 0.02 + frontH * (idx + 0.5);
        return (
          <group key={idx}>
            <mesh position={[0, y, depthM / 2 + 0.004]} receiveShadow>
              <boxGeometry args={[widthM - 0.04, frontH - 0.012, 0.008]} />
              <meshStandardMaterial color={mainColor} roughness={0.55} />
            </mesh>
            <mesh position={[0, y, depthM / 2 + 0.018]} castShadow>
              <boxGeometry args={[widthM * 0.3, 0.016, 0.02]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        );
      })}
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

export function VanityDresserModel({ widthM, depthM, heightM, mainColor, legColor, handleColor }) {
  const legH = 0.14;
  const bodyH = heightM * 0.55;
  const mirrorR = Math.min(widthM * 0.33, (heightM - bodyH - 0.04) / 2);
  const mirrorY = bodyH + 0.03 + mirrorR;
  const mirrorZ = -depthM / 2 + 0.05;
  const rowH = (bodyH - legH - 0.04) / 2;
  return (
    <group>
      <mesh position={[0, legH + (bodyH - legH) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, bodyH - legH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx * (widthM / 2 - 0.06), legH / 2, sz * (depthM / 2 - 0.06)]}
          castShadow
        >
          <boxGeometry args={[0.04, legH, 0.04]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
      {/* Two rows of drawers: a pair on top, one wide below */}
      {[0, 1].map((row) => {
        const y = legH + 0.03 + rowH * (row + 0.5);
        const fronts = row === 1 ? [0] : [-0.25, 0.25];
        return fronts.map((fx) => (
          <group key={`${row}${fx}`}>
            <mesh position={[widthM * fx, y, depthM / 2 + 0.002]}>
              <boxGeometry
                args={[row === 1 ? widthM - 0.05 : widthM * 0.47, rowH - 0.012, 0.006]}
              />
              <meshStandardMaterial color={mainColor} roughness={0.55} />
            </mesh>
            <mesh position={[widthM * fx, y, depthM / 2 + 0.014]} castShadow>
              <boxGeometry args={[0.1, 0.016, 0.018]} />
              <meshStandardMaterial color={handleColor} roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        ));
      })}
      {/* Round mirror in a brass bezel, held by two uprights */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * mirrorR * 0.5, bodyH + (mirrorY - bodyH) / 2, mirrorZ]}
          castShadow
        >
          <cylinderGeometry args={[0.012, 0.012, mirrorY - bodyH, 10]} />
          <meshStandardMaterial color={handleColor} metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, mirrorY, mirrorZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[mirrorR, mirrorR, 0.024, 36]} />
        <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0, mirrorY, mirrorZ + 0.013]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[mirrorR * 0.92, mirrorR * 0.92, 0.004, 36]} />
        <meshStandardMaterial color="#DCEBF0" roughness={0.1} metalness={0.35} />
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

export function TvModel({ widthM, depthM, heightM, mainColor }) {
  const footH = 0.025;
  const panelT = Math.min(0.035, depthM * 0.6);
  const panelY = 0.075;
  const panelH = heightM - panelY;
  const panelZ = -depthM / 2 + panelT / 2 + 0.01;
  return (
    <group>
      {/* Slim bezel panel with the screen set into its front face */}
      <mesh position={[0, panelY + panelH / 2, panelZ]} castShadow receiveShadow>
        <boxGeometry args={[widthM, panelH, panelT]} />
        <meshStandardMaterial color={mainColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, panelY + panelH / 2, panelZ + panelT / 2 + 0.001]}>
        <boxGeometry args={[widthM * 0.95, panelH * 0.92, 0.002]} />
        <meshStandardMaterial color="#1B2D3C" roughness={0.12} metalness={0.2} />
      </mesh>
      <mesh
        position={[-widthM * 0.14, panelY + panelH * 0.58, panelZ + panelT / 2 + 0.003]}
        rotation={[0, 0, -0.5]}
      >
        <planeGeometry args={[widthM * 0.5, 0.03]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.1} />
      </mesh>
      {/* Neck and table-top foot */}
      <mesh position={[0, panelY / 2 + 0.01, panelZ]} castShadow>
        <boxGeometry args={[widthM * 0.05, panelY, 0.03]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, footH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.3, footH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} />
      </mesh>
    </group>
  );
}
