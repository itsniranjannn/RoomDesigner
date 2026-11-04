import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useRoomStore } from '../../store/roomStore.js';
import { Room3DWalls } from './Room3DWalls.jsx';
import { OutlineWalls } from './OutlineWalls.jsx';
import { hasOutline } from '../../engine/roomShape.js';
import { Furniture3DBox } from './Furniture3DBox.jsx';
import { Button } from '../common/Button.jsx';
import { Segmented } from '../common/Field.jsx';
import { Box, Footprints, RotateCcw, Square, Sun, Sunset, Moon } from 'lucide-react';
import { WalkControls } from './WalkControls.jsx';
import styles from './Room3DView.module.css';

const LIGHT_OPTIONS = [
  { value: 'day', label: 'Day', icon: <Sun size={15} />, ariaLabel: 'Day lighting' },
  { value: 'evening', label: 'Evening', icon: <Sunset size={15} />, ariaLabel: 'Evening lighting' },
  { value: 'night', label: 'Night', icon: <Moon size={15} />, ariaLabel: 'Night lighting' },
];

const WALL_OPTIONS = [
  { value: 'cutaway', label: 'Cutaway', icon: <Square size={15} />, ariaLabel: 'Cutaway walls' },
  { value: 'full', label: 'Full walls', icon: <Box size={15} />, ariaLabel: 'Full-height walls' },
];

const LIGHTING = {
  day: {
    background: null,
    ambient: [1.15, '#FAF7F0'],
    hemi: 0.7,
    sun: [1.25, '#FFF8EE'],
    fill: [0.85, 0.65],
    lamp: 0,
  },
  evening: {
    background: '#E7D2BE',
    ambient: [0.4, '#F0BE92'],
    hemi: 0.25,
    sun: [0.7, '#FF9A55'],
    fill: [0.22, 0.14],
    lamp: 1.1,
  },
  night: {
    background: '#1B2233',
    ambient: [0.16, '#8CA0C8'],
    hemi: 0.1,
    sun: [0.3, '#9DB4E0'],
    fill: [0.08, 0.06],
    lamp: 2.2,
  },
};

/**
 * CameraRig handles smooth camera animation from top-down drafting plane
 * into the 3D angled perspective view, with automatic elevation adjustment
 * between cutaway and full-height wall modes.
 */
function CameraRig({ maxDimM, resetTrigger, isFullHeight, enabled = true }) {
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
    if (!enabled) return;
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
      enabled={enabled}
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

  const [isFullHeight, setIsFullHeight] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);
  const [lighting, setLighting] = useState('day');
  const [walking, setWalking] = useState(false);
  const preset = LIGHTING[lighting];

  const exitWalk = React.useCallback(() => {
    setWalking(false);
    setResetCounter((c) => c + 1);
  }, []);

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
        {preset.background && <color attach="background" args={[preset.background]} />}

        {/* Balanced Architectural Studio Lighting */}
        <ambientLight intensity={preset.ambient[0]} color={preset.ambient[1]} />
        <hemisphereLight groundColor="#E0D5C5" color="#FFFFFF" intensity={preset.hemi} />
        {preset.lamp > 0 && (
          <pointLight
            position={[0, 2.3, 0]}
            intensity={preset.lamp}
            distance={maxDimM * 2.2}
            decay={1.4}
            color="#FFD9A0"
            castShadow
          />
        )}

        {/* Key Directional Sun Light with acne-free normalBias */}
        <directionalLight
          castShadow
          position={[maxDimM * 1.8, maxDimM * 2.8, maxDimM * 1.8]}
          intensity={preset.sun[0]}
          color={preset.sun[1]}
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
          intensity={preset.fill[0]}
          color="#F5EFE6"
        />

        {/* Soft Cross Fill Light 2 (Illuminates South & West wall interior faces) */}
        <directionalLight
          position={[maxDimM * 1.8, maxDimM * 1.5, -maxDimM * 1.8]}
          intensity={preset.fill[1]}
          color="#FAF4EA"
        />

        {/* Room Floor and Architectural Walls (Cutaway or Full-Height) */}
        {hasOutline(room) ? (
          <OutlineWalls room={room} isFullHeight={isFullHeight || walking} />
        ) : (
          <Room3DWalls room={room} isFullHeight={isFullHeight || walking} />
        )}

        {/* Detailed Architectural 3D Furniture */}
        {(room.placedFurniture || []).map((item) => (
          <Furniture3DBox
            key={item.id}
            item={item}
            roomWidthCm={room.widthCm}
            roomDepthCm={room.depthCm}
            isSelected={selectedItemId === item.id}
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
          enabled={!walking}
        />
        {walking && <WalkControls room={room} onExit={exitWalk} />}
      </Canvas>

      <p className={styles.hint} aria-live="polite">
        {walking
          ? 'Drag to look around. Walk with W A S D or the arrow keys. Press Esc to leave.'
          : 'Drag to turn the view, right-drag to move it, scroll to zoom.'}
      </p>

      <div className={styles.controls} role="toolbar" aria-label="3D view controls">
        <Segmented
          ariaLabel="Lighting"
          options={LIGHT_OPTIONS}
          value={lighting}
          onChange={setLighting}
          className={styles.compactSeg}
        />
        {!walking && (
          <>
            <Segmented
              ariaLabel="Walls"
              options={WALL_OPTIONS}
              value={isFullHeight ? 'full' : 'cutaway'}
              onChange={(v) => setIsFullHeight(v === 'full')}
              className={styles.compactSeg}
            />
            <Button
              variant="secondary"
              icon={<RotateCcw size={16} />}
              onClick={() => setResetCounter((c) => c + 1)}
              aria-label="Reset view"
              title="Reset view"
              className={styles.controlBtn}
            >
              <span className={styles.controlText}>Reset view</span>
            </Button>
          </>
        )}
        <Button
          variant={walking ? 'primary' : 'secondary'}
          icon={<Footprints size={16} />}
          onClick={() => (walking ? exitWalk() : setWalking(true))}
          className={walking ? undefined : styles.controlBtn}
          aria-label={walking ? 'Leave walkthrough' : 'Walk through the room'}
          title={walking ? 'Leave walkthrough' : 'Walk through the room'}
        >
          <span className={walking ? undefined : styles.controlText}>
            {walking ? 'Leave walkthrough' : 'Walk through'}
          </span>
        </Button>
      </div>
    </div>
  );
}
