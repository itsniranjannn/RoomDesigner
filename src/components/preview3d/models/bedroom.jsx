import { Box, Cyl, Ball, Pad, Drawers, Pillow, BRASS, STEEL, clamp, shade } from './shared.jsx';

/** 3D models: bedroom pieces. Built from Three.js primitives; origin on the floor, centered on the footprint. */
export function DressingTableModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  subColor,
  handleColor,
  legColor,
}) {
  const topY = 0.76;
  const mirrorH = heightM - topY;
  const mirrorW = widthM * 0.62;
  const drawerW = widthM * 0.28;
  const front = depthM / 2;
  const bulbs = clamp(Math.round(mirrorW / 0.09), 4, 12);
  return (
    <group>
      {/* Tapered legs with a shaped apron over the knee space */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <Cyl
          key={i}
          position={[sx * (widthM / 2 - 0.035), (topY - 0.04) / 2, sz * (depthM / 2 - 0.035)]}
          radiusTop={0.024}
          radiusBottom={0.014}
          height={topY - 0.04}
          color={legColor}
          roughness={0.5}
          segments={10}
        />
      ))}
      <Box
        position={[0, topY - 0.045, 0]}
        size={[widthM, 0.04, depthM]}
        color={mainColor}
        roughness={0.55}
      />
      <Box
        position={[0, topY - 0.01, 0]}
        size={[widthM + 0.02, 0.03, depthM + 0.02]}
        color={shade(mainColor, 0.04)}
        roughness={0.4}
      />
      <Drawers
        width={widthM * 0.4}
        height={0.06}
        y={topY - 0.12}
        z={front - 0.02}
        rows={1}
        color={mainColor}
        handleColor={handleColor || BRASS.color}
        handle="knob"
        thick={0.012}
      />
      {/* Drawer banks either side of the knee space */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * (widthM / 2 - drawerW / 2 - 0.02), topY - 0.04 - 0.17, 0]}
            size={[drawerW, 0.34, depthM - 0.04]}
            color={subColor}
            roughness={0.65}
          />
          <Drawers
            width={drawerW - 0.02}
            height={0.32}
            x={s * (widthM / 2 - drawerW / 2 - 0.02)}
            y={topY - 0.04 - 0.33}
            z={front - 0.02}
            rows={2}
            color={mainColor}
            handleColor={handleColor || BRASS.color}
            handle="knob"
            thick={0.016}
          />
        </group>
      ))}
      {/* Centre mirror in a carved frame with side wings angled inwards */}
      <group name="dressing-mirror" position={[0, topY + mirrorH / 2, -depthM / 2 + 0.03]}>
        <Pad size={[mirrorW, mirrorH, 0.03]} radius={0.015} color={mainColor} roughness={0.5} />
        <Box
          position={[0, 0, 0.0165]}
          size={[mirrorW - 0.07, mirrorH - 0.07, 0.004]}
          color="#B0D3E2"
          roughness={0.04}
          metalness={0.5}
          castShadow={false}
        />
        <Box
          position={[0, 0, 0.0145]}
          size={[mirrorW - 0.055, mirrorH - 0.055, 0.002]}
          {...BRASS}
          color={handleColor || BRASS.color}
          castShadow={false}
        />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (mirrorW / 2 + 0.08), 0, 0.03]} rotation={[0, -s * 0.5, 0]}>
            <Pad
              size={[0.14, mirrorH * 0.88, 0.022]}
              radius={0.01}
              color={mainColor}
              roughness={0.5}
            />
            <Box
              position={[0, 0, 0.012]}
              size={[0.1, mirrorH * 0.88 - 0.05, 0.003]}
              color="#B0D3E2"
              roughness={0.04}
              metalness={0.5}
              castShadow={false}
            />
          </group>
        ))}
        {/* Vanity bulbs along the top of the frame */}
        {Array.from({ length: bulbs }).map((_, i) => (
          <mesh
            key={i}
            position={[
              -mirrorW / 2 + 0.05 + ((mirrorW - 0.1) * i) / (bulbs - 1),
              mirrorH / 2 - 0.025,
              0.026,
            ]}
          >
            <sphereGeometry args={[0.011, 8, 6]} />
            <meshBasicMaterial color="#FFF1CC" />
          </mesh>
        ))}
      </group>
      {/* Perfume bottles, a jewellery box and a small tray on top */}
      <group name="dressing-decor" position={[0, topY + 0.015, 0]}>
        <Cyl
          position={[-widthM * 0.14, 0.05, -depthM * 0.1]}
          radiusTop={0.022}
          radiusBottom={0.028}
          height={0.1}
          color="#E8D5E0"
          roughness={0.1}
          segments={12}
        />
        <Ball position={[-widthM * 0.14, 0.108, -depthM * 0.1]} radius={0.014} {...BRASS} />
        <Cyl
          position={[widthM * 0.12, 0.04, -depthM * 0.08]}
          radiusTop={0.026}
          height={0.08}
          color="#C7DDE4"
          roughness={0.1}
          segments={12}
        />
        <Box
          position={[widthM * 0.3, 0.025, 0]}
          size={[0.16, 0.05, 0.1]}
          color={shade(mainColor, -0.15)}
          roughness={0.5}
        />
        <Box position={[widthM * 0.3, 0.052, 0]} size={[0.164, 0.006, 0.104]} {...BRASS} />
        <Box
          position={[-widthM * 0.3, 0.008, 0.02]}
          size={[0.16, 0.016, 0.1]}
          color="#F1E8D8"
          roughness={0.4}
        />
      </group>
    </group>
  );
}

export function CribModel({ widthM, depthM, heightM, mainColor, fabricColor, accentColor }) {
  const baseY = 0.3;
  const slatCount = Math.max(6, Math.floor((widthM - 0.1) / 0.075));
  const slatSpan = widthM - 0.12;
  const railTop = heightM - 0.02;
  const stripe = shade(accentColor, -0.08);
  return (
    <group>
      {/* Corner posts with turned finials and castors */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], idx) => (
        <group key={idx}>
          <Box
            position={[sx * (widthM / 2 - 0.025), heightM / 2, sz * (depthM / 2 - 0.025)]}
            size={[0.05, heightM, 0.05]}
            color={mainColor}
            roughness={0.55}
          />
          <Ball
            position={[sx * (widthM / 2 - 0.025), heightM + 0.012, sz * (depthM / 2 - 0.025)]}
            radius={0.03}
            color={mainColor}
            roughness={0.5}
          />
          <Cyl
            position={[sx * (widthM / 2 - 0.025), 0.02, sz * (depthM / 2 - 0.025)]}
            radiusTop={0.022}
            height={0.04}
            {...STEEL}
            segments={10}
          />
          <Ball
            position={[sx * (widthM / 2 - 0.04), baseY - 0.045, sz * (depthM / 2 - 0.04)]}
            radius={0.007}
            {...STEEL}
            segments={6}
            castShadow={false}
          />
        </group>
      ))}
      {/* Base board, piped mattress, fitted sheet and striped blanket */}
      <Box
        position={[0, baseY, 0]}
        size={[widthM - 0.06, 0.03, depthM - 0.06]}
        color={mainColor}
        roughness={0.7}
      />
      <Pad
        position={[0, baseY + 0.07, 0]}
        size={[widthM - 0.1, 0.1, depthM - 0.1]}
        radius={0.025}
        color={fabricColor}
        roughness={0.95}
      />
      <Box
        position={[0, baseY + 0.118, 0]}
        size={[widthM - 0.14, 0.004, 0.006]}
        color={shade(fabricColor, -0.1)}
        castShadow={false}
      />
      <Pad
        position={[0, baseY + 0.125, depthM * 0.12]}
        size={[widthM - 0.14, 0.02, depthM * 0.55]}
        radius={0.01}
        color={accentColor}
        roughness={0.95}
      />
      {[0.3, 0.45, 0.6].map((f) => (
        <Box
          key={f}
          position={[(f - 0.45) * (widthM - 0.14), baseY + 0.136, depthM * 0.12]}
          size={[0.025, 0.001, depthM * 0.52]}
          color={stripe}
          castShadow={false}
        />
      ))}
      <Pillow
        position={[-widthM * 0.28, baseY + 0.145, -depthM * 0.1]}
        size={[0.28, 0.05, 0.2]}
        color="#FFFFFF"
        rotation={[0, 0, 0]}
      />
      {/* Slatted long sides with a rounded teething rail */}
      {[-1, 1].map((sz) => (
        <group key={sz}>
          <Box
            position={[0, railTop, sz * (depthM / 2 - 0.025)]}
            size={[widthM, 0.04, 0.04]}
            color={mainColor}
            roughness={0.55}
          />
          <Box
            position={[0, railTop + 0.022, sz * (depthM / 2 - 0.025)]}
            size={[widthM - 0.05, 0.012, 0.03]}
            color={shade(mainColor, -0.1)}
            roughness={0.5}
          />
          <Box
            position={[0, baseY + 0.04, sz * (depthM / 2 - 0.025)]}
            size={[widthM - 0.06, 0.03, 0.03]}
            color={mainColor}
            roughness={0.6}
          />
          {Array.from({ length: slatCount }).map((_, idx) => (
            <Box
              key={idx}
              position={[
                -slatSpan / 2 + (idx * slatSpan) / (slatCount - 1),
                (baseY + railTop) / 2,
                sz * (depthM / 2 - 0.025),
              ]}
              size={[0.016, railTop - baseY, 0.016]}
              color={mainColor}
              roughness={0.6}
              castShadow={false}
            />
          ))}
        </group>
      ))}
      {/* Solid head and foot boards with inset panels */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box
            position={[sx * (widthM / 2 - 0.015), (baseY + heightM) / 2 - 0.02, 0]}
            size={[0.03, heightM - baseY - 0.04, depthM - 0.06]}
            color={mainColor}
            roughness={0.6}
          />
          <Box
            position={[sx * (widthM / 2 + 0.002), (baseY + heightM) / 2 - 0.02, 0]}
            size={[0.006, heightM - baseY - 0.2, depthM - 0.2]}
            color={shade(mainColor, -0.06)}
            roughness={0.6}
            castShadow={false}
          />
        </group>
      ))}
    </group>
  );
}

export function TrunkModel({ widthM, depthM, heightM, mainColor, accentColor, subColor }) {
  const bodyH = heightM * 0.62;
  const lidH = heightM - bodyH;
  return (
    <group>
      <Box
        position={[0, bodyH / 2, 0]}
        size={[widthM, bodyH, depthM]}
        color={mainColor}
        roughness={0.75}
      />
      <Pad
        position={[0, bodyH + lidH / 2, 0]}
        size={[widthM + 0.012, lidH, depthM + 0.012]}
        radius={Math.min(0.03, lidH / 3)}
        color={subColor}
        roughness={0.7}
      />
      <Box
        position={[0, bodyH + 0.002, depthM / 2 + 0.008]}
        size={[widthM, 0.004, 0.003]}
        color="#1A110B"
        castShadow={false}
      />
      {/* Metal straps wrapping over the lid and front, with studs */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * widthM * 0.3, heightM / 2, 0]}
            size={[0.045, heightM + 0.004, depthM + 0.016]}
            color={accentColor}
            roughness={0.35}
            metalness={0.5}
          />
          {[0.15, 0.4, 0.8].map((f) => (
            <Ball
              key={f}
              position={[s * widthM * 0.3, heightM * f, depthM / 2 + 0.012]}
              radius={0.007}
              {...BRASS}
              segments={6}
              castShadow={false}
            />
          ))}
        </group>
      ))}
      {/* Corner brackets, lock plate with hasp, hinges and rope handles */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            position={[sx * (widthM / 2 - 0.005), bodyH - 0.02, sz * (depthM / 2 - 0.005)]}
            size={[0.04, 0.05, 0.04]}
            color={accentColor}
            roughness={0.35}
            metalness={0.5}
          />
        ))
      )}
      <Box
        position={[0, bodyH + 0.0, depthM / 2 + 0.014]}
        size={[0.06, 0.08, 0.012]}
        color={accentColor}
        roughness={0.3}
        metalness={0.6}
      />
      <Box position={[0, bodyH + 0.04, depthM / 2 + 0.016]} size={[0.03, 0.05, 0.006]} {...STEEL} />
      <Cyl
        position={[0, bodyH - 0.01, depthM / 2 + 0.022]}
        radiusTop={0.008}
        height={0.006}
        rotation={[Math.PI / 2, 0, 0]}
        color="#1A1A1A"
        segments={8}
        castShadow={false}
      />
      {[-1, 1].map((s) => (
        <Box
          key={`h${s}`}
          position={[s * widthM * 0.4, bodyH + 0.005, -depthM / 2 - 0.006]}
          size={[0.07, 0.05, 0.012]}
          {...STEEL}
        />
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`r${s}`}
          position={[s * (widthM / 2 + 0.008), bodyH * 0.65, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        >
          <torusGeometry args={[0.035, 0.006, 6, 14, Math.PI]} />
          <meshStandardMaterial color="#C9B48A" roughness={0.9} />
        </mesh>
      ))}
      {/* Short feet */}
      {[-1, 1].map((sx) => (
        <Box
          key={sx}
          position={[sx * (widthM / 2 - 0.03), 0.01, 0]}
          size={[0.05, 0.02, depthM * 0.9]}
          color={subColor}
        />
      ))}
    </group>
  );
}
