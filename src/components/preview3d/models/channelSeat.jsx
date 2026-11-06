/**
 * Channel-tufted sofa or armchair: deep vertical channels running up the back and over its top, across the long
 * seat and down its front, and over the arm tops and down their fronts; or terraced arms made of two or three
 * rounded slabs stepping down towards the seat. Origin on the floor, centred on the footprint, front at +z.
 */
import { Pad, Cyl, corners, clamp, shade } from './shared.jsx';
import { ChannelRibs, roundedPath, ribCentres } from './channels.jsx';
import { stepTiers, channelBackT } from './designLayout.js';

const CHANNEL_W = 0.1;
// Padded channels: a flattened crest between deep grooves
const PROFILE = 0.6;

/** Terraced arm: rounded slabs side by side, the outer one tallest, stepping down towards the seat. */
export function SteppedArm({ side, widthM, armW, armH, seatH, footH, z0, z1, color, roughness }) {
  return (
    <group name="stepped-arm">
      {stepTiers({ armW, armH, seatH }).map(({ w, off, h }, k) => (
        <Pad
          key={k}
          position={[side * (widthM / 2 - off), (footH + h) / 2, (z0 + z1) / 2]}
          size={[w + (k ? 0.004 : 0), h - footH, z1 - z0]}
          radius={Math.min(0.06, w * 0.45)}
          color={k % 2 ? shade(color, -0.015) : color}
          roughness={roughness}
        />
      ))}
    </group>
  );
}

/** Channel ribs over the top of a block and down its front (seat and arms), running front to back. */
function TopFrontChannels({ x, span, zBack, zFront, yTop, yBottom, depth, color, target }) {
  const { width, centres } = ribCentres(span, target, x, 2);
  const path = roundedPath(
    [
      [zBack, yTop],
      [zFront, yTop],
      [zFront, yBottom],
    ],
    Math.min(0.06, (zFront - zBack) * 0.3, (yTop - yBottom) * 0.4)
  );
  return (
    <ChannelRibs
      path={path}
      centres={centres}
      width={width}
      depth={depth}
      color={color}
      profile={PROFILE}
    />
  );
}

export function ChannelSeat({
  widthM,
  depthM,
  heightM,
  mainColor,
  armColor = mainColor,
  cushionColor = mainColor,
  legColor,
  armRatio,
  seats = 1,
  seatH = 0.44,
  armH = 0.62,
  roughness = 0.88,
  longSeat = false,
  step = false,
  taper = false,
}) {
  const footH = taper ? 0.16 : 0.045;
  const armW = clamp(widthM * armRatio, 0.08, widthM * 0.3);
  const innerW = widthM - armW * 2;
  const top = Math.max(seatH + 0.12, heightM);
  const backT = channelBackT(depthM);
  const rib = clamp(backT * 0.22, 0.022, 0.04);
  // Front face of the back panel, which the back channels stand on
  const zb = -depthM / 2 + backT - rib;
  const zf = depthM / 2 - rib;
  const armTop = Math.min(armH, top - 0.05);
  const n = longSeat ? 1 : Math.max(1, seats);
  const cushionW = innerW / n;
  return (
    <group name="channel-seat">
      {taper
        ? corners(widthM, depthM, 0.1).map(([x, z], i) => (
            <Cyl
              key={i}
              position={[x + Math.sign(x) * 0.02, footH / 2, z + Math.sign(z) * 0.02]}
              rotation={[-Math.sign(z) * 0.2, 0, Math.sign(x) * 0.2]}
              radiusTop={0.03}
              radiusBottom={0.013}
              height={footH + 0.02}
              color={legColor}
              roughness={0.5}
              segments={14}
            />
          ))
        : corners(widthM, depthM, 0.06).map(([x, z], i) => (
            <Cyl
              key={i}
              position={[x, footH / 2, z]}
              radiusTop={0.02}
              radiusBottom={0.018}
              height={footH}
              color={legColor}
              roughness={0.35}
              metalness={0.4}
              segments={12}
            />
          ))}

      {/* Back: a plain outside panel with the channels standing on its front and wrapping over the top */}
      <Pad
        position={[0, (footH + top - rib) / 2, -depthM / 2 + (backT - rib) / 2]}
        size={[widthM, top - rib - footH, backT - rib]}
        radius={0.04}
        color={mainColor}
        roughness={roughness}
      />
      <ChannelRibs
        {...ribCentres(widthM - 0.02, CHANNEL_W, 0, 3)}
        path={roundedPath(
          [
            [zb, seatH - 0.12],
            [zb, top - rib],
            [-depthM / 2 + 0.015, top - rib],
          ],
          Math.min(0.07, (backT - rib) * 0.55),
          true
        )}
        depth={rib}
        color={mainColor}
        roughness={roughness}
        profile={PROFILE}
      />

      {/* Arms: channels over the top and down the front, or terraced slabs */}
      {[-1, 1].map((s) =>
        step ? (
          <SteppedArm
            key={s}
            side={s}
            widthM={widthM}
            armW={armW}
            armH={armTop}
            seatH={seatH}
            footH={footH}
            z0={zb}
            z1={depthM / 2}
            color={armColor}
            roughness={roughness}
          />
        ) : (
          <group key={s} name="channel-arm">
            <Pad
              position={[s * (widthM / 2 - armW / 2), (footH + armTop - rib) / 2, (zb + zf) / 2]}
              size={[armW, armTop - rib - footH, zf - zb]}
              radius={0.03}
              color={armColor}
              roughness={roughness}
            />
            <TopFrontChannels
              x={s * (widthM / 2 - armW / 2)}
              span={armW}
              zBack={zb}
              zFront={zf}
              yTop={armTop - rib}
              yBottom={footH + 0.02}
              depth={rib}
              color={armColor}
              target={CHANNEL_W}
            />
          </group>
        )
      )}

      {/* Long seat (or one per seat) channelled across the top and down the front */}
      {Array.from({ length: n }).map((_, i) => {
        const cx = -innerW / 2 + cushionW * (i + 0.5);
        const w = cushionW - (n > 1 ? 0.012 : 0.004);
        return (
          <group key={i} name="seat-cushion">
            <Pad
              position={[cx, (footH + 0.01 + seatH - rib) / 2, (zb + zf) / 2]}
              size={[w, seatH - rib - footH - 0.01, zf - zb]}
              radius={0.03}
              color={cushionColor}
              roughness={roughness}
            />
            <TopFrontChannels
              x={cx}
              span={w}
              zBack={zb}
              zFront={zf}
              yTop={seatH - rib}
              yBottom={footH + 0.025}
              depth={rib}
              color={cushionColor}
              target={CHANNEL_W}
            />
          </group>
        );
      })}
    </group>
  );
}
