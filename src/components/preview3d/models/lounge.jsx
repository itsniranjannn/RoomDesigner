import { Box } from './shared.jsx';

/** 3D models: lounge seating. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function SofaLModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  const mainD = depthM * 0.55;
  const chaiseW = widthM * 0.34;
  const armW = Math.min(widthM, depthM) * 0.09;
  const backThick = mainD * 0.27;
  const seatY = 0.4;
  const mainZ = -depthM / 2 + mainD / 2;
  const chaiseD = depthM - mainD;
  const chaiseZ = -depthM / 2 + mainD + chaiseD / 2;
  const chaiseX = widthM / 2 - chaiseW / 2;
  const seatsW = widthM - chaiseW - armW;
  return (
    <group>
      {/* Base of the main run and the chaise */}
      <Box position={[0, 0.2, mainZ]} size={[widthM, 0.18, mainD]} color={mainColor} />
      <Box position={[chaiseX, 0.2, chaiseZ]} size={[chaiseW, 0.18, chaiseD]} color={mainColor} />
      {/* Seat cushions */}
      <Box position={[-widthM / 2 + armW + seatsW / 2, seatY, mainZ + backThick / 2]} size={[seatsW, 0.14, mainD - backThick]} color={cushionColor} roughness={0.85} />
      <Box position={[chaiseX - armW / 2, seatY, -depthM / 2 + backThick + (depthM - backThick) / 2]} size={[chaiseW - armW, 0.14, depthM - backThick]} color={cushionColor} roughness={0.85} />
      {/* Backrest along the back edge */}
      <Box position={[0, heightM / 2 + 0.05, -depthM / 2 + backThick / 2]} size={[widthM, heightM - 0.1, backThick]} color={mainColor} />
      {/* Left arm and the long right arm along the chaise */}
      <Box position={[-widthM / 2 + armW / 2, 0.34, mainZ]} size={[armW, 0.42, mainD]} color={mainColor} />
      <Box position={[widthM / 2 - armW / 2, 0.34, 0]} size={[armW, 0.42, depthM]} color={mainColor} />
      {/* Feet */}
      {[
        [-widthM / 2 + 0.06, -depthM / 2 + 0.06],
        [widthM / 2 - 0.06, -depthM / 2 + 0.06],
        [-widthM / 2 + 0.06, -depthM / 2 + mainD - 0.06],
        [widthM / 2 - chaiseW + 0.06, -depthM / 2 + mainD - 0.06],
        [widthM / 2 - chaiseW + 0.06, depthM / 2 - 0.06],
        [widthM / 2 - 0.06, depthM / 2 - 0.06],
      ].map(([fx, fz], idx) => (
        <Box key={idx} position={[fx, 0.05, fz]} size={[0.05, 0.1, 0.05]} color={legColor} roughness={0.5} />
      ))}
    </group>
  );
}

export function BeanBagModel({ widthM, depthM, heightM, mainColor, cushionColor }) {
  return (
    <group>
      {/* Squashed, slumped body */}
      <mesh position={[0, heightM * 0.46, 0]} scale={[widthM / 2, heightM * 0.46, depthM / 2]} castShadow receiveShadow>
        <sphereGeometry args={[1, 28, 20]} />
        <meshStandardMaterial color={mainColor} roughness={0.9} />
      </mesh>
      {/* Seat dimple and back lump */}
      <mesh position={[0, heightM * 0.7, depthM * 0.08]} scale={[widthM * 0.3, heightM * 0.2, depthM * 0.3]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={cushionColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, heightM * 0.62, -depthM * 0.28]} scale={[widthM * 0.34, heightM * 0.36, depthM * 0.2]} castShadow>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={mainColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

export function BenchModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const seatT = 0.04;
  const slats = Math.max(2, Math.round(depthM / 0.14));
  const slatD = depthM / slats;
  return (
    <group>
      {/* Seat slats with small gaps */}
      {Array.from({ length: slats }).map((_, idx) => (
        <Box key={idx} position={[0, heightM - seatT / 2, -depthM / 2 + slatD * (idx + 0.5)]} size={[widthM, seatT, slatD - 0.012]} color={mainColor} roughness={0.7} />
      ))}
      {/* End frames and a stretcher between them */}
      {[-1, 1].map((s) => (
        <Box key={s} position={[s * (widthM / 2 - 0.05), (heightM - seatT) / 2, 0]} size={[0.05, heightM - seatT, depthM * 0.85]} color={subColor} roughness={0.7} />
      ))}
      <Box position={[0, heightM * 0.3, 0]} size={[widthM - 0.1, 0.04, 0.04]} color={legColor} roughness={0.7} />
    </group>
  );
}
