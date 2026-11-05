import React, { useMemo } from 'react';
import { patternOf, usesPatternModel } from '../patterns.js';
import { rugTexture } from '../patternTextures.js';
import { shade } from './shared.jsx';

/**
 * 3D model: a rug drawn from a procedural pattern picture (Persian, kilim, dhaka, striped, rings, shag,
 * plain). The picture is mapped onto the top face so it keeps its proportions at any size; the colours are
 * the piece's main, sub and accent colours, so recolouring a rug recolours its pattern. Origin on the
 * floor, centred on the footprint.
 */

const FRINGED = new Set(['persian', 'kilim', 'dhaka', 'stripes']);
const FRINGE_CM = 3;

export { usesPatternModel };

export function PatternedRug({ def, widthM, depthM, heightM, mainColor, round = false }) {
  const pattern = patternOf(def) || 'plain';
  const thick = Math.max(0.006, heightM || 0.012);
  const colors = {
    main: mainColor || def.color || '#8B1E1E',
    sub: def.subColor || '#D4A359',
    accent: def.accentColor || '#1B2A4A',
  };
  const fringed = !round && FRINGED.has(pattern) && depthM > 0.5;
  const fringe = fringed ? FRINGE_CM / 100 : 0;
  const bodyD = depthM - fringe * 2;
  const size = round ? Math.min(widthM, depthM) : null;
  const tex = useMemo(
    () =>
      rugTexture(
        pattern,
        round ? size * 100 : widthM * 100,
        round ? size * 100 : bodyD * 100,
        colors
      ),
    // colours are read through their parts so a new object each render does not rebuild the picture
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pattern, round, size, widthM, bodyD, colors.main, colors.sub, colors.accent]
  );
  const side = shade(colors.main, -0.12);
  const shag = pattern === 'shag';

  const top = (
    <meshStandardMaterial
      attach={round ? 'material-1' : 'material-2'}
      color={tex ? '#FFFFFF' : colors.main}
      map={tex || undefined}
      bumpMap={shag && tex ? tex : undefined}
      bumpScale={shag ? 1.2 : 0}
      roughness={shag ? 1 : 0.95}
    />
  );
  const sideMat = (index) => (
    <meshStandardMaterial attach={`material-${index}`} color={side} roughness={0.95} />
  );

  return (
    <group>
      {round ? (
        <mesh position={[0, thick / 2, 0]} receiveShadow>
          <cylinderGeometry args={[size / 2, size / 2, thick, 72]} />
          {sideMat(0)}
          {top}
          {sideMat(2)}
        </mesh>
      ) : (
        <mesh position={[0, thick / 2, 0]} receiveShadow>
          <boxGeometry args={[widthM, thick, bodyD]} />
          {sideMat(0)}
          {sideMat(1)}
          {top}
          {sideMat(3)}
          {sideMat(4)}
          {sideMat(5)}
        </mesh>
      )}
      {fringed &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[0, thick * 0.4, s * (depthM / 2 - fringe / 2)]} receiveShadow>
            <boxGeometry args={[widthM * 0.97, thick * 0.8, fringe]} />
            <meshStandardMaterial color="#F3EBDB" roughness={0.98} />
          </mesh>
        ))}
    </group>
  );
}
