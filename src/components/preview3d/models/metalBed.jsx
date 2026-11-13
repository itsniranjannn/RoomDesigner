/**
 * Bed parts read from photos: a tube metal frame (bent head and foot rails with spindles, slim side rails),
 * low guard rails along the long sides, castors, and real drawers set into a storage base.
 * Origin on the floor, centred on the footprint, the head of the bed towards -z.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Box, Cyl, Pad, Pull, clamp, shade, DARK_GAP } from './shared.jsx';
import { metalFinish } from './designShapes.jsx';
import { guardRailSpans } from './designLayout.js';

export const CASTER_H = 0.065;
const POST_R = 0.016;
const RAIL_R = 0.011;
const SPINDLE_R = 0.007;

/** Centre line of a bent tube: up from (x0, y0), round the top corners, across and down to (x1, y0). */
function arch(x0, x1, y0, top, z, bend) {
  const r = Math.min(bend, (x1 - x0) / 2 - 0.001, top - y0 - 0.001);
  const path = new THREE.CurvePath();
  const v = (x, y) => new THREE.Vector3(x, y, z);
  path.add(new THREE.LineCurve3(v(x0, y0), v(x0, top - r)));
  path.add(new THREE.QuadraticBezierCurve3(v(x0, top - r), v(x0, top), v(x0 + r, top)));
  path.add(new THREE.LineCurve3(v(x0 + r, top), v(x1 - r, top)));
  path.add(new THREE.QuadraticBezierCurve3(v(x1 - r, top), v(x1, top), v(x1, top - r)));
  path.add(new THREE.LineCurve3(v(x1, top - r), v(x1, y0)));
  return path;
}

/** A bent metal tube (inverted U) in the x-y plane at depth z. */
export function ArchTube({ x0, x1, y0, top, z, radius = POST_R, bend = 0.07, finish }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(arch(x0, x1, y0, top, z, bend), 64, radius, 10, false),
    [x0, x1, y0, top, z, bend, radius]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name="metal-tube" geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial {...finish} />
    </mesh>
  );
}

/** Horizontal rail across x from x0 to x1 at (y, z). */
function RailX({ x0, x1, y, z, radius = RAIL_R, finish }) {
  return (
    <Cyl
      position={[(x0 + x1) / 2, y, z]}
      radiusTop={radius}
      height={x1 - x0}
      rotation={[0, 0, Math.PI / 2]}
      {...finish}
      segments={10}
    />
  );
}

/** Horizontal rail along z from z0 to z1 at (x, y). */
function RailZ({ z0, z1, x, y, radius = RAIL_R, finish }) {
  return (
    <Cyl
      position={[x, y, (z0 + z1) / 2]}
      radiusTop={radius}
      height={z1 - z0}
      rotation={[Math.PI / 2, 0, 0]}
      {...finish}
      segments={10}
    />
  );
}

/** Evenly spaced upright spindles between y0 and y1 across `span`, at depth z (or along z at x). */
function Spindles({ count, from, to, y0, y1, at, alongZ = false, radius = SPINDLE_R, finish }) {
  return Array.from({ length: count }).map((_, i) => {
    const t = from + ((to - from) * (i + 1)) / (count + 1);
    return (
      <Cyl
        key={i}
        position={alongZ ? [at, (y0 + y1) / 2, t] : [t, (y0 + y1) / 2, at]}
        radiusTop={radius}
        height={y1 - y0}
        {...finish}
        segments={8}
        castShadow={false}
      />
    );
  });
}

/** Small swivel castor: a top plate, a fork and a rubber wheel trailing inwards; its top is at CASTER_H. */
export function Caster({ x, z, finish }) {
  const wheelR = 0.024;
  const trail = -Math.sign(z) * 0.006;
  return (
    <group name="caster" position={[x, 0, z]}>
      <Cyl
        position={[0, CASTER_H - 0.004, 0]}
        radiusTop={0.022}
        height={0.008}
        {...finish}
        segments={14}
      />
      <Box position={[0, CASTER_H - 0.02, 0]} size={[0.024, 0.026, 0.02]} {...finish} />
      <Cyl
        position={[0, wheelR, trail]}
        radiusTop={wheelR}
        height={0.018}
        rotation={[0, 0, Math.PI / 2]}
        color="#1f1f21"
        roughness={0.85}
        segments={16}
      />
      <Cyl
        position={[0, wheelR, trail]}
        radiusTop={0.007}
        height={0.022}
        rotation={[0, 0, Math.PI / 2]}
        {...finish}
        segments={8}
        castShadow={false}
      />
    </group>
  );
}

/** Corner posts of a footprint inset by `inset`: [x, z] pairs, head (-z) first. */
export function postCorners(widthM, depthM, inset = 0.02) {
  const x = widthM / 2 - inset;
  const z = depthM / 2 - inset;
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
}

/**
 * Heights in a tube bed frame whose mattress bottom is at `frameH`: the box spring (when there is one) lies on a
 * deck, and the deck rests on the side rails.
 */
export function metalFrameLevels(frameH, boxSpring) {
  const baseH = boxSpring ? clamp(frameH * 0.32, 0.08, 0.13) : 0;
  const deckTop = frameH - baseH;
  return { baseH, deckTop, sideY: deckTop - 0.022 };
}

/**
 * Tube metal bed frame: a tall bent head rail and a lower foot rail, each with spindles and cross rails,
 * slim side rails under the mattress and a deck for it (or its box spring) to lie on. `frameH` is the mattress
 * bottom.
 */
export function MetalBedFrame({
  widthM,
  depthM,
  heightM,
  frameH,
  mattressTop,
  footTop,
  bottom,
  color,
  fabric,
}) {
  const finish = metalFinish(color);
  const x = widthM / 2 - 0.02;
  const zh = -depthM / 2 + 0.02;
  const zf = depthM / 2 - 0.02;
  const inner = 2 * x;
  // A fabric base (box spring) under the mattress when the photos show one in its own colour
  const { baseH, deckTop, sideY } = metalFrameLevels(frameH, !!fabric);
  const lowY = Math.max(bottom + 0.06, sideY);
  const headTop = Math.max(mattressTop + 0.2, heightM - POST_R);
  const midY = mattressTop + 0.03;
  const footUp = Math.max(mattressTop + 0.08, footTop - POST_R);
  return (
    <group name="metal-frame">
      <group name="headboard">
        <ArchTube x0={-x} x1={x} y0={bottom} top={headTop} z={zh} finish={finish} />
        <RailX x0={-x} x1={x} y={lowY} z={zh} finish={finish} />
        <RailX x0={-x} x1={x} y={midY} z={zh} finish={finish} />
        <Spindles
          count={Math.max(3, Math.round(inner / 0.15))}
          from={-x}
          to={x}
          y0={lowY}
          y1={headTop}
          at={zh}
          finish={finish}
        />
      </group>
      <group name="footboard">
        <ArchTube x0={-x} x1={x} y0={bottom} top={footUp} z={zf} finish={finish} />
        <RailX x0={-x} x1={x} y={lowY} z={zf} finish={finish} />
        <Spindles
          count={Math.max(2, Math.round(inner / 0.24))}
          from={-x}
          to={x}
          y0={lowY}
          y1={footUp}
          at={zf}
          finish={finish}
        />
      </group>
      <group name="side-rails">
        {[-1, 1].map((s) => (
          <RailZ
            key={s}
            z0={zh}
            z1={zf}
            x={s * x}
            y={sideY}
            radius={RAIL_R * 1.1}
            finish={finish}
          />
        ))}
      </group>
      {/* Deck resting on the side rails, and the box spring (when there is one) lying on it */}
      <group name="bed-deck">
        <Box
          position={[0, deckTop - 0.01, 0]}
          size={[widthM - 0.06, 0.02, zf - zh - 0.03]}
          color={shade(finish.color, -0.35)}
          roughness={0.8}
        />
      </group>
      {fabric && (
        <group name="box-spring">
          <Pad
            position={[0, deckTop + baseH / 2, 0]}
            size={[widthM - 0.05, baseH, zf - zh - 0.03]}
            radius={0.02}
            color={fabric}
            roughness={0.95}
          />
        </group>
      )}
      {bottom <= 0 &&
        postCorners(widthM, depthM).map(([px, pz], i) => (
          <Cyl
            key={i}
            position={[px, 0.005, pz]}
            radiusTop={POST_R * 1.25}
            height={0.01}
            color="#202022"
            roughness={0.9}
            segments={12}
            castShadow={false}
          />
        ))}
    </group>
  );
}

/** Low guard rails along both long sides: a bent tube frame with spindles above the mattress. */
export function GuardRails({ widthM, depthM, mattressTop, base, color }) {
  const finish = metalFinish(color);
  const x = widthM / 2 - 0.012;
  const top = mattressTop + 0.2;
  const low = mattressTop + 0.05;
  return (
    <group name="guard-rails">
      {guardRailSpans(depthM).map(({ side, z0, z1 }) => (
        <group key={side} position={[side * x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          {/* Built in the x-y plane and turned to run along the side: local x is world -z */}
          <ArchTube
            x0={-z1}
            x1={-z0}
            y0={base}
            top={top}
            z={0}
            radius={0.012}
            bend={0.05}
            finish={finish}
          />
          <RailX x0={-z1} x1={-z0} y={low} z={0} radius={0.009} finish={finish} />
          <Spindles
            count={Math.max(3, Math.round((z1 - z0) / 0.11))}
            from={-z1}
            to={-z0}
            y0={low}
            y1={top}
            at={0}
            finish={finish}
          />
        </group>
      ))}
    </group>
  );
}

/**
 * Drawers set into both long sides of a storage bed base: flush fronts with a shadow gap round each, a
 * finger groove along the top and a bar pull. The fronts sit at x = +-faceX, between y0 and y1.
 */
export function BedBaseDrawers({ faceX, depthM, z, y0, y1, color, handleColor = '#C4A869' }) {
  const h = y1 - y0;
  const count = depthM > 1.5 ? 2 : 1;
  const gap = 0.012;
  const len = (depthM - 0.16 - gap * (count - 1)) / count;
  const front = shade(color, 0.03);
  return (
    <group name="bed-drawers">
      {[-1, 1].flatMap((s) =>
        Array.from({ length: count }).map((_, k) => {
          const cz = z - ((count - 1) * (len + gap)) / 2 + k * (len + gap);
          return (
            // Turned so the drawer's front (local +z) faces out of the side
            <group
              key={`${s}${k}`}
              name="drawers"
              position={[s * faceX, y0 + h / 2, cz]}
              rotation={[0, (s * Math.PI) / 2, 0]}
            >
              <Box
                position={[0, 0, -0.004]}
                size={[len + 0.012, h + 0.012, 0.006]}
                color={DARK_GAP}
                castShadow={false}
              />
              <Box position={[0, 0, 0.002]} size={[len, h, 0.012]} color={front} roughness={0.6} />
              <Box
                position={[0, h / 2 - 0.012, 0.0085]}
                size={[len - 0.04, 0.004, 0.002]}
                color={shade(color, -0.25)}
                castShadow={false}
              />
              <Pull
                position={[0, h * 0.08, 0.008]}
                length={clamp(len * 0.22, 0.08, 0.2)}
                vertical={false}
                color={handleColor}
                stand={0.01}
                thick={0.008}
              />
            </group>
          );
        })
      )}
    </group>
  );
}
