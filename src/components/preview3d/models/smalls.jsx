/** 3D models: small pieces that stand on other furniture (lamp, monitor, microwave, books). Origin on the base. */
import { Box, Cyl, Pad, Ball, STEEL, CHROME, BRASS, clamp, shade } from './shared.jsx';

/** Table lamp: weighted ceramic base, slim neck and a tapered drum shade. */
export function TableLampModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const span = Math.min(widthM, depthM);
  const baseR = span * 0.3;
  const shadeR = span * 0.5;
  const shadeH = heightM * 0.36;
  const shadeBottom = heightM - shadeH;
  const bodyH = shadeBottom + 0.04;
  return (
    <group name="table-lamp">
      <Cyl
        position={[0, 0.006, 0]}
        radiusTop={baseR * 1.05}
        radiusBottom={baseR * 1.05}
        height={0.012}
        color={shade(mainColor, -0.1)}
        roughness={0.4}
        segments={28}
      />
      <mesh position={[0, 0.012 + (bodyH * 0.55) / 2 + 0.01, 0]} castShadow>
        <sphereGeometry args={[baseR, 24, 16]} />
        <meshStandardMaterial color={mainColor} roughness={0.25} />
      </mesh>
      <Cyl
        position={[0, 0.012 + bodyH * 0.55 + (bodyH * 0.45) / 2 - 0.01, 0]}
        radiusTop={0.012}
        radiusBottom={0.016}
        height={bodyH * 0.45}
        {...BRASS}
        segments={12}
      />
      <Cyl
        position={[0, shadeBottom + shadeH / 2, 0]}
        radiusTop={shadeR * 0.78}
        radiusBottom={shadeR}
        height={shadeH}
        color={subColor || '#F2E8D5'}
        roughness={0.9}
        segments={32}
        castShadow
      />
      <Ball
        position={[0, shadeBottom + shadeH + 0.012, 0]}
        radius={0.012}
        {...BRASS}
        roughness={0.25}
        segments={10}
        castShadow={false}
      />
      <mesh position={[0, shadeBottom + shadeH * 0.4, 0]}>
        <sphereGeometry args={[0.022, 12, 10]} />
        <meshBasicMaterial color="#FFF5DF" />
      </mesh>
    </group>
  );
}

/** Desktop monitor: slim bezel, glass panel, neck and a round foot. */
export function MonitorModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const footR = Math.min(depthM * 0.5, widthM * 0.16);
  const neckH = heightM * 0.22;
  const panelBottom = 0.012 + neckH;
  const panelH = heightM - panelBottom;
  const panelT = Math.min(0.022, depthM * 0.4);
  const panelZ = -depthM * 0.1;
  const front = panelZ + panelT / 2;
  const bezel = 0.008;
  return (
    <group name="monitor">
      <Cyl
        position={[0, 0.006, 0]}
        radiusTop={footR}
        radiusBottom={footR * 1.04}
        height={0.012}
        color={subColor || '#2B2D30'}
        roughness={0.4}
        segments={24}
      />
      <Box
        position={[0, 0.012 + neckH / 2, panelZ - 0.006]}
        size={[0.035, neckH + 0.004, 0.018]}
        color={subColor || '#2B2D30'}
        roughness={0.4}
      />
      <Box
        position={[0, panelBottom + panelH / 2, panelZ]}
        size={[widthM, panelH, panelT]}
        color={mainColor}
        roughness={0.35}
        metalness={0.2}
      />
      <Box
        position={[0, panelBottom + panelH / 2 + 0.004, front + 0.0005]}
        size={[widthM - bezel * 2, panelH - bezel * 2 - 0.006, 0.003]}
        color="#111a25"
        roughness={0.08}
        metalness={0.15}
        castShadow={false}
      />
      <mesh position={[widthM / 2 - 0.03, panelBottom + bezel * 0.5 + 0.002, front + 0.0012]}>
        <sphereGeometry args={[0.0028, 8, 6]} />
        <meshBasicMaterial color="#38D26B" />
      </mesh>
    </group>
  );
}

/** Microwave oven: steel-white body, dark glass door, control column and a handle. */
export function MicrowaveModel({ widthM, depthM, heightM, mainColor }) {
  const front = depthM / 2;
  const doorW = widthM * 0.68;
  const panelW = widthM - doorW - 0.045;
  const doorX = -widthM / 2 + 0.015 + doorW / 2;
  const panelX = widthM / 2 - 0.015 - panelW / 2;
  return (
    <group name="microwave">
      <Pad
        position={[0, heightM / 2 + 0.008, 0]}
        size={[widthM, heightM - 0.016, depthM]}
        radius={0.01}
        color={mainColor}
        roughness={0.35}
      />
      {[-1, 1].map((s) => (
        <Cyl
          key={s}
          position={[s * (widthM / 2 - 0.035), 0.004, depthM / 2 - 0.035]}
          radiusTop={0.014}
          height={0.008}
          color="#1B1D20"
          segments={10}
          castShadow={false}
        />
      ))}
      <Box
        position={[doorX, heightM / 2 + 0.008, front + 0.0005]}
        size={[doorW, heightM - 0.06, 0.004]}
        color="#0F1316"
        roughness={0.1}
        metalness={0.2}
        castShadow={false}
      />
      <Box
        position={[panelX, heightM / 2 + 0.008, front + 0.0005]}
        size={[panelW, heightM - 0.06, 0.003]}
        color="#B9BDC1"
        roughness={0.4}
        metalness={0.3}
        castShadow={false}
      />
      <Box
        position={[panelX, heightM - 0.058, front + 0.0022]}
        size={[panelW * 0.7, 0.026, 0.002]}
        color="#0A0D10"
        castShadow={false}
      />
      <mesh position={[panelX, heightM * 0.36, front + 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[Math.min(0.02, panelW * 0.28), Math.min(0.02, panelW * 0.28), 0.012, 14]}
        />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <Box
        position={[-widthM / 2 + 0.03, heightM / 2 + 0.008, front + 0.014]}
        size={[0.012, heightM * 0.6, 0.012]}
        {...CHROME}
        castShadow={false}
      />
    </group>
  );
}

/** Stack of hardbacks lying flat, each a little off square, with page edges showing. */
export function BookStackModel({ widthM, depthM, heightM, mainColor, subColor }) {
  const count = clamp(Math.round(heightM / 0.032), 3, 6);
  const t = heightM / count;
  const palette = [mainColor, subColor || '#2F4A5C', shade(mainColor, 0.1), '#C49746', '#4A5D52'];
  return (
    <group name="book-stack">
      {Array.from({ length: count }).map((_, i) => {
        const w = widthM * (1 - 0.1 * ((i * 3) % 4));
        const d = depthM * (1 - 0.06 * ((i * 5) % 3));
        const color = palette[i % palette.length];
        return (
          <group
            key={i}
            position={[(i % 2 ? 1 : -1) * widthM * 0.04, t * (i + 0.5), 0]}
            rotation={[0, ((i % 3) - 1) * 0.12, 0]}
          >
            <Box position={[0, 0, 0]} size={[w, t - 0.002, d]} color="#EFE6D3" roughness={0.9} />
            <Box
              position={[0, 0, -d / 2 + 0.002]}
              size={[w + 0.004, t, 0.008]}
              color={color}
              roughness={0.7}
              castShadow={false}
            />
            <Box
              position={[0, t / 2 - 0.0015, 0]}
              size={[w + 0.002, 0.003, d + 0.002]}
              color={color}
              roughness={0.7}
              castShadow={false}
            />
            <Box
              position={[0, -t / 2 + 0.0015, 0]}
              size={[w + 0.002, 0.003, d + 0.002]}
              color={color}
              roughness={0.7}
              castShadow={false}
            />
          </group>
        );
      })}
    </group>
  );
}
