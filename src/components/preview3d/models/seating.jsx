/** 3D models: seating. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import {
  Box,
  Cyl,
  Pad,
  Ball,
  Pillow,
  leaningPillow,
  Strut,
  strutTransform,
  CHROME,
  BLACK_PLASTIC,
  corners,
  clamp,
  shade,
  EdgePiping,
  Buttons,
} from './shared.jsx';

const FOOT_H = 0.1;
const BACK_CUSHION_TILT = 0.22;

/** Scatter cushions for a sofa or armchair: leaning on the back cushions, resting on the seat. */
export function scatterPillows({ widthM, depthM, heightM, armRatio, seats, seatH = 0.44 }) {
  const armW = widthM * armRatio;
  const backThick = depthM * 0.26;
  const innerW = widthM - armW * 2;
  const backCushionH = heightM - seatH - 0.06;
  // Never wider than the gap between the arms, however small the piece is resized
  const w = Math.max(0.12, Math.min(clamp(innerW * 0.34, 0.26, 0.4), innerW - 0.02));
  const size = [w, w * 0.4, w];
  // Front face of the loose back cushion, which the scatter cushions lean on
  const centre = [0, seatH + backCushionH / 2 - 0.02, -depthM / 2 + backThick + 0.06];
  const normal = [0, Math.sin(BACK_CUSHION_TILT), Math.cos(BACK_CUSHION_TILT)];
  const planePoint = centre.map((c, i) => c + normal[i] * 0.065);
  const spots = seats > 1 ? [-1, 1] : [-1];
  return spots.map((sg) => ({
    sg,
    size,
    ...leaningPillow({
      size,
      lean: 1.15 + (sg > 0 ? 0.06 : 0),
      yaw: sg * 0.14,
      x: sg * Math.max(0, innerW / 2 - w / 2 - 0.045),
      seatTop: seatH,
      planePoint,
      planeNormal: normal,
    }),
  }));
}

/** Button-tufted face of a back cushion: a grid of buttons with creases between them and piped edges. */
export function TuftedFace({ width, height, z, color, lift }) {
  const cols = width > 0.5 ? 3 : 2;
  const rows = 2;
  const gx = width * 0.64;
  const gy = height * 0.34;
  const xs = Array.from({ length: cols }, (_, i) => (cols === 1 ? 0 : (i / (cols - 1) - 0.5) * gx));
  const ys = [-gy / 2, gy / 2].slice(0, rows);
  return (
    <group name="tufting">
      {xs.flatMap((x, i) =>
        ys.map((y, j) => (
          <Ball
            key={`${i}-${j}`}
            position={[x, y, z + 0.002]}
            radius={0.014}
            scale={[1, 1, 0.55]}
            color={color}
            segments={8}
            castShadow={false}
          />
        ))
      )}
      {ys.map((y) => (
        <Box
          key={`h${y}`}
          position={[0, y, z]}
          size={[gx, 0.004, 0.003]}
          color={color}
          castShadow={false}
        />
      ))}
      {xs.map((x) => (
        <Box
          key={`v${x}`}
          position={[x, 0, z]}
          size={[0.004, gy, 0.003]}
          color={color}
          castShadow={false}
        />
      ))}
      {/* piped edge */}
      {[-1, 1].map((sg) => (
        <Box
          key={`pt${sg}`}
          position={[0, (sg * (height - 0.07)) / 2, z]}
          size={[width - 0.07, 0.009, 0.006]}
          color={lift}
          castShadow={false}
        />
      ))}
      {[-1, 1].map((sg) => (
        <Box
          key={`px${sg}`}
          position={[(sg * (width - 0.07)) / 2, 0, z]}
          size={[0.009, height - 0.07, 0.006]}
          color={lift}
          castShadow={false}
        />
      ))}
    </group>
  );
}

/** Upholstered sofa or armchair: frame, arms, back, seat cushions and loose back cushions. */
export function Upholstered({
  widthM,
  depthM,
  heightM,
  mainColor,
  cushionColor,
  legColor,
  armRatio,
  seats,
  seatH = 0.44,
  armH = 0.62,
  roughness,
  recliner = false,
  scatter = false,
  roll = false,
  tufted = false,
  taper = false,
}) {
  const footH = taper ? 0.16 : FOOT_H;
  const armW = widthM * armRatio;
  const backThick = depthM * 0.26;
  const innerW = widthM - armW * 2;
  const seatW = innerW / seats;
  const seatDepth = depthM - backThick;
  const backCushionH = heightM - seatH - 0.06;
  const welt = shade(cushionColor, -0.1);
  return (
    <group>
      {/* Frame below the seat, standing on feet */}
      <Pad
        position={[0, (footH + seatH - 0.1) / 2 + 0.02, 0]}
        size={[widthM, seatH - 0.1 - footH + 0.06, depthM]}
        radius={0.03}
        color={mainColor}
        roughness={roughness}
      />
      {taper
        ? corners(widthM, depthM, 0.11).map(([x, z], i) => (
            <Cyl
              key={i}
              position={[x + Math.sign(x) * 0.02, footH / 2, z + Math.sign(z) * 0.02]}
              rotation={[-Math.sign(z) * 0.2, 0, Math.sign(x) * 0.2]}
              radiusTop={0.03}
              radiusBottom={0.013}
              height={footH + 0.02}
              color={legColor}
              roughness={0.55}
              segments={14}
            />
          ))
        : corners(widthM, depthM, 0.07).map(([x, z], i) => (
            <Cyl
              key={i}
              position={[x, FOOT_H / 2, z]}
              radiusTop={0.024}
              radiusBottom={0.018}
              height={FOOT_H}
              color={legColor}
              roughness={0.5}
              segments={12}
            />
          ))}

      {/* Back and arms */}
      <Pad
        position={[0, (footH + heightM) / 2 - 0.03, -depthM / 2 + backThick / 2]}
        size={[widthM, heightM - footH, backThick]}
        radius={0.05}
        color={mainColor}
        roughness={roughness}
      />
      {[-1, 1].map((s) => (
        <Pad
          key={s}
          position={[s * (widthM / 2 - armW / 2), (footH + armH) / 2, 0]}
          size={[armW, armH - footH, depthM]}
          radius={roll ? Math.min(0.12, armW / 2.05) : Math.min(0.06, armW / 2.5)}
          color={mainColor}
          roughness={roughness}
        />
      ))}

      {/* Seat cushions with welting, front seam and a base welt line */}
      {Array.from({ length: seats }).map((_, i) => {
        const cx = -innerW / 2 + seatW * (i + 0.5);
        return (
          <group key={i} name="seat-cushion">
            <Pad
              position={[cx, seatH - 0.07, backThick / 2]}
              size={[seatW - 0.015, 0.14, seatDepth - 0.02]}
              radius={0.05}
              color={cushionColor}
            />
            <EdgePiping
              position={[cx, seatH - 0.004, backThick / 2]}
              width={seatW - 0.015}
              depth={seatDepth - 0.02}
              color={welt}
            />
          </group>
        );
      })}
      <Box
        position={[0, seatH - 0.17, depthM / 2 + 0.002]}
        size={[widthM - 0.04, 0.006, 0.006]}
        color={shade(mainColor, -0.1)}
        castShadow={false}
      />
      {/* Loose back cushions leaning on the backrest, stitched and buttoned */}
      {Array.from({ length: seats }).map((_, i) => (
        <group
          key={i}
          position={[
            -innerW / 2 + seatW * (i + 0.5),
            seatH + backCushionH / 2 - 0.02,
            -depthM / 2 + backThick + 0.06,
          ]}
          rotation={[-BACK_CUSHION_TILT, 0, 0]}
        >
          <Pad size={[seatW - 0.03, backCushionH, 0.13]} radius={0.05} color={cushionColor} />
          <Box
            position={[0, 0, 0.066]}
            size={[seatW - 0.1, 0.004, 0.003]}
            color={welt}
            castShadow={false}
          />
          {tufted ? (
            <TuftedFace
              width={seatW - 0.03}
              height={backCushionH}
              z={0.066}
              color={welt}
              lift={shade(cushionColor, 0.06)}
            />
          ) : (
            [-0.18, 0.18].map((f) => (
              <Ball
                key={f}
                position={[(seatW - 0.03) * f, backCushionH * 0.05, 0.068]}
                radius={0.011}
                color={welt}
                segments={8}
                castShadow={false}
              />
            ))
          )}
        </group>
      ))}
      {scatter &&
        scatterPillows({ widthM, depthM, heightM, armRatio, seats, seatH }).map((p) => (
          <Pillow
            key={p.sg}
            position={p.position}
            size={p.size}
            color={p.sg > 0 ? shade(mainColor, 0.18) : '#E9DFCF'}
            rotation={p.rotation}
          />
        ))}
      {recliner && (
        <group name="recliner-mech">
          <Pad
            position={[0, heightM - 0.07, -depthM / 2 + backThick / 2 + 0.01]}
            size={[widthM * 0.5, 0.2, 0.12]}
            radius={0.05}
            color={cushionColor}
            rotation={[-0.15, 0, 0]}
          />
          <Pad
            position={[0, seatH - 0.2, depthM / 2 - 0.1]}
            size={[widthM * 0.62, 0.1, 0.14]}
            radius={0.04}
            color={cushionColor}
          />
          <Box
            position={[widthM / 2 + 0.006, seatH - 0.02, 0.18]}
            size={[0.02, 0.012, 0.1]}
            {...BLACK_PLASTIC}
          />
          {[0.28, 0.4, 0.52].map((f) => (
            <Box
              key={f}
              position={[0, heightM * f + 0.1, -depthM / 2 + backThick + 0.0]}
              size={[widthM * 0.5, 0.005, 0.004]}
              color={shade(cushionColor, -0.12)}
              castShadow={false}
            />
          ))}
        </group>
      )}
    </group>
  );
}

export function SofaModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  const seats = widthM > 2.1 ? 3 : widthM > 1.5 ? 2 : 1;
  return (
    <Upholstered
      widthM={widthM}
      depthM={depthM}
      heightM={heightM}
      mainColor={mainColor}
      cushionColor={cushionColor}
      legColor={legColor}
      armRatio={0.1}
      seats={seats}
      roughness={0.85}
      scatter={widthM > 1.5}
    />
  );
}

export function ArmchairModel({ def, widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  return (
    <Upholstered
      widthM={widthM}
      depthM={depthM}
      heightM={heightM}
      mainColor={mainColor}
      cushionColor={cushionColor}
      legColor={legColor}
      armRatio={0.17}
      seats={1}
      seatH={0.42}
      armH={0.58}
      roughness={0.7}
      recliner={def?.id === 'recliner-chair'}
      scatter={def?.id !== 'recliner-chair'}
    />
  );
}

export function ChairModel({
  widthM,
  depthM,
  heightM,
  mainColor,
  cushionColor,
  legColor,
  backStyle = 'slat',
}) {
  const seatH = Math.min(0.46, heightM * 0.56);
  const legInset = 0.035;
  const backTop = heightM;
  const slatBottom = seatH + 0.06;
  return (
    <group>
      <Pad
        position={[0, seatH - 0.025, 0.01]}
        size={[widthM, 0.05, depthM - 0.02]}
        radius={0.015}
        color={cushionColor}
        roughness={0.75}
      />
      <EdgePiping
        position={[0, seatH + 0.0005, 0.01]}
        width={widthM}
        depth={depthM - 0.02}
        inset={0.03}
        color={shade(cushionColor, -0.12)}
      />
      <Box
        position={[0, seatH + 0.001, 0.01]}
        size={[widthM - 0.1, 0.002, 0.003]}
        color={shade(cushionColor, -0.14)}
        castShadow={false}
      />
      {/* Front legs stop under the seat, rear legs run up to form the back posts */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * (widthM / 2 - legInset), (seatH - 0.05) / 2, depthM / 2 - legInset]}
            size={[0.035, seatH - 0.05, 0.035]}
            color={legColor}
            roughness={0.55}
          />
          <Box
            position={[s * (widthM / 2 - legInset), backTop / 2, -depthM / 2 + legInset]}
            size={[0.035, backTop, 0.035]}
            color={legColor}
            roughness={0.55}
          />
        </group>
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cyl
            key={`f${sx}${sz}`}
            position={[sx * (widthM / 2 - legInset), 0.008, sz * (depthM / 2 - legInset)]}
            radiusTop={0.019}
            height={0.016}
            color="#2A2A2C"
            roughness={0.6}
            segments={8}
            castShadow={false}
          />
        ))
      )}
      {/* Stretchers and seat rails */}
      <Box
        position={[0, seatH * 0.38, depthM / 2 - legInset]}
        size={[widthM - 0.07, 0.02, 0.02]}
        color={legColor}
        roughness={0.55}
      />
      <Box
        position={[0, seatH * 0.38, -depthM / 2 + legInset]}
        size={[widthM - 0.07, 0.02, 0.02]}
        color={legColor}
        roughness={0.55}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          position={[s * (widthM / 2 - legInset), seatH * 0.38, 0]}
          size={[0.02, 0.02, depthM - 0.07]}
          color={legColor}
          roughness={0.55}
        />
      ))}
      {/* Backrest: top rail plus vertical slats */}
      <Box
        position={[0, backTop - 0.05, -depthM / 2 + legInset]}
        size={[widthM - 0.07, 0.1, 0.025]}
        color={mainColor}
        roughness={0.6}
      />
      {backStyle === 'solid' ? (
        <Pad
          position={[0, (slatBottom + backTop - 0.1) / 2, -depthM / 2 + legInset]}
          size={[widthM - 0.07, backTop - 0.1 - slatBottom, 0.025]}
          radius={0.01}
          color={mainColor}
          roughness={0.6}
        />
      ) : backStyle === 'open' ? null : (
        [-0.28, -0.14, 0, 0.14, 0.28].map((f, i) => (
          <Box
            key={i}
            position={[widthM * f, (slatBottom + backTop - 0.1) / 2, -depthM / 2 + legInset]}
            size={[0.016, backTop - 0.1 - slatBottom, 0.016]}
            color={mainColor}
            roughness={0.6}
          />
        ))
      )}
    </group>
  );
}

export function DeskChairModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  const seatH = 0.48;
  const reach = Math.min(widthM, depthM) / 2 - 0.03;
  const armCount = 5;
  return (
    <group>
      {/* Five-star base with casters */}
      {Array.from({ length: armCount }).map((_, i) => {
        const a = (i / armCount) * Math.PI * 2;
        const x = Math.sin(a) * reach;
        const z = Math.cos(a) * reach;
        return (
          <group key={i}>
            <Strut
              from={[0, 0.1, 0]}
              to={[x, 0.05, z]}
              radius={0.016}
              color={legColor}
              roughness={0.4}
              metalness={0.5}
            />
            <group name="caster" position={[x, 0.03, z]} rotation={[0, a, 0]}>
              <Box position={[0, 0.012, 0]} size={[0.014, 0.03, 0.014]} {...CHROME} />
              <Box
                position={[0, 0.0, 0]}
                size={[0.03, 0.006, 0.012]}
                color="#2A2A2C"
                roughness={0.6}
              />
              <Cyl
                position={[0, -0.006, 0]}
                radiusTop={0.022}
                height={0.016}
                rotation={[0, 0, Math.PI / 2]}
                color="#1B1B1B"
                roughness={0.7}
                segments={12}
              />
            </group>
          </group>
        );
      })}
      <Cyl
        position={[0, 0.1 + (seatH - 0.14) / 2, 0]}
        radiusTop={0.028}
        height={seatH - 0.14}
        {...CHROME}
        segments={14}
      />
      <Cyl
        position={[0, 0.14 + (seatH - 0.14) * 0.3, 0]}
        radiusTop={0.04}
        radiusBottom={0.046}
        height={(seatH - 0.14) * 0.6}
        {...BLACK_PLASTIC}
        segments={14}
      />
      <Cyl
        position={[0, 0.12, 0]}
        radiusTop={0.04}
        radiusBottom={0.05}
        height={0.08}
        color={legColor}
        roughness={0.5}
        segments={14}
      />
      {/* Seat, back and arm rests */}
      <Pad
        position={[0, seatH, 0.02]}
        size={[widthM * 0.72, 0.09, depthM * 0.7]}
        radius={0.04}
        color={cushionColor}
      />
      <Pad
        position={[0, (seatH + heightM) / 2 + 0.03, -depthM * 0.3]}
        size={[widthM * 0.68, heightM - seatH - 0.06, 0.07]}
        radius={0.035}
        color={mainColor}
        rotation={[-0.1, 0, 0]}
      />
      <Box
        position={[0, seatH - 0.065, 0.02]}
        size={[widthM * 0.5, 0.03, depthM * 0.45]}
        {...BLACK_PLASTIC}
      />
      <Box
        position={[widthM * 0.3, seatH - 0.085, 0.02]}
        size={[0.1, 0.012, 0.02]}
        {...BLACK_PLASTIC}
      />
      <EdgePiping
        position={[0, seatH + 0.045, 0.02]}
        width={widthM * 0.72}
        depth={depthM * 0.7}
        color={shade(cushionColor, -0.1)}
      />
      {[0.18, 0.4, 0.62].map((f) => (
        <Box
          key={f}
          position={[0, seatH + (heightM - seatH) * f + 0.05, -depthM * 0.3 + 0.036]}
          size={[widthM * 0.56, 0.004, 0.003]}
          color={shade(mainColor, -0.1)}
          castShadow={false}
          rotation={[-0.1, 0, 0]}
        />
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box
            position={[s * widthM * 0.37, seatH + 0.12, 0]}
            size={[0.025, 0.2, 0.025]}
            color={legColor}
            roughness={0.4}
            metalness={0.4}
          />
          <Pad
            position={[s * widthM * 0.37, seatH + 0.23, 0]}
            size={[0.06, 0.03, 0.26]}
            radius={0.012}
            color={legColor}
            roughness={0.6}
          />
        </group>
      ))}
    </group>
  );
}

export function BarStoolModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  const seatR = Math.min(widthM, depthM) / 2;
  const seatH = heightM - 0.2;
  const backArc = Math.PI * 0.7;
  return (
    <group>
      {/* Four slightly splayed legs and a footrest ring */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <Strut
          key={i}
          from={[sx * seatR * 0.82, seatH - 0.03, sz * seatR * 0.82]}
          to={[sx * seatR * 0.98, 0, sz * seatR * 0.98]}
          radius={0.015}
          color={legColor}
          roughness={0.45}
          metalness={0.3}
        />
      ))}
      <mesh position={[0, seatH * 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[seatR * 0.9, 0.012, 8, 32]} />
        <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.3} />
      </mesh>
      <Cyl
        position={[0, seatH - 0.03, 0]}
        radiusTop={seatR * 0.9}
        height={0.03}
        color={legColor}
        roughness={0.5}
        segments={28}
      />
      <mesh position={[0, seatH + 0.056, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[seatR * 0.97, 0.007, 6, 32]} />
        <meshStandardMaterial color={shade(cushionColor, -0.12)} roughness={0.8} />
      </mesh>
      <Ball
        position={[0, seatH + 0.058, 0]}
        radius={0.012}
        scale={[1, 0.6, 1]}
        color={shade(cushionColor, -0.15)}
        segments={8}
        castShadow={false}
      />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <Cyl
          key={`rf${i}`}
          position={[sx * seatR * 0.98, 0.006, sz * seatR * 0.98]}
          radiusTop={0.017}
          height={0.012}
          color="#101010"
          roughness={0.9}
          segments={8}
          castShadow={false}
        />
      ))}
      {/* Round cushioned seat and a low curved back rail */}
      <Cyl
        position={[0, seatH + 0.02, 0]}
        radiusTop={seatR}
        radiusBottom={seatR * 0.97}
        height={0.07}
        color={cushionColor}
        roughness={0.7}
        segments={32}
      />
      <mesh
        position={[0, seatH + 0.17, 0]}
        rotation={[Math.PI / 2, 0, -Math.PI / 2 - backArc / 2]}
        castShadow
      >
        <torusGeometry args={[seatR * 0.88, 0.014, 8, 24, backArc]} />
        <meshStandardMaterial color={mainColor} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <Strut
          key={s}
          from={[s * seatR * 0.55, seatH + 0.05, -seatR * 0.68]}
          to={[s * seatR * 0.55, seatH + 0.17, -seatR * 0.68]}
          radius={0.012}
          color={mainColor}
        />
      ))}
    </group>
  );
}

export function OttomanModel({ widthM, depthM, heightM, cushionColor, legColor }) {
  const baseH = 0.06;
  const footH = 0.05;
  const cols = clamp(Math.round(widthM / 0.2), 2, 6);
  const rows = clamp(Math.round(depthM / 0.2), 1, 3);
  const dark = shade(cushionColor, -0.14);
  return (
    <group>
      {/* Bun feet under a plinth, welted top and buttoned surface */}
      {corners(widthM, depthM, 0.07).map(([x, z], i) => (
        <Ball
          key={i}
          position={[x, footH / 2, z]}
          radius={0.032}
          scale={[1, 0.8, 1]}
          color={legColor}
          roughness={0.5}
          segments={10}
        />
      ))}
      <Box
        position={[0, footH + baseH / 2 - 0.02, 0]}
        size={[widthM * 0.92, baseH, depthM * 0.92]}
        color={legColor}
        roughness={0.8}
      />
      <Pad
        position={[0, baseH + footH - 0.02 + (heightM - baseH - footH + 0.02) / 2, 0]}
        size={[widthM, heightM - baseH - footH + 0.02, depthM]}
        radius={0.05}
        color={cushionColor}
      />
      <EdgePiping position={[0, heightM - 0.004, 0]} width={widthM} depth={depthM} color={dark} />
      <Box
        position={[0, heightM * 0.5, depthM / 2 + 0.001]}
        size={[widthM - 0.1, 0.004, 0.004]}
        color={dark}
        castShadow={false}
      />
      <Buttons
        y={heightM + 0.0}
        width={widthM - 0.1}
        depth={depthM - 0.1}
        cols={cols}
        rows={rows}
        color={dark}
      />
    </group>
  );
}

/** Rectangular wooden bar running between two points (frames, slanted legs, armrests). */
export function WoodBar({ from, to, size = [0.04, 0.03], color, roughness = 0.5 }) {
  const { position, quaternion, length } = strutTransform(from, to);
  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <boxGeometry args={[size[0], length, size[1]]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

/**
 * Mid-century lounge chair: an exposed wooden frame (slanted legs, back posts, flat wooden armrests and
 * horizontal back rails) with a loose seat cushion and a loose back cushion, open at the sides.
 */
export function LoungeChairModel({ widthM, depthM, heightM, mainColor, cushionColor, slats = 3 }) {
  const seatTop = clamp(heightM * 0.55, 0.34, 0.44);
  const sideX = widthM / 2 - 0.03;
  const zFront = depthM / 2 - 0.08;
  const zFoot = -depthM / 2 + 0.03;
  const zSeatBack = -depthM / 2 + 0.2;
  const railY = seatTop - 0.12;
  const armY = seatTop + 0.2;
  const topY = heightM - 0.015;
  const zTop = -depthM / 2 + 0.03;
  const postZ = (y) => zSeatBack + ((y - railY) / (topY - railY)) * (zTop - zSeatBack);
  const inner = widthM - 0.15;
  const cushionLean = Math.atan2(zSeatBack - zTop, topY - railY);
  const backH = topY - seatTop - 0.06;
  const wood = mainColor;
  const rail = shade(wood, -0.06);
  return (
    <group>
      {[-1, 1].map((s) => {
        const x = s * sideX;
        return (
          <group key={s}>
            {/* front leg, raked forward, rising into the armrest */}
            <WoodBar
              from={[x, 0, zFront + 0.045]}
              to={[x, armY - 0.02, zFront - 0.015]}
              size={[0.04, 0.04]}
              color={wood}
            />
            {/* rear leg: splays backwards at the floor and meets the seat rail */}
            <WoodBar
              from={[x, 0, zFoot]}
              to={[x, railY + 0.03, zSeatBack + 0.09]}
              size={[0.04, 0.035]}
              color={wood}
            />
            {/* back post leaning back from the rail up to the top of the back */}
            <WoodBar
              from={[x, railY, zSeatBack + 0.05]}
              to={[x, topY, zTop]}
              size={[0.04, 0.035]}
              color={wood}
            />
            {/* side rails under the seat */}
            <WoodBar
              from={[x, railY + 0.02, zFront]}
              to={[x, railY + 0.02, zSeatBack + 0.06]}
              size={[0.035, 0.05]}
              color={rail}
            />
            <WoodBar
              from={[x, railY - 0.07, zFront + 0.01]}
              to={[x, railY - 0.07, zSeatBack + 0.1]}
              size={[0.03, 0.03]}
              color={rail}
            />
            {/* flat wooden armrest, wider than the post, ending in a rounded front */}
            <WoodBar
              from={[x, armY, zFront + 0.045]}
              to={[x, armY + 0.02, zTop + 0.1]}
              size={[0.055, 0.022]}
              color={wood}
            />
          </group>
        );
      })}
      {/* cross rails across the front and back of the seat frame */}
      <Box
        position={[0, railY + 0.03, zFront]}
        size={[widthM - 0.06, 0.05, 0.03]}
        color={rail}
        roughness={0.5}
      />
      <Box
        position={[0, railY - 0.07, zFront + 0.01]}
        size={[widthM - 0.06, 0.03, 0.025]}
        color={rail}
        roughness={0.5}
      />
      <Box
        position={[0, railY + 0.03, zSeatBack + 0.05]}
        size={[widthM - 0.06, 0.05, 0.03]}
        color={rail}
        roughness={0.5}
      />
      {/* horizontal back rails */}
      {Array.from({ length: slats }).map((_, i) => {
        const y = seatTop + 0.1 + ((topY - seatTop - 0.16) * i) / Math.max(1, slats - 1);
        return (
          <Box
            key={i}
            position={[0, y, postZ(y) - 0.005]}
            size={[widthM - 0.06, 0.055, 0.022]}
            color={wood}
            roughness={0.5}
          />
        );
      })}
      {/* loose seat cushion */}
      <Pad
        position={[0, seatTop - 0.065, (zFront + zSeatBack) / 2 + 0.01]}
        size={[inner, 0.13, zFront - zSeatBack - 0.02]}
        radius={0.04}
        color={cushionColor}
        roughness={0.98}
      />
      {/* loose back cushion leaning on the rails */}
      <Pad
        position={[0, seatTop + backH / 2 - 0.02, postZ(seatTop + backH / 2) + 0.075]}
        rotation={[-cushionLean, 0, 0]}
        size={[inner, backH, 0.11]}
        radius={0.04}
        color={cushionColor}
        roughness={0.98}
      />
    </group>
  );
}
