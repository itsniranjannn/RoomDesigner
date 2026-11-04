/** 3D models: bed. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import {
  Box,
  Cyl,
  Pad,
  Ball,
  Pillow,
  pillowRestY,
  tonal,
  Drawers,
  BRASS,
  corners,
  shade,
  clamp,
} from './shared.jsx';

const LINEN = '#FBF9F4';

/** Thin stitched lines in a darker shade, laid flat on top of a cushion or quilt. */
function Stitches({ y, xs = [], zs = [], w, d, color }) {
  return (
    <group>
      {xs.map((x) => (
        <Box
          key={`x${x}`}
          position={[x, y, 0]}
          size={[0.004, 0.003, d]}
          color={color}
          castShadow={false}
        />
      ))}
      {zs.map((z) => (
        <Box
          key={`z${z}`}
          position={[0, y, z]}
          size={[w, 0.003, 0.004]}
          color={color}
          castShadow={false}
        />
      ))}
    </group>
  );
}

function Mattress({ widthM, depthM, y, z, fabricColor }) {
  const mattressH = 0.22;
  const w = widthM - 0.04;
  const edge = shade(fabricColor, -0.09);
  return (
    <group name="mattress" position={[0, y, z]}>
      <Pad
        position={[0, mattressH / 2, 0]}
        size={[w, mattressH, depthM]}
        radius={0.05}
        color={fabricColor}
      />
      {/* Piping round the top edge and a seam around the side */}
      {[-1, 1].map((s) => (
        <Box
          key={`pz${s}`}
          position={[0, mattressH - 0.012, (s * (depthM - 0.01)) / 2]}
          size={[w - 0.04, 0.012, 0.012]}
          color={edge}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={`px${s}`}
          position={[(s * (w - 0.01)) / 2, mattressH - 0.012, 0]}
          size={[0.012, 0.012, depthM - 0.04]}
          color={edge}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={`sz${s}`}
          position={[0, mattressH * 0.45, (s * (depthM + 0.002)) / 2]}
          size={[w - 0.1, 0.004, 0.004]}
          color={edge}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={`sx${s}`}
          position={[(s * (w + 0.002)) / 2, mattressH * 0.45, 0]}
          size={[0.004, 0.004, depthM - 0.1]}
          color={edge}
          castShadow={false}
        />
      ))}
    </group>
  );
}

function Duvet({ widthM, mattressTop, z0, z1, accentColor, fabricColor, throwBlanket }) {
  const d = z1 - z0;
  const w = widthM - 0.02;
  const line = shade(accentColor, -0.1);
  const cz = (z0 + z1) / 2;
  const nx = Math.max(1, Math.round(w / 0.4) - 1);
  const xs = Array.from({ length: nx }, (_, i) => -w / 2 + (w * (i + 1)) / (nx + 1));
  return (
    <group name="duvet">
      <Pad
        position={[0, mattressTop + 0.028, cz]}
        size={[w, 0.06, d]}
        radius={0.025}
        color={accentColor}
        roughness={0.95}
      />
      <Stitches
        y={mattressTop + 0.059}
        xs={xs}
        zs={[z0 + d * 0.33, z0 + d * 0.66]}
        w={w - 0.04}
        d={d - 0.04}
        color={line}
      />
      {/* Sheet turned back at the head end */}
      <Pad
        position={[0, mattressTop + 0.05, z0 + 0.07]}
        size={[w + 0.005, 0.075, 0.16]}
        radius={0.03}
        color={fabricColor}
        roughness={0.95}
      />
      {/* Drape over the side rails and foot */}
      {[-1, 1].map((s) => (
        <Pad
          key={s}
          position={[(s * (w - 0.006)) / 2, mattressTop - 0.07, cz + 0.01]}
          size={[0.025, 0.2, d * 0.92]}
          radius={0.01}
          color={accentColor}
          roughness={0.95}
        />
      ))}
      <Pad
        position={[0, mattressTop - 0.05, z1 - 0.005]}
        size={[w - 0.02, 0.17, 0.025]}
        radius={0.01}
        color={accentColor}
        roughness={0.95}
      />
      {throwBlanket && (
        <Pad
          position={[0, mattressTop + 0.073, z1 - 0.2]}
          size={[w - 0.1, 0.02, 0.3]}
          radius={0.008}
          color={tonal(accentColor, 0.16)}
          roughness={0.98}
        />
      )}
    </group>
  );
}

export function BedModel({
  def,
  widthM,
  depthM,
  heightM,
  mainColor,
  fabricColor,
  headboardColor,
  accentColor,
}) {
  const id = def?.id || '';
  const storage = id === 'bed-storage-single';
  const slatted = id === 'bed-single';
  const isSingle = widthM < 1.2;
  const big = widthM > 1.8;
  const hb = 0.08;
  const frameH = storage ? 0.3 : 0.22;
  const mattressH = 0.22;
  const mattressTop = frameH + mattressH;
  const mattressD = depthM - hb - 0.02;
  const mattressZ = hb / 2 + 0.01;
  const front = depthM / 2;
  const pillowZ = -depthM / 2 + hb + 0.2;
  const duvetZ0 = mattressZ - mattressD / 2 + mattressD * 0.38;
  const duvetZ1 = mattressZ + mattressD / 2 - 0.005;
  const hbColor = headboardColor;
  const chanN = clamp(Math.round(widthM / 0.24), 3, 10);
  const trim = shade(mainColor, -0.1);
  const pillowW = isSingle ? widthM * 0.6 : widthM * (big ? 0.28 : 0.38);
  const prop = (key, x, z, size, color, tilt, yaw = 0) => {
    const rotation = [tilt, yaw, 0];
    return {
      id: key,
      size,
      color,
      rotation,
      position: [x, pillowRestY(size, rotation, mattressTop), z],
    };
  };
  const sleep = [pillowW, 0.13, 0.36];
  const bedPillows = isSingle
    ? [prop('p', 0, pillowZ, sleep, LINEN, 0.22)]
    : [
        ...[-1, 1].map((s) =>
          prop(`p${s}`, s * widthM * (big ? 0.26 : 0.23), pillowZ, sleep, LINEN, 0.22)
        ),
        ...(big
          ? [-1, 1].map((s) =>
              prop(
                `e${s}`,
                s * widthM * 0.12,
                pillowZ + 0.2,
                [pillowW * 0.82, 0.12, 0.3],
                shade(accentColor, 0.12),
                0.3,
                s * 0.1
              )
            )
          : [
              prop(
                'e',
                0,
                pillowZ + 0.22,
                [widthM * 0.3, 0.1, 0.24],
                shade(accentColor, 0.12),
                0.3
              ),
            ]),
      ];
  return (
    <group>
      {/* Base: plinth rail with trim, short turned feet (or a drawer base for the storage bed) */}
      <Box
        position={[0, 0.07 + (frameH - 0.07) / 2, hb / 2]}
        size={[widthM, frameH - 0.07, depthM - hb]}
        color={mainColor}
        roughness={0.65}
      />
      <Box
        position={[0, frameH - 0.012, hb / 2]}
        size={[widthM + 0.016, 0.024, depthM - hb + 0.016]}
        color={trim}
        roughness={0.6}
      />
      {storage ? (
        <>
          <Box
            position={[0, 0.03, hb / 2]}
            size={[widthM - 0.04, 0.06, depthM - hb - 0.04]}
            color="#2B2118"
            roughness={0.9}
          />
          {[1, -1].map((s) => (
            <group key={s} rotation={[0, (s * Math.PI) / 2, 0]}>
              <Drawers
                width={(depthM - hb) * 0.9}
                height={frameH - 0.1}
                x={(-s * hb) / 2}
                y={0.07}
                z={widthM / 2}
                rows={1}
                cols={2}
                color={shade(mainColor, 0.03)}
                handle="knob"
                handleColor={BRASS.color}
              />
            </group>
          ))}
        </>
      ) : (
        corners(widthM, depthM, 0.055).map(([x, z], i) => (
          <Cyl
            key={i}
            position={[x, 0.04, z]}
            radiusTop={0.032}
            radiusBottom={0.022}
            height={0.08}
            color={mainColor}
            roughness={0.55}
            segments={12}
          />
        ))
      )}

      {/* Headboard */}
      {slatted ? (
        <group name="headboard">
          {[0.15, heightM - 0.06].map((y) => (
            <Box
              key={y}
              position={[0, y, -depthM / 2 + hb / 2]}
              size={[widthM, 0.07, hb]}
              color={mainColor}
              roughness={0.6}
            />
          ))}
          {[-1, 1].map((s) => (
            <Box
              key={s}
              position={[(s * (widthM - 0.06)) / 2, heightM / 2, -depthM / 2 + hb / 2]}
              size={[0.06, heightM, hb]}
              color={mainColor}
              roughness={0.6}
            />
          ))}
          {Array.from({ length: Math.round(widthM / 0.08) - 1 }).map((_, i, arr) => (
            <Box
              key={i}
              position={[
                -widthM / 2 + 0.08 + ((widthM - 0.16) * (i + 0.5)) / arr.length,
                heightM / 2 + 0.04,
                -depthM / 2 + hb / 2,
              ]}
              size={[0.035, heightM - 0.2, 0.03]}
              color={hbColor}
              roughness={0.7}
            />
          ))}
        </group>
      ) : (
        <group name="headboard">
          <Pad
            position={[0, heightM / 2 + 0.03, -depthM / 2 + hb / 2]}
            size={[widthM + 0.02, heightM - 0.06, hb]}
            radius={0.03}
            color={hbColor}
            roughness={0.9}
          />
          <Box
            position={[0, heightM - 0.015, -depthM / 2 + hb / 2]}
            size={[widthM + 0.04, 0.035, hb + 0.02]}
            color={mainColor}
            roughness={0.55}
          />
          {/* Vertical channels and buttons for a tufted look */}
          {Array.from({ length: chanN - 1 }).map((_, i) => {
            const x = -widthM / 2 + (widthM * (i + 1)) / chanN;
            return (
              <group key={i}>
                <Box
                  position={[x, mattressTop + 0.32, -depthM / 2 + hb + 0.001]}
                  size={[0.006, heightM - mattressTop - 0.2, 0.004]}
                  color={shade(hbColor, -0.1)}
                  castShadow={false}
                />
                {[0.18, 0.38].map((dy) => (
                  <Ball
                    key={dy}
                    position={[x, mattressTop + dy, -depthM / 2 + hb + 0.006]}
                    radius={0.011}
                    color={shade(hbColor, -0.14)}
                    segments={8}
                    castShadow={false}
                  />
                ))}
              </group>
            );
          })}
          {[-1, 1].map((s) => (
            <Box
              key={s}
              position={[(s * (widthM + 0.01)) / 2, heightM / 2, -depthM / 2 + hb / 2]}
              size={[0.035, heightM, hb + 0.02]}
              color={mainColor}
              roughness={0.55}
            />
          ))}
        </group>
      )}

      {/* Footboard: low panelled rail with a darker inset */}
      <Box
        position={[0, frameH + 0.1, front - 0.02]}
        size={[widthM, 0.28, 0.04]}
        color={mainColor}
        roughness={0.6}
      />
      <Box
        position={[0, frameH + 0.1, front + 0.001]}
        size={[widthM - 0.12, 0.18, 0.004]}
        color={shade(mainColor, 0.04)}
        roughness={0.6}
        castShadow={false}
      />
      <Box
        position={[0, frameH + 0.245, front - 0.02]}
        size={[widthM + 0.02, 0.03, 0.05]}
        color={trim}
        roughness={0.55}
      />

      <Mattress
        widthM={widthM}
        depthM={mattressD}
        y={frameH}
        z={mattressZ}
        fabricColor={fabricColor}
      />
      <Duvet
        widthM={widthM}
        mattressTop={mattressTop}
        z0={duvetZ0}
        z1={duvetZ1}
        accentColor={accentColor}
        fabricColor={fabricColor}
        throwBlanket={!isSingle}
      />

      {/* Pillows propped against the headboard, back edge raised */}
      {bedPillows.map((p) => (
        <Pillow
          key={p.id}
          position={p.position}
          size={p.size}
          color={p.color}
          rotation={p.rotation}
        />
      ))}
    </group>
  );
}

export function BedBunkModel({ widthM, depthM, heightM, mainColor, fabricColor, accentColor }) {
  const postW = 0.06;
  const lowerY = heightM * 0.2;
  const upperY = heightM * 0.62;
  const slats = 9;
  const bunk = (y, key) => (
    <group key={key} name="bunk-mattress">
      {/* Slatted bed base on side rails */}
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[(s * (widthM - postW * 2 - 0.03)) / 2, y - 0.07, 0]}
          size={[0.03, 0.09, depthM - postW * 2]}
          color={mainColor}
          roughness={0.65}
        />
      ))}
      {Array.from({ length: slats }).map((_, i) => (
        <Box
          key={i}
          position={[
            0,
            y - 0.04,
            -(depthM - postW * 2) / 2 + ((depthM - postW * 2) * (i + 0.5)) / slats,
          ]}
          size={[widthM - postW * 2 - 0.02, 0.018, 0.06]}
          color={shade(mainColor, 0.06)}
          roughness={0.7}
        />
      ))}
      <Pad
        position={[0, y + 0.06, 0]}
        size={[widthM - postW * 2 - 0.02, 0.15, depthM - postW * 2 - 0.02]}
        radius={0.04}
        color={fabricColor}
      />
      <Box
        position={[0, y + 0.128, 0]}
        size={[widthM - postW * 2 - 0.06, 0.006, 0.006]}
        color={shade(fabricColor, -0.1)}
        castShadow={false}
      />
      <Pad
        position={[0, y + 0.12, 0.12]}
        size={[widthM - postW * 2 - 0.03, 0.04, (depthM - postW * 2) * 0.58]}
        radius={0.02}
        color={accentColor}
        roughness={0.95}
      />
      <Pillow
        position={[
          0,
          pillowRestY([widthM * 0.55, 0.1, 0.3], [0.2, 0, 0], y + 0.14),
          -depthM / 2 + 0.3,
        ]}
        size={[widthM * 0.55, 0.1, 0.3]}
        color={LINEN}
        rotation={[0.2, 0, 0]}
      />
    </group>
  );
  const ladderX = widthM / 2 - 0.18;
  return (
    <group>
      {corners(widthM, depthM, postW / 2).map(([x, z], i) => (
        <group key={i}>
          <Box
            position={[x, heightM / 2, z]}
            size={[postW, heightM, postW]}
            color={mainColor}
            roughness={0.65}
          />
          <Ball
            position={[x, heightM + 0.01, z]}
            radius={0.04}
            color={mainColor}
            roughness={0.55}
          />
        </group>
      ))}
      {bunk(lowerY, 'lower')}
      {bunk(upperY, 'upper')}

      {/* Headboard / footboard panels at both levels */}
      {[lowerY, upperY].map((y) => (
        <Box
          key={y}
          position={[0, y + 0.02, -depthM / 2 + postW / 2]}
          size={[widthM - postW * 2, 0.22, 0.02]}
          color={shade(mainColor, 0.05)}
          roughness={0.65}
        />
      ))}

      {/* Upper bunk safety rails: slatted guard on the long sides, gap at the ladder */}
      {[-1, 1].map((s) => (
        <group key={s} name="bunk-rail">
          <Box
            position={[s * (widthM / 2 - postW / 2), upperY + 0.32, 0]}
            size={[0.025, 0.045, depthM - postW * 2]}
            color={mainColor}
            roughness={0.65}
          />
          <Box
            position={[s * (widthM / 2 - postW / 2), upperY + 0.2, 0]}
            size={[0.025, 0.045, depthM - postW * 2]}
            color={mainColor}
            roughness={0.65}
          />
          {Array.from({ length: 12 }).map((_, i) => (
            <Box
              key={i}
              position={[
                s * (widthM / 2 - postW / 2),
                upperY + 0.26,
                -(depthM - postW * 2) / 2 + ((depthM - postW * 2) * (i + 0.5)) / 12,
              ]}
              size={[0.018, 0.14, 0.018]}
              color={shade(mainColor, 0.05)}
              roughness={0.7}
            />
          ))}
        </group>
      ))}
      <Box
        position={[0, upperY + 0.3, -depthM / 2 + postW / 2]}
        size={[widthM - postW * 2, 0.07, 0.025]}
        color={mainColor}
        roughness={0.65}
      />
      <Box
        position={[0, upperY + 0.3, depthM / 2 - postW / 2]}
        size={[widthM - postW * 2, 0.07, 0.025]}
        color={mainColor}
        roughness={0.65}
      />

      {/* Ladder with flat rungs fixed to the foot end */}
      <group name="bunk-ladder">
        {[-1, 1].map((s) => (
          <Box
            key={s}
            position={[ladderX + s * 0.13, heightM * 0.47, depthM / 2 + 0.03]}
            size={[0.035, heightM * 0.94, 0.04]}
            color={mainColor}
            roughness={0.65}
          />
        ))}
        {[0.12, 0.26, 0.4, 0.54, 0.68, 0.82].map((f) => (
          <Box
            key={f}
            position={[ladderX, heightM * f, depthM / 2 + 0.03]}
            size={[0.26, 0.03, 0.035]}
            color={accentColor}
            roughness={0.6}
          />
        ))}
        {[-1, 1].map((s) => (
          <Box
            key={`h${s}`}
            position={[ladderX + s * 0.13, upperY + 0.15, depthM / 2 + 0.03]}
            size={[0.03, 0.34, 0.04]}
            color={mainColor}
            roughness={0.65}
          />
        ))}
      </group>
    </group>
  );
}
