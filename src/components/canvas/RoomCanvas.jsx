import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRoomStore } from '../../store/roomStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { getRotatedRectCorners, getAABB } from '../../engine/geometry.js';
import { RoomBoundary } from './RoomBoundary.jsx';
import { GridOverlay } from './GridOverlay.jsx';
import { FurniturePiece } from './FurniturePiece.jsx';
import { CollisionLayer } from './CollisionLayer.jsx';
import { CanvasToolbar } from './CanvasToolbar.jsx';
import {
  TraceLayer,
  ClearanceLayer,
  DimensionLayer,
  MeasureLayer,
  useClearanceIssues,
} from './OverlayLayers.jsx';
import styles from './RoomCanvas.module.css';

const isTyping = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);

export function RoomCanvas() {
  const room = useRoomStore((state) => state.room);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const selectedItemIds = useRoomStore((state) => state.selectedItemIds);
  const deselectItem = useRoomStore((state) => state.deselectItem);
  const selectMany = useRoomStore((state) => state.selectMany);
  const addFurniture = useRoomStore((state) => state.addFurniture);
  const collidingItemIds = useRoomStore((state) => state.collidingItemIds);
  const measureActive = useRoomStore((state) => state.measureActive);
  const showClearance = useRoomStore((state) => state.showClearance);
  const showDimensions = useRoomStore((state) => state.showDimensions);

  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const suppressClick = useRef(false);
  const [scale, setScale] = useState(1); // px per cm
  const [isDragOver, setIsDragOver] = useState(false);
  const [marquee, setMarquee] = useState(null); // { x0, y0, x1, y1 } in cm
  const [measurements, setMeasurements] = useState([]);

  const issues = useClearanceIssues(room);

  const updateScale = useCallback(() => {
    if (svgRef.current) {
      const ctm = svgRef.current.getScreenCTM();
      if (ctm && ctm.a) setScale(ctm.a);
    }
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale, room?.widthCm, room?.depthCm]);

  // Leaving the measure tool or switching rooms clears old measurements
  useEffect(() => {
    if (!measureActive) setMeasurements([]);
  }, [measureActive]);
  useEffect(() => {
    setMeasurements([]);
  }, [room?.id]);

  // Keyboard shortcuts for the drafting canvas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isTyping()) return;
      const state = useRoomStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl) {
        if (key === 'a') { e.preventDefault(); state.selectAll(); }
        else if (key === 'c') { state.copySelection(); }
        else if (key === 'v') { e.preventDefault(); state.pasteClipboard(); }
        else if (key === 'd') { e.preventDefault(); state.duplicateSelection(); }
        return;
      }

      if (e.key === '?') { state.openModal('shortcuts'); return; }
      if (key === 'm' && !e.altKey) { state.toggleMeasure(); return; }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (state.measureActive) state.toggleMeasure();
        else state.deselectItem();
        return;
      }

      const ids = state.selectedItemIds;
      if (ids.length === 0) return;
      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); state.nudgeSelection(-step, 0); break;
        case 'ArrowRight': e.preventDefault(); state.nudgeSelection(step, 0); break;
        case 'ArrowUp': e.preventDefault(); state.nudgeSelection(0, -step); break;
        case 'ArrowDown': e.preventDefault(); state.nudgeSelection(0, step); break;
        case 'r':
        case 'R': {
          e.preventDefault();
          const rotateStep = e.shiftKey ? 45 : 15;
          const items = state.room?.placedFurniture || [];
          ids.forEach((id, index) => {
            const target = items.find((i) => i.id === id);
            if (target) state.updateFurnitureRotation(id, (target.rotationDeg || 0) + rotateStep, index === 0);
          });
          break;
        }
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          state.removeSelection();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const svgPoint = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  // Drag on empty floor to box-select
  const handleSvgPointerDown = (e) => {
    if (measureActive || e.button !== 0) return;
    const start = svgPoint(e);
    if (!start) return;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const baseIds = additive ? useRoomStore.getState().selectedItemIds : [];
    let moved = false;

    const onMove = (ev) => {
      const p = svgPoint(ev);
      if (!p) return;
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 4) return;
      moved = true;
      setMarquee({ x0: start.x, y0: start.y, x1: p.x, y1: p.y });
    };

    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setMarquee(null);
      if (!moved) return;
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);

      const p = svgPoint(ev) || start;
      const minX = Math.min(start.x, p.x);
      const maxX = Math.max(start.x, p.x);
      const minY = Math.min(start.y, p.y);
      const maxY = Math.max(start.y, p.y);
      const hits = (useRoomStore.getState().room?.placedFurniture || [])
        .filter((item) => {
          const def = resolveItemDef(item);
          if (!def) return false;
          const box = getAABB(getRotatedRectCorners(item.x, item.y, def.widthCm, def.depthCm, item.rotationDeg || 0));
          return box.maxX >= minX && box.minX <= maxX && box.maxY >= minY && box.minY <= maxY;
        })
        .map((i) => i.id);
      selectMany(Array.from(new Set([...baseIds, ...hits])));
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

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
    if (!furnitureTypeId) return;
    const p = svgPoint(e);
    if (!p) return;
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

  const selectionCount = selectedItemIds.length;

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasContainer} ${isDragOver ? styles.dragOver : ''}`}
      onClick={() => {
        if (suppressClick.current) return;
        deselectItem();
      }}
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
        onPointerDown={handleSvgPointerDown}
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

        {/* Drafting Plate & Measurement Grid */}
        <GridOverlay
          roomWidthCm={room.widthCm}
          roomDepthCm={room.depthCm}
          viewBoxMinX={viewBoxMinX}
          viewBoxMinY={viewBoxMinY}
          viewBoxWidth={viewBoxWidth}
          viewBoxHeight={viewBoxHeight}
        />

        {/* Animated Room Group with soft cross-dissolve when switching rooms */}
        <motion.g
          key={room.id}
          initial={{ opacity: 0.15 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Walls, Doors, Windows & Stroke-draw-in */}
          <RoomBoundary room={room} svgRef={svgRef} />

          <TraceLayer room={room} />

          {showClearance && <ClearanceLayer room={room} />}

          {/* Placed Furniture Items */}
          {(room.placedFurniture || []).map((item) => (
            <FurniturePiece
              key={item.id}
              item={item}
              isSelected={selectedItemIds.includes(item.id)}
              isPrimary={selectedItemIds.length === 1}
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

          {showDimensions && selectedItemId && selectionCount === 1 && !measureActive && (
            <DimensionLayer room={room} itemId={selectedItemId} />
          )}

          {marquee && (
            <rect
              x={Math.min(marquee.x0, marquee.x1)}
              y={Math.min(marquee.y0, marquee.y1)}
              width={Math.abs(marquee.x1 - marquee.x0)}
              height={Math.abs(marquee.y1 - marquee.y0)}
              fill="rgba(34, 72, 94, 0.10)"
              stroke="#22485E"
              strokeWidth="1"
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}

          {measureActive && (
            <MeasureLayer
              room={room}
              svgRef={svgRef}
              bounds={{ x: viewBoxMinX, y: viewBoxMinY, width: viewBoxWidth, height: viewBoxHeight }}
              measurements={measurements}
              setMeasurements={setMeasurements}
            />
          )}
        </motion.g>
      </svg>

      <CanvasToolbar
        issues={issues}
        measurementCount={measurements.length}
        onClearMeasurements={() => setMeasurements([])}
      />

      <div className={styles.canvasEmptyHint} aria-live="polite">
        {measureActive
          ? 'Measure: click two points · Esc to finish'
          : selectionCount > 1
            ? `${selectionCount} selected · drag to move together · Ctrl+C / Ctrl+V to copy · Delete to remove`
            : selectedItemId
              ? 'Use arrow keys to nudge, R to rotate, Delete to remove · Shift+click to multi-select'
              : 'Drag pieces from catalog, click swatch to place, or drag on the floor to box-select'}
      </div>
    </div>
  );
}
