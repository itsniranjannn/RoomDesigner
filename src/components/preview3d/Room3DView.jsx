import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useRoomStore } from '../../store/roomStore.js';
import { Room3DWalls } from './Room3DWalls.jsx';
import { Furniture3DBox } from './Furniture3DBox.jsx';
import { Button } from '../common/Button.jsx';
import { Eye, RotateCcw } from 'lucide-react';
import styles from './Room3DView.module.css';

/**
 * CameraRig handles smooth camera animation from top-down drafting plane
 * into the 3D angled perspective view, with automatic elevation adjustment
 * between Cutaway (maquette) and Full-Height (architectural perspective) modes.
 */
function CameraRig({ maxDimM, resetTrigger, isFullHeight }) {
  const { camera } = useThree();
  const controlsRef = useRef(null);
  const isTransitioning = useRef(true);
  const transitionTime = useRef(0);

  // Target camera position based on mode:
  // Cutaway: 45° angle at moderate height for maquette view
  // Full-Height: elevated high-angle perspective so all interior furniture is clearly visible
  const targetPos = useMemo(() => {
    const dist = Math.max(4.5, maxDimM * 1.3);
    if (isFullHeight) {
      return new THREE.Vector3(dist * 0.6, dist * 1.45, dist * 0.8);
    }
    return new THREE.Vector3(dist * 0.75, dist * 0.85, dist * 0.9);
  }, [maxDimM, isFullHeight]);

  // Handle reset view button and view mode toggle transitions
  React.useEffect(() => {
    isTransitioning.current = true;
    transitionTime.current = 0;
  }, [resetTrigger, isFullHeight]);

  useFrame((_, delta) => {
    if (isTransitioning.current) {
      transitionTime.current += delta;
      const duration = 0.85;
      const t = Math.min(1, transitionTime.current / duration);

      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(camera.position, targetPos, ease * 0.2);
      const lookTargetY = isFullHeight ? 0.35 : 0.25;
      camera.lookAt(0, lookTargetY, 0);

      if (controlsRef.current) {
        controlsRef.current.target.set(0, lookTargetY, 0);
        controlsRef.current.update();
      }

      if (t >= 1) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minDistance={2}
      maxDistance={40}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

export function Room3DView() {
  const room = useRoomStore((state) => state.room);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const collidingItemIds = useRoomStore((state) => state.collidingItemIds);

  const [isFullHeight, setIsFullHeight] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  if (!room) return null;

  const maxDimM = Math.max(room.widthCm, room.depthCm) / 100;
  const initialCamY = Math.max(5, maxDimM * 1.8);

  return (
    <div className={styles.viewContainer} aria-label="3D room preview">
      <Canvas
        className={styles.canvas3d}
        shadows
        camera={{ position: [0.01, initialCamY, 0.01], fov: 45 }}
        gl={{ antialias: true }}
      >
        {/* Balanced Architectural Studio Lighting */}
        <ambientLight intensity={1.15} color="#FAF7F0" />
        <hemisphereLight groundColor="#E0D5C5" color="#FFFFFF" intensity={0.7} />

        {/* Key Directional Sun Light with acne-free normalBias */}
        <directionalLight
          castShadow
          position={[maxDimM * 1.8, maxDimM * 2.8, maxDimM * 1.8]}
          intensity={1.25}
          color="#FFF8EE"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={maxDimM * 8}
          shadow-camera-left={-maxDimM * 2}
          shadow-camera-right={maxDimM * 2}
          shadow-camera-top={maxDimM * 2}
          shadow-camera-bottom={-maxDimM * 2}
          shadow-bias={0.00005}
          shadow-normalBias={0.04}
        />

        {/* Soft Warm Fill Light 1 */}
        <directionalLight
          position={[-maxDimM * 1.8, maxDimM * 2.2, -maxDimM * 1.8]}
          intensity={0.85}
          color="#F5EFE6"
        />

        {/* Soft Cross Fill Light 2 (Illuminates South & West wall interior faces) */}
        <directionalLight
          position={[maxDimM * 1.8, maxDimM * 1.5, -maxDimM * 1.8]}
          intensity={0.65}
          color="#FAF4EA"
        />

        {/* Room Floor and Architectural Walls (Cutaway or Full-Height) */}
        <Room3DWalls room={room} isFullHeight={isFullHeight} />

        {/* Detailed Architectural 3D Furniture */}
        {(room.placedFurniture || []).map((item) => (
          <Furniture3DBox
            key={item.id}
            item={item}
            roomWidthCm={room.widthCm}
            roomDepthCm={room.depthCm}
            isSelected={selectedItemId === item.id}
            isColliding={collidingItemIds.has(item.id)}
          />
        ))}

        {/* Soft floor contact shadow */}
        <ContactShadows
          position={[0, 0.002, 0]}
          opacity={0.35}
          scale={maxDimM * 2}
          blur={1.8}
          far={maxDimM}
        />

        {/* Camera transition & Orbit navigation */}
        <CameraRig
          maxDimM={maxDimM}
          resetTrigger={resetCounter}
          isFullHeight={isFullHeight}
        />
      </Canvas>

      <div className={styles.hintBadge}>
        Left-click to orbit · Right-click to pan · Scroll to zoom
      </div>

      <div className={styles.controlsOverlay}>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setIsFullHeight(!isFullHeight)}
          icon={<Eye size={12} />}
        >
          {isFullHeight ? 'Cutaway walls' : 'Full-height walls'}
        </Button>
        <Button
          variant="secondary"
          size="small"
          onClick={() => setResetCounter((c) => c + 1)}
          icon={<RotateCcw size={12} />}
        >
          Reset view
        </Button>
      </div>
    </div>
  );
}
