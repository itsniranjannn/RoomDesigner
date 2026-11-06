/**
 * classicShapes.jsx
 * Ornate and framed furniture read from real-room photos: a carved wood headboard around a tufted leather panel,
 * a sleigh footboard, bun feet; seating with an exposed carved wood frame, gold trim, cabriole legs, cane side
 * panels and scatter cushions; coffee tables with a polished top and gold trim. All in the same plain parts as the
 * rest of the catalog (extruded outlines, rounded pads, balls), drawn from the design record's traits.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { Box, Pad, Cyl, Ball, Pillow, shade, clamp } from './shared.jsx';

const GOLD = '#c9a24a';

const textureCache = new Map();

/** A small damask-like floral repeat: a lattice of medallions with petals, in the cloth colour and a lighter and darker tone. */
export function floralTexture(base) {
  if (typeof document === 'undefined') return null;
  if (textureCache.has(base)) return textureCache.get(base);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const light = shade(base, 0.09);
  const dark = shade(base, -0.1);
  const bloom = (cx, cy, r) => {
    ctx.fillStyle = light;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(a) * r * 0.55,
        cy + Math.sin(a) * r * 0.55,
        r * 0.42,
        r * 0.2,
        a,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  };
  bloom(32, 32, 24);
  bloom(96, 96, 24);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 0);
  ctx.quadraticCurveTo(80, 32, 64, 64);
  ctx.quadraticCurveTo(48, 96, 64, 128);
  ctx.stroke();
  for (const [x, y] of [
    [96, 32],
    [32, 96],
  ]) {
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 7, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (textureCache.size > 24) textureCache.delete(textureCache.keys().next().value);
  textureCache.set(base, texture);
  return texture;
}

/** A padded box in cloth: plain colour, or the floral repeat when the upholstery is patterned. */
function FPad({ position, size, radius = 0.05, color, roughness = 0.88, rotation, pattern }) {
  const map = pattern ? floralTexture(color) : null;
  if (!map)
    return (
      <Pad
        position={position}
        size={size}
        radius={radius}
        color={color}
        roughness={roughness}
        rotation={rotation}
      />
    );
  const r = Math.max(0.002, Math.min(radius, Math.min(...size) / 2 - 0.001));
  return (
    <RoundedBox
      position={position}
      rotation={rotation}
      args={size}
      radius={r}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color="#ffffff" map={map} roughness={roughness} />
    </RoundedBox>
  );
}

/** Outline (x, y) of a headboard: flat shoulders with a crest rising in the middle (arch) or with scrolls. */
export function headboardOutline(width, shoulderY, peakY, crest, y0 = 0) {
  const pts = [];
  const half = width / 2;
  const steps = 48;
  pts.push([-half, y0]);
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 - 1; // -1..1
    const u = Math.abs(t);
    let y = shoulderY;
    if (crest) {
      const span = crest === 2 ? 0.7 : 0.62;
      if (u < span) {
        const v = u / span;
        y += (peakY - shoulderY) * Math.pow(Math.max(0, 1 - v * v), 1.4);
        // scrolled crest: a notch each side of the middle and a rolled ear at the shoulder
        if (crest === 2) y += (peakY - shoulderY) * 0.07 * Math.cos(v * Math.PI * 3);
      } else if (crest === 2 && u < 0.86) {
        y += (peakY - shoulderY) * 0.09 * Math.sin(((u - span) / (0.86 - span)) * Math.PI);
      }
    }
    pts.push([t * half, y]);
  }
  pts.push([half, y0]);
  return pts;
}

function ExtrudedOutline({ points, depth, position, color, roughness = 0.5, bevel = 0.012 }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 4,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [points, depth, bevel]);
  return (
    <mesh position={position} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

/**
 * Carved headboard: a wood frame in the silhouette read from the photo (flat, arched or scrolled), with the panel
 * set inside it (leather, tufted with buttons) and carved ornaments along the crest.
 */
export function ClassicHeadboard({
  widthM,
  depthM,
  heightM,
  footH,
  mattressTop,
  hb,
  wood,
  panel,
  crest,
  tufted,
  framed,
}) {
  const z = -depthM / 2 + hb / 2;
  const shoulderY = clamp(
    mattressTop + (heightM - mattressTop) * (crest ? 0.62 : 1),
    mattressTop + 0.12,
    heightM
  );
  const frame = useMemo(
    () => headboardOutline(widthM + 0.04, shoulderY, heightM, crest, footH),
    [widthM, shoulderY, heightM, crest, footH]
  );
  const border = framed ? 0.075 : 0.0;
  const inner = useMemo(
    () =>
      headboardOutline(
        widthM - 2 * border,
        shoulderY - border,
        heightM - border * (crest ? 1.6 : 1),
        crest,
        mattressTop - 0.04
      ),
    [widthM, shoulderY, heightM, crest, border, mattressTop]
  );
  const buttonColor = shade(panel, -0.12);
  const lift = shade(panel, 0.04);
  const buttons = useMemo(() => {
    if (!tufted) return [];
    const out = [];
    const step = clamp(widthM / 9, 0.07, 0.13);
    const innerW = widthM - 2 * border;
    const yTop = (x) => {
      const u = Math.abs(x) / (innerW / 2);
      const span = crest === 2 ? 0.7 : 0.62;
      let y = shoulderY - border;
      if (crest && u < span)
        y +=
          (heightM - border * 1.6 - (shoulderY - border)) *
          Math.pow(Math.max(0, 1 - (u / span) ** 2), 1.4);
      return y;
    };
    let row = 0;
    for (let y = mattressTop + 0.1; y < heightM - 0.06; y += step * 0.85, row++) {
      const off = row % 2 ? step / 2 : 0;
      for (let x = -innerW / 2 + step * 0.7 + off; x < innerW / 2 - step * 0.5; x += step)
        if (y < yTop(x) - 0.07) out.push([x, y]);
    }
    return out;
  }, [tufted, widthM, border, crest, shoulderY, heightM, mattressTop]);
  const zFace = -depthM / 2 + hb + 0.012;
  return (
    <group name="headboard">
      <ExtrudedOutline
        points={frame}
        depth={hb}
        position={[0, 0, z]}
        color={wood}
        roughness={0.42}
      />
      {(framed || tufted) && (
        <ExtrudedOutline
          points={inner}
          depth={0.04}
          bevel={0.008}
          position={[0, 0, zFace - 0.02]}
          color={panel}
          roughness={0.55}
        />
      )}
      {buttons.map(([x, y], i) => (
        <Ball
          key={i}
          position={[x, y, zFace + 0.012]}
          radius={0.014}
          scale={[1, 1, 0.6]}
          color={buttonColor}
          roughness={0.35}
          segments={8}
          castShadow={false}
        />
      ))}
      {tufted &&
        buttons.length > 0 &&
        buttons.map(([x, y], i) => (
          <Box
            key={`r${i}`}
            position={[x, y, zFace + 0.004]}
            size={[0.07, 0.07, 0.002]}
            rotation={[0, 0, Math.PI / 4]}
            color={lift}
            roughness={0.7}
            castShadow={false}
          />
        ))}
      {crest > 0 && (
        <group position={[0, heightM - 0.01, -depthM / 2 + hb + 0.01]}>
          <Ball
            position={[0, 0.0, 0]}
            radius={0.03}
            scale={[1.3, 1, 0.6]}
            color={wood}
            roughness={0.4}
          />
          {[-1, 1].map((s) => (
            <Ball
              key={s}
              position={[s * 0.09, -0.05, 0]}
              radius={0.022}
              scale={[1.2, 1, 0.6]}
              color={shade(wood, 0.05)}
              roughness={0.4}
            />
          ))}
        </group>
      )}
    </group>
  );
}

/** A sleigh footboard: a deep board whose top dips between rolled ends, with a panel set into its face. */
export function SleighFootboard({ widthM, z, footH, topY, thick, wood }) {
  const points = useMemo(() => {
    const half = widthM / 2;
    const out = [[-half, footH]];
    const steps = 36;
    const end = topY;
    const mid = topY - 0.1;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1;
      const u = Math.abs(t);
      out.push([t * half, mid + (end - mid) * Math.pow(u, 2.4)]);
    }
    out.push([half, footH]);
    return out;
  }, [widthM, footH, topY]);
  const panel = useMemo(() => {
    const half = widthM / 2 - 0.1;
    const out = [[-half, footH + 0.07]];
    const steps = 30;
    const mid = topY - 0.17;
    const end = topY - 0.07;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 - 1;
      out.push([t * half, mid + (end - mid) * Math.pow(Math.abs(t), 2.4)]);
    }
    out.push([half, footH + 0.07]);
    return out;
  }, [widthM, footH, topY]);
  return (
    <group name="footboard">
      <ExtrudedOutline
        points={points}
        depth={thick}
        position={[0, 0, z]}
        color={wood}
        roughness={0.42}
      />
      <ExtrudedOutline
        points={panel}
        depth={0.02}
        bevel={0.008}
        position={[0, 0, z + thick / 2 + 0.006]}
        color={shade(wood, 0.04)}
        roughness={0.4}
      />
      {[-1, 1].map((s) => (
        <Ball
          key={s}
          position={[s * (widthM / 2 - 0.03), topY - 0.01, z]}
          radius={0.065}
          scale={[1, 0.9, 1.1]}
          color={shade(wood, -0.03)}
          roughness={0.4}
        />
      ))}
    </group>
  );
}

/** Round bun feet (flattened balls) at the corners of a bed or chest. */
export function BunFeet({ widthM, depthM, inset = 0.08, radius = 0.06, color }) {
  return (
    <group name="bun-feet">
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Ball
            key={`${sx}${sz}`}
            position={[sx * (widthM / 2 - inset), radius * 0.85, sz * (depthM / 2 - inset)]}
            radius={radius}
            scale={[1, 0.95, 1]}
            color={color}
            roughness={0.4}
            segments={14}
          />
        ))
      )}
    </group>
  );
}

/**
 * A cabriole leg: a bowed, tapered leg that curves out at the knee and in at the ankle, ending in a small foot.
 * Drawn from a lathe-like stack of short cylinders along an S curve.
 */
export function CabrioleLeg({
  position,
  height,
  thick = 0.05,
  dir = [0, 0],
  color,
  trim = GOLD,
  showTrim = true,
}) {
  const segs = 10;
  const parts = [];
  for (let i = 0; i < segs; i++) {
    const t = (i + 0.5) / segs; // 0 at the foot, 1 at the knee
    const swing = Math.sin(t * Math.PI) * 0.045;
    const r = thick * (0.38 + 0.62 * Math.pow(t, 1.4)) + (t > 0.85 ? thick * 0.2 : 0);
    parts.push(
      <Cyl
        key={i}
        position={[dir[0] * (swing + t * 0.02), t * height, dir[1] * (swing + t * 0.02)]}
        radiusTop={Math.max(0.01, r * 1.05)}
        radiusBottom={Math.max(0.01, r)}
        height={height / segs + 0.004}
        color={color}
        roughness={0.35}
        segments={12}
      />
    );
  }
  return (
    <group position={position}>
      {parts}
      <Ball
        position={[0, 0.012, 0]}
        radius={thick * 0.55}
        scale={[1, 0.5, 1]}
        color={shade(color, -0.04)}
        roughness={0.3}
      />
      {showTrim && (
        <Ball
          position={[dir[0] * 0.03, height * 0.82, dir[1] * 0.03]}
          radius={thick * 0.45}
          scale={[1, 1.2, 0.6]}
          color={trim}
          roughness={0.3}
          metalness={0.6}
        />
      )}
    </group>
  );
}

/** Cane webbing on a panel: a frame with a diamond lattice (two sets of thin rods) over a darker backing. */
export function CanePanel({ position, size, rotation, cane = '#d8bf8e', frame = '#6b4426' }) {
  const [w, h] = size;
  const gap = 0.03;
  const nx = Math.max(3, Math.floor(w / gap));
  const ny = Math.max(3, Math.floor(h / gap));
  return (
    <group position={position} rotation={rotation}>
      <Box
        position={[0, 0, 0]}
        size={[w, h, 0.006]}
        color={shade(cane, -0.12)}
        roughness={0.85}
        castShadow={false}
      />
      {Array.from({ length: Math.min(nx, 18) }).map((_, i, a) => (
        <Box
          key={`v${i}`}
          position={[-w / 2 + (w * (i + 0.5)) / a.length, 0, 0.004]}
          size={[0.004, h, 0.003]}
          color={cane}
          roughness={0.9}
          castShadow={false}
        />
      ))}
      {Array.from({ length: Math.min(ny, 18) }).map((_, i, a) => (
        <Box
          key={`h${i}`}
          position={[0, -h / 2 + (h * (i + 0.5)) / a.length, 0.006]}
          size={[w, 0.004, 0.003]}
          color={cane}
          roughness={0.9}
          castShadow={false}
        />
      ))}
      {/* rim */}
      <Box
        position={[0, h / 2 - 0.012, 0.004]}
        size={[w, 0.024, 0.014]}
        color={frame}
        roughness={0.5}
      />
      <Box
        position={[0, -h / 2 + 0.012, 0.004]}
        size={[w, 0.024, 0.014]}
        color={frame}
        roughness={0.5}
      />
      <Box
        position={[-w / 2 + 0.012, 0, 0.004]}
        size={[0.024, h, 0.014]}
        color={frame}
        roughness={0.5}
      />
      <Box
        position={[w / 2 - 0.012, 0, 0.004]}
        size={[0.024, h, 0.014]}
        color={frame}
        roughness={0.5}
      />
    </group>
  );
}

/** Scatter cushions leaning on the back of a seat, in their own colour. */
export function ScatterCushions({ count, widthM, y, z, size = 0.38, color, accent }) {
  const n = clamp(Math.round(count), 0, 6);
  if (!n) return null;
  return (
    <group name="scatter">
      {Array.from({ length: n }).map((_, i) => {
        const x = n === 1 ? 0 : -widthM * 0.34 + (widthM * 0.68 * i) / (n - 1);
        const tilt = (i % 2 ? -1 : 1) * 0.08;
        return (
          <Pillow
            key={i}
            position={[x, y + size * 0.42, z]}
            size={[size, 0.12, size * 0.92]}
            color={i % 2 && accent ? accent : color}
            rotation={[-1.05, tilt, tilt * 0.6]}
          />
        );
      })}
    </group>
  );
}

/**
 * Classic upholstered seating (sofa, loveseat, armchair): an exposed carved wood frame under and around the
 * upholstery, rolled scroll arms, a crest along the back, cabriole or tapered legs, cane side panels, gold
 * trim and scatter cushions. `frame` is 1 for an exposed frame, 2 for a carved one with a crest.
 */
export function ClassicSeat({
  widthM,
  depthM,
  heightM,
  seats,
  armRatio,
  wood,
  fabric,
  cushion,
  trim,
  scatterColor,
  scatter,
  frame,
  legs,
  cane,
  roll,
  tufted,
  pattern,
  seatH = 0.44,
  armH = 0.62,
}) {
  const armW = clamp(widthM * armRatio, 0.08, 0.2);
  const innerW = widthM - armW * 2;
  const backT = depthM * (cane ? 0.14 : 0.2);
  const footH = legs === 'cabriole' ? 0.2 : 0.17;
  const seatW = innerW / Math.max(1, seats);
  const caned = !!cane;
  const trimOn = !!trim;
  const upholsteryTop = heightM - (frame === 2 ? 0.05 : 0.02);
  return (
    <group name="classic-seat">
      {/* base rail frame in wood */}
      <Box
        position={[0, footH + 0.03, 0]}
        size={[widthM, 0.06, depthM]}
        color={wood}
        roughness={0.4}
      />
      <Box
        position={[0, footH + 0.075, depthM / 2 - 0.02]}
        size={[widthM, 0.04, 0.04]}
        color={shade(wood, 0.04)}
        roughness={0.4}
      />
      {/* legs */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) =>
          legs === 'cabriole' ? (
            <CabrioleLeg
              key={`${sx}${sz}`}
              position={[sx * (widthM / 2 - 0.06), 0, sz * (depthM / 2 - 0.06)]}
              height={footH + 0.04}
              thick={0.052}
              dir={[sx * 0.5, sz * 0.5]}
              color={wood}
              trim={trim || GOLD}
              showTrim={trimOn}
            />
          ) : (
            <Cyl
              key={`${sx}${sz}`}
              position={[sx * (widthM / 2 - 0.05), footH / 2, sz * (depthM / 2 - 0.05)]}
              radiusTop={0.032}
              radiusBottom={0.016}
              height={footH + 0.02}
              color={wood}
              roughness={0.45}
              segments={14}
              rotation={[-sz * 0.12, 0, sx * 0.12]}
            />
          )
        )
      )}
      {/* arms: upholstered scrolls, or an open wood frame with a cane panel */}
      {[-1, 1].map((s) =>
        caned ? (
          <group key={s}>
            <Box
              position={[s * (widthM / 2 - 0.02), armH - 0.02, 0]}
              size={[0.05, 0.045, depthM - 0.02]}
              color={wood}
              roughness={0.42}
            />
            <Box
              position={[s * (widthM / 2 - 0.02), (footH + armH) / 2 - 0.04, depthM / 2 - 0.03]}
              size={[0.04, armH - footH - 0.06, 0.04]}
              color={wood}
              roughness={0.42}
            />
            <Box
              position={[s * (widthM / 2 - 0.02), (footH + armH) / 2 - 0.04, -depthM / 2 + backT]}
              size={[0.04, armH - footH - 0.06, 0.04]}
              color={wood}
              roughness={0.42}
            />
            <CanePanel
              position={[s * (widthM / 2 - 0.02), (footH + seatH) / 2 + 0.08, 0]}
              size={[depthM - backT - 0.08, armH - footH - 0.1]}
              rotation={[0, Math.PI / 2, 0]}
              cane="#d9c18f"
              frame={wood}
            />
          </group>
        ) : (
          <group key={s}>
            <FPad
              pattern={pattern}
              position={[s * (widthM / 2 - armW / 2), (footH + armH) / 2, 0.02]}
              size={[armW, armH - footH, depthM - 0.04]}
              radius={roll ? Math.min(0.1, armW / 2.05) : 0.05}
              color={fabric}
              roughness={0.85}
            />
            {roll && (
              <Cyl
                position={[s * (widthM / 2 - armW / 2), armH + 0.01, depthM / 2 - 0.05]}
                radiusTop={armW * 0.5}
                height={armW * 0.9}
                color={fabric}
                roughness={0.85}
                rotation={[0, 0, Math.PI / 2]}
              />
            )}
            {frame >= 1 && (
              <Box
                position={[s * (widthM / 2 - 0.012), armH - 0.05, 0.02]}
                size={[0.024, 0.04, depthM - 0.06]}
                color={wood}
                roughness={0.4}
              />
            )}
          </group>
        )
      )}
      {/* back: upholstered, with a carved wood top rail and crest when the frame is carved */}
      <FPad
        pattern={pattern}
        position={[0, (footH + upholsteryTop) / 2 + 0.03, -depthM / 2 + backT / 2]}
        size={[widthM - (caned ? 0.04 : 0), upholsteryTop - footH - 0.04, backT]}
        radius={0.05}
        color={fabric}
        roughness={0.85}
      />
      {frame >= 1 && (
        <Box
          position={[0, heightM - 0.015, -depthM / 2 + backT / 2]}
          size={[widthM, 0.036, backT + 0.02]}
          color={wood}
          roughness={0.4}
        />
      )}
      {frame === 2 && (
        <group position={[0, heightM, -depthM / 2 + backT / 2]}>
          <Ball
            position={[0, 0.045, 0]}
            radius={0.055}
            scale={[1.5, 1, 0.5]}
            color={wood}
            roughness={0.4}
          />
          {trimOn && (
            <Ball
              position={[0, 0.07, 0.01]}
              radius={0.028}
              scale={[1.2, 1, 0.5]}
              color={trim}
              roughness={0.3}
              metalness={0.6}
            />
          )}
          {[-1, 1].map((s) => (
            <Ball
              key={s}
              position={[s * widthM * 0.3, 0.012, 0]}
              radius={0.032}
              scale={[1.6, 0.7, 0.6]}
              color={shade(wood, 0.03)}
              roughness={0.4}
            />
          ))}
        </group>
      )}
      {/* seat cushions: one long one for a sofa with a thin seam per seat */}
      {Array.from({ length: Math.max(1, seats) }).map((_, i) => (
        <FPad
          pattern={pattern}
          key={i}
          position={[-innerW / 2 + seatW * (i + 0.5), seatH - 0.07, backT / 2 + 0.01]}
          size={[seatW - 0.012, 0.14, depthM - backT - 0.02]}
          radius={0.05}
          color={cushion}
          roughness={0.85}
        />
      ))}
      {tufted &&
        Array.from({ length: Math.max(2, Math.round(innerW / 0.2)) }).map((_, i, a) => (
          <Ball
            key={i}
            position={[
              -innerW / 2 + (innerW * (i + 0.5)) / a.length,
              heightM - 0.2,
              -depthM / 2 + backT + 0.005,
            ]}
            radius={0.012}
            scale={[1, 1, 0.5]}
            color={shade(fabric, -0.18)}
            segments={8}
            castShadow={false}
          />
        ))}
      {/* loose back cushions */}
      {Array.from({ length: Math.max(1, seats) }).map((_, i) => (
        <group
          key={i}
          position={[
            -innerW / 2 + seatW * (i + 0.5),
            seatH + (heightM - seatH - 0.1) / 2,
            -depthM / 2 + backT + 0.07,
          ]}
          rotation={[-0.2, 0, 0]}
        >
          <FPad
            pattern={pattern}
            size={[seatW - 0.03, heightM - seatH - 0.12, 0.13]}
            radius={0.05}
            color={cushion}
            roughness={0.85}
          />
        </group>
      ))}
      {/* gold trim along the front rail */}
      {trimOn && (
        <Box
          position={[0, footH + 0.06, depthM / 2 + 0.002]}
          size={[widthM - 0.1, 0.016, 0.006]}
          color={trim}
          roughness={0.3}
          metalness={0.6}
          castShadow={false}
        />
      )}
      <ScatterCushions
        count={scatter}
        widthM={innerW}
        y={seatH}
        z={-depthM / 2 + backT + 0.2}
        size={clamp(seatW * 0.5, 0.3, 0.45)}
        color={scatterColor || cushion}
        accent={scatterColor ? shade(scatterColor, -0.08) : null}
      />
    </group>
  );
}

/** Coffee table with a polished top (optionally dark), a carved apron with gold trim and cabriole or turned legs. */
export function ClassicTable({ widthM, depthM, heightM, topColor, wood, trim, legs, topH = 0.04 }) {
  const apronH = Math.min(0.1, heightM * 0.22);
  const legH = heightM - topH - 0.01;
  const inset = 0.07;
  return (
    <group name="classic-table">
      <Pad
        position={[0, heightM - topH / 2, 0]}
        size={[widthM, topH, depthM]}
        radius={0.012}
        color={topColor}
        roughness={0.18}
      />
      <Box
        position={[0, heightM - topH - apronH / 2, 0]}
        size={[widthM - 0.1, apronH, depthM - 0.1]}
        color={wood}
        roughness={0.35}
      />
      {trim && (
        <>
          <Box
            position={[0, heightM - topH - apronH * 0.5, depthM / 2 - 0.045]}
            size={[widthM - 0.2, 0.03, 0.01]}
            color={trim}
            roughness={0.3}
            metalness={0.6}
            castShadow={false}
          />
          <Box
            position={[0, heightM - topH - apronH * 0.5, -depthM / 2 + 0.045]}
            size={[widthM - 0.2, 0.03, 0.01]}
            color={trim}
            roughness={0.3}
            metalness={0.6}
            castShadow={false}
          />
          <Box
            position={[widthM / 2 - 0.045, heightM - topH - apronH * 0.5, 0]}
            size={[0.01, 0.03, depthM - 0.2]}
            color={trim}
            roughness={0.3}
            metalness={0.6}
            castShadow={false}
          />
          <Box
            position={[-widthM / 2 + 0.045, heightM - topH - apronH * 0.5, 0]}
            size={[0.01, 0.03, depthM - 0.2]}
            color={trim}
            roughness={0.3}
            metalness={0.6}
            castShadow={false}
          />
        </>
      )}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) =>
          legs === 'cabriole' ? (
            <CabrioleLeg
              key={`${sx}${sz}`}
              position={[sx * (widthM / 2 - inset), 0, sz * (depthM / 2 - inset)]}
              height={legH}
              thick={0.075}
              dir={[sx * 0.6, sz * 0.6]}
              color={wood}
              trim={trim || GOLD}
              showTrim={!!trim}
            />
          ) : (
            <Cyl
              key={`${sx}${sz}`}
              position={[sx * (widthM / 2 - inset), legH / 2, sz * (depthM / 2 - inset)]}
              radiusTop={0.035}
              radiusBottom={0.022}
              height={legH}
              color={wood}
              roughness={0.35}
              segments={14}
            />
          )
        )
      )}
    </group>
  );
}
