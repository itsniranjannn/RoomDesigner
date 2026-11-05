import React, { useMemo } from 'react';
import { artTexture } from '../patternTextures.js';
import { Box, Cyl, Ball, BRASS, shade } from './shared.jsx';

/**
 * 3D models for pieces that hang on a wall: framed pictures, hung mirrors, a floating shelf, a clock and
 * a wall planter. Each one has its back at z = -depth / 2 (against the wall), is centred on the footprint
 * and starts at y = 0 (the piece is lifted to its hanging height by its elevation). The wall itself is
 * drawn by the room, so only the piece is built here.
 */

/** A picture inside a mat and a frame; the picture is drawn procedurally. */
function Framed({ widthM, heightM, depthM, frameColor, art, artColors, position = [0, 0, 0] }) {
  const f = Math.min(0.045, Math.min(widthM, heightM) * 0.09);
  const matW = widthM - f * 2;
  const matH = heightM - f * 2;
  const inset = Math.min(0.03, Math.min(matW, matH) * 0.1);
  const tex = useMemo(
    () => artTexture(art, (matW - inset * 2) * 100, (matH - inset * 2) * 100, artColors),
    [art, matW, matH, inset, artColors]
  );
  const z = -depthM / 2;
  return (
    <group position={position}>
      {/* Frame bars */}
      <Box
        position={[0, heightM - f / 2, z + depthM / 2]}
        size={[widthM, f, depthM]}
        color={frameColor}
        roughness={0.5}
      />
      <Box
        position={[0, f / 2, z + depthM / 2]}
        size={[widthM, f, depthM]}
        color={frameColor}
        roughness={0.5}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * (widthM / 2 - f / 2), heightM / 2, z + depthM / 2]}
          size={[f, heightM - f * 2, depthM]}
          color={frameColor}
          roughness={0.5}
        />
      ))}
      {/* Backing, mat and the picture */}
      <Box
        position={[0, heightM / 2, z + 0.004]}
        size={[matW, matH, 0.008]}
        color="#EFE8DA"
        roughness={0.9}
        castShadow={false}
      />
      <mesh position={[0, heightM / 2, z + 0.0095]}>
        <planeGeometry args={[matW - inset * 2, matH - inset * 2]} />
        <meshStandardMaterial
          color={tex ? '#FFFFFF' : '#C9B79C'}
          map={tex || undefined}
          roughness={0.7}
        />
      </mesh>
    </group>
  );
}

const ART_COLORS = (def) => ({ a: def.subColor, b: def.accentColor });

export function WallArtModel({ def, widthM, depthM, heightM, mainColor }) {
  const artColors = useMemo(() => ART_COLORS(def), [def]);
  const style = def.artStyle || 'landscape';
  if (style === 'gallery') {
    // Three frames of different sizes hung as a set
    const styles = ['abstract', 'landscape', 'sunrise'];
    const frames = [
      { x: -widthM * 0.33, w: widthM * 0.3, h: heightM * 0.7, y: heightM * 0.12, art: styles[0] },
      { x: 0, w: widthM * 0.34, h: heightM * 0.95, y: heightM * 0.02, art: styles[1] },
      { x: widthM * 0.34, w: widthM * 0.28, h: heightM * 0.62, y: heightM * 0.2, art: styles[2] },
    ];
    return (
      <group>
        {frames.map((fr, i) => (
          <Framed
            key={i}
            widthM={fr.w}
            heightM={fr.h}
            depthM={depthM}
            frameColor={i === 1 ? shade(mainColor, -0.05) : mainColor}
            art={fr.art}
            artColors={artColors}
            position={[fr.x, fr.y, 0]}
          />
        ))}
      </group>
    );
  }
  return (
    <Framed
      widthM={widthM}
      heightM={heightM}
      depthM={depthM}
      frameColor={mainColor}
      art={style}
      artColors={artColors}
    />
  );
}

/** A mirror hung on the wall: round, rectangular or arched, in a slim frame. */
export function WallMirrorHungModel({ def, widthM, depthM, heightM, mainColor }) {
  const shape = def.mirrorShape || 'rect';
  const glass = {
    color: def.mirrorColor || '#B0D3E2',
    metalness: 0.78,
    roughness: 0.1,
  };
  const z = -depthM / 2;
  const f = Math.min(0.04, Math.min(widthM, heightM) * 0.07);
  if (shape === 'round') {
    const r = Math.min(widthM, heightM) / 2;
    return (
      <group position={[0, heightM / 2, z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, depthM / 2]} castShadow>
          <cylinderGeometry args={[r, r, depthM, 56]} />
          <meshStandardMaterial color={mainColor} roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, depthM + 0.001]}>
          <cylinderGeometry args={[r - f, r - f, 0.004, 56]} />
          <meshStandardMaterial {...glass} />
        </mesh>
      </group>
    );
  }
  const archR = shape === 'arch' ? widthM / 2 : 0;
  const bodyH = heightM - archR;
  return (
    <group position={[0, 0, z]}>
      <Box
        position={[0, bodyH / 2, depthM / 2]}
        size={[widthM, bodyH, depthM]}
        color={mainColor}
        roughness={0.5}
      />
      {archR > 0 && (
        <mesh position={[0, bodyH, depthM / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[archR, archR, depthM, 40, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={mainColor} roughness={0.5} side={2} />
        </mesh>
      )}
      <mesh position={[0, bodyH / 2, depthM + 0.001]}>
        <planeGeometry args={[widthM - f * 2, bodyH - f * 2]} />
        <meshStandardMaterial {...glass} />
      </mesh>
      {archR > 0 && (
        <mesh position={[0, bodyH, depthM + 0.001]}>
          <circleGeometry args={[archR - f, 36, 0, Math.PI]} />
          <meshStandardMaterial {...glass} />
        </mesh>
      )}
    </group>
  );
}

/** A floating shelf: a solid board on hidden brackets. Things placed on it rest at its top. */
export function WallShelfModel({ widthM, depthM, heightM, mainColor }) {
  return (
    <group>
      <Box
        position={[0, heightM / 2, 0]}
        size={[widthM, heightM, depthM]}
        color={mainColor}
        roughness={0.55}
      />
      <Box
        position={[0, heightM + 0.002, 0]}
        size={[widthM - 0.004, 0.002, depthM - 0.004]}
        color={shade(mainColor, 0.04)}
        roughness={0.5}
        castShadow={false}
      />
    </group>
  );
}

/** A round wall clock with ticks and hands. */
export function WallClockModel({ def, widthM, depthM, heightM, mainColor }) {
  const r = Math.min(widthM, heightM) / 2;
  const ticks = Array.from({ length: 12 });
  const z = -depthM / 2;
  return (
    <group position={[0, heightM / 2, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, depthM / 2]} castShadow>
        <cylinderGeometry args={[r, r, depthM, 48]} />
        <meshStandardMaterial color={mainColor} roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, depthM + 0.001]}>
        <cylinderGeometry args={[r * 0.9, r * 0.9, 0.004, 48]} />
        <meshStandardMaterial color={def.subColor || '#F6F1E7'} roughness={0.6} />
      </mesh>
      {ticks.map((_, i) => {
        const a = (i * Math.PI) / 6;
        const len = i % 3 === 0 ? r * 0.16 : r * 0.08;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * r * 0.74, Math.cos(a) * r * 0.74, depthM + 0.004]}
            rotation={[0, 0, -a]}
          >
            <boxGeometry args={[0.006, len, 0.003]} />
            <meshStandardMaterial color="#262320" roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, r * 0.2, depthM + 0.007]}>
        <boxGeometry args={[0.009, r * 0.4, 0.003]} />
        <meshStandardMaterial color="#1E1B19" roughness={0.5} />
      </mesh>
      <mesh position={[r * 0.17, 0, depthM + 0.009]} rotation={[0, 0, -Math.PI / 2]}>
        <boxGeometry args={[0.006, r * 0.62, 0.003]} />
        <meshStandardMaterial color="#1E1B19" roughness={0.5} />
      </mesh>
      <Ball position={[0, 0, depthM + 0.011]} radius={0.01} color="#B8453A" />
    </group>
  );
}

/** A planter hung on the wall, with trailing leaves. */
export function WallPlanterModel({ def, widthM, depthM, heightM, mainColor }) {
  const potH = heightM * 0.38;
  const leafGreen = mainColor || '#4F7A52';
  const leaves = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return {
      x: (t - 0.5) * widthM * 0.9,
      y: potH + 0.05 + Math.sin(t * Math.PI) * heightM * 0.3,
      tilt: (t - 0.5) * 1.1,
      len: heightM * (0.3 + 0.18 * Math.sin(t * 7)),
    };
  });
  return (
    <group>
      <Box
        position={[0, heightM - 0.01, -depthM / 2 + 0.006]}
        size={[widthM * 0.5, 0.02, 0.012]}
        color="#3A3530"
        roughness={0.5}
      />
      <Cyl
        position={[0, potH / 2, 0]}
        radiusTop={Math.min(widthM, depthM) / 2 + 0.01}
        radiusBottom={Math.min(widthM, depthM) / 2 - 0.01}
        height={potH}
        color={def.subColor || '#D4CABB'}
        roughness={0.6}
      />
      {leaves.map((l, i) => (
        <mesh
          key={i}
          position={[l.x, l.y, 0.01]}
          rotation={[0.2, 0, l.tilt]}
          scale={[0.55, 1, 0.3]}
          castShadow
        >
          <sphereGeometry args={[l.len / 2, 10, 8]} />
          <meshStandardMaterial color={shade(leafGreen, (i % 3) * 0.04)} roughness={0.8} />
        </mesh>
      ))}
      <Ball position={[0, potH + 0.03, 0]} radius={0.04} color={shade(leafGreen, 0.06)} />
      <Ball position={[0, potH + 0.015, 0.02]} radius={0.012} color={BRASS.color} />
    </group>
  );
}
