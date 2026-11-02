/** 3D models: seating. Built from Three.js primitives; origin on the floor, centered on the footprint. */

export function SofaModel({ widthM, depthM, mainColor, cushionColor, legColor }) {
  const armW = widthM * 0.12;
  const seatH = 0.42;
  const backH = 0.78;
  const backThick = depthM * 0.25;

  return (
    <group>
      {/* Seat Base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, 0.18, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.8} />
      </mesh>

      {/* Plush Seat Cushions */}
      <mesh position={[0, seatH, backThick / 2]} castShadow receiveShadow>
        <boxGeometry args={[widthM - armW * 2, 0.14, depthM - backThick]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>

      {/* Backrest along -Z */}
      <mesh
        position={[0, backH / 2 + 0.1, -depthM / 2 + backThick / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM, backH - 0.1, backThick]} />
        <meshStandardMaterial color={mainColor} roughness={0.8} />
      </mesh>

      {/* Left Armrest */}
      <mesh position={[-widthM / 2 + armW / 2, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[armW, 0.42, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.8} />
      </mesh>

      {/* Right Armrest */}
      <mesh position={[widthM / 2 - armW / 2, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[armW, 0.42, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.8} />
      </mesh>

      {/* 4 Wooden / Steel Feet */}
      {[
        [-widthM / 2 + 0.06, -depthM / 2 + 0.06],
        [widthM / 2 - 0.06, -depthM / 2 + 0.06],
        [-widthM / 2 + 0.06, depthM / 2 - 0.06],
        [widthM / 2 - 0.06, depthM / 2 - 0.06],
      ].map(([fx, fz], idx) => (
        <mesh key={idx} position={[fx, 0.05, fz]} castShadow>
          <boxGeometry args={[0.05, 0.1, 0.05]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function ArmchairModel({ widthM, depthM, mainColor, cushionColor, legColor }) {
  const armW = widthM * 0.18;
  const backThick = depthM * 0.28;

  return (
    <group>
      {/* Seat Base */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, 0.16, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>

      {/* Seat Cushion */}
      <mesh position={[0, 0.36, backThick / 2]} castShadow receiveShadow>
        <boxGeometry args={[widthM - armW * 2, 0.14, depthM - backThick]} />
        <meshStandardMaterial color={cushionColor} roughness={0.7} />
      </mesh>

      {/* Backrest */}
      <mesh position={[0, 0.48, -depthM / 2 + backThick / 2]} castShadow receiveShadow>
        <boxGeometry args={[widthM, 0.52, backThick]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>

      {/* Left & Right Armrests */}
      <mesh position={[-widthM / 2 + armW / 2, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[armW, 0.38, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>
      <mesh position={[widthM / 2 - armW / 2, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[armW, 0.38, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>

      {/* 4 Tapered Feet */}
      {[
        [-widthM / 2 + 0.08, -depthM / 2 + 0.08],
        [widthM / 2 - 0.08, -depthM / 2 + 0.08],
        [-widthM / 2 + 0.08, depthM / 2 - 0.08],
        [widthM / 2 - 0.08, depthM / 2 - 0.08],
      ].map(([fx, fz], idx) => (
        <mesh key={idx} position={[fx, 0.07, fz]} castShadow>
          <boxGeometry args={[0.04, 0.14, 0.04]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function ChairModel({ widthM, depthM, mainColor, cushionColor, legColor }) {
  const seatH = 0.45;
  const totalH = 0.82;
  const legThick = 0.032;

  return (
    <group>
      {/* Cane / Leather Woven Seat Cushion */}
      <mesh position={[0, seatH, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, 0.045, depthM]} />
        <meshStandardMaterial color={cushionColor} roughness={0.7} />
      </mesh>

      {/* Solid Timber Backrest Top Rail */}
      <mesh
        position={[0, seatH + (totalH - seatH) * 0.75, -depthM / 2 + 0.02]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[widthM * 0.92, (totalH - seatH) * 0.45, 0.025]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>

      {/* Vertical Backrest Support Spindles connecting seat to back rail */}
      {[-widthM * 0.32, -widthM * 0.16, 0, widthM * 0.16, widthM * 0.32].map((sx, idx) => (
        <mesh
          key={idx}
          position={[sx, seatH + (totalH - seatH) * 0.4, -depthM / 2 + 0.02]}
          castShadow
        >
          <cylinderGeometry args={[0.008, 0.008, (totalH - seatH) * 0.75, 10]} />
          <meshStandardMaterial color={mainColor} roughness={0.65} />
        </mesh>
      ))}

      {/* 4 Solid Grounded Chair Legs */}
      {[
        [-widthM / 2 + 0.045, -depthM / 2 + 0.045],
        [widthM / 2 - 0.045, -depthM / 2 + 0.045],
        [-widthM / 2 + 0.045, depthM / 2 - 0.045],
        [widthM / 2 - 0.045, depthM / 2 - 0.045],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, (seatH - 0.022) / 2, lz]} castShadow>
          <cylinderGeometry args={[legThick * 0.45, legThick * 0.55, seatH - 0.022, 12]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export function DeskChairModel({ widthM, depthM, mainColor, cushionColor, legColor }) {
  const seatH = 0.48;
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.03, 5]} />
        <meshStandardMaterial color={legColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, seatH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, seatH - 0.06, 12]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, seatH, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.75, 0.06, depthM * 0.75]} />
        <meshStandardMaterial color={cushionColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, seatH + 0.25, -depthM * 0.32]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.7, 0.45, 0.03]} />
        <meshStandardMaterial color={mainColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function BarStoolModel({ widthM, depthM, mainColor, cushionColor, legColor }) {
  const seatR = Math.min(widthM, depthM) / 2;
  const seatH = 0.68;
  return (
    <group>
      {/* 4 Tall Slender Stool Legs */}
      {[
        [-seatR * 0.65, -seatR * 0.65],
        [seatR * 0.65, -seatR * 0.65],
        [-seatR * 0.65, seatR * 0.65],
        [seatR * 0.65, seatR * 0.65],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, seatH / 2, lz]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, seatH, 12]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}
      {/* Circular Footrest Ring */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <torusGeometry args={[seatR * 0.75, 0.015, 12, 24]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color={legColor} roughness={0.5} />
      </mesh>
      {/* Round Leather Seat Pad */}
      <mesh position={[0, seatH, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[seatR, seatR, 0.06, 24]} />
        <meshStandardMaterial color={cushionColor} roughness={0.7} />
      </mesh>
      {/* Low Curved Backrest Rim */}
      <mesh position={[0, seatH + 0.14, -seatR * 0.65]} castShadow>
        <boxGeometry args={[seatR * 1.2, 0.08, 0.025]} />
        <meshStandardMaterial color={mainColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function OttomanModel({ widthM, depthM, heightM, cushionColor, legColor }) {
  return (
    <group>
      {/* Recessed Plinth Base */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM * 0.92, 0.08, depthM * 0.92]} />
        <meshStandardMaterial color={legColor} roughness={0.8} />
      </mesh>
      {/* Plush Tufted Cushion Body */}
      <mesh position={[0, 0.08 + (heightM - 0.08) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM - 0.08, depthM]} />
        <meshStandardMaterial color={cushionColor} roughness={0.85} />
      </mesh>
      {/* Surface Tufting Buttons */}
      {[-widthM * 0.25, widthM * 0.25].map((bx, idx) => (
        <mesh key={idx} position={[bx, heightM + 0.005, 0]}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshStandardMaterial color={legColor} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
