/** 3D models: nepali. Built from Three.js primitives; origin on the floor, centered on the footprint. */

export function NepaliChowkiModel({ widthM, depthM, heightM, mainColor, accentColor }) {
  return (
    <group>
      <mesh position={[0, heightM - 0.05, 0]} castShadow receiveShadow><boxGeometry args={[widthM, 0.1, depthM]} /><meshStandardMaterial color={mainColor} roughness={0.65} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => <mesh key={i} position={[x * (widthM / 2 - 0.07), (heightM - 0.1) / 2, z * (depthM / 2 - 0.07)]} castShadow><boxGeometry args={[0.07, heightM - 0.1, 0.07]} /><meshStandardMaterial color={mainColor} roughness={0.7} /></mesh>)}
      <mesh position={[0, heightM + 0.003, 0]} receiveShadow><boxGeometry args={[widthM * 0.72, 0.015, depthM * 0.58]} /><meshStandardMaterial color={accentColor} roughness={0.55} /></mesh>
    </group>
  );
}

export function NepaliPatukaChestModel({ widthM, depthM, heightM, mainColor, accentColor, subColor }) {
  const lidH = 0.04;
  const bodyH = heightM - lidH;
  return (
    <group>
      <mesh position={[0, bodyH / 2, 0]} castShadow receiveShadow><boxGeometry args={[widthM, bodyH, depthM]} /><meshStandardMaterial color={mainColor} roughness={0.7} /></mesh>
      <mesh position={[0, bodyH + lidH / 2, 0]} castShadow><boxGeometry args={[widthM, lidH, depthM]} /><meshStandardMaterial color={subColor} roughness={0.65} /></mesh>
      <mesh position={[0, bodyH * 0.55, depthM / 2 + 0.003]} castShadow><boxGeometry args={[0.025, bodyH * 0.5, 0.008]} /><meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, bodyH * 0.53, depthM / 2 + 0.008]} castShadow><sphereGeometry args={[0.03, 12, 8]} /><meshStandardMaterial color={accentColor} metalness={0.65} roughness={0.3} /></mesh>
    </group>
  );
}

export function NepaliBrassDiyaModel({ widthM, heightM, mainColor, accentColor }) {
  return (
    <group>
      <mesh position={[0, 0.035, 0]} castShadow><cylinderGeometry args={[widthM * 0.42, widthM * 0.5, 0.07, 24]} /><meshStandardMaterial color={mainColor} metalness={0.8} roughness={0.28} /></mesh>
      <mesh position={[0, 0.1, 0]} castShadow><cylinderGeometry args={[widthM * 0.12, widthM * 0.18, heightM * 0.45, 16]} /><meshStandardMaterial color={mainColor} metalness={0.8} roughness={0.28} /></mesh>
      <mesh position={[0, heightM * 0.35, 0]} castShadow><sphereGeometry args={[widthM * 0.2, 16, 8]} /><meshStandardMaterial color={mainColor} metalness={0.85} roughness={0.25} /></mesh>
      <mesh position={[0.02, heightM * 0.62, 0]} castShadow><coneGeometry args={[0.05, 0.12, 12]} /><meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.4} /></mesh>
    </group>
  );
}

export function NepaliPirkaModel({ widthM, depthM, heightM, mainColor }) {
  // Traditional low Sal wood stool with carved plank top & twin angled cleats
  const plankH = 0.035;
  const cleatH = heightM - plankH;
  return (
    <group>
      {/* Top Solid Plank */}
      <mesh position={[0, heightM - plankH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, plankH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.65} />
      </mesh>
      {/* Left Cleat Runner */}
      <mesh position={[-widthM / 2 + 0.06, cleatH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, cleatH, depthM - 0.04]} />
        <meshStandardMaterial color="#422517" roughness={0.7} />
      </mesh>
      {/* Right Cleat Runner */}
      <mesh position={[widthM / 2 - 0.06, cleatH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, cleatH, depthM - 0.04]} />
        <meshStandardMaterial color="#422517" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function NepaliCharpaiModel({ widthM, depthM, heightM, mainColor, fabricColor, cushionColor }) {
  // Handwoven Khat / Charpai daybed with turned wooden corner posts & woven rope webbing
  const legR = 0.04;
  const frameTop = heightM - 0.04;
  const frameThick = 0.06;
  const bolsterR = 0.06;
  const rails = [
    [0, -depthM / 2 + 0.03, widthM - 0.08, 0.05],
    [0, depthM / 2 - 0.03, widthM - 0.08, 0.05],
    [-widthM / 2 + 0.03, 0, 0.05, depthM - 0.08],
    [widthM / 2 - 0.03, 0, 0.05, depthM - 0.08],
  ];
  return (
    <group>
      {/* 4 turned corner timber legs */}
      {[
        [-widthM / 2 + legR, -depthM / 2 + legR],
        [widthM / 2 - legR, -depthM / 2 + legR],
        [-widthM / 2 + legR, depthM / 2 - legR],
        [widthM / 2 - legR, depthM / 2 - legR],
      ].map(([lx, lz], idx) => (
        <mesh key={idx} position={[lx, frameTop / 2, lz]} castShadow receiveShadow>
          <cylinderGeometry args={[legR, legR * 1.1, frameTop, 16]} />
          <meshStandardMaterial color={mainColor} roughness={0.75} />
        </mesh>
      ))}
      {/* Side rails */}
      {rails.map(([rx, rz, rw, rd], idx) => (
        <mesh key={idx} position={[rx, frameTop - frameThick / 2, rz]} castShadow>
          <boxGeometry args={[rw, frameThick, rd]} />
          <meshStandardMaterial color={mainColor} roughness={0.7} />
        </mesh>
      ))}
      {/* Woven jute rope webbing */}
      <mesh position={[0, frameTop - 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM - 0.12, 0.02, depthM - 0.12]} />
        <meshStandardMaterial color={fabricColor} roughness={0.9} />
      </mesh>
      {/* Cylindrical bolster at the headrest */}
      <mesh position={[-widthM / 2 + 0.2, frameTop - 0.01 + bolsterR, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[bolsterR, bolsterR, depthM - 0.16, 16]} />
        <meshStandardMaterial color={cushionColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function NepaliGaddaModel({ widthM, depthM, heightM, mainColor, cushionColor }) {
  // Floor mattress seating with twin cylindrical takiya bolsters
  const matH = heightM * 0.38;
  const bolsterR = (heightM - matH) / 2;
  return (
    <group>
      <mesh position={[0, matH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, matH, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.85} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (widthM / 2 - bolsterR - 0.04), matH + bolsterR, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[bolsterR, bolsterR, depthM - 0.1, 16]} />
          <meshStandardMaterial color={cushionColor} roughness={0.8} />
        </mesh>
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
            {idx < 2 && [0.35, 0.85, 1.45].map((hy, hi) => (
              <mesh key={`hinge-${hi}`} position={[panelW / 2, hy, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 0.04, 12]} />
                <meshStandardMaterial color={accentColor} metalness={0.85} roughness={0.25} />
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
      <mesh position={[-widthM * 0.2, baseH / 2, depthM / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
        <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[widthM * 0.2, baseH / 2, depthM / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
        <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
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

      {/* Lower Tier Pagoda Roof Eave (Flared outward) */}
      <mesh position={[0, baseH + columnH + tier1H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, tier1H, depthM]} />
        <meshStandardMaterial color="#30180D" roughness={0.65} />
      </mesh>
      {/* Flared Eave Cornice Molding */}
      <mesh position={[0, baseH + columnH + tier1H, 0]} castShadow>
        <boxGeometry args={[widthM, 0.02, depthM]} />
        <meshStandardMaterial color={accentColor} metalness={0.75} roughness={0.3} />
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
          <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Sacred Kalasha Spherical Urn */}
        <mesh position={[0, 0.055, 0]} castShadow>
          <sphereGeometry args={[0.038, 16, 16]} />
          <meshStandardMaterial color={accentColor} metalness={0.92} roughness={0.18} />
        </mesh>
        {/* Pointed Spire Cone (Gajur Tip) */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <coneGeometry args={[0.024, 0.11, 16]} />
          <meshStandardMaterial color={accentColor} metalness={0.94} roughness={0.15} />
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
          <mesh key={idx} position={[lx, standH / 2, lz]} rotation={[0.08 * Math.sin(rad), 0, -0.08 * Math.cos(rad)]} castShadow>
            <cylinderGeometry args={[0.02, 0.025, standH, 12]} />
            <meshStandardMaterial color={mainColor} roughness={0.7} />
          </mesh>
        );
      })}
      {/* Polished Brass Karuwa Vessel Body */}
      <mesh position={[0, standH + 0.1, 0]} castShadow>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Karuwa Neck & Fluted Rim */}
      <mesh position={[0, standH + 0.21, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.025, 0.08, 16]} />
        <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Karuwa Curved Spout */}
      <mesh position={[0.07, standH + 0.15, 0]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.12, 12]} />
        <meshStandardMaterial color={accentColor} metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}
