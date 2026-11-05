/** 3D models: rugs. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import React from 'react';
import { PatternedRug } from './rugsPatterned.jsx';
import { usesPatternModel } from '../patterns.js';

export function RugModel({ def, widthM, depthM, heightM, mainColor }) {
  if (usesPatternModel(def)) {
    return (
      <PatternedRug
        def={def}
        widthM={widthM}
        depthM={depthM}
        heightM={heightM}
        mainColor={mainColor}
      />
    );
  }
  const rugThick = 0.012;
  const b1W = widthM * 0.86;
  const b1D = depthM * 0.88;
  const b2W = widthM * 0.74;
  const b2D = depthM * 0.78;
  const medRadius = Math.min(widthM, depthM) * 0.22;
  const subCol = def.subColor || '#D4A359';
  const accCol = def.accentColor || '#1B2A4A';
  const mainCol = mainColor || '#8B1E1E';
  return (
    <group position={[0, rugThick / 2, 0]}>
      {/* Main crimson base */}
      <mesh receiveShadow>
        <boxGeometry args={[widthM, rugThick, depthM]} />
        <meshStandardMaterial color={mainCol} roughness={0.96} />
      </mesh>
      {/* Navy border band */}
      <mesh receiveShadow position={[0, 0.0006, 0]}>
        <boxGeometry args={[b1W, rugThick + 0.0012, b1D]} />
        <meshStandardMaterial color={accCol} roughness={0.94} />
      </mesh>
      {/* Inner crimson field */}
      <mesh receiveShadow position={[0, 0.0012, 0]}>
        <boxGeometry args={[b2W, rugThick + 0.0024, b2D]} />
        <meshStandardMaterial color={mainCol} roughness={0.96} />
      </mesh>
      {/* 4 corner gold diamonds - rotationOrder="ZXY" ensures plane lies completely flat on floor before 45-deg diamond spin */}
      {[
        [-b2W / 2 + 0.18, -b2D / 2 + 0.18],
        [b2W / 2 - 0.18, -b2D / 2 + 0.18],
        [-b2W / 2 + 0.18, b2D / 2 - 0.18],
        [b2W / 2 - 0.18, b2D / 2 - 0.18],
      ].map(([cx, cz], idx) => (
        <mesh
          key={`rug-cor-${idx}`}
          receiveShadow
          position={[cx, rugThick / 2 + 0.003, cz]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
          rotationOrder="ZXY"
        >
          <planeGeometry args={[0.16, 0.16]} />
          <meshStandardMaterial color={subCol} roughness={0.8} />
        </mesh>
      ))}
      {/* Central navy medallion disc */}
      <mesh receiveShadow position={[0, rugThick / 2 + 0.0032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[medRadius, 32]} />
        <meshStandardMaterial color={accCol} roughness={0.92} />
      </mesh>
      {/* Gold mandala ring */}
      <mesh receiveShadow position={[0, rugThick / 2 + 0.0036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[medRadius * 0.72, medRadius * 0.92, 32]} />
        <meshStandardMaterial color={subCol} roughness={0.8} />
      </mesh>
      {/* Gold diamond lotus motif - rotationOrder="ZXY" keeps diamond perfectly flat on medallion */}
      <mesh
        receiveShadow
        position={[0, rugThick / 2 + 0.004, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        rotationOrder="ZXY"
      >
        <planeGeometry args={[medRadius * 0.65, medRadius * 0.65]} />
        <meshStandardMaterial color={subCol} roughness={0.8} />
      </mesh>
      {/* Center crimson core */}
      <mesh receiveShadow position={[0, rugThick / 2 + 0.0044, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[medRadius * 0.22, 24]} />
        <meshStandardMaterial color={mainCol} roughness={0.9} />
      </mesh>
      {/* Fringes north & south - nested flush within rug depth */}
      {[-depthM / 2 + 0.015, depthM / 2 - 0.015].map((fz, idx) => (
        <mesh key={`rug-fr-${idx}`} receiveShadow position={[0, 0.001, fz]}>
          <boxGeometry args={[widthM * 0.96, 0.004, 0.03]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export function RugRunnerModel({ def, widthM, depthM, heightM, mainColor }) {
  if (usesPatternModel(def)) {
    return (
      <PatternedRug
        def={def}
        widthM={widthM}
        depthM={depthM}
        heightM={heightM}
        mainColor={mainColor}
      />
    );
  }
  const runnerThick = 0.012; // 1.2cm plush runner pile
  const b1W = widthM * 0.82;
  const b1D = depthM * 0.94;
  const b2W = widthM * 0.72;
  const b2D = depthM * 0.92;
  const subCol = def.subColor || '#C49746';
  const accCol = def.accentColor || '#8A2020';
  const mainCol = mainColor || '#1E2D42';

  return (
    <group position={[0, runnerThick / 2, 0]}>
      {/* Main Outer Indigo Blue Wool Pile */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[widthM, runnerThick, depthM]} />
        <meshStandardMaterial color={mainCol} roughness={0.96} />
      </mesh>
      {/* Outer Gold Border Ribbon */}
      <mesh receiveShadow position={[0, 0.0004, 0]}>
        <boxGeometry args={[b1W, runnerThick + 0.0008, b1D]} />
        <meshStandardMaterial color={subCol} roughness={0.8} />
      </mesh>
      {/* Inner Indigo Runner Field */}
      <mesh receiveShadow position={[0, 0.0008, 0]}>
        <boxGeometry args={[b2W, runnerThick + 0.0016, b2D]} />
        <meshStandardMaterial color={mainCol} roughness={0.96} />
      </mesh>
      {/* Repeating Center Diamond Medallions along runner */}
      {[-depthM * 0.35, -depthM * 0.12, depthM * 0.12, depthM * 0.35].map((dz, idx) => (
        <group key={`run-d-${idx}`} position={[0, runnerThick / 2 + 0.003, dz]}>
          {/* Gold Diamond Outer - rotationOrder="ZXY" ensures plane lies completely flat on floor before 45-deg diamond spin */}
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, Math.PI / 4]} rotationOrder="ZXY">
            <planeGeometry args={[widthM * 0.38, widthM * 0.38]} />
            <meshStandardMaterial color={subCol} roughness={0.8} />
          </mesh>
          {/* Ruby Crimson Inner Diamond */}
          <mesh
            receiveShadow
            position={[0, 0.0006, 0]}
            rotation={[-Math.PI / 2, 0, Math.PI / 4]}
            rotationOrder="ZXY"
          >
            <planeGeometry args={[widthM * 0.26, widthM * 0.26]} />
            <meshStandardMaterial color={accCol} roughness={0.85} />
          </mesh>
          {/* Center Lokta White Bead */}
          <mesh receiveShadow position={[0, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.002, 16]} />
            <meshStandardMaterial color="#FAF6EE" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* End Fringes at North & South - contained within runner footprint */}
      {[-depthM / 2 + 0.015, depthM / 2 - 0.015].map((fz, idx) => (
        <mesh key={`run-fr-${idx}`} receiveShadow position={[0, 0.001, fz]}>
          <boxGeometry args={[widthM * 0.94, 0.004, 0.025]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export function NepaliDhakaRugModel({
  def,
  widthM,
  depthM,
  heightM,
  mainColor,
  accentColor,
  subColor,
}) {
  if (usesPatternModel(def)) {
    return (
      <PatternedRug
        def={def}
        widthM={widthM}
        depthM={depthM}
        heightM={heightM}
        mainColor={mainColor}
      />
    );
  }
  const tile = 0.28;
  const cols = Math.max(4, Math.floor(widthM / tile));
  const rows = Math.max(4, Math.floor(depthM / tile));
  return (
    <group>
      <mesh position={[0, heightM / 2, 0]} receiveShadow>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={mainColor} roughness={0.95} />
      </mesh>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (((i % cols) + 0.5) * widthM) / cols - widthM / 2,
            heightM + 0.002,
            ((Math.floor(i / cols) + 0.5) * depthM) / rows - depthM / 2,
          ]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
          receiveShadow
        >
          <planeGeometry args={[0.12, 0.12]} />
          <meshStandardMaterial color={i % 2 ? accentColor : subColor} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
