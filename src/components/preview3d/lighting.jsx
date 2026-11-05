import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer } from '@react-three/drei';
import { Sun, Sunset, Moon } from 'lucide-react';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { degToRad } from '../../engine/geometry.js';

/** Day, evening and night lighting shared by the room and flat 3D views. */
export const LIGHT_OPTIONS = [
  { value: 'day', label: 'Day', icon: <Sun size={15} />, ariaLabel: 'Day lighting' },
  { value: 'evening', label: 'Evening', icon: <Sunset size={15} />, ariaLabel: 'Evening lighting' },
  { value: 'night', label: 'Night', icon: <Moon size={15} />, ariaLabel: 'Night lighting' },
];

/**
 * Per mode: base light levels, where the sun (or moon) stands (`sunDir`, a direction from the room),
 * how dark the soft contact shadows under furniture are, the strength of the environment light and of
 * the warm lamps.
 */
export const LIGHTING = {
  day: {
    background: null,
    ambient: [1.05, '#FAF7F0'],
    hemi: 0.65,
    sun: [1.3, '#FFF8EE'],
    fill: [0.8, 0.6],
    lamp: 0,
    sunDir: [1, 1.55, 1],
    shadowRadius: 3,
    contact: 0.38,
    blob: 0.55,
    env: 0.32,
    envTint: ['#FFFFFF', '#FFF1DC', '#DCE8F5'],
    lampLight: 0,
    glow: 0,
  },
  evening: {
    background: '#E7D2BE',
    ambient: [0.4, '#F0BE92'],
    hemi: 0.25,
    sun: [0.85, '#FF9A55'],
    fill: [0.2, 0.12],
    lamp: 0.8,
    sunDir: [1.7, 0.62, 0.55],
    shadowRadius: 5,
    contact: 0.45,
    blob: 0.6,
    env: 0.2,
    envTint: ['#FFD2A8', '#FF9A55', '#8A9FC4'],
    lampLight: 1.6,
    glow: 0.5,
  },
  night: {
    background: '#1B2233',
    ambient: [0.16, '#8CA0C8'],
    hemi: 0.1,
    sun: [0.32, '#9DB4E0'],
    fill: [0.07, 0.05],
    lamp: 1.2,
    sunDir: [-0.9, 1.3, 0.8],
    shadowRadius: 6,
    contact: 0.5,
    blob: 0.55,
    env: 0.07,
    envTint: ['#6C84B8', '#4A5E8C', '#2A3550'],
    lampLight: 3.4,
    glow: 0.85,
  },
};

const LAMP_COLOR = '#FFC47A';

/** A soft rounded halo drawn on a canvas: dark in the middle of the footprint, fading outward. */
function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 1000;
  ctx.fillStyle = '#000';
  const inset = 26;
  ctx.fillRect(inset - 1000, inset, 128 - inset * 2, 128 - inset * 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,214,150,1)');
  g.addColorStop(0.25, 'rgba(255,190,110,0.55)');
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(ctx.canvas);
}

let halo = null;
let glow = null;

/**
 * Soft shadows painted on the floor under each piece of furniture: a tight dark one for contact and a wide,
 * faint one for the occlusion of the room's light. Cheap (no extra render pass), so it also runs on Low.
 * Pieces standing on another piece (elevated) are skipped.
 */
export function FurnitureShadows({ items, roomWidthCm, roomDepthCm, strength = 0.55 }) {
  if (!halo && typeof document !== 'undefined') halo = haloTexture();
  const list = useMemo(
    () =>
      (items || [])
        .filter((it) => !it.elevationCm)
        .map((it) => {
          const def = resolveItemDef(it);
          if (!def) return null;
          return {
            id: it.id,
            x: (it.x - roomWidthCm / 2) / 100,
            z: (it.y - roomDepthCm / 2) / 100,
            rot: -degToRad(it.rotationDeg || 0),
            w: def.widthCm / 100,
            d: def.depthCm / 100,
          };
        })
        .filter(Boolean),
    [items, roomWidthCm, roomDepthCm]
  );
  if (!halo) return null;
  return (
    <group>
      {list.map((s) => (
        <group key={s.id} position={[s.x, 0.004, s.z]} rotation={[0, s.rot, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
            <planeGeometry args={[s.w + 0.42, s.d + 0.42]} />
            <meshBasicMaterial
              map={halo}
              transparent
              opacity={strength * 0.62}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} renderOrder={2}>
            <planeGeometry args={[s.w + 0.1, s.d + 0.1]} />
            <meshBasicMaterial
              map={halo}
              transparent
              opacity={strength}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Warm light and a soft glow for each lamp; on Day they are off. Capped by the quality setting. */
export function LampLights({ lamps, mode, max = 4, offset = [0, 0, 0] }) {
  const preset = LIGHTING[mode];
  if (!glow && typeof document !== 'undefined') glow = glowTexture();
  if (!preset.lampLight || !lamps.length || !glow) return null;
  return (
    <>
      {lamps.slice(0, max).map((l) => (
        <group key={l.id} position={[l.x + offset[0], l.y + offset[1], l.z + offset[2]]}>
          <pointLight
            intensity={preset.lampLight}
            distance={l.tall ? 6.5 : 4.5}
            decay={1.6}
            color={LAMP_COLOR}
          />
          <sprite scale={[l.tall ? 1.3 : 0.85, l.tall ? 1.3 : 0.85, 1]} renderOrder={5}>
            <spriteMaterial
              map={glow}
              transparent
              opacity={preset.glow}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        </group>
      ))}
    </>
  );
}

/** Soft studio light from a few panels, drawn on a canvas (nothing is downloaded). */
function SoftEnvironment({ mode }) {
  const preset = LIGHTING[mode];
  const [top, side, back] = preset.envTint;
  return (
    <Environment key={mode} resolution={128} environmentIntensity={preset.env}>
      <Lightformer
        form="rect"
        intensity={2.2}
        color={top}
        position={[0, 6, 0]}
        rotation-x={Math.PI / 2}
        scale={[10, 10, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.6}
        color={side}
        position={[6, 2.5, 1]}
        rotation-y={-Math.PI / 2}
        scale={[7, 4, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.2}
        color={back}
        position={[-6, 2, -2]}
        rotation-y={Math.PI / 2}
        scale={[8, 4, 1]}
      />
      <Lightformer
        form="rect"
        intensity={0.8}
        color={top}
        position={[0, 2, -6]}
        scale={[10, 3, 1]}
      />
    </Environment>
  );
}

/**
 * All the lights of a 3D view: ambient and sky light, the sun or moon with soft shadows, two fills, a warm
 * room lamp for evening and night, and (on High) a light environment. `span` is the long side of what is
 * shown in metres; `cx`, `cz` is its centre; `y` the height of the floor being looked at.
 */
export function SceneLights({
  mode,
  span,
  cx = 0,
  cz = 0,
  y = 0,
  settings,
  centerLamp = true,
  fullLamps = false,
}) {
  const preset = LIGHTING[mode];
  const target = useMemo(() => new THREE.Object3D(), []);
  const [dx, dy, dz] = preset.sunDir;
  const len = Math.hypot(dx, dy, dz);
  const dist = span * 2.4 + 4;
  const reach = span * 1.6 + 1;
  return (
    <>
      <ambientLight intensity={preset.ambient[0]} color={preset.ambient[1]} />
      <hemisphereLight groundColor="#E0D5C5" color="#FFFFFF" intensity={preset.hemi} />
      {settings.environment && <SoftEnvironment mode={mode} />}
      {centerLamp && preset.lamp > 0 && (
        <pointLight
          position={[cx, y + 2.3, cz]}
          intensity={preset.lamp * (fullLamps ? 0.5 : 1)}
          distance={span * 2.2}
          decay={1.4}
          color="#FFD9A0"
        />
      )}
      <primitive object={target} position={[cx, y, cz]} />
      <directionalLight
        castShadow
        target={target}
        position={[cx + (dx / len) * dist, y + (dy / len) * dist, cz + (dz / len) * dist]}
        intensity={preset.sun[0]}
        color={preset.sun[1]}
        shadow-mapSize-width={settings.shadowMap}
        shadow-mapSize-height={settings.shadowMap}
        shadow-camera-near={0.5}
        shadow-camera-far={dist * 3}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-bias={-0.0002}
        shadow-normalBias={0.04}
        shadow-radius={preset.shadowRadius}
      />
      <directionalLight
        position={[cx - span * 1.8, y + span * 2.2, cz - span * 1.8]}
        intensity={preset.fill[0]}
        color="#F5EFE6"
      />
      <directionalLight
        position={[cx + span * 1.8, y + span * 1.5, cz - span * 1.8]}
        intensity={preset.fill[1]}
        color="#FAF4EA"
      />
    </>
  );
}
