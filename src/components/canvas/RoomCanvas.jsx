import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { RoomBoundary } from './RoomBoundary.jsx';
import { GridOverlay } from './GridOverlay.jsx';
import { FurniturePiece } from './FurniturePiece.jsx';
import { CollisionLayer } from './CollisionLayer.jsx';
import styles from './RoomCanvas.module.css';

export function RoomCanvas() {
  const room = useRoomStore((state) => state.room);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const deselectItem = useRoomStore((state) => state.deselectItem);
  const addFurniture = useRoomStore((state) => state.addFurniture);
  const removeFurniture = useRoomStore((state) => state.removeFurniture);
  const nudgeFurniture = useRoomStore((state) => state.nudgeFurniture);
  const updateFurnitureRotation = useRoomStore((state) => state.updateFurnitureRotation);
  const collidingItemIds = useRoomStore((state) => state.collidingItemIds);

  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1); // px per cm
  const [isDragOver, setIsDragOver] = useState(false);

  // Compute current screen CTM scale factor (pixels per cm)
  const updateScale = useCallback(() => {
    if (svgRef.current) {
      const ctm = svgRef.current.getScreenCTM();
      if (ctm && ctm.a) {
        setScale(ctm.a);
      }
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale, room?.widthCm, room?.depthCm]);

  // Global keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input field
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (!selectedItemId) return;

      const targetItem = (room?.placedFurniture || []).find((i) => i.id === selectedItemId);
      if (!targetItem) return;

      const step = e.shiftKey ? 10 : 1; // 10cm or 1cm nudge

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          nudgeFurniture(selectedItemId, -step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nudgeFurniture(selectedItemId, step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nudgeFurniture(selectedItemId, 0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nudgeFurniture(selectedItemId, 0, step);
          break;
        case 'r':
        case 'R': {
          e.preventDefault();
          const rotateStep = e.shiftKey ? 45 : 15;
          const currentRot = targetItem.rotationDeg || 0;
          updateFurnitureRotation(selectedItemId, currentRot + rotateStep);
          updateFurnitureRotation(selectedItemId, currentRot + rotateStep, true);
          break;
        }
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          removeFurniture(selectedItemId);
          break;
        case 'Escape':
          e.preventDefault();
          deselectItem();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, room, nudgeFurniture, updateFurnitureRotation, removeFurniture, deselectItem]);

  // Native HTML5 Drag and Drop handlers for dropping catalog items onto canvas
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const furnitureTypeId = e.dataTransfer.getData('text/plain');
    if (!furnitureTypeId || !svgRef.current) return;

    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());

    // p.x and p.y are directly in centimeters in the room's coordinate system
    addFurniture(furnitureTypeId, Math.round(p.x), Math.round(p.y));
  };

  if (!room) return null;

  // Check if any doors swing outward so we expand canvas padding so the arc & label don't get cut off or overlap UI
  const hasOutwardDoors = (room.doors || []).some((d) => d.swingDirection === 'outward');
  const paddingCm = hasOutwardDoors ? 110 : 45;
  const viewBoxMinX = -paddingCm;
  const viewBoxMinY = -paddingCm;
  const viewBoxWidth = room.widthCm + paddingCm * 2;
  const viewBoxHeight = room.depthCm + paddingCm * 2;

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasContainer} ${isDragOver ? styles.dragOver : ''}`}
      onClick={() => deselectItem()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
      role="region"
      aria-label="Room drafting canvas"
    >
      <svg
        ref={svgRef}
        className={styles.svgCanvas}
        viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Subtle resting drop shadow for furniture depth on floor */}
          <filter id="furniture-drop-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="3.5" stdDeviation="3" floodColor="#1C1A17" floodOpacity="0.14" />
          </filter>

          {/* Elevated shadow during drag */}
          <filter id="furniture-lift-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="4" dy="8" stdDeviation="6" floodColor="#1C1A17" floodOpacity="0.24" />
          </filter>
        </defs>

        {/* Drafting Grid */}
        <GridOverlay
          roomWidthCm={room.widthCm}
          roomDepthCm={room.depthCm}
        />

        {/* Walls, Doors, Windows & Stroke-draw-in */}
        <RoomBoundary room={room} svgRef={svgRef} />

        {/* Placed Furniture Items */}
        {(room.placedFurniture || []).map((item) => (
          <FurniturePiece
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            isColliding={collidingItemIds.has(item.id)}
            scale={scale}
            roomWidthCm={room.widthCm}
            roomDepthCm={room.depthCm}
            svgRef={svgRef}
          />
        ))}

        {/* Soft warning pulse on collisions */}
        <CollisionLayer
          placedFurniture={room.placedFurniture || []}
          collidingItemIds={collidingItemIds}
        />
      </svg>

      <div className={styles.canvasEmptyHint}>
        {selectedItemId
          ? 'Use arrow keys to nudge, R to rotate, Delete to remove'
          : 'Drag pieces from catalog or click swatch to place'}
      </div>
    </div>
  );
}
