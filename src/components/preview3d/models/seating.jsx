/** 3D models: seating. Built from Three.js primitives; origin on the floor, centered on the footprint. */
import { Box, Cyl, Pad, Strut, corners } from './shared.jsx';

const FOOT_H = 0.1;

/** Upholstered sofa or armchair: frame, arms, back, seat cushions and loose back cushions. */
function Upholstered({ widthM, depthM, heightM, mainColor, cushionColor, legColor, armRatio, seats, seatH = 0.44, armH = 0.62, roughness }) {
  const armW = widthM * armRatio;
  const backThick = depthM * 0.26;
  const innerW = widthM - armW * 2;
  const seatW = innerW / seats;
  const seatDepth = depthM - backThick;
  const backCushionH = heightM - seatH - 0.06;
  return (
    <group>
      {/* Frame below the seat, standing on feet */}
      <Pad position={[0, (FOOT_H + seatH - 0.1) / 2 + 0.02, 0]} size={[widthM, seatH - 0.1 - FOOT_H + 0.06, depthM]} radius={0.03} color={mainColor} roughness={roughness} />
      {corners(widthM, depthM, 0.07).map(([x, z], i) => (
        <Cyl key={i} position={[x, FOOT_H / 2, z]} radiusTop={0.024} radiusBottom={0.018} height={FOOT_H} color={legColor} roughness={0.5} segments={12} />
      ))}

      {/* Back and arms */}
      <Pad position={[0, (FOOT_H + heightM) / 2 - 0.03, -depthM / 2 + backThick / 2]} size={[widthM, heightM - FOOT_H, backThick]} radius={0.05} color={mainColor} roughness={roughness} />
      {[-1, 1].map((s) => (
        <Pad key={s} position={[s * (widthM / 2 - armW / 2), (FOOT_H + armH) / 2, 0]} size={[armW, armH - FOOT_H, depthM]} radius={Math.min(0.06, armW / 2.5)} color={mainColor} roughness={roughness} />
      ))}

      {/* Seat cushions */}
      {Array.from({ length: seats }).map((_, i) => (
        <Pad key={i} position={[-innerW / 2 + seatW * (i + 0.5), seatH - 0.07, backThick / 2]} size={[seatW - 0.015, 0.14, seatDepth - 0.02]} radius={0.05} color={cushionColor} />
      ))}
      {/* Loose back cushions leaning on the backrest */}
      {Array.from({ length: seats }).map((_, i) => (
        <Pad
          key={i}
          position={[-innerW / 2 + seatW * (i + 0.5), seatH + backCushionH / 2 - 0.02, -depthM / 2 + backThick + 0.06]}
          size={[seatW - 0.03, backCushionH, 0.13]}
          radius={0.05}
          color={cushionColor}
          rotation={[-0.22, 0, 0]}
        />
      ))}
    </group>
  );
}

export function SofaModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  const seats = widthM > 2.1 ? 3 : widthM > 1.5 ? 2 : 1;
  return <Upholstered widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} cushionColor={cushionColor} legColor={legColor} armRatio={0.1} seats={seats} roughness={0.85} />;
}

export function ArmchairModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  return <Upholstered widthM={widthM} depthM={depthM} heightM={heightM} mainColor={mainColor} cushionColor={cushionColor} legColor={legColor} armRatio={0.17} seats={1} seatH={0.42} armH={0.58} roughness={0.7} />;
}

export function ChairModel({ widthM, depthM, heightM, mainColor, cushionColor, legColor }) {
  const seatH = Math.min(0.46, heightM * 0.56);
  const legInset = 0.035;
  const backTop = heightM;
  const slatBottom = seatH + 0.06;
  return (
    <group>
      <Pad position={[0, seatH - 0.025, 0.01]} size={[widthM, 0.05, depthM - 0.02]} radius={0.015} color={cushionColor} roughness={0.75} />
      {/* Front legs stop under the seat, rear legs run up to form the back posts */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box position={[s * (widthM / 2 - legInset), (seatH - 0.05) / 2, depthM / 2 - legInset]} size={[0.035, seatH - 0.05, 0.035]} color={legColor} roughness={0.55} />
          <Box position={[s * (widthM / 2 - legInset), backTop / 2, -depthM / 2 + legInset]} size={[0.035, backTop, 0.035]} color={legColor} roughness={0.55} />
        </group>
      ))}
      {/* Stretchers and seat rails */}
      <Box position={[0, seatH * 0.38, depthM / 2 - legInset]} size={[widthM - 0.07, 0.02, 0.02]} color={legColor} roughness={0.55} />
      <Box position={[0, seatH * 0.38, -depthM / 2 + legInset]} size={[widthM - 0.07, 0.02, 0.02]} color={legColor} roughness={0.55} />
      {[-1, 1].map((s) => (
        <Box key={s} position={[s * (widthM / 2 - legInset), seatH * 0.38, 0]} size={[0.02, 0.02, depthM - 0.07]} color={legColor} roughness={0.55} />
      ))}
      {/* Backrest: top rail plus vertical slats */}
      <Box position={[0, backTop - 0.05, -depthM / 2 + legInset]} size={[widthM - 0.07, 0.1, 0.025]} color={mainColor} roughness={0.6} />
      {[-0.28, -0.14, 0, 0.14, 0.28].map((f, i) => (
        <Box key={i} position={[widthM * f, (slatBottom + backTop - 0.1) / 2, -depthM / 2 + legInset]} size={[0.016, backTop - 0.1 - slatBottom, 0.016]} color={mainColor} roughness={0.6} />
      ))}
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
            <Strut from={[0, 0.1, 0]} to={[x, 0.05, z]} radius={0.016} color={legColor} roughness={0.4} metalness={0.5} />
            <mesh position={[x, 0.025, z]} castShadow>
              <sphereGeometry args={[0.025, 12, 10]} />
              <meshStandardMaterial color="#1B1B1B" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      <Cyl position={[0, 0.1 + (seatH - 0.14) / 2, 0]} radiusTop={0.028} height={seatH - 0.14} color="#9AA0A6" roughness={0.25} metalness={0.8} segments={14} />
      <Cyl position={[0, 0.12, 0]} radiusTop={0.04} radiusBottom={0.05} height={0.08} color={legColor} roughness={0.5} segments={14} />
      {/* Seat, back and arm rests */}
      <Pad position={[0, seatH, 0.02]} size={[widthM * 0.72, 0.09, depthM * 0.7]} radius={0.04} color={cushionColor} />
      <Pad position={[0, (seatH + heightM) / 2 + 0.03, -depthM * 0.3]} size={[widthM * 0.68, heightM - seatH - 0.06, 0.07]} radius={0.035} color={mainColor} rotation={[-0.1, 0, 0]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box position={[s * widthM * 0.37, seatH + 0.12, 0]} size={[0.025, 0.2, 0.025]} color={legColor} roughness={0.4} metalness={0.4} />
          <Pad position={[s * widthM * 0.37, seatH + 0.23, 0]} size={[0.06, 0.03, 0.26]} radius={0.012} color={legColor} roughness={0.6} />
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
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Strut key={i} from={[sx * seatR * 0.82, seatH - 0.03, sz * seatR * 0.82]} to={[sx * seatR * 0.98, 0, sz * seatR * 0.98]} radius={0.015} color={legColor} roughness={0.45} metalness={0.3} />
      ))}
      <mesh position={[0, seatH * 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[seatR * 0.9, 0.012, 8, 32]} />
        <meshStandardMaterial color={legColor} roughness={0.45} metalness={0.3} />
      </mesh>
      <Cyl position={[0, seatH - 0.03, 0]} radiusTop={seatR * 0.9} height={0.03} color={legColor} roughness={0.5} segments={28} />
      {/* Round cushioned seat and a low curved back rail */}
      <Cyl position={[0, seatH + 0.02, 0]} radiusTop={seatR} radiusBottom={seatR * 0.97} height={0.07} color={cushionColor} roughness={0.7} segments={32} />
      <mesh position={[0, seatH + 0.17, 0]} rotation={[Math.PI / 2, 0, -Math.PI / 2 - backArc / 2]} castShadow>
        <torusGeometry args={[seatR * 0.88, 0.014, 8, 24, backArc]} />
        <meshStandardMaterial color={mainColor} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <Strut key={s} from={[s * seatR * 0.55, seatH + 0.05, -seatR * 0.68]} to={[s * seatR * 0.55, seatH + 0.17, -seatR * 0.68]} radius={0.012} color={mainColor} />
      ))}
    </group>
  );
}

export function OttomanModel({ widthM, depthM, heightM, cushionColor, legColor }) {
  const baseH = 0.06;
  return (
    <group>
      <Box position={[0, baseH / 2, 0]} size={[widthM * 0.9, baseH, depthM * 0.9]} color={legColor} roughness={0.8} />
      <Pad position={[0, baseH + (heightM - baseH) / 2, 0]} size={[widthM, heightM - baseH, depthM]} radius={0.05} color={cushionColor} />
      {[-0.25, 0.25].map((f, i) => (
        <mesh key={i} position={[widthM * f, heightM + 0.002, 0]} castShadow>
          <sphereGeometry args={[0.02, 12, 10]} />
          <meshStandardMaterial color={legColor} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
