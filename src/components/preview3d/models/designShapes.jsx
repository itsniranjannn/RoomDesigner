/**
 * Extra shapes for photo-made furniture: corner sofas, tub chairs, ottomans, daybeds, open shelving,
 * sideboards and stools. Each is built from the same parts as the catalog models (Pad, Box, Cyl, Doors,
 * Drawers ...) and parameterised by the design record read from the photos (see engine/design.js).
 * Origin on the floor, centred on the footprint, the front towards +z.
 */
import React from 'react';
import * as THREE from 'three';
import {
  Box,
  Pad,
  Cyl,
  Ball,
  Strut,
  Doors,
  Drawers,
  clamp,
  shade,
  corners,
  BRASS,
} from './shared.jsx';
import { TuftedFace } from './seating.jsx';
import { WRAP_END, wrapRise, wrapThickness } from './designLayout.js';

const DARK = '#171310';

/** A cylinder shell open at the front, wrapping the back through `arc` radians. */
function Wrap({
  radius,
  radiusBottom = radius,
  height,
  y,
  arc,
  color,
  scale = [1, 1, 1],
  roughness = 0.8,
}) {
  return (
    <mesh position={[0, y, 0]} scale={scale} castShadow receiveShadow>
      <cylinderGeometry
        args={[radius, radiusBottom, height, 48, 1, true, Math.PI - arc / 2, arc]}
      />
      <meshStandardMaterial color={color} roughness={roughness} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** L-shaped sofa: a run along the back with a chaise at the front on one side. */
export function CornerSofaDesign({ widthM, depthM, heightM, palette, traits }) {
  const body = palette.body;
  const cushion = palette.cushion || body;
  const legColor = palette.leg || '#2a2622';
  const welt = shade(cushion, -0.1);
  const seats = clamp(Math.round(traits.seats ?? 2), 1, 4);
  const armW = clamp((traits.arm ?? 0.08) * widthM, 0.07, 0.2);
  const mainD = depthM * 0.55;
  const backT = clamp(mainD * 0.27, 0.14, 0.24);
  const chaiseW = clamp(widthM - armW - seats * 0.72, 0.55, widthM * 0.5);
  const chaiseD = depthM - mainD;
  const seatY = clamp(heightM * 0.47, 0.34, 0.46);
  const mainZ = -depthM / 2 + mainD / 2;
  const chaiseZ = -depthM / 2 + mainD + chaiseD / 2;
  const chaiseX = widthM / 2 - chaiseW / 2;
  const seatsW = widthM - chaiseW - armW;
  const seatW = seatsW / seats;
  const seatStart = -widthM / 2 + armW;
  const legH = traits.taper ? 0.14 : 0.07;
  const baseTop = legH + 0.1;
  const flip = traits.side === 'left' ? -1 : 1;
  return (
    <group scale={[flip, 1, 1]}>
      <Pad
        position={[0, legH + 0.09, mainZ]}
        size={[widthM, 0.2, mainD]}
        radius={0.03}
        color={body}
        roughness={0.85}
      />
      <Pad
        position={[chaiseX, legH + 0.09, chaiseZ]}
        size={[chaiseW, 0.2, chaiseD]}
        radius={0.03}
        color={body}
        roughness={0.85}
      />
      {Array.from({ length: seats }).map((_, i) => {
        const cx = seatStart + seatW * (i + 0.5);
        const cz = mainZ + backT / 2;
        return (
          <Pad
            key={i}
            position={[cx, seatY, cz]}
            size={[seatW - 0.012, 0.14, mainD - backT - 0.01]}
            radius={0.05}
            color={cushion}
            roughness={0.95}
          />
        );
      })}
      <Pad
        position={[chaiseX - armW / 2, seatY, -depthM / 2 + backT + (depthM - backT) / 2]}
        size={[chaiseW - armW, 0.14, depthM - backT]}
        radius={0.05}
        color={cushion}
        roughness={0.95}
      />
      <Pad
        position={[0, baseTop + (heightM - baseTop) / 2, -depthM / 2 + backT / 2]}
        size={[widthM, heightM - baseTop, backT]}
        radius={0.05}
        color={body}
        roughness={0.85}
      />
      {Array.from({ length: seats + 1 }).map((_, i) => {
        const w = (widthM - armW - 0.06) / (seats + 1);
        const cx = -widthM / 2 + armW + 0.03 + w * (i + 0.5);
        return (
          <group
            key={i}
            position={[cx, seatY + 0.2, -depthM / 2 + backT + 0.05]}
            rotation={[-0.2, 0, 0]}
          >
            <Pad size={[w - 0.015, 0.36, 0.12]} radius={0.05} color={cushion} roughness={0.95} />
            {traits.tufted ? (
              <Ball
                position={[0, 0.02, 0.063]}
                radius={0.011}
                color={welt}
                segments={8}
                castShadow={false}
              />
            ) : null}
          </group>
        );
      })}
      <Pad
        position={[-widthM / 2 + armW / 2, seatY - 0.02, mainZ]}
        size={[armW, 0.42, mainD]}
        radius={0.04}
        color={body}
        roughness={0.85}
      />
      <Pad
        position={[widthM / 2 - armW / 2, seatY - 0.02, 0]}
        size={[armW, 0.42, depthM]}
        radius={0.04}
        color={body}
        roughness={0.85}
      />
      {[
        [-widthM / 2 + 0.07, -depthM / 2 + 0.07],
        [widthM / 2 - 0.07, -depthM / 2 + 0.07],
        [-widthM / 2 + 0.07, -depthM / 2 + mainD - 0.07],
        [widthM / 2 - chaiseW + 0.07, -depthM / 2 + mainD - 0.07],
        [widthM / 2 - chaiseW + 0.07, depthM / 2 - 0.07],
        [widthM / 2 - 0.07, depthM / 2 - 0.07],
      ].map(([fx, fz], idx) => (
        <Cyl
          key={idx}
          position={[fx, legH / 2, fz]}
          radiusTop={traits.taper ? 0.026 : 0.03}
          radiusBottom={traits.taper ? 0.016 : 0.028}
          height={legH}
          color={legColor}
          roughness={0.5}
          segments={12}
        />
      ))}
    </group>
  );
}

/**
 * A thick, rolled tub-chair shell whose top slopes down from the back towards the front, wrapping round the
 * seat: rounded-slab cross-sections swept round the back from -WRAP_END to WRAP_END (before the chair's plan
 * scale), capped at the arm ends. Angles run from the back (-z) towards +x / -x.
 */
export function wrapShellGeometry({ r, t, y0, top, segments = 44 }) {
  const ri = r - t;
  const positions = [];
  const index = [];
  const ARC = 8;
  const profile = (rise) => {
    const yTop = Math.max(y0 + t * 0.55, y0 + (top - y0) * rise);
    const yc = Math.max(y0 + 0.012, yTop - t / 2);
    const rad = Math.min(t / 2, yTop - y0 - 0.006);
    const c = Math.min(0.025, (yc - y0) * 0.5);
    const outerBottom = r * 0.95;
    const pts = [[ri, y0]];
    pts.push([ri, yc]);
    for (let k = 1; k < ARC; k++) {
      const a = Math.PI - (Math.PI * k) / ARC;
      pts.push([ri + t / 2 + (t / 2) * Math.cos(a), yc + rad * Math.sin(a)]);
    }
    pts.push([r, yc]);
    pts.push([outerBottom + (r - outerBottom) * 0.3, y0 + c]);
    pts.push([outerBottom - c * 0.4, y0]);
    return pts;
  };
  const M = profile(1).length;
  for (let i = 0; i <= segments; i++) {
    const phi = -WRAP_END + (2 * WRAP_END * i) / segments;
    const rise = wrapRise(phi / WRAP_END);
    const sn = Math.sin(phi);
    const cs = Math.cos(phi);
    for (const [rho, y] of profile(rise)) positions.push(rho * sn, y, -rho * cs);
  }
  for (let i = 0; i < segments; i++) {
    for (let k = 0; k < M; k++) {
      const a = i * M + k;
      const b = i * M + ((k + 1) % M);
      index.push(a, a + M, b, b, a + M, b + M);
    }
  }
  // Caps at the two arm ends, fanned from the middle of the section
  for (const i of [0, segments]) {
    const centre = positions.length / 3;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < M; k++) {
      cx += positions[(i * M + k) * 3] / M;
      cy += positions[(i * M + k) * 3 + 1] / M;
      cz += positions[(i * M + k) * 3 + 2] / M;
    }
    positions.push(cx, cy, cz);
    for (let k = 0; k < M; k++) {
      const a = i * M + k;
      const b = i * M + ((k + 1) % M);
      if (i === 0) index.push(centre, a, b);
      else index.push(centre, b, a);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  // The top of the back must face up; flip the winding if it came out inside-out
  const crest = (segments / 2) * M + Math.floor(ARC / 2) + 1;
  if (geometry.attributes.normal.getY(crest) < 0) {
    for (let k = 0; k < index.length; k += 3) {
      const tmp = index[k + 1];
      index[k + 1] = index[k + 2];
      index[k + 2] = tmp;
    }
    geometry.setIndex(index);
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Metal finish for a colour read from photos: light and mid greys read as chrome (lifted a little, since a
 * photo of chrome looks grey), near-black as dark powder-coated steel, and anything coloured as painted metal.
 */
export function metalFinish(color) {
  const hsl = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
  if (hsl.s < 0.18 && hsl.l > 0.3)
    return {
      color: shade(color, Math.max(0, 0.25 - hsl.l * 0.25)),
      roughness: 0.22,
      metalness: 0.6,
    };
  if (hsl.s < 0.18) return { color: shade(color, 0.02), roughness: 0.42, metalness: 0.25 };
  return { color, roughness: 0.32, metalness: 0.45 };
}

/** Thin metal legs of a tub chair (positions in the unscaled round plan): two at the back, two at the arm ends. */
export function tubMetalLegs(r) {
  const at = (deg, k) => {
    const a = (deg * Math.PI) / 180;
    return [Math.sin(a) * r * k, -Math.cos(a) * r * k];
  };
  return {
    back: [at(-32, 0.86), at(32, 0.86)],
    front: [at(-108, 0.84), at(108, 0.84)],
  };
}

function WrapShell({ r, t, y0, top, color, scale }) {
  const geometry = React.useMemo(() => wrapShellGeometry({ r, t, y0, top }), [r, t, y0, top]);
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh name="wrap-shell" geometry={geometry} scale={scale} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/** Seat cushion as a drum with rounded edges (a lathe), its bottom at y. */
function DrumCushion({ radius, height, y, z, color, scale }) {
  const geometry = React.useMemo(() => {
    const c = Math.min(0.05, height * 0.3, radius * 0.3);
    const pts = [new THREE.Vector2(0, 0)];
    for (let k = 0; k <= 6; k++) {
      const a = -Math.PI / 2 + ((Math.PI / 2) * k) / 6;
      pts.push(new THREE.Vector2(radius - c + c * Math.cos(a), c + c * Math.sin(a)));
    }
    for (let k = 0; k <= 6; k++) {
      const a = ((Math.PI / 2) * k) / 6;
      pts.push(new THREE.Vector2(radius - c + c * Math.cos(a), height - c + c * Math.sin(a)));
    }
    pts.push(new THREE.Vector2(0, height));
    return new THREE.LatheGeometry(pts, 40);
  }, [radius, height]);
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      name="seat-cushion"
      geometry={geometry}
      position={[0, y, z]}
      scale={scale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/**
 * Round or bucket tub chair: a wrap-around shell, a seat cushion, feet, slim legs, a pedestal or thin metal
 * legs. `wrap` makes the shell a thick roll sloping down from the back to the front round a drum cushion.
 */
export function TubChairDesign({ widthM, depthM, heightM, palette, traits }) {
  const body = palette.body;
  const cushion = palette.cushion || body;
  const legColor = palette.leg || '#2a2622';
  const bucket = traits.plan === 'bucket';
  const base = traits.base || 'feet';
  const metal = base === 'metal';
  const baseH =
    base === 'legs'
      ? 0.2
      : base === 'pedestal'
        ? 0.14
        : metal
          ? clamp(heightM * 0.19, 0.1, 0.2)
          : 0.07;
  const r = Math.min(widthM, depthM) / 2;
  const sx = widthM / 2 / r;
  const sz = depthM / 2 / r;
  const seatY = baseH + clamp(heightM * 0.22, 0.14, 0.24);
  const shellH = heightM - baseH;
  const inner = shade(cushion, -0.03);
  const wrap = !!traits.wrap;
  const t = wrapThickness(r);
  const seatTop = clamp(heightM * 0.53, baseH + 0.18, baseH + 0.34);
  const finish = metal ? metalFinish(legColor) : null;
  const legs = metal ? tubMetalLegs(r) : null;
  const rod = 0.009;
  return (
    <group>
      {wrap ? (
        <group name="wrap-chair">
          <WrapShell r={r} t={t} y0={baseH} top={heightM} color={body} scale={[sx, 1, sz]} />
          {/* Seat deck closing the bowl, and the drum cushion pushed forward inside the wrap */}
          <mesh position={[0, baseH + 0.025, 0]} scale={[sx, 1, sz]} receiveShadow>
            <cylinderGeometry args={[r - t + 0.01, r - t + 0.01, 0.05, 32]} />
            <meshStandardMaterial color={shade(body, -0.08)} roughness={0.9} />
          </mesh>
          <DrumCushion
            radius={(r - t) * 1.02}
            height={seatTop - baseH - 0.004}
            y={baseH + 0.004}
            z={r * 0.1 * sz}
            color={cushion}
            scale={[sx, 1, sz]}
          />
        </group>
      ) : (
        <>
          {/* Outer shell: a full wrap for a round chair, a high back with lower arms for a bucket */}
          <Wrap
            radius={r}
            radiusBottom={r * 0.88}
            height={shellH}
            y={baseH + shellH / 2}
            arc={bucket ? Math.PI * 1.15 : Math.PI * 1.55}
            color={body}
            scale={[sx, 1, sz]}
          />
          {bucket && (
            <Wrap
              radius={r}
              radiusBottom={r * 0.88}
              height={shellH * 0.62}
              y={baseH + (shellH * 0.62) / 2}
              arc={Math.PI * 1.85}
              color={body}
              scale={[sx, 1, sz]}
            />
          )}
          {/* Padded lining inside the wrap */}
          <Wrap
            radius={r * 0.93}
            radiusBottom={r * 0.82}
            height={shellH * 0.8}
            y={baseH + (shellH * 0.8) / 2 + 0.06}
            arc={Math.PI * (bucket ? 1.05 : 1.45)}
            color={inner}
            scale={[sx, 1, sz]}
            roughness={0.95}
          />
          {/* Base of the bowl and seat cushion */}
          <mesh position={[0, baseH + 0.07, 0]} scale={[sx, 1, sz]} castShadow receiveShadow>
            <cylinderGeometry args={[r * 0.9, r * 0.84, 0.14, 40]} />
            <meshStandardMaterial color={body} roughness={0.85} />
          </mesh>
          <mesh position={[0, seatY, 0.02]} scale={[sx, 1, sz]} castShadow receiveShadow>
            <cylinderGeometry args={[r * 0.8, r * 0.8, 0.13, 40]} />
            <meshStandardMaterial color={cushion} roughness={0.95} />
          </mesh>
        </>
      )}
      {traits.tufted
        ? [-0.5, 0, 0.5].map((k) => {
            // On the inside of the shell: the lining of a plain chair, the roll of a wrap-around one
            const rho = r - t - 0.004;
            return (
              <Ball
                key={k}
                position={
                  wrap
                    ? [
                        Math.sin(Math.PI + k) * rho * sx,
                        seatTop + (heightM - seatTop) * 0.45,
                        Math.cos(Math.PI + k) * rho * sz,
                      ]
                    : [
                        Math.sin(Math.PI + k) * r * 0.9 * sx,
                        seatY + 0.2,
                        Math.cos(Math.PI + k) * r * 0.9 * sz,
                      ]
                }
                radius={0.013}
                color={shade(cushion, -0.18)}
                segments={8}
                castShadow={false}
              />
            );
          })
        : null}
      {metal ? (
        <group name="metal-legs">
          {[...legs.back, ...legs.front].map(([x, z], i) => (
            <Cyl
              key={i}
              position={[x * sx, baseH / 2, z * sz]}
              radiusTop={rod}
              height={baseH}
              {...finish}
              segments={10}
            />
          ))}
          {/* Slim rails joining the legs under the seat: one each side, one across the back */}
          {[0, 1].map((i) => (
            <Strut
              key={`s${i}`}
              from={[legs.back[i][0] * sx, baseH - rod, legs.back[i][1] * sz]}
              to={[legs.front[i][0] * sx, baseH - rod, legs.front[i][1] * sz]}
              radius={rod * 0.8}
              {...finish}
            />
          ))}
          <Strut
            from={[legs.back[0][0] * sx, baseH - rod, legs.back[0][1] * sz]}
            to={[legs.back[1][0] * sx, baseH - rod, legs.back[1][1] * sz]}
            radius={rod * 0.8}
            {...finish}
          />
        </group>
      ) : base === 'pedestal' ? (
        <>
          <Cyl
            position={[0, baseH / 2, 0]}
            radiusTop={r * 0.16}
            radiusBottom={r * 0.2}
            height={baseH}
            color={legColor}
            roughness={0.4}
            metalness={0.3}
          />
          <Cyl
            position={[0, 0.012, 0]}
            radiusTop={r * 0.55}
            height={0.024}
            color={legColor}
            roughness={0.4}
            metalness={0.3}
            segments={32}
          />
        </>
      ) : (
        [45, 135, 225, 315].map((deg) => {
          const a = (deg * Math.PI) / 180;
          const x = Math.sin(a) * r * 0.68 * sx;
          const z = Math.cos(a) * r * 0.68 * sz;
          return base === 'legs' ? (
            <Strut
              key={deg}
              from={[x, baseH + 0.02, z]}
              to={[x * 1.18, 0, z * 1.18]}
              radius={0.018}
              color={legColor}
              roughness={0.5}
            />
          ) : (
            <Cyl
              key={deg}
              position={[x, baseH / 2, z]}
              radiusTop={0.032}
              radiusBottom={0.028}
              height={baseH}
              color={legColor}
              roughness={0.55}
              segments={12}
            />
          );
        })
      )}
    </group>
  );
}

/** Ottoman or pouf: a padded block, square or round, on no feet, short feet or tall legs. */
export function OttomanDesign({ widthM, depthM, heightM, palette, traits }) {
  const cover = palette.body;
  const legColor = palette.leg || '#2a2622';
  const round = traits.shape === 'round';
  const feet = traits.feet || 'short';
  const footH = feet === 'none' ? 0 : feet === 'tall' ? 0.16 : 0.06;
  const bodyH = Math.max(0.1, heightM - footH);
  const dark = shade(cover, -0.14);
  const r = Math.min(widthM, depthM) / 2;
  return (
    <group>
      {footH > 0 &&
        (round ? [0, 120, 240] : [null]).flatMap((deg, i) =>
          deg === null
            ? corners(widthM, depthM, 0.07).map(([x, z], j) => (
                <Cyl
                  key={`f${j}`}
                  position={[x, footH / 2, z]}
                  radiusTop={feet === 'tall' ? 0.026 : 0.032}
                  radiusBottom={feet === 'tall' ? 0.016 : 0.028}
                  height={footH}
                  color={legColor}
                  roughness={0.5}
                  segments={12}
                />
              ))
            : [
                <Cyl
                  key={`f${i}`}
                  position={[
                    Math.sin((deg * Math.PI) / 180) * r * 0.6,
                    footH / 2,
                    Math.cos((deg * Math.PI) / 180) * r * 0.6,
                  ]}
                  radiusTop={feet === 'tall' ? 0.026 : 0.032}
                  radiusBottom={feet === 'tall' ? 0.016 : 0.028}
                  height={footH}
                  color={legColor}
                  roughness={0.5}
                  segments={12}
                />,
              ]
        )}
      {round ? (
        <>
          <mesh
            position={[0, footH + bodyH / 2, 0]}
            scale={[widthM / 2 / r, 1, depthM / 2 / r]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[r * 0.97, r, bodyH, 40]} />
            <meshStandardMaterial color={cover} roughness={0.92} />
          </mesh>
          <mesh
            position={[0, footH + bodyH - 0.004, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[widthM / 2 / r, depthM / 2 / r, 1]}
          >
            <torusGeometry args={[r * 0.97, 0.008, 6, 40]} />
            <meshStandardMaterial color={dark} roughness={0.85} />
          </mesh>
        </>
      ) : (
        <Pad
          position={[0, footH + bodyH / 2, 0]}
          size={[widthM, bodyH, depthM]}
          radius={clamp(bodyH * 0.25, 0.02, 0.06)}
          color={cover}
          roughness={0.92}
        />
      )}
      {traits.tufted &&
        (round ? [0, 90, 180, 270] : [0, 90, 180, 270]).map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <Ball
              key={deg}
              position={[
                Math.sin(a) * Math.min(widthM, depthM) * 0.2,
                footH + bodyH + 0.002,
                Math.cos(a) * Math.min(widthM, depthM) * 0.2,
              ]}
              radius={0.013}
              scale={[1, 0.6, 1]}
              color={dark}
              segments={8}
              castShadow={false}
            />
          );
        })}
      {traits.tufted ? (
        <Ball
          position={[0, footH + bodyH + 0.002, 0]}
          radius={0.013}
          scale={[1, 0.6, 1]}
          color={dark}
          segments={8}
          castShadow={false}
        />
      ) : null}
    </group>
  );
}

/** Daybed: a low frame with a mattress, a back and end panels, with bolsters. */
export function DaybedDesign({ widthM, depthM, heightM, palette, traits }) {
  const frame = palette.body;
  const mattress = palette.cushion || frame;
  const bolster = palette.accent || shade(mattress, 0.05);
  const legH = 0.12;
  const rail = 0.05;
  const baseH = 0.14;
  const mattressH = 0.18;
  const mattressTop = legH + baseH + mattressH;
  const backStyle = traits.back || 'panel';
  const ends = traits.ends === 0 || traits.ends === 1 ? traits.ends : 2;
  const innerW = widthM - rail * 2;
  const topY = heightM;
  const backH = topY - (legH + baseH);
  const zBack = -depthM / 2 + rail / 2;
  const slats = Math.max(6, Math.round(innerW / 0.09));
  return (
    <group>
      {corners(widthM, depthM, 0.05).map(([x, z], i) => (
        <Cyl
          key={i}
          position={[x, legH / 2, z]}
          radiusTop={0.03}
          radiusBottom={0.022}
          height={legH}
          color={shade(frame, -0.1)}
          roughness={0.55}
          segments={12}
        />
      ))}
      <Box
        position={[0, legH + baseH / 2, 0]}
        size={[widthM, baseH, depthM]}
        color={frame}
        roughness={0.7}
      />
      <Pad
        position={[0, legH + baseH + mattressH / 2, rail / 2]}
        size={[innerW, mattressH, depthM - rail * 2]}
        radius={0.05}
        color={mattress}
        roughness={0.95}
      />
      {backStyle === 'panel' && (
        <Pad
          position={[0, legH + baseH + backH / 2, zBack]}
          size={[widthM, backH, rail]}
          radius={0.015}
          color={frame}
          roughness={0.7}
        />
      )}
      {backStyle === 'slat' && (
        <group name="back-slats">
          <Box
            position={[0, topY - 0.03, zBack]}
            size={[widthM, 0.06, rail]}
            color={frame}
            roughness={0.65}
          />
          <Box
            position={[0, legH + baseH + 0.04, zBack]}
            size={[widthM, 0.08, rail]}
            color={frame}
            roughness={0.65}
          />
          {Array.from({ length: slats }).map((_, i) => (
            <Box
              key={i}
              position={[
                -innerW / 2 + (innerW * (i + 0.5)) / slats,
                legH + baseH + backH / 2,
                zBack,
              ]}
              size={[0.025, backH - 0.1, 0.025]}
              color={frame}
              roughness={0.65}
            />
          ))}
        </group>
      )}
      {[-1, 1].map((s, i) =>
        ends === 2 || (ends === 1 && i === 0) ? (
          <Pad
            key={s}
            position={[
              (s * (widthM - rail)) / 2,
              legH + baseH + backH / 2 - (backStyle === 'none' ? 0.1 : 0),
              0,
            ]}
            size={[rail, backStyle === 'none' ? backH - 0.2 : backH, depthM]}
            radius={0.015}
            color={frame}
            roughness={0.7}
          />
        ) : null
      )}
      {/* Bolsters against the ends and a pair of back cushions */}
      {(ends >= 1 ? [-1] : []).concat(ends === 2 ? [1] : []).map((s) => (
        <mesh
          key={s}
          position={[s * (innerW / 2 - 0.1), mattressTop + 0.09, rail / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.09, 0.09, Math.min(0.62, depthM - 0.25), 20]} />
          <meshStandardMaterial color={bolster} roughness={0.95} />
        </mesh>
      ))}
      {[-0.25, 0.25].map((k) => (
        <Pad
          key={k}
          position={[k * innerW * 0.5, mattressTop + 0.17, -depthM / 2 + rail + 0.1]}
          size={[0.5, 0.34, 0.14]}
          radius={0.05}
          color={bolster}
          roughness={0.95}
          rotation={[-0.18, 0, 0]}
        />
      ))}
    </group>
  );
}

/**
 * Open shelving unit: sides, shelves and optional vertical dividers (a cubby grid), with a closed part below
 * (doors or drawers) when the photos show one.
 */
export function ShelvingDesign({ widthM, depthM, heightM, palette, traits }) {
  const frame = palette.body;
  const front = palette.accent || shade(frame, -0.05);
  const t = 0.025;
  const rows = clamp(Math.round(traits.shelves ?? 4), 2, 7);
  const cols = clamp(Math.round(traits.cols ?? 1), 1, 4);
  const base = traits.base || 'open';
  const kick = 0.06;
  const baseH = base === 'open' ? 0 : clamp(heightM * 0.26, 0.28, 0.6);
  const y0 = kick + baseH;
  const openH = heightM - y0 - t;
  const gap = (openH - rows * t) / rows;
  const inner = widthM - t * 2;
  return (
    <group>
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[(s * (widthM - t)) / 2, heightM / 2, 0]}
          size={[t, heightM, depthM]}
          color={frame}
          roughness={0.65}
        />
      ))}
      <Box
        position={[0, heightM - t / 2, 0]}
        size={[widthM, t, depthM]}
        color={frame}
        roughness={0.6}
      />
      <Box
        position={[0, kick / 2, 0]}
        size={[inner, kick, depthM - 0.04]}
        color={shade(frame, -0.12)}
        roughness={0.7}
      />
      {traits.back === 0 ? (
        // Open back: two slim cross braces keep the frame square
        [0.3, 0.78].map((k) => (
          <Box
            key={k}
            position={[0, y0 + (heightM - y0) * k, -depthM / 2 + 0.01]}
            size={[inner, 0.03, 0.012]}
            color={shade(frame, -0.08)}
            roughness={0.7}
            castShadow={false}
          />
        ))
      ) : (
        <Box
          position={[0, heightM / 2, -depthM / 2 + 0.008]}
          size={[inner, heightM - 0.004, 0.012]}
          color={shade(frame, -0.2)}
          roughness={0.85}
        />
      )}
      {Array.from({ length: rows }).map((_, k) => (
        <Box
          key={k}
          position={[0, y0 + k * (gap + t) + t / 2, 0]}
          size={[inner, t, depthM]}
          color={frame}
          roughness={0.6}
        />
      ))}
      {cols > 1 &&
        Array.from({ length: cols - 1 }).map((_, i) => (
          <Box
            key={i}
            position={[-inner / 2 + (inner * (i + 1)) / cols, y0 + openH / 2, 0]}
            size={[t * 0.8, openH, depthM - 0.02]}
            color={frame}
            roughness={0.65}
          />
        ))}
      {base === 'doors' && (
        <Doors
          width={inner}
          height={baseH - 0.01}
          y={kick + 0.005}
          z={depthM / 2}
          count={cols > 1 ? Math.min(cols, 4) : 2}
          color={front}
          handleColor={BRASS.color}
        />
      )}
      {base === 'drawers' && (
        <Drawers
          width={inner}
          height={baseH - 0.01}
          y={kick + 0.005}
          z={depthM / 2}
          rows={baseH > 0.4 ? 3 : 2}
          cols={cols > 1 ? Math.min(cols, 2) : 1}
          color={front}
          handleColor={BRASS.color}
        />
      )}
    </group>
  );
}

/** Sideboard: sections across the front with doors, drawers or a mix, on legs or a plinth. */
export function SideboardDesign({ widthM, depthM, heightM, palette, traits }) {
  const body = palette.body;
  const topColor = palette.accent || shade(body, 0.04);
  const legColor = palette.leg || '#2a2622';
  const legs = !!traits.legs;
  const legH = legs ? clamp(heightM * 0.2, 0.12, 0.22) : 0.06;
  const topT = 0.03;
  const bodyH = heightM - legH - topT;
  const n = clamp(Math.round(traits.n ?? 2), 1, 5);
  const style = traits.front || 'doors';
  const sw = (widthM - 0.04) / n;
  return (
    <group>
      {legs ? (
        corners(widthM, depthM, 0.08).map(([x, z], i) => (
          <Cyl
            key={i}
            position={[x, legH / 2, z]}
            radiusTop={0.024}
            radiusBottom={0.014}
            height={legH}
            color={legColor}
            roughness={0.45}
            metalness={0.1}
            segments={10}
          />
        ))
      ) : (
        <Box
          position={[0, legH / 2, -0.01]}
          size={[widthM - 0.06, legH, depthM - 0.06]}
          color={DARK}
          roughness={0.9}
        />
      )}
      <Box
        position={[0, legH + bodyH / 2, 0]}
        size={[widthM, bodyH, depthM]}
        color={body}
        roughness={0.55}
      />
      <Box
        position={[0, heightM - topT / 2, 0]}
        size={[widthM + 0.02, topT, depthM + 0.02]}
        color={topColor}
        roughness={0.45}
      />
      {Array.from({ length: n }).map((_, i) => {
        const x = -widthM / 2 + 0.02 + sw * (i + 0.5);
        // Mixed: the middle sections are drawers, the outer ones doors
        const drawers = style === 'drawers' || (style === 'mixed' && i % 2 === 1);
        return drawers ? (
          <Drawers
            key={i}
            width={sw - 0.006}
            height={bodyH - 0.04}
            x={x}
            y={legH + 0.02}
            z={depthM / 2}
            rows={bodyH > 0.5 ? 3 : 2}
            color={body}
            handleColor={BRASS.color}
          />
        ) : (
          <Doors
            key={i}
            width={sw - 0.006}
            height={bodyH - 0.04}
            x={x}
            y={legH + 0.02}
            z={depthM / 2}
            count={1}
            color={body}
            handleColor={BRASS.color}
          />
        );
      })}
    </group>
  );
}

/** Stool or bar stool: a round or square seat on four legs, with an optional low back and footrest. */
export function StoolDesign({ widthM, depthM, heightM, palette, traits }) {
  const frame = palette.body;
  const seatColor = palette.cushion || frame;
  const legColor = palette.leg || '#2a2622';
  const round = traits.seat !== 'square';
  const back = !!traits.back;
  const rest = !!traits.rest;
  const seatH = heightM - (back ? 0.2 : 0.03);
  const r = Math.min(widthM, depthM) / 2;
  const spread = round ? r * 0.7 : null;
  return (
    <group>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => {
        const hx = round ? spread : widthM / 2 - 0.04;
        const hz = round ? spread : depthM / 2 - 0.04;
        return (
          <Strut
            key={i}
            from={[sx * hx * 0.9, seatH - 0.03, sz * hz * 0.9]}
            to={[sx * hx * 1.12, 0, sz * hz * 1.12]}
            radius={0.016}
            color={legColor}
            roughness={0.45}
            metalness={0.2}
          />
        );
      })}
      {rest &&
        (round ? (
          <mesh position={[0, seatH * 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[spread * 1.02, 0.012, 8, 32]} />
            <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.3} />
          </mesh>
        ) : (
          [
            [0, -1, true],
            [0, 1, true],
            [-1, 0, false],
            [1, 0, false],
          ].map(([ax, az, alongX], i) => (
            <Box
              key={i}
              position={[
                ax * (widthM / 2 - 0.02) * 0.95,
                seatH * 0.36,
                az * (depthM / 2 - 0.02) * 0.95,
              ]}
              size={alongX ? [widthM * 0.9, 0.022, 0.022] : [0.022, 0.022, depthM * 0.9]}
              color={legColor}
              roughness={0.45}
            />
          ))
        ))}
      {round ? (
        <Cyl
          position={[0, seatH, 0]}
          radiusTop={r}
          radiusBottom={r * 0.97}
          height={0.06}
          color={seatColor}
          roughness={0.8}
          segments={32}
        />
      ) : (
        <Pad
          position={[0, seatH, 0]}
          size={[widthM, 0.06, depthM]}
          radius={0.02}
          color={seatColor}
          roughness={0.85}
        />
      )}
      {back &&
        (round ? (
          <mesh
            position={[0, seatH + 0.14, 0]}
            rotation={[Math.PI / 2, 0, -Math.PI / 2 - (Math.PI * 0.7) / 2]}
            castShadow
          >
            <torusGeometry args={[r * 0.88, 0.016, 8, 24, Math.PI * 0.7]} />
            <meshStandardMaterial color={frame} roughness={0.5} />
          </mesh>
        ) : (
          <>
            <Box
              position={[0, seatH + 0.16, -depthM / 2 + 0.03]}
              size={[widthM - 0.04, 0.06, 0.025]}
              color={frame}
              roughness={0.55}
            />
            {[-1, 1].map((s) => (
              <Box
                key={s}
                position={[s * (widthM / 2 - 0.04), seatH + 0.09, -depthM / 2 + 0.03]}
                size={[0.025, 0.14, 0.025]}
                color={frame}
                roughness={0.55}
              />
            ))}
          </>
        ))}
    </group>
  );
}

/**
 * Headboard for a photo-made bed in one of five styles: flat, panel (inset), channel stitched, tufted or slatted.
 * `hb` is the board's thickness; the board stands at the back of a bed `depthM` long.
 */
export function Headboard({ style, widthM, depthM, heightM, footH, mattressTop, hb, body }) {
  const zFace = -depthM / 2 + hb;
  const above = heightM - mattressTop;
  const midY = mattressTop + above / 2 - 0.02;
  const board = (
    <Pad
      position={[0, footH + (heightM - footH) / 2, -depthM / 2 + hb / 2]}
      size={[widthM + 0.02, heightM - footH, hb]}
      radius={style === 'flat' ? 0.02 : 0.04}
      color={body}
      roughness={0.92}
    />
  );
  if (style === 'slat') {
    const n = Math.max(6, Math.round(widthM / 0.11));
    const w = widthM - 0.04;
    return (
      <group name="headboard">
        <Box
          position={[0, heightM - 0.03, -depthM / 2 + hb / 2]}
          size={[widthM + 0.02, 0.06, hb]}
          color={body}
          roughness={0.7}
        />
        <Box
          position={[0, mattressTop - 0.04, -depthM / 2 + hb / 2]}
          size={[widthM + 0.02, 0.12, hb]}
          color={body}
          roughness={0.7}
        />
        {Array.from({ length: n }).map((_, i) => (
          <Box
            key={i}
            position={[
              -w / 2 + (w * (i + 0.5)) / n,
              mattressTop + (heightM - mattressTop) / 2 - 0.01,
              -depthM / 2 + hb / 2,
            ]}
            size={[Math.min(0.05, (w / n) * 0.6), heightM - mattressTop - 0.04, hb * 0.6]}
            color={shade(body, 0.02)}
            roughness={0.65}
          />
        ))}
      </group>
    );
  }
  return (
    <group name="headboard">
      {board}
      {style === 'panel' && (
        <Pad
          position={[0, midY, zFace + 0.004]}
          size={[widthM - 0.16, above - 0.12, 0.014]}
          radius={0.012}
          color={shade(body, 0.02)}
          roughness={0.95}
        />
      )}
      {style === 'channel' &&
        Array.from({ length: Math.max(2, Math.round(widthM / 0.28) - 1) }).map((_, i, a) => (
          <Box
            key={i}
            position={[-widthM / 2 + (widthM * (i + 1)) / (a.length + 1), midY, zFace + 0.012]}
            size={[0.006, above - 0.16, 0.004]}
            color={shade(body, -0.12)}
            castShadow={false}
          />
        ))}
      {style === 'tufted' && (
        <group position={[0, midY, zFace + 0.004]}>
          <TuftedFace
            width={Math.max(0.4, widthM - 0.1)}
            height={Math.max(0.2, above - 0.1)}
            z={0}
            color={shade(body, -0.16)}
            lift={shade(body, 0.02)}
          />
          {Array.from({ length: Math.max(2, Math.round(widthM / 0.3)) }).map((_, i, a) => (
            <Ball
              key={i}
              position={[-widthM / 2 + (widthM * (i + 0.5)) / a.length, 0, 0.004]}
              radius={0.012}
              scale={[1, 1, 0.55]}
              color={shade(body, -0.2)}
              segments={8}
              castShadow={false}
            />
          ))}
        </group>
      )}
    </group>
  );
}
