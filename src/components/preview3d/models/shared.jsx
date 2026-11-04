import React from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';

/** Small mesh helpers shared by the 3D models (position is the center of the part, in meters). */
export function Box({
  position,
  size,
  color,
  roughness = 0.8,
  metalness = 0,
  rotation,
  castShadow = true,
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Box with softened edges for cushions, mattresses and padded seats. */
export function Pad({ position, size, radius = 0.025, color, roughness = 0.88, rotation }) {
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
      <meshStandardMaterial color={color} roughness={roughness} />
    </RoundedBox>
  );
}

/** Upright cylinder; radiusTop/radiusBottom allow tapered pots and baskets. */
export function Cyl({
  position,
  radiusTop,
  radiusBottom = radiusTop,
  height,
  color,
  roughness = 0.7,
  metalness = 0,
  segments = 24,
  castShadow = true,
  rotation,
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, segments]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Direction, midpoint and length of a rod between two points (used by Strut). */
export function strutTransform(from, to) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const length = dir.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    length > 0 ? dir.normalize() : new THREE.Vector3(0, 1, 0)
  );
  return { position: a.add(b).multiplyScalar(0.5).toArray(), quaternion, length };
}

/** Round rod running between two points, for frames, easels and splayed legs. */
export function Strut({ from, to, radius = 0.012, color, roughness = 0.5, metalness = 0 }) {
  const { position, quaternion, length } = strutTransform(from, to);
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Four square legs placed inset from the corners of a widthM x depthM footprint. */
export function CornerLegs({
  widthM,
  depthM,
  height,
  thick = 0.05,
  inset = 0.04,
  color,
  roughness = 0.6,
}) {
  const lx = widthM / 2 - inset - thick / 2;
  const lz = depthM / 2 - inset - thick / 2;
  return [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ].map(([x, z], idx) => (
    <Box
      key={idx}
      position={[x, height / 2, z]}
      size={[thick, height, thick]}
      color={color}
      roughness={roughness}
    />
  ));
}

/** Corner positions [x, z] of a footprint inset by `inset` meters. */
export function corners(widthM, depthM, inset) {
  const x = widthM / 2 - inset;
  const z = depthM / 2 - inset;
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
}

/* ------------------------------------------------------------------ */
/* Shared materials and small-detail parts (taps, knobs, handles ...)  */
/* ------------------------------------------------------------------ */

/** PBR-ish presets: spread them onto Box / Cyl / Ball (color, roughness, metalness). */
export const CHROME = { color: '#EEF1F3', roughness: 0.2, metalness: 0.5 };
export const STEEL = { color: '#B8BEC3', roughness: 0.35, metalness: 0.6 };
export const BRASS = { color: '#C9A24A', roughness: 0.3, metalness: 0.7 };
export const BLACK_PLASTIC = { color: '#202225', roughness: 0.5, metalness: 0.1 };
export const RUBBER = { color: '#2A2B2E', roughness: 0.92, metalness: 0 };
export const CERAMIC = { roughness: 0.14, metalness: 0 };
export const DARK_GAP = '#171310';
export const GLASS_TINT = '#BFD9E4';
export const FABRIC_ROUGHNESS = 0.95;

/** Clamp a detail dimension to sane absolute limits so hardware never balloons or vanishes. */
export function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/** A colour nudged lighter (positive) or darker (negative) in lightness. */
export function shade(color, amount) {
  return new THREE.Color(color).offsetHSL(0, 0, amount).getStyle();
}

/** Sphere for knobs, buttons, finials and rounded detail. */
export function Ball({
  position,
  radius,
  color,
  roughness = 0.4,
  metalness = 0,
  segments = 10,
  scale,
  castShadow = true,
}) {
  return (
    <mesh position={position} scale={scale} castShadow={castShadow}>
      <sphereGeometry args={[radius, segments, Math.max(6, segments - 2)]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Cylinder lying along the z axis (front-facing knobs, pipes running front to back). */
export function ZCyl({ position, radius, length, ...rest }) {
  return (
    <Cyl
      position={position}
      radiusTop={radius}
      height={length}
      rotation={[Math.PI / 2, 0, 0]}
      {...rest}
    />
  );
}

/** Cylinder lying along the x axis (towel rails, handles, pipes running left to right). */
export function XCyl({ position, radius, length, ...rest }) {
  return (
    <Cyl
      position={position}
      radiusTop={radius}
      height={length}
      rotation={[0, 0, Math.PI / 2]}
      {...rest}
    />
  );
}

/** Rotary knob with a pointer line. facing "front" sits on a vertical face, "up" on a top panel. */
export function Knob({
  position,
  radius = 0.017,
  depth = 0.02,
  facing = 'front',
  color = STEEL.color,
  roughness = STEEL.roughness,
  metalness = STEEL.metalness,
  tick = true,
}) {
  const r = clamp(radius, 0.008, 0.04);
  const d = clamp(depth, 0.008, 0.04);
  const front = facing === 'front';
  return (
    <group name="knob" position={position}>
      <Cyl
        position={[0, 0, 0]}
        radiusTop={r}
        radiusBottom={r * 1.08}
        height={d}
        color={color}
        roughness={roughness}
        metalness={metalness}
        segments={14}
        rotation={front ? [Math.PI / 2, 0, 0] : undefined}
      />
      {tick && (
        <Box
          position={front ? [0, r * 0.45, d / 2 + 0.001] : [0, d / 2 + 0.001, -r * 0.45]}
          size={front ? [r * 0.18, r * 0.7, 0.002] : [r * 0.18, 0.002, r * 0.7]}
          color={BLACK_PLASTIC.color}
          castShadow={false}
        />
      )}
    </group>
  );
}

/** Bar handle on a front face (faces +z): two posts and a grip. Vertical by default. */
export function Pull({
  position,
  length = 0.12,
  vertical = true,
  color = BRASS.color,
  roughness = BRASS.roughness,
  metalness = BRASS.metalness,
  stand = 0.02,
  thick = 0.01,
}) {
  const len = clamp(length, 0.04, 0.45);
  const t = clamp(thick, 0.006, 0.016);
  const mat = { color, roughness, metalness };
  const span = len * 0.7;
  const gripSize = vertical ? [t, len, t] : [len, t, t];
  return (
    <group name="handle" position={position}>
      <Box position={[0, 0, stand]} size={gripSize} {...mat} />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={vertical ? [0, s * span * 0.5, stand / 2] : [s * span * 0.5, 0, stand / 2]}
          size={[t * 0.7, t * 0.7, stand]}
          {...mat}
          castShadow={false}
        />
      ))}
    </group>
  );
}

/** Round cabinet knob on a short stem (faces +z). */
export function RoundKnob({ position, radius = 0.014, color = BRASS.color }) {
  const r = clamp(radius, 0.008, 0.025);
  return (
    <group name="handle" position={position}>
      <ZCyl
        position={[0, 0, 0.007]}
        radius={r * 0.35}
        length={0.014}
        {...BRASS}
        color={color}
        segments={8}
        castShadow={false}
      />
      <Ball position={[0, 0, 0.016]} radius={r} {...BRASS} color={color} segments={12} />
    </group>
  );
}

/** Glass pane: translucent, no depth write so things behind stay visible. */
export function GlassPane({ position, size, opacity = 0.22, tint = GLASS_TINT, rotation }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={tint}
        transparent
        opacity={opacity}
        roughness={0.05}
        metalness={0.1}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Mixer tap on a deck, spout pointing to +z. `scale` is applied to the whole fitting
 * (clamped); lever 'single' is a side lever, 'double' two cross handles.
 */
export function Tap({ position, scale = 1, lever = 'single', reach = 0.1, rise = 0.085 }) {
  const s = clamp(scale, 0.7, 1.4);
  const top = 0.012 + rise;
  return (
    <group name="tap" position={position} scale={s}>
      <Cyl
        position={[0, 0.006, 0]}
        radiusTop={0.024}
        radiusBottom={0.028}
        height={0.012}
        {...CHROME}
        segments={16}
      />
      <Cyl
        position={[0, 0.012 + rise / 2, 0]}
        radiusTop={0.012}
        radiusBottom={0.015}
        height={rise}
        {...CHROME}
        segments={14}
      />
      {/* Spout reaching forward and dipping at the end */}
      <ZCyl
        position={[0, top, reach / 2]}
        radius={0.0085}
        length={reach}
        {...CHROME}
        segments={10}
      />
      <Ball position={[0, top, 0]} radius={0.0125} {...CHROME} segments={10} />
      <Cyl
        position={[0, top - 0.014, reach]}
        radiusTop={0.0095}
        height={0.03}
        {...CHROME}
        segments={10}
      />
      {lever === 'single' ? (
        <group position={[0, 0.012 + rise * 0.55, 0]}>
          <XCyl position={[0.022, 0, 0]} radius={0.006} length={0.044} {...CHROME} segments={8} />
          <Box
            position={[0.052, 0.008, 0]}
            size={[0.04, 0.012, 0.014]}
            rotation={[0, 0, 0.35]}
            {...CHROME}
          />
        </group>
      ) : (
        [-1, 1].map((sx) => (
          <group key={sx} position={[sx * 0.075, 0, 0]}>
            <Cyl
              position={[0, 0.02, 0]}
              radiusTop={0.01}
              radiusBottom={0.013}
              height={0.04}
              {...CHROME}
              segments={10}
            />
            <Box position={[0, 0.045, 0]} size={[0.034, 0.01, 0.01]} {...CHROME} />
            <Box position={[0, 0.045, 0]} size={[0.01, 0.01, 0.034]} {...CHROME} />
          </group>
        ))
      )}
    </group>
  );
}

/**
 * Door fronts for a carcass: seam backing, door slabs with an inset panel, handles and hinges.
 * (x, y, z) place the front face: x centre, y bottom, z the carcass front.
 */
export function Doors({
  width,
  height,
  x = 0,
  y = 0,
  z,
  count = 2,
  color,
  handleColor = BRASS.color,
  handle = 'bar',
  panel = true,
  hinges = true,
  glass = false,
  handleY,
  gap = 0.004,
  thick = 0.018,
}) {
  const dw = width / count;
  const hy = handleY ?? y + height * 0.5;
  const panelColor = shade(color, -0.04);
  return (
    <group name="doors">
      <Box
        position={[x, y + height / 2, z + 0.001]}
        size={[width, height, 0.002]}
        color={DARK_GAP}
        castShadow={false}
      />
      {Array.from({ length: count }).map((_, i) => {
        const cx = x - width / 2 + dw * (i + 0.5);
        const side = count === 1 ? 1 : i < count / 2 - 0.01 ? 1 : -1;
        const mid = count % 2 === 1 && i === (count - 1) / 2;
        const edge = (mid ? 1 : side) * (dw / 2 - 0.035);
        const hingeX = -(mid ? 1 : side) * (dw / 2 - gap);
        return (
          <group key={i}>
            <Box
              position={[cx, y + height / 2, z + thick / 2]}
              size={[dw - gap, height - gap, thick]}
              color={color}
              roughness={0.55}
            />
            {glass ? (
              <GlassPane
                position={[cx, y + height / 2, z + thick + 0.001]}
                size={[Math.max(0.02, dw - 0.1), Math.max(0.02, height - 0.1), 0.004]}
                opacity={0.3}
              />
            ) : (
              panel &&
              dw > 0.16 &&
              height > 0.2 && (
                <Box
                  position={[cx, y + height / 2, z + thick + 0.002]}
                  size={[dw - 0.1, height - 0.1, 0.005]}
                  color={panelColor}
                  roughness={0.6}
                  castShadow={false}
                />
              )
            )}
            {handle === 'bar' && (
              <Pull
                position={[cx + edge, hy, z + thick]}
                length={clamp(height * 0.22, 0.07, 0.32)}
                color={handleColor}
              />
            )}
            {handle === 'knob' && (
              <RoundKnob position={[cx + edge, hy, z + thick]} color={handleColor} />
            )}
            {hinges &&
              height > 0.3 &&
              [0.12, height - 0.12].map((hh) => (
                <Box
                  key={hh}
                  position={[cx + hingeX, y + hh, z + thick + 0.001]}
                  size={[0.008, 0.04, 0.004]}
                  {...STEEL}
                  castShadow={false}
                />
              ))}
          </group>
        );
      })}
    </group>
  );
}

/** Stacked drawer fronts (rows x cols) with pulls. */
export function Drawers({
  width,
  height,
  x = 0,
  y = 0,
  z,
  rows = 3,
  cols = 1,
  color,
  handleColor = BRASS.color,
  handle = 'bar',
  gap = 0.005,
  thick = 0.018,
}) {
  const fh = height / rows;
  const fw = width / cols;
  const panelColor = shade(color, -0.035);
  return (
    <group name="drawers">
      <Box
        position={[x, y + height / 2, z + 0.001]}
        size={[width, height, 0.002]}
        color={DARK_GAP}
        castShadow={false}
      />
      {Array.from({ length: rows }).flatMap((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const cx = x - width / 2 + fw * (c + 0.5);
          const cy = y + fh * (r + 0.5);
          return (
            <group key={`${r}-${c}`}>
              <Box
                position={[cx, cy, z + thick / 2]}
                size={[fw - gap, fh - gap, thick]}
                color={color}
                roughness={0.55}
              />
              {fw > 0.2 && fh > 0.09 && (
                <Box
                  position={[cx, cy, z + thick + 0.0015]}
                  size={[fw - 0.07, fh - 0.06, 0.003]}
                  color={panelColor}
                  roughness={0.6}
                  castShadow={false}
                />
              )}
              {handle === 'bar' ? (
                <Pull
                  position={[cx, cy + (fh > 0.14 ? fh * 0.12 : 0), z + thick]}
                  length={clamp(fw * 0.3, 0.06, 0.16)}
                  vertical={false}
                  color={handleColor}
                  stand={0.018}
                />
              ) : (
                <RoundKnob position={[cx, cy, z + thick]} color={handleColor} />
              )}
            </group>
          );
        })
      )}
    </group>
  );
}

/** Pillow with a flange border and a soft crease across the top. */
export function Pillow({ position, size, color, rotation }) {
  const [w, h, d] = size;
  const line = shade(color, -0.06);
  return (
    <group name="pillow" position={position} rotation={rotation}>
      <Pad size={size} radius={h * 0.45} color={color} roughness={FABRIC_ROUGHNESS} />
      <Box
        position={[0, h / 2 + 0.0005, 0]}
        size={[w * 0.6, 0.004, 0.008]}
        color={line}
        castShadow={false}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[0, h * 0.32, s * (d / 2 - 0.012)]}
          size={[w * 0.92, 0.004, 0.004]}
          color={line}
          castShadow={false}
        />
      ))}
    </group>
  );
}

function roundedRectPath(path, cx, cy, w, h, r) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const k = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001));
  path.moveTo(x0 + k, y0);
  path.lineTo(x1 - k, y0);
  path.quadraticCurveTo(x1, y0, x1, y0 + k);
  path.lineTo(x1, y1 - k);
  path.quadraticCurveTo(x1, y1, x1 - k, y1);
  path.lineTo(x0 + k, y1);
  path.quadraticCurveTo(x0, y1, x0, y1 - k);
  path.lineTo(x0, y0 + k);
  path.quadraticCurveTo(x0, y0, x0 + k, y0);
}

/**
 * Slab with a real hole (basin tops, bath rims, sink worktops). Its underside sits at the
 * mesh position and it rises `thickness`; holeX / holeZ centre the opening on the footprint.
 */
export function HoledSlab({
  width,
  depth,
  thickness,
  position = [0, 0, 0],
  radius = 0.03,
  hole = 'ellipse',
  holeW,
  holeD,
  holeX = 0,
  holeZ = 0,
  holeRadius = 0.04,
  color,
  roughness = 0.2,
  metalness = 0,
}) {
  const geometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    roundedRectPath(shape, 0, 0, width, depth, radius);
    const h = new THREE.Path();
    if (hole === 'ellipse') {
      h.absellipse(holeX, -holeZ, holeW / 2, holeD / 2, 0, Math.PI * 2, true, 0);
    } else {
      roundedRectPath(h, holeX, -holeZ, holeW, holeD, holeRadius);
    }
    shape.holes.push(h);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 20,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [width, depth, thickness, radius, hole, holeW, holeD, holeX, holeZ, holeRadius]);
  return (
    <mesh position={position} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/** Round, sloped-wall dish (basin or tub bowl). Top rim at the mesh y, floor `depth` below. */
export function Dish({
  position = [0, 0, 0],
  rx,
  rz,
  depth,
  color,
  roughness = 0.2,
  metalness = 0,
}) {
  const geometry = React.useMemo(() => {
    const pts = [
      [1, 0],
      [0.97, -0.18],
      [0.82, -0.62],
      [0.5, -0.92],
      [0.22, -1],
      [0, -1],
    ].map(([r, y]) => new THREE.Vector2(r, y * depth));
    return new THREE.LatheGeometry(pts, 32);
  }, [depth]);
  return (
    <mesh position={position} scale={[rx, 1, rz]} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Drain: chrome ring, dark slotted centre. */
export function Drain({ position, radius = 0.025 }) {
  const r = clamp(radius, 0.015, 0.05);
  return (
    <group name="drain" position={position}>
      <Cyl
        position={[0, 0.001, 0]}
        radiusTop={r}
        height={0.004}
        {...CHROME}
        segments={20}
        castShadow={false}
      />
      <Cyl
        position={[0, 0.0035, 0]}
        radiusTop={r * 0.7}
        height={0.004}
        color="#2B2E31"
        roughness={0.6}
        segments={16}
        castShadow={false}
      />
      <Box
        position={[0, 0.0065, 0]}
        size={[r * 1.1, 0.002, r * 0.14]}
        {...CHROME}
        castShadow={false}
      />
      <Box
        position={[0, 0.0065, 0]}
        size={[r * 0.14, 0.002, r * 1.1]}
        {...CHROME}
        castShadow={false}
      />
    </group>
  );
}

/** Tall arched kitchen tap on a deck, spout pointing to +z. */
export function GooseneckTap({ position, scale = 1, rise = 0.2, arc = 0.07 }) {
  const s = clamp(scale, 0.75, 1.3);
  return (
    <group name="tap" position={position} scale={s}>
      <Cyl position={[0, 0.008, 0]} radiusTop={0.03} radiusBottom={0.034} height={0.016} {...CHROME} segments={18} />
      <Cyl position={[0, rise / 2 + 0.01, 0]} radiusTop={0.0125} radiusBottom={0.016} height={rise} {...CHROME} segments={14} />
      <mesh position={[0, rise + 0.01, arc]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[arc, 0.0115, 8, 16, Math.PI]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      <Cyl position={[0, rise + 0.01 - 0.035, arc * 2]} radiusTop={0.0125} radiusBottom={0.015} height={0.07} {...CHROME} segments={12} />
      <group position={[0.045, 0.02, 0]}>
        <Cyl position={[0, 0.02, 0]} radiusTop={0.011} height={0.04} {...CHROME} segments={10} />
        <Box position={[0.03, 0.04, 0]} size={[0.07, 0.012, 0.018]} rotation={[0, 0, 0.25]} {...CHROME} />
      </group>
    </group>
  );
}

/**
 * Stainless sink bowl set into a worktop: rectangular walls and a floor, with a drain.
 * (position is the middle of the opening at the worktop top; the bowl hangs below it.)
 */
export function SteelBowl({ position, width, depth, bowlDepth = 0.17 }) {
  const t = 0.004;
  const mid = bowlDepth / 2;
  return (
    <group name="sink-bowl" position={position}>
      <Box position={[0, -bowlDepth, 0]} size={[width, t, depth]} {...STEEL} roughness={0.28} castShadow={false} />
      <Box position={[0, -mid, -depth / 2]} size={[width, bowlDepth, t]} {...STEEL} roughness={0.28} castShadow={false} />
      <Box position={[0, -mid, depth / 2]} size={[width, bowlDepth, t]} {...STEEL} roughness={0.28} castShadow={false} />
      <Box position={[-width / 2, -mid, 0]} size={[t, bowlDepth, depth]} {...STEEL} roughness={0.28} castShadow={false} />
      <Box position={[width / 2, -mid, 0]} size={[t, bowlDepth, depth]} {...STEEL} roughness={0.28} castShadow={false} />
      <Drain position={[0, -bowlDepth + t, 0]} radius={Math.min(0.04, width * 0.14)} />
      {/* Rim bead */}
      {[-1, 1].map((s) => (
        <Box key={`z${s}`} position={[0, 0.002, (s * depth) / 2]} size={[width + 0.016, 0.004, 0.014]} {...STEEL} castShadow={false} />
      ))}
      {[-1, 1].map((s) => (
        <Box key={`x${s}`} position={[(s * width) / 2, 0.002, 0]} size={[0.014, 0.004, depth + 0.016]} {...STEEL} castShadow={false} />
      ))}
    </group>
  );
}
