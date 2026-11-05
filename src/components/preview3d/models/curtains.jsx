import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { patternOf, mix } from '../patterns.js';
import { curtainTexture } from '../patternTextures.js';

/**
 * 3D model: a curtain on a rod with rings. Heavy or sheer, open (two panels tied back to the sides) or
 * closed (two panels meeting in the middle). The fabric is a pleated sheet (real folds, not a flat
 * plane) with a procedural pattern; colours are the piece's main, sub and accent colours. The back of the
 * piece is against the wall (-z); the footprint width is the rod length.
 */

const FABRIC_REPEAT_M = 0.5;

/**
 * A pleated panel hanging from y = 0 (bottom) to y = height (top), `width` wide, centred on x = 0.
 * `folds` pleats run top to bottom; `pinch` (0 to 1) gathers the panel in at the tie-back height.
 * Texture coordinates are in repeats of FABRIC_REPEAT_M so a pattern tile keeps its real size.
 */
export function panelGeometry({ width, height, folds, amp, pinch = 0, tieAt = 0.42 }) {
  const cols = Math.max(8, Math.round(folds * 8));
  const rows = 28;
  const positions = [];
  const uvs = [];
  const index = [];
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    const gather = pinch * Math.exp(-(((v - tieAt) / 0.13) ** 2));
    const spread = 1 - gather;
    // Folds are fuller towards the hem and tighter at the heading
    const depth = amp * (0.62 + 0.38 * (1 - v)) * (1 + gather * 0.9);
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const x = (u - 0.5) * width * spread;
      const z = Math.sin(u * folds * Math.PI * 2) * depth;
      positions.push(x, v * height, z);
      uvs.push((u * width) / FABRIC_REPEAT_M, (v * height) / FABRIC_REPEAT_M);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

function Panel({ x, width, height, y, z, folds, amp, pinch, material }) {
  const geo = useMemo(
    () => panelGeometry({ width, height, folds, amp, pinch }),
    [width, height, folds, amp, pinch]
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh position={[x, y, z]} geometry={geo} material={material} castShadow receiveShadow />;
}

export function CurtainModel({ def, widthM, depthM, heightM, mainColor, handleColor }) {
  const sheer = !!def?.sheer;
  const open = def?.curtainStyle === 'open';
  const pattern = patternOf(def) || 'plain';
  const colors = useMemo(
    () => ({
      main: mainColor || def?.color || '#D9CBB0',
      sub: def?.subColor || mix(mainColor || '#D9CBB0', '#FFFFFF', 0.35),
      accent: def?.accentColor || mix(mainColor || '#D9CBB0', '#000000', 0.25),
    }),
    [mainColor, def?.color, def?.subColor, def?.accentColor]
  );
  const tex = useMemo(
    () => curtainTexture(pattern, colors),
    // colours are read through their parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pattern, colors.main, colors.sub, colors.accent]
  );
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: tex ? 0xffffff : colors.main,
      map: tex || null,
      roughness: 0.96,
      side: THREE.DoubleSide,
    });
    if (sheer) {
      m.transparent = true;
      m.opacity = 0.5;
      m.depthWrite = false;
      m.roughness = 0.8;
    }
    return m;
  }, [tex, colors.main, sheer]);
  useEffect(() => () => material.dispose(), [material]);

  const rodR = 0.013;
  const rodY = heightM - 0.03;
  const rodZ = -depthM / 2 + Math.min(0.07, depthM * 0.45);
  const rodHalf = widthM / 2 + 0.035;
  const fabricTop = rodY - 0.012;
  const hem = 0.015;
  const fabricH = Math.max(0.2, fabricTop - hem);
  const amp = Math.min(sheer ? 0.018 : 0.03, depthM * 0.28);
  const panelW = open ? widthM * 0.3 : widthM / 2 + 0.01;
  const foldsFor = (w) => Math.max(3, Math.round(w / (sheer ? 0.09 : 0.12)));
  const panels = open
    ? [
        { x: -(widthM / 2 - panelW / 2), pinch: 0.42 },
        { x: widthM / 2 - panelW / 2, pinch: 0.42 },
      ]
    : [
        { x: -widthM / 4, pinch: 0 },
        { x: widthM / 4, pinch: 0 },
      ];
  const ringCount = Math.max(3, Math.round(panelW / 0.11));
  const rod = { color: handleColor || '#2A2622', roughness: 0.4, metalness: 0.5 };

  return (
    <group>
      {/* Wall brackets and the rod with its finials */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * (rodHalf - 0.05), rodY, (rodZ - depthM / 2) / 2]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.007, 0.007, Math.max(0.01, rodZ + depthM / 2), 8]} />
            <meshStandardMaterial {...rod} />
          </mesh>
          <mesh position={[s * rodHalf, rodY, rodZ]} castShadow>
            <sphereGeometry args={[0.024, 14, 10]} />
            <meshStandardMaterial {...rod} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, rodY, rodZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[rodR, rodR, rodHalf * 2, 14]} />
        <meshStandardMaterial {...rod} />
      </mesh>
      {panels.map((p, k) => (
        <group key={k}>
          <Panel
            x={p.x}
            y={hem}
            z={rodZ}
            width={panelW}
            height={fabricH}
            folds={foldsFor(panelW)}
            amp={amp}
            pinch={p.pinch}
            material={material}
          />
          {Array.from({ length: ringCount }).map((_, i) => (
            <mesh
              key={i}
              position={[p.x + ((i + 0.5) / ringCount - 0.5) * panelW, rodY, rodZ]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[0.02, 0.0035, 6, 14]} />
              <meshStandardMaterial {...rod} />
            </mesh>
          ))}
        </group>
      ))}
      {open &&
        panels.map((p, k) => (
          // A tie-back band round each gathered panel
          <mesh
            key={`tie${k}`}
            position={[p.x, hem + fabricH * 0.42, rodZ + 0.003]}
            castShadow={false}
          >
            <boxGeometry args={[panelW * 0.62, 0.025, amp * 3.1]} />
            <meshStandardMaterial color={colors.accent} roughness={0.8} />
          </mesh>
        ))}
    </group>
  );
}
