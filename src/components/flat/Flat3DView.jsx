import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Footprints, Square } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { pushOffInteriorWalls } from '../../engine/furnitureWalls.js';
import { Furniture3DBox } from '../preview3d/Furniture3DBox.jsx';
import { WalkControls } from '../preview3d/WalkControls.jsx';
import { WalkHud } from '../preview3d/WalkHud.jsx';
import {
  LIGHTING,
  LIGHT_OPTIONS,
  SceneLights,
  FurnitureShadows,
  LampLights,
} from '../preview3d/lighting.jsx';
import { MaterialsPanel } from '../preview3d/MaterialsPanel.jsx';
import { StyleButton } from '../preview3d/StylePicker.jsx';
import { dominantFinish, sharedStyle } from '../../data/stylePresets.js';
import { useQuality, useFlatLook } from '../preview3d/useLook.js';
import { collectLamps } from '../preview3d/lamps.js';
import { normalizeFinish } from '../preview3d/materials.js';
import { floorMaterial, wallMaterial } from '../preview3d/surfaceTextures.js';
import { Button } from '../common/Button.jsx';
import { Segmented } from '../common/Field.jsx';
import { SnapshotBridge } from '../preview3d/SnapshotBridge.jsx';
import {
  stairTreads,
  stairOpensOn,
  levelIndex,
  SPACE_KINDS,
  stairRect,
} from '../../engine/flat.js';
import {
  wallsOf,
  openingsOf,
  analyzeLevel,
  levelSolidEdges,
  entranceOf,
} from '../../engine/flatPlan.js';
import {
  wallPieces,
  skirtingBoxes,
  regionRects,
  carveHoles,
  defaultSwing,
} from '../../engine/flatWalls.js';
import {
  flatWalkStart,
  levelObstacles,
  isFlatBlocked,
  walkSurface,
} from '../../engine/flatWalk.js';
import planStyles from './FlatPlan.module.css';
import { useFlatUi } from '../../store/flatUiStore.js';
import styles from './FlatDesigner.module.css';

const WALL_OPTIONS = [
  { value: 'low', label: 'Low walls', icon: <Square size={15} />, ariaLabel: 'Low walls' },
  { value: 'full', label: 'Full walls', icon: <Box size={15} />, ariaLabel: 'Full-height walls' },
];

const WALL_COLOR = '#F2EDE4';
const SKIRTING_COLOR = '#B79C78';
const TIMBER = '#6B4A33';
const LEAF = '#9A6B45';
const ENTRANCE_LEAF = '#7B1E2E';
const STEP_COLOR = '#C9B79C';
const RAIL_COLOR = '#3B2E26';
const SLAB_THICKNESS = 0.2;

/** A thin bar between two points, for slanted handrails. */
function Bar({ from, to, size = 0.04, color = RAIL_COLOR }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const length = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    b.clone().sub(a).normalize()
  );
  return (
    <mesh position={mid.toArray()} quaternion={quat} castShadow>
      <boxGeometry args={[length, size, size]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

/** Steps, landing and handrails of one staircase, in the flat's metre space. */
function Stairs3D({ stair, baseY }) {
  const { treads, rails } = useMemo(() => {
    const all = stairTreads(stair);
    const byFlight = new Map();
    for (const t of all) {
      if (t.flight === undefined) continue;
      if (!byFlight.has(t.flight)) byFlight.set(t.flight, []);
      byFlight.get(t.flight).push(t);
    }
    const bars = [];
    const RAIL_H = 90;
    for (const list of byFlight.values()) {
      list.sort((p, q) => p.index - q.index);
      const first = list[0];
      const last = list[list.length - 1];
      const across = { x: Math.abs(first.dirY) > 0 ? 1 : 0, y: Math.abs(first.dirX) > 0 ? 1 : 0 };
      const span = across.x ? first.x1 - first.x0 : first.y1 - first.y0;
      for (const side of [-1, 1]) {
        const centre = (t) => ({ x: (t.x0 + t.x1) / 2, y: (t.y0 + t.y1) / 2 });
        const point = (t, along) => {
          const c = centre(t);
          return {
            x: c.x + across.x * side * (span / 2 - 2) + along * first.dirX,
            y: c.y + across.y * side * (span / 2 - 2) + along * first.dirY,
          };
        };
        // The rail starts a half tread before the first step and ends a half tread after the last
        const p0 = point(first, -13);
        const p1 = point(last, 13);
        bars.push({
          key: `r${first.flight}${side}`,
          from: [p0.x / 100, baseY + (first.top + RAIL_H - 6) / 100, p0.y / 100],
          to: [p1.x / 100, baseY + (last.top + RAIL_H) / 100, p1.y / 100],
        });
        for (const t of list.filter((_, i) => i % 2 === 0)) {
          const q = point(t, 0);
          bars.push({
            key: `p${first.flight}${side}${t.index}`,
            post: [q.x / 100, baseY + t.top / 100, q.y / 100],
            height: RAIL_H / 100,
          });
        }
      }
    }
    return { treads: all, rails: bars };
  }, [stair, baseY]);

  return (
    <group>
      {treads.map((t, i) => (
        <mesh
          key={i}
          position={[(t.x0 + t.x1) / 200, baseY + t.top / 200, (t.y0 + t.y1) / 200]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[(t.x1 - t.x0) / 100, t.top / 100, (t.y1 - t.y0) / 100]} />
          <meshStandardMaterial color={t.landing ? '#B9A587' : STEP_COLOR} roughness={0.75} />
        </mesh>
      ))}
      {rails.map((r) =>
        r.post ? (
          <mesh key={r.key} position={[r.post[0], r.post[1] + r.height / 2, r.post[2]]} castShadow>
            <boxGeometry args={[0.025, r.height, 0.025]} />
            <meshStandardMaterial color={RAIL_COLOR} roughness={0.5} />
          </mesh>
        ) : (
          <Bar key={r.key} from={r.from} to={r.to} />
        )
      )}
    </group>
  );
}

/** Position and orientation of a wall-aligned frame: local x runs along the wall, local z across it. */
function wallFrame(f) {
  const mid = (f.a + f.b) / 200;
  const across = (f.line + f.off) / 100;
  return f.axis === 'h'
    ? { position: [mid, 0, across], rotation: [0, 0, 0], flip: 1 }
    : { position: [across, 0, mid], rotation: [0, -Math.PI / 2, 0], flip: -1 };
}

const Part = ({ position, size, color, roughness = 0.6, shadow = true }) => (
  <mesh position={position} castShadow={shadow} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={roughness} />
  </mesh>
);

/** One clean translucent pane: it never writes depth, so what is behind it always shows. */
function GlassPane({ width, height, position }) {
  return (
    <mesh position={position} renderOrder={2}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color="#CFE4EE"
        transparent
        opacity={0.26}
        roughness={0.08}
        metalness={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** How far a walkthrough leaves an inner door ajar (radians). */
const AJAR = 1.25;

/**
 * Frame, closed leaf and handles of a door, sitting inside the wall thickness. The main entrance
 * gets a wine leaf and a small doormat inside. While walking, inner doors stand ajar.
 */
function Door3D({ fixture: f, swing, entrance, ajar }) {
  const frame = wallFrame(f);
  const w = (f.b - f.a) / 100;
  const t = f.thick / 100;
  const h = f.z1 / 100;
  const post = 0.05;
  const tall = h > 1;
  const leafW = w - post * 2;
  const leafH = Math.max(0.2, h - post - 0.005);
  const leafT = 0.04;
  const leafColor = entrance ? ENTRANCE_LEAF : LEAF;
  const panelColor = entrance ? '#6B1726' : '#8C5F3D';
  // Hinged at the start of the opening; opens towards its side of the wall
  const side = swing * (f.opening.flip ? -1 : 1) * frame.flip;
  const angle = ajar && !entrance && tall ? -side * AJAR : 0;
  const lever = (z) => (
    <Part
      key={z}
      position={[leafW - 0.07, Math.min(0.98, leafH * 0.5), z]}
      size={[0.11, 0.022, 0.026]}
      color="#C4A869"
      roughness={0.3}
      shadow={false}
    />
  );
  return (
    <group position={frame.position} rotation={frame.rotation}>
      <Part position={[-(w / 2 - post / 2), h / 2, 0]} size={[post, h, t]} color={TIMBER} />
      <Part position={[w / 2 - post / 2, h / 2, 0]} size={[post, h, t]} color={TIMBER} />
      <Part position={[0, h - post / 2, 0]} size={[w - post * 2, post, t]} color={TIMBER} />
      <Part
        position={[0, 0.005, 0]}
        size={[w - post * 2, 0.01, t - 0.01]}
        color="#4A3424"
        shadow={false}
      />
      <group position={[-w / 2 + post, 0, 0]} rotation={[0, angle, 0]}>
        <Part
          position={[leafW / 2, 0.01 + leafH / 2, 0]}
          size={[leafW, leafH, leafT]}
          color={leafColor}
        />
        {tall &&
          [-1, 1].flatMap((face) => [
            <Part
              key={`u${face}`}
              position={[leafW / 2, leafH * 0.72, face * (leafT / 2 + 0.002)]}
              size={[leafW - 0.2, leafH * 0.28, 0.006]}
              color={panelColor}
              shadow={false}
            />,
            <Part
              key={`l${face}`}
              position={[leafW / 2, leafH * 0.28, face * (leafT / 2 + 0.002)]}
              size={[leafW - 0.2, leafH * 0.4, 0.006]}
              color={panelColor}
              shadow={false}
            />,
          ])}
        {tall && [lever(leafT / 2 + 0.014), lever(-(leafT / 2 + 0.014))]}
      </group>
      {entrance && f.outward !== 0 && tall && (
        <Part
          position={[0, 0.006, -f.outward * frame.flip * (t / 2 + 0.3)]}
          size={[Math.min(w, 1.0) - 0.1, 0.012, 0.5]}
          color="#4A4038"
          roughness={0.98}
          shadow={false}
        />
      )}
    </group>
  );
}

/** Timber frame, thin centred cross bars, one glass pane and a sill board around a window. */
function Window3D({ fixture: f }) {
  const frame = wallFrame(f);
  const w = (f.b - f.a) / 100;
  const t = f.thick / 100;
  const y0 = f.sill / 100;
  const y1 = f.z1 / 100;
  const h = y1 - y0;
  const bar = 0.045;
  if (h < 0.05) {
    // Low walls: the window is marked on the wall top by a timber rim around a glass inlay
    return (
      <group position={frame.position} rotation={frame.rotation}>
        <Part
          position={[0, y0 + 0.004, 0]}
          size={[w, 0.008, t - 0.01]}
          color={TIMBER}
          shadow={false}
        />
        <mesh position={[0, y0 + 0.0085, 0]}>
          <boxGeometry args={[Math.max(0.05, w - 0.1), 0.002, Math.max(0.02, t - 0.06)]} />
          <meshStandardMaterial color="#BFD7E3" roughness={0.2} />
        </mesh>
      </group>
    );
  }
  const innerW = w - bar * 2;
  const innerH = h - bar * 2;
  return (
    <group position={frame.position} rotation={frame.rotation}>
      <Part position={[-(w / 2 - bar / 2), y0 + h / 2, 0]} size={[bar, h, t]} color={TIMBER} />
      <Part position={[w / 2 - bar / 2, y0 + h / 2, 0]} size={[bar, h, t]} color={TIMBER} />
      <Part position={[0, y1 - bar / 2, 0]} size={[innerW, bar, t]} color={TIMBER} />
      <Part position={[0, y0 + bar / 2, 0]} size={[innerW, bar, t]} color={TIMBER} />
      {innerW > 0.6 && (
        <Part
          position={[0, y0 + h / 2, 0]}
          size={[0.025, innerH, 0.03]}
          color={TIMBER}
          shadow={false}
        />
      )}
      {innerH > 0.5 && (
        <Part
          position={[0, y0 + h / 2, 0]}
          size={[innerW, 0.025, 0.03]}
          color={TIMBER}
          shadow={false}
        />
      )}
      <GlassPane width={innerW} height={innerH} position={[0, y0 + h / 2, 0]} />
      <Part
        position={[0, y0 - 0.012, 0]}
        size={[w + 0.06, 0.024, t + 0.06]}
        color="#E6DCCB"
        shadow={false}
      />
    </group>
  );
}

function WallBox({ box: b, color, material = null }) {
  const len = (b.b - b.a) / 100;
  const h = (b.z1 - b.z0) / 100;
  const mid = (b.a + b.b) / 200;
  const across = (b.line + (b.off || 0)) / 100;
  const y = (b.z0 + b.z1) / 200;
  const pos = b.axis === 'h' ? [mid, y, across] : [across, y, mid];
  const dims = b.axis === 'h' ? [len, h, b.thick / 100] : [b.thick / 100, h, len];
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={dims} />
      {material ? (
        <primitive object={material} attach="material" />
      ) : (
        <meshStandardMaterial color={color} roughness={0.85} />
      )}
    </mesh>
  );
}

/** Floors, walls (with real door and window openings) and furniture of one floor. */
function LevelShell({
  flat,
  level,
  rooms,
  baseY,
  fullHeight,
  entranceId,
  withSlab,
  ajar,
  wallMat = null,
  floorId = null,
  showShadows = true,
  shadowStrength = 0.55,
}) {
  const openings = openingsOf(flat, level.id);
  const { boxes, skirting, fixtures, swings } = useMemo(() => {
    const analysis = analyzeLevel(flat, level.id);
    const pieces = wallPieces(levelSolidEdges(flat, level.id), analysis.isExteriorEdge, openings, {
      fullHeight,
      outsideCell: analysis.isOutsideCell || null,
    });
    const map = {};
    for (const f of pieces.fixtures)
      if (f.type === 'door') map[f.id] = defaultSwing(analysis, f.opening);
    return {
      boxes: pieces.boxes,
      skirting: skirtingBoxes(pieces.boxes),
      fixtures: pieces.fixtures,
      swings: map,
    };
  }, [flat, level.id, openings, fullHeight]);
  const holes = useMemo(
    () => flat.stairs.filter((s) => stairOpensOn(flat, s, level.id)).map((s) => stairRect(s)),
    [flat, level.id]
  );
  const spaces = flat.spaces.filter((s) => s.levelId === level.id);
  const thick = withSlab ? SLAB_THICKNESS : 0.06;
  return (
    <group position={[0, baseY, 0]}>
      {spaces.map((space) => {
        const room = rooms[space.roomId];
        const color = (SPACE_KINDS[space.kind] || SPACE_KINDS.room).color;
        // A room's own floor wins; otherwise the floor picked for the whole flat; otherwise the plain kind color
        const spaceFloor = floorMaterial(normalizeFinish(room?.finish).floor || floorId);
        return (
          <group key={space.id}>
            {carveHoles(regionRects(space), withSlab ? holes : []).map((r, i) => (
              <mesh
                key={i}
                position={[(r.x + r.widthCm / 2) / 100, -thick / 2, (r.y + r.depthCm / 2) / 100]}
                receiveShadow
              >
                <boxGeometry args={[r.widthCm / 100, thick, r.depthCm / 100]} />
                {spaceFloor ? (
                  <primitive object={spaceFloor} attach="material" />
                ) : (
                  <meshStandardMaterial color={color} roughness={0.9} />
                )}
              </mesh>
            ))}
            {room && space.furnishable && (
              <group
                position={[
                  (space.x + space.widthCm / 2) / 100,
                  0,
                  (space.y + space.depthCm / 2) / 100,
                ]}
              >
                {showShadows && (
                  <FurnitureShadows
                    items={room.placedFurniture}
                    roomWidthCm={room.widthCm}
                    roomDepthCm={room.depthCm}
                    strength={shadowStrength}
                  />
                )}
                {(room.placedFurniture || []).map((raw) => {
                  const def = resolveItemDef(raw);
                  // Pictures, mirrors and curtains hang higher than the low walls: they show with full walls
                  if (def?.wallMounted && !fullHeight) return null;
                  // Pieces on the floor and pieces hung on a wall are moved clear of a wall drawn on the room's edge
                  const item =
                    def && (!raw.elevationCm || def.wallMounted)
                      ? { ...raw, ...pushOffInteriorWalls(raw, space, room, boxes, def) }
                      : raw;
                  return (
                    <Furniture3DBox
                      key={item.id}
                      item={item}
                      roomWidthCm={room.widthCm}
                      roomDepthCm={room.depthCm}
                      isSelected={false}
                      isColliding={false}
                    />
                  );
                })}
              </group>
            )}
          </group>
        );
      })}
      {skirting.map((b, i) => (
        <WallBox key={`s${i}`} box={b} color={SKIRTING_COLOR} />
      ))}
      {boxes
        .filter((b) => !b.glass)
        .map((b, i) => (
          <WallBox key={i} box={b} color={WALL_COLOR} material={wallMat} />
        ))}
      {fixtures.map((f) =>
        f.type === 'door' ? (
          <Door3D
            key={`${f.id}-${f.a}`}
            fixture={f}
            swing={swings[f.id] ?? 1}
            entrance={entranceId === f.id}
            ajar={ajar}
          />
        ) : (
          <Window3D key={`${f.id}-${f.a}`} fixture={f} />
        )
      )}
    </group>
  );
}

/** A warm lamp that follows the visitor on evening and night walks, so rooms away from the sun are lit. */
function WalkLamp({ intensity }) {
  const ref = useRef(null);
  const { camera } = useThree();
  useFrame(() => {
    if (ref.current)
      ref.current.position.set(camera.position.x, camera.position.y + 0.3, camera.position.z);
  });
  if (intensity <= 0) return null;
  return (
    <pointLight ref={ref} intensity={intensity * 1.6} distance={7} decay={1.3} color="#FFD9A0" />
  );
}

export function Flat3DView() {
  const flat = useFlatStore((s) => s.flat);
  const rooms = useFlatStore((s) => s.rooms);
  const levelId = useFlatStore((s) => s.levelId);
  const [fullHeight, setFullHeight] = useState(false);
  const [lighting, setLighting] = useState('day');
  const [walking, setWalking] = useState(false);
  const notice = useFlatUi((s) => s.notice);
  // A message such as "Saved ... .png" after an export; the plan clears its own, the 3D view clears here
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => useFlatUi.getState().setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  const [walkLevel, setWalkLevel] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const preset = LIGHTING[lighting];
  const quality = useQuality();
  const look = useFlatLook();
  // One wall finish for the whole flat: the one picked here, else what its rooms were given (a style)
  const wallMat = wallMaterial(look.wall || dominantFinish(Object.values(rooms), 'wall'));
  const selected = useFlatStore((s) => s.selected);
  const applyStyle = useFlatStore((s) => s.applyStyle);
  const resetStyle = useFlatStore((s) => s.resetStyle);
  const [styleScope, setStyleScope] = useState('all');
  const selectedSpace =
    selected?.type === 'space' ? flat?.spaces.find((sp) => sp.id === selected.id) : null;
  const scopeRoom = selectedSpace && rooms[selectedSpace.roomId] ? selectedSpace : null;
  const oneRoom = styleScope === 'one' && scopeRoom;
  const styleRooms = oneRoom ? [rooms[scopeRoom.roomId]] : Object.values(rooms);
  const styleRoomIds = oneRoom ? [scopeRoom.roomId] : null;

  const layout = useMemo(() => {
    if (!flat) return null;
    let maxX = 600;
    let maxY = 600;
    for (const lvl of flat.levels) {
      for (const r of wallsOf(flat, lvl.id)) {
        maxX = Math.max(maxX, r.x2);
        maxY = Math.max(maxY, r.y2);
      }
    }
    return { cx: maxX / 200, cz: maxY / 200, span: Math.max(maxX, maxY) / 100 };
  }, [flat]);

  const start = useMemo(() => (flat ? flatWalkStart(flat, rooms) : null), [flat, rooms]);
  const entrance = useMemo(() => (flat ? entranceOf(flat) : null), [flat]);

  // Lamps on the floor being shown light the room in the evening and at night
  const lampLevel = flat ? (walking ? walkLevel : levelIndex(flat, levelId)) : 0;
  const lamps = useMemo(() => {
    const lvl = flat?.levels[lampLevel];
    if (!lvl) return [];
    const out = [];
    for (const space of flat.spaces) {
      const room = rooms[space.roomId];
      if (space.levelId !== lvl.id || !space.furnishable || !room) continue;
      const ox = (space.x + space.widthCm / 2) / 100;
      const oz = (space.y + space.depthCm / 2) / 100;
      for (const l of collectLamps(room.placedFurniture, room.widthCm, room.depthCm))
        out.push({
          ...l,
          id: `${space.id}-${l.id}`,
          x: l.x + ox,
          z: l.z + oz,
          y: l.y + (lampLevel * flat.floorHeightCm) / 100,
        });
    }
    return out;
  }, [flat, rooms, lampLevel]);

  // Walking rules: walls with door gaps, furniture of every room, and staircases between floors
  const env = useMemo(() => {
    if (!walking || !flat || !start) return null;
    const cache = new Map();
    const obstacles = (idx) => {
      const id = flat.levels[idx]?.id;
      if (!cache.has(id)) cache.set(id, levelObstacles(flat, rooms, id));
      return cache.get(id);
    };
    return {
      start: { ...start, floorM: (start.levelIdx * flat.floorHeightCm) / 100 },
      isBlocked: (x, z, idx) => isFlatBlocked(x, z, obstacles(idx)),
      surface: (x, z, idx) => walkSurface(flat, idx, x, z),
    };
    // A walk keeps the rules it began with even when the flat is saved meanwhile
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walking]);

  const startWalk = () => {
    if (!start) return;
    setWalkLevel(start.levelIdx);
    setWalking(true);
  };
  const exitWalk = useCallback(() => {
    setWalking(false);
    setResetKey((k) => k + 1);
  }, []);

  if (!flat || !layout) return null;
  const floorH = flat.floorHeightCm / 100;
  const activeIdx = walking ? walkLevel : levelIndex(flat, levelId);
  const full = fullHeight || walking;
  const maxDim = layout.span;

  return (
    <div className={styles.view3d} aria-label="3D view of the flat">
      <Canvas
        key={`${levelId}-${resetKey}-${quality.level}`}
        shadows={quality.settings.shadowType}
        dpr={quality.settings.dpr}
        camera={{
          position: [
            layout.cx + layout.span * 0.7,
            layout.span * 0.95 + 3 + activeIdx * floorH,
            layout.cz + layout.span * 1.25,
          ],
          fov: 45,
          near: 0.25,
          far: 400,
        }}
        gl={{ antialias: true }}
      >
        {preset.background && <color attach="background" args={[preset.background]} />}
        <SceneLights
          mode={lighting}
          span={maxDim}
          cx={layout.cx}
          cz={layout.cz}
          settings={quality.settings}
          centerLamp={!walking}
          fullLamps={lamps.length > 0}
          y={activeIdx * floorH}
        />
        <LampLights lamps={lamps} mode={lighting} max={quality.settings.maxLamps} />
        {walking && <WalkLamp intensity={preset.lamp} />}

        {flat.levels.map((level, li) => {
          // Floors above the one being edited (or walked) are hidden so the plan below stays visible
          if (li > activeIdx) return null;
          const baseY = li * floorH;
          return (
            <group key={level.id}>
              <LevelShell
                flat={flat}
                level={level}
                rooms={rooms}
                baseY={baseY}
                fullHeight={full || li < activeIdx}
                entranceId={entrance?.opening.id}
                withSlab={li > 0}
                ajar={walking}
                wallMat={wallMat}
                floorId={look.floor}
                shadowStrength={preset.blob}
              />
              {flat.stairs
                .filter((s) => s.levelId === level.id)
                .map((stair) => (
                  <Stairs3D key={stair.id} stair={stair} baseY={baseY} />
                ))}
            </group>
          );
        })}

        {quality.settings.contactShadows && (
          <ContactShadows
            position={[layout.cx, activeIdx * floorH + 0.002, layout.cz]}
            opacity={preset.contact}
            scale={layout.span * 2.4}
            blur={2.4}
            far={Math.min(2.5, layout.span)}
            resolution={1024}
          />
        )}
        <OrbitControls
          enabled={!walking}
          target={[layout.cx, 0.3 + activeIdx * floorH, layout.cz]}
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={2}
          maxDistance={80}
          enableDamping
        />
        {walking && env && (
          <WalkControls env={env} onExit={exitWalk} onLevelChange={setWalkLevel} />
        )}
        <SnapshotBridge />
      </Canvas>

      {notice && (
        <div className={`${planStyles.notice} ${styles.noticeTop}`} role="status">
          {notice}
        </div>
      )}

      {walking && (
        <p className={styles.view3dHint} aria-live="polite">
          Drag to look around. Walk with W A S D (Shift to run), through doors and up stairs; the
          arrow keys move and turn. Press Esc to leave.
          {entrance ? '' : ' This flat has no outer door, so you start in the first room.'}
        </p>
      )}

      {walking && <WalkHud onExit={exitWalk} />}

      <div className={styles.view3dControls} role="toolbar" aria-label="3D view controls">
        <Segmented
          ariaLabel="Lighting"
          options={LIGHT_OPTIONS}
          value={lighting}
          onChange={setLighting}
          size="small"
        />
        {!walking && (
          <Segmented
            ariaLabel="Walls"
            options={WALL_OPTIONS}
            value={fullHeight ? 'full' : 'low'}
            onChange={(v) => setFullHeight(v === 'full')}
            size="small"
          />
        )}
        <StyleButton
          size="small"
          current={sharedStyle(styleRooms)}
          hasStyle={styleRooms.some((r) => r.styleApplied)}
          onPick={(id) => {
            // Walls are one finish for the whole flat in 3D, so a single room takes only floor and colours
            applyStyle(id, styleRoomIds, oneRoom ? { wall: false } : undefined);
            if (!oneRoom) look.set({ wall: null, floor: null });
          }}
          onReset={() => resetStyle(styleRoomIds)}
          scope={
            <Segmented
              ariaLabel="Apply the style to"
              options={[
                { value: 'all', label: 'All rooms' },
                {
                  value: 'one',
                  label: scopeRoom ? scopeRoom.name || 'This room' : 'One room',
                  title: scopeRoom ? undefined : 'Select a room on the plan first',
                },
              ]}
              value={oneRoom ? 'one' : 'all'}
              onChange={(v) => setStyleScope(v === 'one' && !scopeRoom ? 'all' : v)}
              size="small"
              fill
            />
          }
          note={scopeRoom ? null : 'Select a room on the plan to style just that room.'}
        />
        <MaterialsPanel
          floor={look.floor}
          wall={look.wall}
          onFloor={(floor) => look.set({ floor })}
          onWall={(wall) => look.set({ wall })}
          quality={quality.mode}
          onQuality={quality.setMode}
          resolvedQuality={quality.level}
          floorLabel="Floors"
          floorNote="A floor chosen for a room in its own editor is kept for that room."
        />
        <Button
          variant={walking ? 'primary' : 'secondary'}
          icon={<Footprints size={16} aria-hidden="true" />}
          onClick={() => (walking ? exitWalk() : startWalk())}
          disabled={!walking && !start}
          aria-label={walking ? 'Leave walkthrough' : 'Walk through the flat'}
          title={
            start
              ? walking
                ? 'Leave walkthrough (Esc)'
                : entrance
                  ? 'Walk through the flat, starting at the main entrance'
                  : 'Walk through the flat'
              : 'Draw some walls first'
          }
        >
          {walking ? 'Leave walkthrough' : 'Walk through'}
        </Button>
      </div>
    </div>
  );
}
