/** 3D models: tables. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import {
  Box,
  Cyl,
  Ball,
  Drawers,
  CHROME,
  STEEL,
  BRASS,
  DARK_GAP,
  corners,
  shade,
} from './shared.jsx';

/** Rectangular top with four legs and an optional apron frame under it. */
function LeggedTable({
  widthM,
  depthM,
  heightM,
  topH,
  topColor,
  apronColor,
  legColor,
  legThick,
  inset,
  roughness = 0.6,
  apron = true,
  seam = false,
  drawer = false,
  ports = false,
}) {
  const legH = heightM - topH;
  const apronH = Math.min(0.08, legH * 0.18);
  const lx = widthM / 2 - inset - legThick / 2;
  const lz = depthM / 2 - inset - legThick / 2;
  return (
    <group>
      <Box
        position={[0, heightM - topH / 2, 0]}
        size={[widthM, topH, depthM]}
        color={topColor}
        roughness={roughness}
      />
      {/* Edge band under the top, wood-grain lines and optional leaf seam */}
      <Box
        position={[0, heightM - topH - 0.006, 0]}
        size={[widthM - 0.03, 0.012, depthM - 0.03]}
        color={shade(topColor, -0.1)}
        roughness={0.7}
        castShadow={false}
      />
      {[-0.3, -0.1, 0.12, 0.3].map((f) => (
        <Box
          key={f}
          position={[0, heightM + 0.0005, depthM * f]}
          size={[widthM * (0.5 + Math.abs(f)), 0.001, 0.003]}
          color={shade(topColor, -0.07)}
          castShadow={false}
        />
      ))}
      {seam && (
        <Box
          position={[0, heightM + 0.001, 0]}
          size={[0.006, 0.002, depthM - 0.01]}
          color={DARK_GAP}
          castShadow={false}
        />
      )}
      {ports &&
        [-0.18, 0.18].map((f) => (
          <group key={f} name="cable-port" position={[widthM * f, heightM, 0]}>
            <Box
              position={[0, 0.001, 0]}
              size={[0.14, 0.003, 0.09]}
              color="#222426"
              roughness={0.6}
              castShadow={false}
            />
            <Box
              position={[0, 0.003, 0.01]}
              size={[0.12, 0.003, 0.05]}
              {...STEEL}
              castShadow={false}
            />
            <Cyl
              position={[0, 0.0035, -0.03]}
              radiusTop={0.012}
              height={0.003}
              {...CHROME}
              segments={12}
              castShadow={false}
            />
          </group>
        ))}
      {corners(widthM, depthM, inset + legThick / 2).map(([x, z], i) => (
        <group key={i}>
          <Box
            position={[x, legH / 2, z]}
            size={[legThick, legH, legThick]}
            color={legColor}
            roughness={0.5}
          />
          <Box
            position={[x, 0.006, z]}
            size={[legThick + 0.006, 0.012, legThick + 0.006]}
            {...STEEL}
            castShadow={false}
          />
        </group>
      ))}
      {drawer && (
        <Drawers
          width={Math.min(0.4, widthM * 0.4)}
          height={apronH * 0.9}
          x={0}
          y={legH - apronH * 0.95}
          z={lz + 0.01}
          rows={1}
          color={apronColor}
          handleColor={BRASS.color}
          handle="knob"
          thick={0.012}
        />
      )}
      {apron && (
        <>
          {[-1, 1].map((s) => (
            <Box
              key={`a${s}`}
              position={[0, legH - apronH / 2, s * lz]}
              size={[lx * 2 - legThick, apronH, 0.02]}
              color={apronColor}
              roughness={0.7}
            />
          ))}
          {[-1, 1].map((s) => (
            <Box
              key={`b${s}`}
              position={[s * lx, legH - apronH / 2, 0]}
              size={[0.02, apronH, lz * 2 - legThick]}
              color={apronColor}
              roughness={0.7}
            />
          ))}
        </>
      )}
      {apron &&
        corners(lx * 2 - legThick, lz * 2 - legThick, 0.02).map(([x, z], i) => (
          <Box
            key={`br${i}`}
            position={[x, legH - apronH - 0.012, z]}
            size={[0.05, 0.03, 0.05]}
            rotation={[0, Math.PI / 4, 0]}
            color={apronColor}
            roughness={0.7}
            castShadow={false}
          />
        ))}
    </group>
  );
}

export function TableModel({ def, widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const id = def?.id || '';
  return (
    <LeggedTable
      seam={id === 'dining-table-large' || id === 'conference-table'}
      ports={id === 'conference-table'}
      drawer={id === 'dining-table-4'}
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
      <Cyl
        position={[0, heightM - topH / 2, 0]}
        radiusTop={radius}
        height={topH}
        color={mainColor}
        roughness={0.6}
        segments={48}
      />
      <Cyl
        position={[0, (heightM - topH) / 2, 0]}
        radiusTop={0.06}
        radiusBottom={0.09}
        height={heightM - topH}
        color={legColor}
        roughness={0.5}
        segments={20}
      />
      <Cyl
        position={[0, heightM - topH - 0.006, 0]}
        radiusTop={radius - 0.02}
        height={0.012}
        color={shade(mainColor, -0.1)}
        roughness={0.7}
        segments={48}
        castShadow={false}
      />
      <mesh position={[0, heightM + 0.0005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.55, 0.0015, 4, 48]} />
        <meshStandardMaterial color={shade(mainColor, -0.1)} roughness={0.7} />
      </mesh>
      {[0.3, 0.55, 0.8].map((f) => (
        <Cyl
          key={f}
          position={[0, (heightM - topH) * f, 0]}
          radiusTop={0.066 + 0.024 * (1 - f)}
          height={0.012}
          color={shade(legColor, 0.08)}
          segments={20}
          castShadow={false}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={`foot${i}`}
          position={[
            Math.cos((i * Math.PI) / 2) * radius * 0.42,
            0.01,
            Math.sin((i * Math.PI) / 2) * radius * 0.42,
          ]}
          rotation={[0, -(i * Math.PI) / 2, 0]}
          size={[radius * 0.3, 0.02, 0.05]}
          color={legColor}
          roughness={0.5}
        />
      ))}
      <Cyl
        position={[0, 0.015, 0]}
        radiusTop={radius * 0.38}
        radiusBottom={radius * 0.42}
        height={0.03}
        color={legColor}
        roughness={0.5}
        segments={32}
      />
      <Cyl
        position={[0, heightM - topH - 0.02, 0]}
        radiusTop={0.12}
        radiusBottom={0.07}
        height={0.04}
        color={legColor}
        roughness={0.5}
        segments={20}
      />
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
      <Box
        position={[0, heightM * 0.3, 0]}
        size={[
          widthM - (inset + legThick) * 2 + 0.02,
          0.025,
          depthM - (inset + legThick) * 2 + 0.02,
        ]}
        color={subColor || mainColor}
        roughness={0.7}
      />
      <Box
        position={[0, heightM * 0.3 - 0.016, 0]}
        size={[
          widthM - (inset + legThick) * 2 - 0.02,
          0.012,
          depthM - (inset + legThick) * 2 - 0.02,
        ]}
        color={shade(subColor || mainColor, -0.12)}
        roughness={0.8}
        castShadow={false}
      />
      {[-1, 1].map((sg) => (
        <Box
          key={sg}
          position={[0, heightM - 0.04 - 0.03, (sg * (depthM - inset * 2 - legThick)) / 2]}
          size={[widthM - (inset + legThick) * 2, 0.04, 0.02]}
          color={legColor}
          roughness={0.55}
          castShadow={false}
        />
      ))}
    </group>
  );
}

export function SideTableModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const radius = Math.min(widthM, depthM) / 2;
  const topH = 0.03;
  return (
    <group>
      <Cyl
        position={[0, heightM - topH / 2, 0]}
        radiusTop={radius}
        height={topH}
        color={mainColor}
        roughness={0.5}
        segments={40}
      />
      <mesh position={[0, heightM - topH / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[radius, 0.008, 6, 40]} />
        <meshStandardMaterial color={shade(mainColor, -0.1)} roughness={0.5} />
      </mesh>
      <mesh position={[0, heightM + 0.0005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.72, 0.0015, 4, 40]} />
        <meshStandardMaterial color={shade(mainColor, -0.1)} roughness={0.6} />
      </mesh>
      <Cyl
        position={[0, heightM - topH - 0.01, 0]}
        radiusTop={radius * 0.9}
        height={0.02}
        color={subColor || legColor}
        roughness={0.6}
        segments={40}
      />
      <Cyl
        position={[0, (heightM - topH) / 2, 0]}
        radiusTop={radius * 0.3}
        radiusBottom={radius * 0.5}
        height={heightM - topH}
        color={legColor}
        roughness={0.55}
        segments={32}
      />
      <Cyl
        position={[0, 0.012, 0]}
        radiusTop={radius * 0.62}
        radiusBottom={radius * 0.66}
        height={0.024}
        color={legColor}
        roughness={0.55}
        segments={32}
      />
    </group>
  );
}

export function DeskModel({ widthM, depthM, heightM, mainColor, subColor, legColor }) {
  const topH = 0.035;
  const pedestalW = widthM * 0.28;
  const bodyH = heightM - topH;
  const legThick = 0.04;
  const pedestalX = widthM / 2 - pedestalW / 2 - 0.02;
  const front = depthM * 0.45;
  const padW = widthM * 0.44;
  const padD = depthM * 0.5;
  return (
    <group>
      {/* Top with edge banding, leather desk pad with stitched border, cable grommet */}
      <Box
        position={[0, heightM - topH / 2, 0]}
        size={[widthM, topH, depthM]}
        color={mainColor}
        roughness={0.55}
      />
      <Box
        position={[0, heightM - topH - 0.005, 0]}
        size={[widthM - 0.03, 0.01, depthM - 0.03]}
        color={shade(mainColor, -0.12)}
        roughness={0.7}
        castShadow={false}
      />
      <Box
        position={[-widthM * 0.08, heightM + 0.002, depthM * 0.06]}
        size={[padW, 0.004, padD]}
        color={subColor}
        roughness={0.85}
      />
      {[-1, 1].map((sg) => (
        <Box
          key={`pz${sg}`}
          position={[-widthM * 0.08, heightM + 0.0045, depthM * 0.06 + (sg * (padD - 0.03)) / 2]}
          size={[padW - 0.03, 0.001, 0.003]}
          color="#8A8F94"
          castShadow={false}
        />
      ))}
      {[-1, 1].map((sg) => (
        <Box
          key={`px${sg}`}
          position={[-widthM * 0.08 + (sg * (padW - 0.03)) / 2, 0.0045 + heightM, depthM * 0.06]}
          size={[0.003, 0.001, padD - 0.03]}
          color="#8A8F94"
          castShadow={false}
        />
      ))}
      <Cyl
        position={[-widthM * 0.36, heightM + 0.0015, -depthM * 0.3]}
        radiusTop={0.03}
        height={0.003}
        {...STEEL}
        segments={20}
        castShadow={false}
      />
      <Cyl
        position={[-widthM * 0.36, heightM + 0.0032, -depthM * 0.3]}
        radiusTop={0.02}
        height={0.002}
        color="#16181A"
        segments={16}
        castShadow={false}
      />
      {/* Shallow centre drawer under the top */}
      <Drawers
        width={widthM * 0.3}
        height={0.07}
        x={-widthM * 0.08}
        y={bodyH - 0.1}
        z={front - 0.02}
        rows={1}
        color={mainColor}
        handleColor={BRASS.color}
        thick={0.014}
      />
      {/* Modesty panel at the back */}
      <Box
        position={[-widthM * 0.08, bodyH * 0.72, -depthM * 0.44]}
        size={[widthM * 0.5, bodyH * 0.4, 0.018]}
        color={shade(mainColor, -0.08)}
        roughness={0.7}
      />

      {/* Right drawer pedestal with plinth, three drawers and bar pulls */}
      <Box
        position={[pedestalX, bodyH / 2 + 0.02, 0]}
        size={[pedestalW, bodyH - 0.04, depthM * 0.9]}
        color={mainColor}
        roughness={0.65}
      />
      <Box
        position={[pedestalX, 0.02, 0]}
        size={[pedestalW - 0.03, 0.04, depthM * 0.84]}
        color="#1E1B18"
        roughness={0.9}
      />
      <Drawers
        width={pedestalW - 0.02}
        height={bodyH - 0.08}
        x={pedestalX}
        y={0.05}
        z={front}
        rows={3}
        color={mainColor}
        handleColor={BRASS.color}
        thick={0.014}
      />

      {/* Left steel sled frame with levelling feet */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[-widthM / 2 + 0.06, bodyH / 2, s * depthM * 0.42]}
          size={[legThick, bodyH, legThick]}
          color={legColor}
          roughness={0.4}
          metalness={0.4}
        />
      ))}
      <Box
        position={[-widthM / 2 + 0.06, 0.02, 0]}
        size={[legThick, 0.04, depthM * 0.86]}
        color={legColor}
        roughness={0.4}
        metalness={0.4}
      />
      <Box
        position={[-widthM / 2 + 0.06, bodyH - 0.02, 0]}
        size={[legThick, 0.04, depthM * 0.86]}
        color={legColor}
        roughness={0.4}
        metalness={0.4}
      />
      {[-1, 1].map((s) => (
        <Cyl
          key={`f${s}`}
          position={[-widthM / 2 + 0.06, 0.004, s * depthM * 0.42]}
          radiusTop={0.022}
          height={0.008}
          color="#111"
          roughness={0.9}
          segments={10}
          castShadow={false}
        />
      ))}
    </group>
  );
}

export function NightstandModel({ widthM, depthM, heightM, mainColor, legColor }) {
  const legH = Math.min(0.1, heightM * 0.2);
  const bodyH = heightM - legH;
  const topT = 0.02;
  return (
    <group>
      <Box
        position={[0, legH + (bodyH - topT) / 2, 0]}
        size={[widthM, bodyH - topT, depthM]}
        color={mainColor}
        roughness={0.65}
      />
      <Box
        position={[0, heightM - topT / 2, 0.004]}
        size={[widthM + 0.02, topT, depthM + 0.02]}
        color={shade(mainColor, 0.05)}
        roughness={0.45}
      />
      {/* Two drawer fronts with inset panels and round brass knobs */}
      <Drawers
        width={widthM - 0.03}
        height={bodyH - topT - 0.03}
        y={legH + 0.015}
        z={depthM / 2}
        rows={2}
        color={mainColor}
        handleColor={BRASS.color}
        handle="knob"
      />
      {corners(widthM, depthM, 0.045).map(([x, z], i) => (
        <group key={i}>
          <Cyl
            position={[x, legH / 2, z]}
            radiusTop={0.022}
            radiusBottom={0.014}
            height={legH}
            color={legColor}
            roughness={0.5}
            segments={10}
          />
          <Ball
            position={[x, 0.006, z]}
            radius={0.014}
            color="#C49746"
            metalness={0.6}
            roughness={0.3}
            segments={8}
            castShadow={false}
          />
        </group>
      ))}
    </group>
  );
}
