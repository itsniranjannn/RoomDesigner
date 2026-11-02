import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { Eye } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { Room3DWalls } from '../preview3d/Room3DWalls.jsx';
import { Furniture3DBox } from '../preview3d/Furniture3DBox.jsx';
import { Button } from '../common/Button.jsx';
import { stairGeometry, stairFootprint, levelIndex } from '../../engine/flat.js';
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
        <mesh key={s.key} position={[s.x - offX, s.height / 2, s.z - offZ]} castShadow receiveShadow>
          <boxGeometry args={[s.w, s.height, s.d]} />
          <meshStandardMaterial color="#C9B79C" roughness={0.75} />
        </mesh>
      ))}
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
    for (const s of flat.spaces) {
      maxX = Math.max(maxX, s.x + s.widthCm);
      maxY = Math.max(maxY, s.y + s.depthCm);
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
        camera={{ position: [layout.cx + layout.span * 1.1, layout.span * 2 + 4 + activeIdx * floorH, layout.cz + layout.span * 1.4], fov: 45 }}
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
              {flat.spaces.filter((s) => s.levelId === level.id).map((space) => {
                const room = rooms[space.roomId];
                if (!room) return null;
                const px = (space.x + space.widthCm / 2) / 100;
                const pz = (space.y + space.depthCm / 2) / 100;
                return (
                  <group key={space.id} position={[px, baseY, pz]}>
                    <Room3DWalls room={room} isFullHeight={fullHeight || li < activeIdx} />
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
                );
              })}
              {flat.stairs.filter((s) => s.levelId === level.id).map((stair) => (
                <Stairs3D key={stair.id} stair={stair} baseY={baseY} />
              ))}
            </group>
          );
        })}

        <ContactShadows position={[layout.cx, 0.002, layout.cz]} opacity={0.35} scale={layout.span * 2.4} blur={1.8} far={layout.span} />
        <OrbitControls
          target={[layout.cx, 0.3 + activeIdx * floorH, layout.cz]}
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={2}
          maxDistance={80}
          enableDamping
        />
      </Canvas>
      <div className={styles.view3dControls}>
        <Button variant="secondary" size="small" icon={<Eye size={12} />} onClick={() => setFullHeight((v) => !v)}>
          {fullHeight ? 'Cutaway walls' : 'Full-height walls'}
        </Button>
      </div>
      <div className={styles.view3dHint}>Left-drag to orbit · right-drag to pan · scroll to zoom · floors above the selected one are hidden</div>
    </div>
  );
}
