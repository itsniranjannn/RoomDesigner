import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Footprints, Square } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { Furniture3DBox } from '../preview3d/Furniture3DBox.jsx';
import { WalkControls } from '../preview3d/WalkControls.jsx';
import { LIGHTING, LIGHT_OPTIONS } from '../preview3d/lighting.jsx';
import { Button } from '../common/Button.jsx';
import { Segmented } from '../common/Field.jsx';
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

/** Frame, leaf and handle of a door; the main entrance gets a wine leaf and a doormat. */
function Door3D({ fixture: f, swing, entrance }) {
  const frame = wallFrame(f);
  const w = (f.b - f.a) / 100;
  const t = f.thick / 100;
  const h = f.z1 / 100;
  const post = 0.05;
  // Leaf hinged at the start of the opening, swung 70 degrees towards its side of the wall
  const side = swing * (f.opening.flip ? -1 : 1) * frame.flip;
  const leafColor = entrance ? ENTRANCE_LEAF : LEAF;
  const leafLen = w - 0.06;
  const leafH = Math.max(0.2, h - 0.04);
  const outLocal = f.outward * frame.flip;
  return (
    <group position={frame.position} rotation={frame.rotation}>
      <Part position={[-(w / 2 - post / 2), h / 2, 0]} size={[post, h, t + 0.02]} color={TIMBER} />
      <Part position={[w / 2 - post / 2, h / 2, 0]} size={[post, h, t + 0.02]} color={TIMBER} />
      <Part position={[0, h - post / 2, 0]} size={[w, post, t + 0.02]} color={TIMBER} />
      <Part position={[0, 0.006, 0]} size={[w, 0.012, t + 0.01]} color="#4A3424" shadow={false} />
      <group position={[-w / 2 + 0.03, 0, 0]} rotation={[0, -side * 1.22, 0]}>
        <Part
          position={[leafLen / 2, leafH / 2, 0]}
          size={[leafLen, leafH, 0.04]}
          color={leafColor}
        />
        <Part
          position={[leafLen - 0.07, Math.min(0.95, leafH * 0.5), side * 0.035]}
          size={[0.1, 0.025, 0.03]}
          color="#C4A869"
          roughness={0.3}
        />
      </group>
      {entrance && f.outward !== 0 && (
        <Part
          position={[0, 0.01, outLocal * (t / 2 + 0.32)]}
          size={[w, 0.02, 0.5]}
          color="#8A2635"
          roughness={0.95}
          shadow={false}
        />
      )}
    </group>
  );
}

/** Timber frame, sill board and cross bar around a window's glass. */
function Window3D({ fixture: f }) {
  const frame = wallFrame(f);
  const w = (f.b - f.a) / 100;
  const t = f.thick / 100;
  const y0 = f.sill / 100;
  const y1 = f.z1 / 100;
  const h = Math.max(0.1, y1 - y0);
  const bar = 0.045;
  return (
    <group position={frame.position} rotation={frame.rotation}>
      <Part
        position={[-(w / 2 - bar / 2), y0 + h / 2, 0]}
        size={[bar, h, t + 0.015]}
        color={TIMBER}
      />
      <Part position={[w / 2 - bar / 2, y0 + h / 2, 0]} size={[bar, h, t + 0.015]} color={TIMBER} />
      <Part position={[0, y1 - bar / 2, 0]} size={[w, bar, t + 0.015]} color={TIMBER} />
      <Part position={[0, y0 + bar / 2, 0]} size={[w, bar, t + 0.015]} color={TIMBER} />
      {h > 0.4 && <Part position={[0, y0 + h / 2, 0]} size={[0.03, h, 0.03]} color={TIMBER} />}
      <Part position={[0, y0 + h / 2, 0]} size={[w - 0.1, 0.03, 0.03]} color={TIMBER} />
      <Part position={[0, y0 - 0.012, 0]} size={[w + 0.1, 0.03, t + 0.1]} color="#E6DCCB" />
    </group>
  );
}

function WallBox({ box: b, color, glass = false }) {
  const len = (b.b - b.a) / 100;
  const h = (b.z1 - b.z0) / 100;
  const mid = (b.a + b.b) / 200;
  const across = (b.line + (b.off || 0)) / 100;
  const y = (b.z0 + b.z1) / 200;
  const pos = b.axis === 'h' ? [mid, y, across] : [across, y, mid];
  const dims = b.axis === 'h' ? [len, h, b.thick / 100] : [b.thick / 100, h, len];
  return (
    <mesh position={pos} castShadow={!glass} receiveShadow>
      <boxGeometry args={dims} />
      {glass ? (
        <meshStandardMaterial color="#BFD7E3" transparent opacity={0.35} roughness={0.1} />
      ) : (
        <meshStandardMaterial color={color} roughness={0.85} />
      )}
    </mesh>
  );
}

/** Floors, walls (with real door and window openings) and furniture of one floor. */
function LevelShell({ flat, level, rooms, baseY, fullHeight, entranceId, withSlab }) {
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
        return (
          <group key={space.id}>
            {carveHoles(regionRects(space), withSlab ? holes : []).map((r, i) => (
              <mesh
                key={i}
                position={[(r.x + r.widthCm / 2) / 100, -thick / 2, (r.y + r.depthCm / 2) / 100]}
                receiveShadow
              >
                <boxGeometry args={[r.widthCm / 100, thick, r.depthCm / 100]} />
                <meshStandardMaterial color={color} roughness={0.9} />
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
                {(room.placedFurniture || []).map((item) => (
                  <Furniture3DBox
                    key={item.id}
                    item={item}
                    roomWidthCm={room.widthCm}
                    roomDepthCm={room.depthCm}
                    isSelected={false}
                    isColliding={false}
                  />
                ))}
              </group>
            )}
          </group>
        );
      })}
      {skirting.map((b, i) => (
        <WallBox key={`s${i}`} box={b} color={SKIRTING_COLOR} />
      ))}
      {boxes.map((b, i) => (
        <WallBox key={i} box={b} color={WALL_COLOR} glass={b.glass} />
      ))}
      {fixtures.map((f) =>
        f.type === 'door' ? (
          <Door3D
            key={`${f.id}-${f.a}`}
            fixture={f}
            swing={swings[f.id] ?? 1}
            entrance={entranceId === f.id}
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
  const [walkLevel, setWalkLevel] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const preset = LIGHTING[lighting];

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
        key={`${levelId}-${resetKey}`}
        shadows
        camera={{
          position: [
            layout.cx + layout.span * 0.7,
            layout.span * 0.95 + 3 + activeIdx * floorH,
            layout.cz + layout.span * 1.25,
          ],
          fov: 45,
        }}
        gl={{ antialias: true }}
      >
        {preset.background && <color attach="background" args={[preset.background]} />}
        <ambientLight intensity={preset.ambient[0]} color={preset.ambient[1]} />
        <hemisphereLight groundColor="#E0D5C5" color="#FFFFFF" intensity={preset.hemi} />
        <directionalLight
          castShadow
          position={[layout.cx + maxDim, maxDim * 2, layout.cz + maxDim]}
          intensity={preset.sun[0]}
          color={preset.sun[1]}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-maxDim * 1.5}
          shadow-camera-right={maxDim * 1.5}
          shadow-camera-top={maxDim * 1.5}
          shadow-camera-bottom={-maxDim * 1.5}
          shadow-camera-far={maxDim * 8}
          shadow-normalBias={0.04}
        />
        <directionalLight
          position={[layout.cx - maxDim, maxDim * 1.6, layout.cz - maxDim]}
          intensity={preset.fill[0]}
          color="#F5EFE6"
        />
        {preset.lamp > 0 && !walking && (
          <pointLight
            position={[layout.cx, 2.4 + activeIdx * floorH, layout.cz]}
            intensity={preset.lamp * 2}
            distance={maxDim * 1.6}
            decay={1.3}
            color="#FFD9A0"
          />
        )}
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
              />
              {flat.stairs
                .filter((s) => s.levelId === level.id)
                .map((stair) => (
                  <Stairs3D key={stair.id} stair={stair} baseY={baseY} />
                ))}
            </group>
          );
        })}

        <ContactShadows
          position={[layout.cx, 0.002, layout.cz]}
          opacity={0.35}
          scale={layout.span * 2.4}
          blur={1.8}
          far={layout.span}
        />
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
      </Canvas>

      {walking && (
        <p className={styles.view3dHint} aria-live="polite">
          Drag to look around. Walk with W A S D or the arrow keys, through doors and up stairs.
          Press Esc to leave.
          {entrance ? '' : ' This flat has no outer door, so you start in the first room.'}
        </p>
      )}

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
