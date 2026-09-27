import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getFurnitureType } from '../../data/furnitureCatalog.js';
import { useRoomStore } from '../../store/roomStore.js';
import { applySnapping } from '../../engine/snapping.js';
import { normalizeAngle } from '../../engine/geometry.js';
import { ArchitecturalSilhouette } from './ArchitecturalSilhouette.jsx';

export function FurniturePiece({
  item,
  isSelected,
  isColliding,
  scale, // px per cm
  roomWidthCm,
  roomDepthCm,
  svgRef,
}) {
  const selectItem = useRoomStore((state) => state.selectItem);
  const updateFurniturePosition = useRoomStore((state) => state.updateFurniturePosition);
  const updateFurnitureRotation = useRoomStore((state) => state.updateFurnitureRotation);

  const def = getFurnitureType(item.furnitureTypeId);
  const widthCm = def ? def.widthCm : 50;
  const depthCm = def ? def.depthCm : 50;

  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dragStartPos = useRef({ x: item.x, y: item.y });
  const dragPointerStart = useRef({ clientX: 0, clientY: 0 });
  const preDragSnapshot = useRef(null);
  const preRotateSnapshot = useRef(null);
  const rotateStartDeg = useRef(item.rotationDeg || 0);

  // Handle pointer drag with real-time snapping & boundary clamping
  const handlePointerDown = (e) => {
    e.stopPropagation();
    selectItem(item.id);

    if (!svgRef?.current) return;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());

    dragStartPos.current = { x: item.x, y: item.y };
    dragPointerStart.current = { x: p.x, y: p.y };
    preDragSnapshot.current = useRoomStore.getState().getCurrentSnapshot();
    setIsDragging(true);

    const onPointerMove = (moveEvent) => {
      const ctmNow = svg.getScreenCTM();
      if (!ctmNow) return;

      const movePt = svg.createSVGPoint();
      movePt.x = moveEvent.clientX;
      movePt.y = moveEvent.clientY;
      const currentP = movePt.matrixTransform(ctmNow.inverse());

      const rawX = dragStartPos.current.x + (currentP.x - dragPointerStart.current.x);
      const rawY = dragStartPos.current.y + (currentP.y - dragPointerStart.current.y);

      // Snaps to wall and grid AND strictly clamps inside room boundaries
      const snapped = applySnapping(
        {
          x: rawX,
          y: rawY,
          widthCm,
          depthCm,
          rotationDeg: item.rotationDeg || 0,
        },
        roomWidthCm,
        roomDepthCm
      );

      updateFurniturePosition(item.id, snapped.x, snapped.y);
      updateFurniturePosition(item.id, snapped.x, snapped.y, false);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Check if position actually changed from dragStartPos
      const currentPiece = (useRoomStore.getState().room?.placedFurniture || []).find((i) => i.id === item.id);
      if (currentPiece && preDragSnapshot.current) {
        const dx = currentPiece.x - dragStartPos.current.x;
        const dy = currentPiece.y - dragStartPos.current.y;
        if (Math.hypot(dx, dy) > 0.5) {
          useRoomStore.getState().pushExplicitSnapshot(preDragSnapshot.current);
        }
      }
      preDragSnapshot.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Direct rotation handle drag with millimeter-precise SVG coordinates
  const handleRotatePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);
    rotateStartDeg.current = item.rotationDeg || 0;
    preRotateSnapshot.current = useRoomStore.getState().getCurrentSnapshot();

    const onRotateMove = (moveEvent) => {
      if (!svgRef?.current) return;
      const svg = svgRef.current;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;

      const pt = svg.createSVGPoint();
      pt.x = moveEvent.clientX;
      pt.y = moveEvent.clientY;
      const p = pt.matrixTransform(ctm.inverse());

      // Clockwise angle from piece center
      const dx = p.x - item.x;
      const dy = p.y - item.y;

      // 0° is straight up (-dy), 90° is right (+dx)
      let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      angleDeg = normalizeAngle(angleDeg);

      // Snap to 15-degree magnetic intervals unless holding Alt
      if (!moveEvent.altKey) {
        const snapInterval = 15;
        const nearestSnap = Math.round(angleDeg / snapInterval) * snapInterval;
        if (Math.abs(angleDeg - nearestSnap) < 4.5) {
          angleDeg = normalizeAngle(nearestSnap);
        }
      }

      updateFurnitureRotation(item.id, Math.round(angleDeg));
      updateFurnitureRotation(item.id, Math.round(angleDeg), false);
    };

    const onRotateUp = () => {
      setIsRotating(false);
      window.removeEventListener('pointermove', onRotateMove);
      window.removeEventListener('pointerup', onRotateUp);

      const currentPiece = (useRoomStore.getState().room?.placedFurniture || []).find((i) => i.id === item.id);
      if (currentPiece && preRotateSnapshot.current) {
        if (Math.round(currentPiece.rotationDeg || 0) !== Math.round(rotateStartDeg.current)) {
          useRoomStore.getState().pushExplicitSnapshot(preRotateSnapshot.current);
        }
      }
      preRotateSnapshot.current = null;
    };

    window.addEventListener('pointermove', onRotateMove);
    window.addEventListener('pointerup', onRotateUp);
  };

  if (!def) return null;

  const rotation = item.rotationDeg || 0;
  const hw = widthCm / 2;
  const hd = depthCm / 2;

  return (
    <g
      transform={`translate(${item.x}, ${item.y}) rotate(${rotation})`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation();
        selectItem(item.id);
      }}
    >
      <motion.g
        animate={{
          scale: isDragging ? 1.03 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {/* Physical Drop Shadow giving depth to floor */}
        <g filter={isDragging ? 'url(#furniture-lift-shadow)' : 'url(#furniture-drop-shadow)'}>
          <ArchitecturalSilhouette item={def} widthCm={widthCm} depthCm={depthCm} />
        </g>

        {/* Dual-Layer High-Contrast Selection Outline & Precision Crop Brackets */}
        {isSelected && !isColliding && (
          <g className="selection-frame" pointerEvents="none">
            {/* White Under-Stroke Barrier (Guarantees 100% contrast on any dark wall or wood) */}
            <rect
              x={-hw - 2.5}
              y={-hd - 2.5}
              width={widthCm + 5}
              height={depthCm + 5}
              rx={3}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4"
            />
            {/* Crisp Himalayan Cobalt-Indigo Drafting Border */}
            <rect
              x={-hw - 2.5}
              y={-hd - 2.5}
              width={widthCm + 5}
              height={depthCm + 5}
              rx={3}
              fill="rgba(44, 78, 128, 0.04)"
              stroke="#2C4E80"
              strokeWidth="1.8"
            />

            {/* Precision Architectural L-Bracket Corner Crops */}
            <g stroke="#2C4E80" strokeWidth="2.2" strokeLinecap="square">
              {/* Top-Left Crop */}
              <path d={`M ${-hw - 7} ${-hd - 2.5} L ${-hw - 2.5} ${-hd - 2.5} L ${-hw - 2.5} ${-hd - 7}`} fill="none" />
              {/* Top-Right Crop */}
              <path d={`M ${hw + 7} ${-hd - 2.5} L ${hw + 2.5} ${-hd - 2.5} L ${hw + 2.5} ${-hd - 7}`} fill="none" />
              {/* Bottom-Left Crop */}
              <path d={`M ${-hw - 7} ${hd + 2.5} L ${-hw - 2.5} ${hd + 2.5} L ${-hw - 2.5} ${hd + 7}`} fill="none" />
              {/* Bottom-Right Crop */}
              <path d={`M ${hw + 7} ${hd + 2.5} L ${hw + 2.5} ${hd + 2.5} L ${hw + 2.5} ${hd + 7}`} fill="none" />
            </g>
          </g>
        )}

        {/* Direct Rotation Compass Handle (visible when selected) */}
        {isSelected && (
          <g
            className="rotation-handle"
            transform={`translate(0, ${-hd - 24})`}
            onPointerDown={handleRotatePointerDown}
            style={{ cursor: 'crosshair' }}
          >
            {/* White Under-casing for stem */}
            <line
              x1={0}
              y1={24}
              x2={0}
              y2={0}
              stroke="#FFFFFF"
              strokeWidth="4"
            />
            {/* Technical Cobalt Compass Stem */}
            <line
              x1={0}
              y1={24}
              x2={0}
              y2={0}
              stroke="#2C4E80"
              strokeWidth="1.8"
              strokeDasharray="2 2"
            />

            {/* Invisible Large Hit Circle (36px wide hit target) */}
            <circle
              cx={0}
              cy={0}
              r={18}
              fill="transparent"
              pointerEvents="all"
            />

            {/* White under-casing for knob */}
            <circle
              cx={0}
              cy={0}
              r={9}
              fill="#FFFFFF"
            />

            {/* Outer Indigo Compass Ring */}
            <circle
              cx={0}
              cy={0}
              r={8}
              fill="#FAF6EE"
              stroke="#2C4E80"
              strokeWidth="2"
            />

            {/* Patan Brass Precision Core */}
            <circle
              cx={0}
              cy={0}
              r={3.5}
              fill="#C5A059"
            />

            {/* Live Angle Badge while rotating (counter-rotated to stay upright) */}
            {isRotating && (
              <g transform={`translate(0, -22) rotate(${-rotation})`}>
                <rect
                  x={-28}
                  y={-11}
                  width={56}
                  height={22}
                  rx={3}
                  fill="#1C1A17"
                  stroke="#C5A059"
                  strokeWidth="1.2"
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fill="#FAF6EE"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                  letterSpacing="0.04em"
                >
                  {Math.round(rotation)}°
                </text>
              </g>
            )}
          </g>
        )}
      </motion.g>
    </g>
  );
}
