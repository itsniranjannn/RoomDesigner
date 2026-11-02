/** 3D models: tables. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import { Box, Cyl, corners } from './shared.jsx';

/** Rectangular top with four legs and an optional apron frame under it. */
function LeggedTable({ widthM, depthM, heightM, topH, topColor, apronColor, legColor, legThick, inset, roughness = 0.6, apron = true }) {
  const legH = heightM - topH;
  const apronH = Math.min(0.08, legH * 0.18);
  const lx = widthM / 2 - inset - legThick / 2;
  const lz = depthM / 2 - inset - legThick / 2;
  return (
    <group>
      <Box position={[0, heightM - topH / 2, 0]} size={[widthM, topH, depthM]} color={topColor} roughness={roughness} />
      {corners(widthM, depthM, inset + legThick / 2).map(([x, z], i) => (
        <Box key={i} position={[x, legH / 2, z]} size={[legThick, legH, legThick]} color={legColor} roughness={0.5} />
      ))}
      {apron && (
        <>
          {[-1, 1].map((s) => (
            <Box key={`a${s}`} position={[0, legH - apronH / 2, s * lz]} size={[lx * 2 - legThick, apronH, 0.02]} color={apronColor} roughness={0.7} />
          ))}
          {[-1, 1].map((s) => (
            <Box key={`b${s}`} position={[s * lx, legH - apronH / 2, 0]} size={[0.02, apronH, lz * 2 - legThick]} color={apronColor} roughness={0.7} />
          ))}
        </>
      )}
    </group>
  );
}

export function TableModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  return (
    <LeggedTable
      widthM={widthM}
      depthM={depthM}
      heightM={heightM}
      topH={0.035}
      topColor={mainColor}
      apronColor={subColor}
      legColor={legColor}
      legThick={0.06}
      inset={0.07}
    />
  );
}

export function TableRoundModel({ widthM, depthM, heightM, mainColor, legColor }) {
  const radius = Math.min(widthM, depthM) / 2;
  const topH = 0.04;
  return (
    <group>
      <Cyl position={[0, heightM - topH / 2, 0]} radiusTop={radius} height={topH} color={mainColor} roughness={0.6} segments={48} />
      <Cyl position={[0, (heightM - topH) / 2, 0]} radiusTop={0.06} radiusBottom={0.09} height={heightM - topH} color={legColor} roughness={0.5} segments={20} />
      <Cyl position={[0, 0.015, 0]} radiusTop={radius * 0.38} radiusBottom={radius * 0.42} height={0.03} color={legColor} roughness={0.5} segments={32} />
      <Cyl position={[0, heightM - topH - 0.02, 0]} radiusTop={0.12} radiusBottom={0.07} height={0.04} color={legColor} roughness={0.5} segments={20} />
    </group>
  );
}

export function CoffeeTableModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const legThick = 0.05;
  const inset = 0.06;
  return (
    <group>
      <LeggedTable
        widthM={widthM}
        depthM={depthM}
        heightM={heightM}
        topH={0.04}
        topColor={mainColor}
        apronColor={legColor}
        legColor={legColor}
        legThick={legThick}
        inset={inset}
        roughness={0.55}
        apron={false}
      />
      {/* Lower shelf between the legs */}
      <Box position={[0, heightM * 0.3, 0]} size={[widthM - (inset + legThick) * 2 + 0.02, 0.025, depthM - (inset + legThick) * 2 + 0.02]} color={subColor || mainColor} roughness={0.7} />
    </group>
  );
}

export function SideTableModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const radius = Math.min(widthM, depthM) / 2;
  const topH = 0.03;
  return (
    <group>
      <Cyl position={[0, heightM - topH / 2, 0]} radiusTop={radius} height={topH} color={mainColor} roughness={0.5} segments={40} />
      <Cyl position={[0, heightM - topH - 0.01, 0]} radiusTop={radius * 0.9} height={0.02} color={subColor || legColor} roughness={0.6} segments={40} />
      <Cyl position={[0, (heightM - topH) / 2, 0]} radiusTop={radius * 0.3} radiusBottom={radius * 0.5} height={heightM - topH} color={legColor} roughness={0.55} segments={32} />
      <Cyl position={[0, 0.012, 0]} radiusTop={radius * 0.62} radiusBottom={radius * 0.66} height={0.024} color={legColor} roughness={0.55} segments={32} />
    </group>
  );
}

export function DeskModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const topH = 0.035;
  const pedestalW = widthM * 0.28;
  const bodyH = heightM - topH;
  const drawerH = (bodyH - 0.04) / 3;
  const legThick = 0.04;
  const pedestalX = widthM / 2 - pedestalW / 2 - 0.02;
  return (
    <group>
      <Box position={[0, heightM - topH / 2, 0]} size={[widthM, topH, depthM]} color={mainColor} roughness={0.6} />
      <Box position={[-widthM * 0.08, heightM + 0.002, depthM * 0.06]} size={[widthM * 0.44, 0.004, depthM * 0.5]} color={subColor} roughness={0.85} />

      {/* Right drawer pedestal */}
      <Box position={[pedestalX, bodyH / 2, 0]} size={[pedestalW, bodyH, depthM * 0.9]} color={mainColor} roughness={0.7} />
      {[0, 1, 2].map((i) => {
        const y = 0.02 + drawerH * (i + 0.5) + 0.01 * i;
        return (
          <group key={i}>
            <Box position={[pedestalX, y, depthM * 0.45 + 0.002]} size={[pedestalW - 0.03, drawerH - 0.012, 0.006]} color={mainColor} roughness={0.55} />
            <Box position={[pedestalX, y, depthM * 0.45 + 0.016]} size={[0.09, 0.014, 0.02]} color="#C49746" roughness={0.25} metalness={0.8} />
          </group>
        );
      })}

      {/* Left steel sled frame */}
      {[-1, 1].map((s) => (
        <Box key={s} position={[-widthM / 2 + 0.06, bodyH / 2, s * depthM * 0.42]} size={[legThick, bodyH, legThick]} color={legColor} roughness={0.4} metalness={0.6} />
      ))}
      <Box position={[-widthM / 2 + 0.06, 0.02, 0]} size={[legThick, 0.04, depthM * 0.86]} color={legColor} roughness={0.4} metalness={0.6} />
      <Box position={[-widthM / 2 + 0.06, bodyH - 0.02, 0]} size={[legThick, 0.04, depthM * 0.86]} color={legColor} roughness={0.4} metalness={0.6} />
    </group>
  );
}

export function NightstandModel({ widthM, depthM, heightM, mainColor, legColor }) {
  const legH = Math.min(0.1, heightM * 0.2);
  const bodyH = heightM - legH;
  return (
    <group>
      <Box position={[0, legH + bodyH / 2, 0]} size={[widthM, bodyH, depthM]} color={mainColor} roughness={0.65} />
      {/* Two drawer fronts with knobs */}
      {[0.27, 0.73].map((f, i) => (
        <group key={i}>
          <Box position={[0, legH + bodyH * f, depthM / 2 + 0.002]} size={[widthM - 0.04, bodyH * 0.42, 0.006]} color={mainColor} roughness={0.5} />
          <mesh position={[0, legH + bodyH * f, depthM / 2 + 0.015]} castShadow>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshStandardMaterial color="#C49746" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      ))}
      {corners(widthM, depthM, 0.045).map(([x, z], i) => (
        <Box key={i} position={[x, legH / 2, z]} size={[0.035, legH, 0.035]} color={legColor} roughness={0.5} />
      ))}
    </group>
  );
}
