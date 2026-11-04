import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Eye } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { Furniture3DBox } from '../preview3d/Furniture3DBox.jsx';
import { Button } from '../common/Button.jsx';
import { stairGeometry, stairFootprint, levelIndex, SPACE_KINDS } from '../../engine/flat.js';
import { wallsOf, openingsOf, analyzeLevel } from '../../engine/flatPlan.js';
import { edgesOf, wallBoxes, regionRects } from '../../engine/flatWalls.js';
import styles from './FlatDesigner.module.css';

/** Steps of one staircase as boxes, positioned in the flat's metre space. */
function Stairs3D({ stair, baseY }) {
  const g = useMemo(() => stairGeometry(stair), [stair]);
  const fp = stairFootprint(stair);
  const rot = (-(stair.rotationDeg || 0) * Math.PI) / 180;
  const cx = (stair.x + fp.widthCm / 2) / 100;
  const cz = (stair.y + fp.depthCm / 2) / 100;
  const T = 0.27;
  const riser = g.riserCm / 100;

  const steps = [];
  for (const f of g.flights) {
    for (let i = 0; i < f.treads; i++) {
      const height = (f.firstStep + i) * riser;
      const along = (i + 0.5) * T;
      // Climbing 'up' goes toward -y from the flight's bottom edge; 'down' toward +y; 'right' toward +x
      let x = (f.x + f.widthCm / 2) / 100;
      let z = (f.y + f.lengthCm / 2) / 100;
      let w = f.widthCm / 100;
      let d = T;
      if (f.dir === 'up') z = (f.y + f.lengthCm) / 100 - along;
      if (f.dir === 'down') z = f.y / 100 + along;
      if (f.dir === 'right') {
        x = f.x / 100 + along;
        z = (f.y + f.widthCm / 2) / 100;
        w = T;
        d = f.widthCm / 100;
      }
      steps.push({ key: `${f.dir}-${i}-${f.x}`, x, z, w, d, height });
    }
  }
  if (g.landing) {
    const L = g.landing;
    steps.push({
      key: 'landing',
      x: (L.x + L.widthCm / 2) / 100,
      z: (L.y + L.depthCm / 2) / 100,
      w: L.widthCm / 100,
      d: L.depthCm / 100,
      height: L.stepIndex * riser,
    });
  }
  const offX = g.localWidthCm / 200;
  const offZ = g.localDepthCm / 200;

  return (
    <group position={[cx, baseY, cz]} rotation={[0, rot, 0]}>
      {steps.map((s) => (
        <mesh
          key={s.key}
          position={[s.x - offX, s.height / 2, s.z - offZ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[s.w, s.height, s.d]} />
          <meshStandardMaterial color="#C9B79C" roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

const WALL_COLOR = '#F2EDE4';

/** Floors, walls (with door and window gaps) and furniture of one floor. */
function LevelShell({ flat, level, rooms, baseY, fullHeight }) {
  const runs = wallsOf(flat, level.id);
  const openings = openingsOf(flat, level.id);
  const boxes = useMemo(() => {
    const analysis = analyzeLevel(flat, level.id);
    return wallBoxes(edgesOf(runs), analysis.isExteriorEdge, openings, { fullHeight });
  }, [flat, level.id, runs, openings, fullHeight]);
  const spaces = flat.spaces.filter((s) => s.levelId === level.id);
  return (
    <group position={[0, baseY, 0]}>
      {spaces.map((space) => {
        const room = rooms[space.roomId];
        const color = (SPACE_KINDS[space.kind] || SPACE_KINDS.room).color;
        return (
          <group key={space.id}>
            {regionRects(space).map((r, i) => (
              <mesh
                key={i}
                position={[(r.x + r.widthCm / 2) / 100, -0.03, (r.y + r.depthCm / 2) / 100]}
                receiveShadow
              >
                <boxGeometry args={[r.widthCm / 100, 0.06, r.depthCm / 100]} />
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
      {boxes.map((b, i) => {
        const len = (b.b - b.a) / 100;
        const h = (b.z1 - b.z0) / 100;
        const mid = (b.a + b.b) / 200;
        const line = b.line / 100;
        const y = (b.z0 + b.z1) / 200;
        const pos = b.axis === 'h' ? [mid, y, line] : [line, y, mid];
        const dims = b.axis === 'h' ? [len, h, b.thick / 100] : [b.thick / 100, h, len];
        return (
          <mesh key={i} position={pos} castShadow={!b.glass} receiveShadow>
            <boxGeometry args={dims} />
            {b.glass ? (
              <meshStandardMaterial color="#BFD7E3" transparent opacity={0.35} roughness={0.1} />
            ) : (
              <meshStandardMaterial color={WALL_COLOR} roughness={0.85} />
            )}
          </mesh>
        );
      })}
    </group>
  );
}

export function Flat3DView() {
  const flat = useFlatStore((s) => s.flat);
  const rooms = useFlatStore((s) => s.rooms);
  const levelId = useFlatStore((s) => s.levelId);
  const [fullHeight, setFullHeight] = useState(false);

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

  if (!flat || !layout) return null;
  const floorH = flat.floorHeightCm / 100;
  const activeIdx = levelIndex(flat, levelId);

  return (
    <div className={styles.view3d} aria-label="3D view of the flat">
      <Canvas
        key={levelId}
        shadows
        camera={{
          position: [
            layout.cx + layout.span * 0.7,
            layout.span * 0.95 + 3 + activeIdx * floorH,
            layout.cz + layout.span * 1.25,
          ],
          fov: 45,
        }}
      >
        <ambientLight intensity={1.1} color="#FAF7F0" />
        <hemisphereLight groundColor="#E0D5C5" color="#FFFFFF" intensity={0.7} />
        <directionalLight
          castShadow
          position={[layout.cx + layout.span, layout.span * 2, layout.cz + layout.span]}
          intensity={1.2}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-layout.span * 1.5}
          shadow-camera-right={layout.span * 1.5}
          shadow-camera-top={layout.span * 1.5}
          shadow-camera-bottom={-layout.span * 1.5}
          shadow-camera-far={layout.span * 8}
          shadow-normalBias={0.04}
        />

        {flat.levels.map((level, li) => {
          // Floors above the one being edited are hidden so the plan below stays visible
          if (li > activeIdx) return null;
          const baseY = li * floorH;
          return (
            <group key={level.id}>
              <LevelShell
                flat={flat}
                level={level}
                rooms={rooms}
                baseY={baseY}
                fullHeight={fullHeight || li < activeIdx}
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
          target={[layout.cx, 0.3 + activeIdx * floorH, layout.cz]}
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={2}
          maxDistance={80}
          enableDamping
        />
      </Canvas>
      <div className={styles.view3dControls}>
        <Button
          variant="secondary"
          icon={<Eye size={16} aria-hidden="true" />}
          onClick={() => setFullHeight((v) => !v)}
        >
          {fullHeight ? 'Low walls' : 'Full-height walls'}
        </Button>
      </div>
    </div>
  );
}
