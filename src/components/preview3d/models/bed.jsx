/** 3D models: bed. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import { Box, Cyl, Pad, corners } from './shared.jsx';

function Pillow({ position, width }) {
  return (
    <Pad
      position={position}
      size={[width, 0.12, 0.34]}
      radius={0.05}
      color="#FBF9F4"
      roughness={0.9}
      rotation={[-0.12, 0, 0]}
    />
  );
}

export function BedModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  fabricColor,
  headboardColor,
  accentColor,
}) {
  const isSingle = widthM < 1.2;
  const headboardThick = 0.08;
  const frameH = 0.22;
  const mattressH = 0.22;
  const mattressTop = frameH + mattressH;
  const mattressD = depthM - headboardThick - 0.02;
  const mattressZ = headboardThick / 2 + 0.01;
  const pillowY = mattressTop + 0.05;
  const pillowZ = -depthM / 2 + headboardThick + 0.26;
  const duvetD = mattressD * 0.62;

  return (
    <group>
      {/* Frame with a slim overhang-free side rail, standing on short feet */}
      <Box
        position={[0, 0.07 + (frameH - 0.07) / 2, headboardThick / 2]}
        size={[widthM, frameH - 0.07, depthM - headboardThick]}
        color={mainColor}
        roughness={0.7}
      />
      {corners(widthM, depthM, 0.06).map(([x, z], i) => (
        <Box
          key={i}
          position={[x, 0.035, z]}
          size={[0.07, 0.07, 0.07]}
          color={mainColor}
          roughness={0.7}
        />
      ))}

      {/* Tall padded headboard at the back (-Z) with a lower footboard at the front */}
      <Box
        position={[0, heightM / 2, -depthM / 2 + headboardThick / 2]}
        size={[widthM, heightM, headboardThick]}
        color={headboardColor}
        roughness={0.8}
      />
      <Box
        position={[0, frameH + 0.1, depthM / 2 - 0.02]}
        size={[widthM, 0.28, 0.04]}
        color={mainColor}
        roughness={0.7}
      />

      {/* Mattress, duvet and pillows */}
      <Pad
        position={[0, frameH + mattressH / 2, mattressZ]}
        size={[widthM - 0.04, mattressH, mattressD]}
        radius={0.05}
        color={fabricColor}
      />
      <Pad
        position={[0, mattressTop + 0.005, mattressZ + mattressD / 2 - duvetD / 2 + 0.01]}
        size={[widthM - 0.02, 0.05, duvetD]}
        radius={0.02}
        color={accentColor}
        roughness={0.9}
      />
      {isSingle ? (
        <Pillow position={[0, pillowY, pillowZ]} width={widthM * 0.62} />
      ) : (
        [-1, 1].map((s) => (
          <Pillow key={s} position={[s * widthM * 0.24, pillowY, pillowZ]} width={widthM * 0.4} />
        ))
      )}
    </group>
  );
}

export function BedBunkModel({ widthM, depthM, heightM, mainColor, fabricColor, accentColor }) {
  const postW = 0.06;
  const lowerY = heightM * 0.2;
  const upperY = heightM * 0.62;
  const bunk = (y, key) => (
    <group key={key}>
      <Box
        position={[0, y - 0.05, 0]}
        size={[widthM - postW * 2, 0.06, depthM - postW * 2]}
        color={mainColor}
        roughness={0.7}
      />
      <Pad
        position={[0, y + 0.07, 0]}
        size={[widthM - postW * 2 - 0.02, 0.16, depthM - postW * 2 - 0.02]}
        radius={0.04}
        color={fabricColor}
      />
      <Pad
        position={[0, y + 0.18, -depthM / 2 + 0.3]}
        size={[widthM * 0.6, 0.1, 0.3]}
        radius={0.04}
        color="#FBF9F4"
        roughness={0.9}
        rotation={[-0.1, 0, 0]}
      />
    </group>
  );
  return (
    <group>
      {corners(widthM, depthM, postW / 2).map(([x, z], i) => (
        <Box
          key={i}
          position={[x, heightM / 2, z]}
          size={[postW, heightM, postW]}
          color={mainColor}
          roughness={0.7}
        />
      ))}
      {bunk(lowerY, 'lower')}
      {bunk(upperY, 'upper')}

      {/* Safety rails along the upper bunk, open at the ladder end */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * (widthM / 2 - postW / 2), upperY + 0.25, 0]}
          size={[0.025, 0.07, depthM - postW * 2]}
          color={mainColor}
          roughness={0.7}
        />
      ))}
      <Box
        position={[0, upperY + 0.25, -depthM / 2 + postW / 2]}
        size={[widthM - postW * 2, 0.07, 0.025]}
        color={mainColor}
        roughness={0.7}
      />

      {/* Ladder rungs across the front-right bay */}
      {[0.2, 0.4, 0.6, 0.8].map((f, i) => (
        <Cyl
          key={i}
          position={[widthM / 2 - 0.18, heightM * f * 0.9, depthM / 2 + 0.01]}
          radiusTop={0.015}
          height={0.26}
          color={accentColor}
          roughness={0.6}
          rotation={[0, 0, Math.PI / 2]}
          segments={12}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[widthM / 2 - 0.18 + s * 0.13, heightM * 0.45, depthM / 2 + 0.01]}
          size={[0.025, heightM * 0.9, 0.03]}
          color={mainColor}
          roughness={0.7}
        />
      ))}
    </group>
  );
}
