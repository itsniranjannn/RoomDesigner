import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRoomStore } from '../../store/roomStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { getRotatedRectCorners, getAABB } from '../../engine/geometry.js';
import { RoomBoundary } from './RoomBoundary.jsx';
import { GridOverlay } from './GridOverlay.jsx';
import { FurniturePiece } from './FurniturePiece.jsx';
import { CollisionLayer } from './CollisionLayer.jsx';
import { CanvasToolbar } from './CanvasToolbar.jsx';
import { TraceLayer, ClearanceLayer, DimensionLayer, MeasureLayer } from './OverlayLayers.jsx';
import { PlanningLayer } from './PlanningLayer.jsx';
import { PlanningPanels } from './PlanningPanels.jsx';
import { usePlanChecks } from './usePlanChecks.js';
import {
  crosshairHome,
  crosshairWords,
  isCrosshairKey,
  nudgeCrosshair,
  usePlanningStore,
} from '../../store/planningStore.js';
import { EmptyState } from '../common/EmptyState.jsx';
import { MousePointerClick } from 'lucide-react';
import { drawOrder } from '../../engine/stacking.js';
import { SERVICE_KINDS } from '../../engine/planning.js';
import { distanceCm, formatCm } from '../../engine/measure.js';
import { useMediaQuery } from '../layout/hooks.js';
import styles from './RoomCanvas.module.css';

const isTyping = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
// Scrolling the furniture list is what the arrow keys are for while focus is in it
const inCatalog = () => !!document.activeElement?.closest('[aria-label="Furniture"]');

/**
 * The line under the plan, by what the viewer is pointing with. A phone or tablet has no
 * keys, so it is pointed at the controls on screen instead of at Esc, R and Delete.
 */
const MEASURE_HINTS = {
  mouse:
    'Click two points to measure, or move the crosshair with the arrow keys and press Enter for each point. Press Esc when done.',
  touch: 'Tap two points to measure. Tap Done when you have finished.',
};
const SELECTED_HINTS = {
  mouse: 'Drag to move. Arrow keys nudge, R rotates, Delete removes.',
  touch: 'Drag to move. Open the details panel to turn it or remove it.',
};

export function RoomCanvas({ catalogOpen, onToggleCatalog }) {
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [marquee, setMarquee] = useState(null); // { x0, y0, x1, y1 } in cm
  const [measurements, setMeasurements] = useState([]);
  // The measurement being taken: its first point, set by a click or by Enter on the crosshair
  const [measureStart, setMeasureStart] = useState(null);

  const accessible = usePlanningStore((s) => s.accessible);
  const placing = usePlanningStore((s) => !!s.placeKind);
  const crosshair = usePlanningStore((s) => s.crosshair);
  const checks = usePlanChecks(room, accessible);
  const pointer = useMediaQuery('(pointer: coarse)') ? 'touch' : 'mouse';

  // Leaving the measure tool or switching rooms clears old measurements
  useEffect(() => {
    if (!measureActive) {
      setMeasurements([]);
      setMeasureStart(null);
    }
  }, [measureActive]);
  useEffect(() => {
    setMeasurements([]);
    setMeasureStart(null);
  }, [room?.id]);

  // The crosshair belongs to whichever tool is driving it, so it goes when they do
  useEffect(() => {
    if (!placing && !measureActive) usePlanningStore.getState().clearCrosshair();
  }, [placing, measureActive]);

  // Keyboard shortcuts for the drafting canvas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isTyping()) return;
      const state = useRoomStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl) {
        if (key === 'a') {
          e.preventDefault();
          state.selectAll();
        } else if (key === 'c') {
          state.copySelection();
        } else if (key === 'v') {
          e.preventDefault();
          state.pasteClipboard();
        } else if (key === 'd') {
          e.preventDefault();
          state.duplicateSelection();
        }
        return;
      }

      // Planning tools: Esc steps back out of placing or a selected point, Delete and R act on it
      const plan = usePlanningStore.getState();
      if (e.key === 'Escape' && plan.escape()) {
        e.preventDefault();
        return;
      }
      if (plan.selectedServiceId && state.selectedItemIds.length === 0) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          state.removeService(plan.selectedServiceId);
          plan.clearServiceSelection();
          return;
        }
        if (key === 'r') {
          e.preventDefault();
          state.rotateService(plan.selectedServiceId);
          return;
        }
      }

      if (e.key === '?') {
        state.openModal('shortcuts');
        return;
      }
      if (key === 'm' && !e.altKey) {
        state.toggleMeasure();
        return;
      }
      if (e.key === 'Escape') {
        // With nothing to cancel the key is left alone, so the app can step back out of a room
        if (!state.measureActive && state.selectedItemIds.length === 0) return;
        e.preventDefault();
        if (state.measureActive) state.toggleMeasure();
        else state.deselectItem();
        return;
      }

      const ids = state.selectedItemIds;
      if (ids.length === 0) return;
      const step = e.shiftKey ? 10 : 1;
      // The arrows scroll the furniture list while focus is in it: nudging would steal them
      if (inCatalog() && isCrosshairKey(e.key)) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          state.nudgeSelection(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          state.nudgeSelection(step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          state.nudgeSelection(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          state.nudgeSelection(0, step);
          break;
        case 'r':
        case 'R': {
          e.preventDefault();
          const rotateStep = e.shiftKey ? 45 : 15;
          const items = state.room?.placedFurniture || [];
          ids.forEach((id, index) => {
            const target = items.find((i) => i.id === id);
            if (target)
              state.updateFurnitureRotation(
                id,
                (target.rotationDeg || 0) + rotateStep,
                index === 0
              );
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

  // Starting a tool that needs a point on the plan hands the plan the keyboard, so the arrow
  // keys and Enter reach it without hunting for the plan region with Tab first
  useEffect(() => {
    if (placing || measureActive) containerRef.current?.focus({ preventScroll: true });
  }, [placing, measureActive]);

  // ---------- the keyboard crosshair ----------
  // The surfaces that take a point are transparent SVG rectangles with pointer handlers, so
  // without this there is no way to say "here" with a keyboard.
  const crosshairBounds = {
    minX: 0,
    minY: 0,
    maxX: room?.widthCm || 0,
    maxY: room?.depthCm || 0,
  };

  const nextStepWords = () => {
    const kind = usePlanningStore.getState().placeKind;
    if (kind) return `Press Enter to place the ${SERVICE_KINDS[kind].label.toLowerCase()}.`;
    return measureStart ? 'Press Enter for the second point.' : 'Press Enter for the first point.';
  };

  /** Enter while a service kind is being placed: mark the point and say where it landed. */
  const placeServiceAt = (at) => {
    const plan = usePlanningStore.getState();
    const kind = plan.placeKind;
    const label = SERVICE_KINDS[kind]?.label || 'point';
    const id = useRoomStore.getState().addService(kind, at.x, at.y);
    if (!id) {
      plan.sayCrosshair(
        `The ${label.toLowerCase()} would not go there. Move the crosshair and press Enter again.`
      );
      return;
    }
    const placed = (useRoomStore.getState().room?.services || []).find((s) => s.id === id) || at;
    usePlanningStore.setState({ selectedServiceId: id });
    plan.sayCrosshair(
      `${label} placed at ${crosshairWords(placed)}. Enter places another, Esc finishes.`
    );
  };

  /** Enter while measuring: the first Enter sets one end of the line, the second the other. */
  const measureAt = (at) => {
    const plan = usePlanningStore.getState();
    if (!measureStart) {
      setMeasureStart(at);
      plan.sayCrosshair(
        `First point at ${crosshairWords(at)}. Move the crosshair and press Enter for the second.`
      );
      return;
    }
    const length = distanceCm(measureStart, at);
    if (length <= 1) {
      plan.sayCrosshair(
        'Both points are in the same spot. Move the crosshair and press Enter again.'
      );
      return;
    }
    setMeasurements((prev) => [...prev, { a: measureStart, b: at }]);
    setMeasureStart(null);
    plan.sayCrosshair(
      `Measured ${formatCm(length)}, from ${crosshairWords(measureStart)} to ${crosshairWords(at)}.`
    );
  };

  const handlePlanKeyDown = (e) => {
    // Only the plan region itself: the toolbar and the panels sit inside it and need their keys
    if (e.target !== e.currentTarget) return;
    if (isTyping() || e.ctrlKey || e.metaKey || e.altKey) return;
    const plan = usePlanningStore.getState();
    if (!plan.placeKind && !measureActive) return;

    if (isCrosshairKey(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      // The first arrow only brings the crosshair out, in the middle of the plan
      const at = plan.crosshair
        ? nudgeCrosshair(plan.crosshair, e.key, e.shiftKey, crosshairBounds)
        : crosshairHome(crosshairBounds);
      plan.setCrosshair(at, `Crosshair at ${crosshairWords(at)}. ${nextStepWords()}`);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!plan.crosshair) {
        const home = crosshairHome(crosshairBounds);
        plan.setCrosshair(home, `Crosshair at ${crosshairWords(home)}. ${nextStepWords()}`);
        return;
      }
      if (plan.placeKind) placeServiceAt(plan.crosshair);
      else measureAt(plan.crosshair);
      return;
    }

    if (e.key === 'Escape' && plan.crosshair) {
      // A half-taken measurement is dropped first, so Esc does not leave the tool too early
      if (measureActive && measureStart) {
        e.preventDefault();
        e.stopPropagation();
        setMeasureStart(null);
        plan.sayCrosshair('Measurement dropped. Enter starts another, Esc finishes.');
        return;
      }
      // The window handler then steps the tool back, exactly as it does for the mouse
      plan.clearCrosshair();
    }
  };

  const svgPoint = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  // Pieces dragged out of the catalog with pointer events (mouse, pen or touch) land here
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onDrop = (e) => {
      const { id, clientX, clientY } = e.detail;
      const p = svgPoint({ clientX, clientY });
      if (p) addFurniture(id, Math.round(p.x), Math.round(p.y));
    };
    el.addEventListener('furniture-drop', onDrop);
    return () => el.removeEventListener('furniture-drop', onDrop);
  }, [addFurniture]);

  // Drag on empty floor to box-select
  const handleSvgPointerDown = (e) => {
    if (measureActive || placing || e.button !== 0) return;
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
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);

      const p = svgPoint(ev) || start;
      const minX = Math.min(start.x, p.x);
      const maxX = Math.max(start.x, p.x);
      const minY = Math.min(start.y, p.y);
      const maxY = Math.max(start.y, p.y);
      const hits = (useRoomStore.getState().room?.placedFurniture || [])
        .filter((item) => {
          const def = resolveItemDef(item);
          if (!def) return false;
          const box = getAABB(
            getRotatedRectCorners(item.x, item.y, def.widthCm, def.depthCm, item.rotationDeg || 0)
          );
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
  const hasOutwardDoors =
    (room.doors || []).some((d) => d.swingDirection === 'outward') ||
    (room.windows || []).some((w) => w.swing === 'outward');
  const paddingCm = hasOutwardDoors ? 110 : 60;
  const viewBoxMinX = -paddingCm;
  const viewBoxMinY = -paddingCm;
  const viewBoxWidth = room.widthCm + paddingCm * 2;
  const viewBoxHeight = room.depthCm + paddingCm * 2;

  const selectionCount = selectedItemIds.length;
  const isEmpty = (room.placedFurniture || []).length === 0;

  return (
    <div
      ref={containerRef}
      data-furniture-drop
      className={`${styles.canvasContainer} ${isDragOver ? styles.dragOver : ''}`}
      onClick={() => {
        if (suppressClick.current) return;
        deselectItem();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handlePlanKeyDown}
      id="room-plan"
      tabIndex={0}
      role="region"
      aria-label="Room plan"
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
            <feDropShadow
              dx="2"
              dy="3.5"
              stdDeviation="3"
              floodColor="#1C1A17"
              floodOpacity="0.14"
            />
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
          {drawOrder(room.placedFurniture || []).map((item) => (
            <FurniturePiece
              key={item.id}
              item={item}
              isSelected={selectedItemIds.includes(item.id)}
              isPrimary={selectedItemIds.length === 1}
              isColliding={collidingItemIds.has(item.id)}
              roomWidthCm={room.widthCm}
              roomDepthCm={room.depthCm}
              roomOutline={room.outline || null}
              svgRef={svgRef}
            />
          ))}

          {/* Soft warning pulse on collisions */}
          <CollisionLayer
            placedFurniture={room.placedFurniture || []}
            collidingItemIds={collidingItemIds}
          />

          <PlanningLayer
            room={room}
            svgRef={svgRef}
            checks={checks}
            bounds={{
              x: viewBoxMinX,
              y: viewBoxMinY,
              width: viewBoxWidth,
              height: viewBoxHeight,
            }}
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
              bounds={{
                x: viewBoxMinX,
                y: viewBoxMinY,
                width: viewBoxWidth,
                height: viewBoxHeight,
              }}
              measurements={measurements}
              setMeasurements={setMeasurements}
              start={measureStart}
              setStart={setMeasureStart}
              keyboardPoint={crosshair}
            />
          )}
        </motion.g>
      </svg>

      <CanvasToolbar
        checks={checks}
        measurementCount={measurements.length}
        onClearMeasurements={() => setMeasurements([])}
        catalogOpen={catalogOpen}
        onToggleCatalog={onToggleCatalog}
      />

      <PlanningPanels checks={checks} />

      {isEmpty && !measureActive && (
        <EmptyState
          icon={<MousePointerClick size={22} aria-hidden="true" />}
          title="Add your first piece"
        >
          Click a piece in the furniture list, or drag it onto the plan.
        </EmptyState>
      )}

      <p
        className={`${styles.hint} ${isEmpty && !measureActive ? styles.hintHidden : ''}`}
        aria-live="polite"
      >
        {measureActive
          ? MEASURE_HINTS[pointer]
          : selectionCount > 1
            ? `${selectionCount} pieces selected. Drag any one to move them together.`
            : selectedItemId
              ? SELECTED_HINTS[pointer]
              : 'Click a piece in the furniture list, or drag it onto the plan.'}
      </p>
    </div>
  );
}
