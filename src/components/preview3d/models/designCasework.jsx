/**
 * Wardrobes and desks read from photos: wardrobes with 1-6 doors, mirror doors (full height or an oval set in a
 * door), drawers across the bottom or under one door, bar / knob / ring handles, a row of top cupboards, an
 * open mirrored niche with a counter (a built-in wall unit) and fluted doors; desks with drawer pedestals,
 * sled or panel ends and a modesty panel. Everything stays inside the footprint box.
 * Origin on the floor, centred on the footprint, the front towards +z.
 */
import { Box, Cyl, Pull, RoundKnob, clamp, shade, DARK_GAP, STEEL } from './shared.jsx';
import { ChannelRibs, ribCentres } from './channels.jsx';
import { wardrobeLayout, deskLayout } from './designLayout.js';
import { metalFinish } from './designShapes.jsx';

/**
 * Light blue-grey glass that reads as a mirror: very smooth and strongly metallic, so it reflects the room
 * light where there is an environment, with a faint glow of its own so it stays light where there is none.
 */
export const MIRROR_GLASS = {
  color: '#d3dfe5',
  roughness: 0.05,
  metalness: 0.8,
  emissive: '#a9bcc6',
  emissiveIntensity: 0.42,
};

/** Flat mirror pane (a thin box) with a soft diagonal sheen across it. */
export function MirrorPane({ position, size }) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial {...MIRROR_GLASS} />
      </mesh>
      {w > 0.15 &&
        h > 0.3 &&
        [
          [-0.14, 0.1],
          [0.12, 0.05],
        ].map(([k, sw]) => (
          <mesh
            key={k}
            position={[w * k, h * 0.04, d / 2 + 0.0006]}
            rotation={[0, 0, 0.55]}
            scale={[w * sw * 2, Math.min(h * 0.85, w * 1.5), 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.14} depthWrite={false} />
          </mesh>
        ))}
    </group>
  );
}
const DOOR_T = 0.018;
// Carcass front sits back far enough that doors and handles stay inside the footprint
const FRONT_INSET = 0.045;

/** Round ring pull hanging from a small rose (faces +z). */
export function RingPull({ position, radius = 0.017, color }) {
  const r = clamp(radius, 0.01, 0.03);
  const mat = { color, roughness: 0.25, metalness: 0.7 };
  return (
    <group name="handle" position={position}>
      <Cyl
        position={[0, 0, 0.004]}
        radiusTop={r * 0.42}
        height={0.008}
        rotation={[Math.PI / 2, 0, 0]}
        {...mat}
        segments={14}
        castShadow={false}
      />
      <mesh position={[0, -r * 0.55, 0.011]} castShadow>
        <torusGeometry args={[r, r * 0.16, 8, 24]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  );
}

/** One handle in the chosen style on a front face whose surface is at z. */
function Handle({ style, x, y, z, length, vertical = true, color }) {
  if (style === 'knob') return <RoundKnob position={[x, y, z]} color={color} />;
  if (style === 'ring') return <RingPull position={[x, y, z]} color={color} />;
  return (
    <Pull
      position={[x, y, z]}
      length={length}
      vertical={vertical}
      color={color}
      stand={0.018}
      thick={0.011}
      roughness={0.3}
      metalness={0.65}
    />
  );
}

/** Flat door or drawer slab with a shadow gap behind it; its back face sits at z. */
function Slab({ x, y0, y1, w, z, color }) {
  const h = y1 - y0;
  return (
    <group>
      <Box
        position={[x, y0 + h / 2, z + 0.001]}
        size={[w + 0.004, h + 0.004, 0.002]}
        color={DARK_GAP}
        castShadow={false}
      />
      <Box
        position={[x, y0 + h / 2, z + DOOR_T / 2]}
        size={[w - 0.004, h - 0.004, DOOR_T]}
        color={color}
        roughness={0.55}
      />
    </group>
  );
}

/** Oval mirror set into a door (with a thin bright rim), centred at (x, y) on a door face at z. */
function OvalMirror({ x, y, w, h, z }) {
  return (
    <group name="wardrobe-mirror" position={[x, y, z]}>
      <mesh position={[0, 0, 0.0015]} scale={[w, h, 1]}>
        <ringGeometry args={[0.47, 0.5, 64]} />
        <meshStandardMaterial color="#d9dcde" roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.001]} scale={[w, h, 1]}>
        <circleGeometry args={[0.475, 64]} />
        <meshStandardMaterial {...MIRROR_GLASS} />
      </mesh>
    </group>
  );
}

/** Full mirror over a door face: glass with a narrow frame margin of the door showing round it. */
function FullMirror({ x, y0, y1, w, z, frame }) {
  const h = y1 - y0;
  return (
    <group name="wardrobe-mirror">
      <Box
        position={[x, y0 + h / 2, z + 0.0015]}
        size={[w - 0.05, h - 0.05, 0.003]}
        color={frame}
        roughness={0.4}
        metalness={0.3}
        castShadow={false}
      />
      <MirrorPane position={[x, y0 + h / 2, z + 0.0035]} size={[w - 0.07, h - 0.07, 0.003]} />
    </group>
  );
}

/** Rows of drawer heights (fractions) for a stack of n drawers: equal, or a deep bottom one under shallow ones. */
function drawerRows(n, deepBottom) {
  if (!deepBottom || n < 2) return Array.from({ length: n }, () => 1 / n);
  if (n === 2) return [0.62, 0.38];
  if (n === 3) return [0.5, 0.25, 0.25];
  return Array.from({ length: n }, () => 1 / n);
}

/** A stack of drawers (bottom row first) in the box x0..x1 x y0..y1, fronts at z, `cols` across. */
function DrawerStack({
  x0,
  x1,
  y0,
  y1,
  z,
  rows,
  cols = 1,
  deepBottom,
  color,
  handle,
  handleColor,
}) {
  const fr = drawerRows(rows, deepBottom);
  const fw = (x1 - x0) / cols;
  let y = y0;
  const items = [];
  fr.forEach((f, r) => {
    const h = (y1 - y0) * f;
    for (let c = 0; c < cols; c++) {
      const cx = x0 + fw * (c + 0.5);
      items.push(
        <group key={`${r}-${c}`}>
          <Slab x={cx} y0={y} y1={y + h} w={fw} z={z} color={color} />
          <Handle
            style={handle}
            x={cx}
            y={y + h * (h > 0.16 ? 0.62 : 0.5)}
            z={z + DOOR_T}
            length={clamp(fw * 0.36, 0.08, 0.3)}
            vertical={false}
            color={handleColor}
          />
        </group>
      );
    }
    y += h;
  });
  return <group name="drawers">{items}</group>;
}

/** Vertical fluting (half-round reeds) over a set of door faces that share the same height. */
function Fluting({ doors, y0, y1, z, color }) {
  const reed = 0.032;
  const centres = [];
  let width = reed;
  for (const d of doors) {
    const r = ribCentres(d.w - 0.05, reed, d.x, 3);
    width = r.width;
    centres.push(...r.centres);
  }
  if (!centres.length || y1 - y0 < 0.06) return null;
  return (
    <ChannelRibs
      path={[
        { p: [y0 + 0.025, 0], n: [0, 1] },
        { p: [y1 - 0.025, 0], n: [0, 1] },
      ]}
      centres={centres}
      width={width}
      depth={0.006}
      u={[0, 1, 0]}
      v={[0, 0, 1]}
      lateral={[1, 0, 0]}
      origin={[0, 0, z]}
      segments={6}
      color={shade(color, -0.01)}
      roughness={0.55}
    />
  );
}

export function WardrobeDesign({ widthM, depthM, heightM, palette, traits }) {
  const body = palette.body;
  const doorColor = palette.door || body;
  const handleColor = palette.trim || '#C4A869';
  const handle = traits.handle || 'bar';
  const L = wardrobeLayout({ widthM, heightM, traits });
  const zc = depthM / 2 - FRONT_INSET;
  const carcassD = depthM - FRONT_INSET;
  const carcassZ = -FRONT_INSET / 2;
  const fluted = !!traits.fluted;
  const barLen = (h) =>
    traits.handle === 'bar' ? clamp(h * 0.32, 0.18, 0.7) : clamp(h * 0.22, 0.07, 0.32);
  const tallH = L.tallTop - L.plinth;
  const handleY = (c) => clamp(1.05, c.bottom + 0.12, c.top - 0.12);
  const flutedGroups = {};
  const addFlute = (key, d) => {
    if (!fluted) return;
    (flutedGroups[key] = flutedGroups[key] || { ...d, doors: [] }).doors.push(d);
  };
  const doors = L.cols.map((c, i) => {
    const mirror = i === L.mirrorIdx ? traits.mirror : 0;
    // A mirror door on a two-tone wardrobe keeps the body colour (a mirror set in a wood door)
    const color = mirror === 2 && palette.door ? body : doorColor;
    const g = 0.002;
    const y0 = c.bottom + g;
    const y1 = c.top - g;
    // With a row of top cupboards the fluting is on those (as on a built-in unit), otherwise on every door
    if (!mirror && !L.upperH)
      addFlute(`${y0.toFixed(3)}-${y1.toFixed(3)}`, { x: c.x, w: c.w, y0, y1 });
    return (
      <group key={i} name="door">
        <Slab x={c.x} y0={y0} y1={y1} w={c.w} z={zc} color={color} />
        {mirror === 1 && (
          <FullMirror x={c.x} y0={y0} y1={y1} w={c.w} z={zc + DOOR_T} frame={color} />
        )}
        {mirror === 2 && (
          <OvalMirror
            x={c.x - c.edge * c.w * 0.04}
            y={(y0 + y1) / 2 + (y1 - y0) * 0.03}
            w={Math.min(c.w * 0.62, 0.42)}
            h={(y1 - y0) * 0.72}
            z={zc + DOOR_T}
          />
        )}
        <Handle
          style={handle}
          x={c.x + c.edge * (c.w / 2 - (handle === 'bar' ? 0.04 : 0.05))}
          y={handleY(c)}
          z={zc + DOOR_T}
          length={barLen(tallH)}
          color={handleColor}
        />
      </group>
    );
  });
  const uppers = L.uppers.map((u, i) => {
    const y0 = L.tallTop + 0.002;
    const y1 = L.top - 0.002;
    addFlute('upper', { x: u.x, w: u.w, y0, y1 });
    const left = u.x < 0;
    const len = clamp(L.upperH * 0.42, 0.1, 0.24);
    return (
      <group key={`u${i}`} name="upper-door">
        <Slab x={u.x} y0={y0} y1={y1} w={u.w} z={zc} color={doorColor} />
        <Handle
          style={handle}
          x={u.x + (left ? 1 : -1) * (u.w / 2 - 0.04)}
          y={y0 + (handle === 'bar' ? len / 2 + 0.05 : 0.07)}
          z={zc + DOOR_T}
          length={len}
          color={handleColor}
        />
      </group>
    );
  });
  const nc = L.niche;
  return (
    <group>
      {/* Recessed plinth and the carcass (split round an open niche on a built-in unit) */}
      <Box
        position={[0, L.plinth / 2, carcassZ - 0.02]}
        size={[widthM - 0.04, L.plinth, carcassD - 0.06]}
        color={shade(body, -0.3)}
        roughness={0.85}
      />
      {nc ? (
        <group name="niche">
          {[
            [-widthM / 2, nc.x0],
            [nc.x1, widthM / 2],
          ].map(([a, b], i) => (
            <Box
              key={i}
              position={[(a + b) / 2, (L.plinth + L.top) / 2, carcassZ]}
              size={[b - a, L.top - L.plinth, carcassD]}
              color={body}
              roughness={0.7}
            />
          ))}
          {/* Cabinet under the counter, the counter, the back with its mirror and the bulkhead above */}
          <Box
            position={[(nc.x0 + nc.x1) / 2, (L.plinth + nc.counter) / 2, carcassZ]}
            size={[nc.x1 - nc.x0, nc.counter - L.plinth, carcassD]}
            color={body}
            roughness={0.7}
          />
          <Box
            position={[(nc.x0 + nc.x1) / 2, nc.counter + 0.015, carcassZ + 0.01]}
            size={[nc.x1 - nc.x0 + 0.01, 0.03, carcassD + 0.02]}
            color="#ece9e3"
            roughness={0.25}
          />
          <Box
            position={[(nc.x0 + nc.x1) / 2, (nc.counter + nc.top) / 2, -depthM / 2 + 0.01]}
            size={[nc.x1 - nc.x0, nc.top - nc.counter, 0.02]}
            color={shade(body, -0.04)}
            roughness={0.7}
          />
          <Box
            position={[(nc.x0 + nc.x1) / 2, (nc.top + L.top) / 2, carcassZ]}
            size={[nc.x1 - nc.x0, L.top - nc.top, carcassD]}
            color={body}
            roughness={0.7}
          />
          <group name="wardrobe-mirror">
            <Box
              position={[
                (nc.x0 + nc.x1) / 2,
                (nc.counter + nc.top) / 2 + 0.01,
                -depthM / 2 + 0.022,
              ]}
              size={[nc.x1 - nc.x0 - 0.08, nc.top - nc.counter - 0.12, 0.004]}
              color={handleColor}
              roughness={0.3}
              metalness={0.6}
              castShadow={false}
            />
            <MirrorPane
              position={[
                (nc.x0 + nc.x1) / 2,
                (nc.counter + nc.top) / 2 + 0.01,
                -depthM / 2 + 0.025,
              ]}
              size={[nc.x1 - nc.x0 - 0.1, nc.top - nc.counter - 0.14, 0.003]}
            />
          </group>
          {/* A downlight in the niche ceiling */}
          <mesh position={[(nc.x0 + nc.x1) / 2, nc.top - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.035, 20]} />
            <meshStandardMaterial color="#fffaf0" emissive="#fff3d6" emissiveIntensity={0.9} />
          </mesh>
          <DrawerStack
            x0={nc.x0 + 0.004}
            x1={nc.x1 - 0.004}
            y0={L.plinth + 0.004}
            y1={nc.counter - 0.004}
            z={zc}
            rows={nc.rows}
            cols={nc.x1 - nc.x0 > 0.7 ? 2 : 1}
            color={body}
            handle={handle}
            handleColor={handleColor}
          />
        </group>
      ) : (
        <Box
          position={[0, (L.plinth + L.top) / 2, carcassZ]}
          size={[widthM, L.top - L.plinth, carcassD]}
          color={body}
          roughness={0.7}
        />
      )}
      {!nc && (
        <Box
          position={[0, L.top + (heightM - L.top) / 2, -0.005]}
          size={[widthM, heightM - L.top, depthM - 0.01]}
          color={shade(body, 0.02)}
          roughness={0.6}
        />
      )}
      <group name="doors">
        {doors}
        {uppers}
      </group>
      {L.side &&
        (() => {
          const cs = L.side === 'full' ? L.cols : L.cols.filter((c) => c.under);
          const x0 = Math.min(...cs.map((c) => c.x - c.w / 2));
          const x1 = Math.max(...cs.map((c) => c.x + c.w / 2));
          const width = x1 - x0;
          return (
            <DrawerStack
              x0={x0}
              x1={x1}
              y0={L.plinth + 0.002}
              y1={L.plinth + L.rows * L.rowH}
              z={zc}
              rows={L.rows}
              cols={L.side === 'full' ? clamp(Math.round(width / 0.6), 1, 3) : 1}
              color={body}
              handle={handle}
              handleColor={handleColor}
            />
          );
        })()}
      {Object.entries(flutedGroups).map(([key, g]) => (
        <Fluting key={key} doors={g.doors} y0={g.y0} y1={g.y1} z={zc + DOOR_T} color={doorColor} />
      ))}
    </group>
  );
}

/** Drawer pedestal: carcass, drawer fronts (shallow ones over a deep file drawer) and bar pulls. */
function Pedestal({ x, w, y0, y1, depthM, rows, color, carcass }) {
  const d = depthM - 0.08;
  const z = -0.02;
  const front = z + d / 2;
  return (
    <group name="pedestal">
      {y0 > 0.02 && y0 < 0.1 && (
        <Box
          position={[x, y0 / 2, z - 0.01]}
          size={[w - 0.04, y0, d - 0.04]}
          color="#1E1B18"
          roughness={0.9}
        />
      )}
      <Box
        position={[x, (y0 + y1) / 2, z]}
        size={[w, y1 - y0, d]}
        color={carcass}
        roughness={0.6}
      />
      <DrawerStack
        x0={x - w / 2 + 0.006}
        x1={x + w / 2 - 0.006}
        y0={y0 + 0.006}
        y1={y1 - 0.008}
        z={front}
        rows={rows}
        deepBottom
        color={color}
        handle="bar"
        handleColor={STEEL.color}
      />
    </group>
  );
}

/** Desk from photos: top, legs / sled / panel ends, drawer pedestals and a modesty panel. */
export function DeskDesign({ widthM, depthM, heightM, palette, traits, legThick = 0.05 }) {
  const topColor = palette.body;
  const drawerColor = palette.accent || shade(topColor, -0.06);
  const legColor = palette.leg || '#2a2622';
  const D = deskLayout({ widthM, depthM, heightM, traits, legThick });
  const metal = metalFinish(legColor);
  const tube = [0.05, 0.03];
  const sled = D.base === 'sled';
  // Inner faces of whatever holds the desk up at each end, for the modesty panel to span
  const support = (s) => {
    const p = D.pedestals.find((q) => q.side === s && !D.hanging);
    if (p) return Math.abs(p.x) - p.w / 2;
    if (D.base !== 'legs') return D.endX - D.endT / 2;
    return widthM / 2 - 0.03 - legThick;
  };
  const mx0 = -support(-1);
  const mx1 = support(1);
  return (
    <group>
      <Box
        position={[0, heightM - D.topT / 2, 0]}
        size={[widthM, D.topT, depthM]}
        color={topColor}
        roughness={0.55}
      />
      <Box
        position={[0, D.under - 0.004, 0]}
        size={[widthM - 0.03, 0.008, depthM - 0.03]}
        color={shade(topColor, -0.12)}
        roughness={0.7}
        castShadow={false}
      />
      {D.legs.map(([x, z], i) => (
        <Box
          key={i}
          position={[x, D.under / 2, z]}
          size={[legThick, D.under, legThick]}
          color={legColor}
          roughness={0.5}
        />
      ))}
      {sled &&
        [-1, 1].map((s) => {
          const x = s * D.endX;
          const zBack = -depthM / 2 + 0.1;
          return (
            <group key={s} name="sled-end">
              {/* Upright near the back, a floor runner and an arm under the top: a C open to the front */}
              <Box
                position={[x, D.under / 2, zBack]}
                size={[tube[0], D.under - 0.04, tube[1] + 0.02]}
                {...metal}
              />
              <Box position={[x, 0.016, 0]} size={[tube[0], 0.03, depthM - 0.08]} {...metal} />
              <Box
                position={[x, D.under - 0.016, 0.01]}
                size={[tube[0], 0.03, depthM - 0.1]}
                {...metal}
              />
              {[-1, 1].map((k) => (
                <Cyl
                  key={k}
                  position={[x, 0.003, k * (depthM / 2 - 0.07)]}
                  radiusTop={0.02}
                  height={0.006}
                  color="#111"
                  roughness={0.9}
                  segments={10}
                  castShadow={false}
                />
              ))}
            </group>
          );
        })}
      {D.base === 'panel' &&
        [-1, 1].map((s) => (
          <Box
            key={s}
            position={[s * D.endX, D.under / 2, -0.005]}
            size={[D.endT, D.under, depthM - 0.05]}
            color={legColor}
            roughness={0.6}
          />
        ))}
      {D.pedestals.map((p) => (
        <Pedestal
          key={p.side}
          x={p.x}
          w={p.w}
          y0={p.y0}
          y1={p.y1}
          depthM={depthM}
          rows={D.drawers}
          color={drawerColor}
          carcass={shade(drawerColor, -0.04)}
        />
      ))}
      {traits.modesty ? (
        <group name="modesty-panel">
          <Box
            position={[(mx0 + mx1) / 2, D.under - D.under * 0.22 - 0.001, -depthM / 2 + 0.05]}
            size={[Math.max(0.05, mx1 - mx0), D.under * 0.44, 0.018]}
            color={sled ? metal.color : shade(topColor, -0.05)}
            roughness={0.6}
          />
        </group>
      ) : null}
    </group>
  );
}
