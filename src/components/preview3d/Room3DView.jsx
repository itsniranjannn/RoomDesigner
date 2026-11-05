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
import { Box, Footprints, RotateCcw, Square } from 'lucide-react';
import { LIGHTING, LIGHT_OPTIONS, SceneLights, FurnitureShadows, LampLights } from './lighting.jsx';
import { MaterialsPanel } from './MaterialsPanel.jsx';
import { StyleButton } from './StylePicker.jsx';
import { styleOfRoom } from '../../data/stylePresets.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { useQuality, useSurfaceMaterials } from './useLook.js';
import { collectLamps } from './lamps.js';
import { normalizeFinish } from './materials.js';
import { WalkControls } from './WalkControls.jsx';
import { WalkHud } from './WalkHud.jsx';
import { SnapshotBridge } from './SnapshotBridge.jsx';
import styles from './Room3DView.module.css';

const WALL_OPTIONS = [
  { value: 'cutaway', label: 'Cutaway', icon: <Square size={15} />, ariaLabel: 'Cutaway walls' },
  { value: 'full', label: 'Full walls', icon: <Box size={15} />, ariaLabel: 'Full-height walls' },
];

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

  // The view the person had before a walkthrough, put back when it ends
  const saved = useRef(null);
  const wasEnabled = useRef(true);
  React.useEffect(() => {
    if (enabled && !wasEnabled.current && saved.current && controlsRef.current) {
      camera.position.copy(saved.current.position);
      controlsRef.current.target.copy(saved.current.target);
      controlsRef.current.update();
      isTransitioning.current = false;
    }
    wasEnabled.current = enabled;
  }, [enabled, camera]);

  useFrame((_, delta) => {
    if (!enabled) return;
    if (!isTransitioning.current && controlsRef.current) {
      saved.current = {
        position: camera.position.clone(),
        target: controlsRef.current.target.clone(),
      };
    }
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
  const quality = useQuality();
  const setRoomFinish = useRoomStore((state) => state.setRoomFinish);
  const applyStyle = useRoomStore((state) => state.applyStyle);
  const resetStyle = useRoomStore((state) => state.resetStyle);
  const finish = normalizeFinish(room?.finish);
  const materials = useSurfaceMaterials(room?.finish);
  const lamps = useMemo(
    () => (room ? collectLamps(room.placedFurniture, room.widthCm, room.depthCm) : []),
    [room]
  );

  const exitWalk = React.useCallback(() => {
    setWalking(false);
  }, []);

  // Pictures, mirrors and curtains hang higher than the low cutaway walls, so they show with full walls
  const showWallPieces = isFullHeight || walking;
  const pieces = useMemo(
    () =>
      (room?.placedFurniture || []).map((item) => ({
        item,
        wall: !!resolveItemDef(item)?.wallMounted,
      })),
    [room]
  );
  const hiddenWallPieces = !showWallPieces && pieces.some((p) => p.wall);

  if (!room) return null;

  const maxDimM = Math.max(room.widthCm, room.depthCm) / 100;
  const initialCamY = Math.max(5, maxDimM * 1.8);

  return (
    <div className={styles.viewContainer} aria-label="3D room preview">
      <Canvas
        key={quality.level}
        className={styles.canvas3d}
        shadows={quality.settings.shadowType}
        dpr={quality.settings.dpr}
        camera={{ position: [0.01, initialCamY, 0.01], fov: 45 }}
        gl={{ antialias: true }}
      >
        <SnapshotBridge />
        {preset.background && <color attach="background" args={[preset.background]} />}

        <SceneLights
          mode={lighting}
          span={maxDimM}
          settings={quality.settings}
          fullLamps={lamps.length > 0}
        />
        <LampLights lamps={lamps} mode={lighting} max={quality.settings.maxLamps} />

        {/* Room Floor and Architectural Walls (Cutaway or Full-Height) */}
        {hasOutline(room) ? (
          <OutlineWalls room={room} isFullHeight={isFullHeight || walking} materials={materials} />
        ) : (
          <Room3DWalls room={room} isFullHeight={isFullHeight || walking} materials={materials} />
        )}

        {/* Detailed Architectural 3D Furniture */}
        {pieces
          .filter((p) => showWallPieces || !p.wall)
          .map(({ item }) => (
            <Furniture3DBox
              key={item.id}
              item={item}
              roomWidthCm={room.widthCm}
              roomDepthCm={room.depthCm}
              isSelected={selectedItemId === item.id}
            />
          ))}

        {/* Soft shadows under furniture: painted halos everywhere, a rendered contact layer on High */}
        <FurnitureShadows
          items={room.placedFurniture}
          roomWidthCm={room.widthCm}
          roomDepthCm={room.depthCm}
          strength={preset.blob}
        />
        {quality.settings.contactShadows && (
          <ContactShadows
            position={[0, 0.002, 0]}
            opacity={preset.contact}
            scale={maxDimM * 2}
            blur={2.4}
            far={Math.min(2.5, maxDimM)}
            resolution={512}
          />
        )}

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
          ? 'Drag to look around. Walk with W A S D (Shift to run); the arrow keys also move and turn. Press Esc to leave.'
          : `Drag to turn the view, right-drag to move it, scroll to zoom.${hiddenWallPieces ? ' Pictures, mirrors and curtains show with Full walls.' : ''}`}
      </p>

      {walking && <WalkHud onExit={exitWalk} />}

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
        <StyleButton
          current={styleOfRoom(room)}
          hasStyle={!!room.styleApplied}
          onPick={(id) => applyStyle(id)}
          onReset={resetStyle}
          buttonClassName={styles.controlBtn}
          textClassName={styles.controlText}
        />
        <MaterialsPanel
          floor={finish.floor}
          wall={finish.wall}
          onFloor={(floor) => setRoomFinish({ floor })}
          onWall={(wall) => setRoomFinish({ wall })}
          quality={quality.mode}
          onQuality={quality.setMode}
          resolvedQuality={quality.level}
          buttonClassName={styles.controlBtn}
          textClassName={styles.controlText}
        />
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
