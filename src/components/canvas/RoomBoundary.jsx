import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRoomStore } from '../../store/roomStore.js';
import { clampMoveOpening, clampResizeEnd, clampResizeStart } from '../../engine/openings.js';

/**
 * RoomBoundary.jsx
 * Architectural wall boundaries, door swings, and window mullions.
 * Features the single orchestrated SVG blueprint stroke-draw-in entrance animation.
 * Heavy architectural perimeter walls, interactive draggable/resizable doors and windows.
 * 
 * Visual Hierarchy: Wall outline (3.2px) > Furniture (1.5px) > Grid (0.4px).
 */
export function RoomBoundary({ room, svgRef }) {
  const isInitialAnimationDone = useRoomStore((state) => state.isInitialAnimationDone);
  const setInitialAnimationDone = useRoomStore((state) => state.setInitialAnimationDone);
  const updateOpening = useRoomStore((state) => state.updateOpening);

  const { widthCm, depthCm, doors = [], windows = [] } = room;
  const wallThickness = 16; // cm

  const [activeOpeningId, setActiveOpeningId] = useState(null);
  const [hoveredOpeningId, setHoveredOpeningId] = useState(null);

  // SVG path for outer wall perimeter
  const wallPath = `M 0 0 L ${widthCm} 0 L ${widthCm} ${depthCm} L 0 ${depthCm} Z`;

  useEffect(() => {
    if (!isInitialAnimationDone) {
      const timer = setTimeout(() => {
        setInitialAnimationDone(true);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [isInitialAnimationDone, setInitialAnimationDone]);

  // Framer motion variants for blueprint stroke-draw-in
  const strokeVariants = {
    initial: { pathLength: 0, opacity: 0.2 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.3 },
      },
    },
  };

  // Helper to get pointer position in SVG cm coordinates
  const getSvgPoint = (clientX, clientY) => {
    if (!svgRef?.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  // Handle dragging an opening along its wall
  const handleStartMove = (e, type, item, wallLength) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveOpeningId(item.id);

    const startPt = getSvgPoint(e.clientX, e.clientY);
    const startOffset = item.offsetCm;
    const isHorizontal = !item.wall || item.wall === 'top' || item.wall === 'bottom';
    const preMoveSnapshot = useRoomStore.getState().getCurrentSnapshot();

    const onPointerMove = (moveEvt) => {
      const currentPt = getSvgPoint(moveEvt.clientX, moveEvt.clientY);
      const delta = isHorizontal ? currentPt.x - startPt.x : currentPt.y - startPt.y;

      const newOffset = clampMoveOpening(type, startOffset, item.widthCm, delta, wallLength);
      updateOpening(type, item.id, { offsetCm: newOffset });
      updateOpening(type, item.id, { offsetCm: newOffset }, false);
    };

    const onPointerUp = () => {
      setActiveOpeningId(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const list = type === 'door' ? useRoomStore.getState().room?.doors : useRoomStore.getState().room?.windows;
      const current = (list || []).find((o) => o.id === item.id);
      if (current && preMoveSnapshot && current.offsetCm !== startOffset) {
        useRoomStore.getState().pushExplicitSnapshot(preMoveSnapshot);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Handle resizing opening width via edge handle
  const handleStartResize = (e, type, item, wallLength, handleSide) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveOpeningId(item.id);

    const startPt = getSvgPoint(e.clientX, e.clientY);
    const startOffset = item.offsetCm;
    const startWidth = item.widthCm;
    const isHorizontal = !item.wall || item.wall === 'top' || item.wall === 'bottom';
    const preResizeSnapshot = useRoomStore.getState().getCurrentSnapshot();

    const onPointerMove = (moveEvt) => {
      const currentPt = getSvgPoint(moveEvt.clientX, moveEvt.clientY);
      const delta = isHorizontal ? currentPt.x - startPt.x : currentPt.y - startPt.y;

      if (handleSide === 'end') {
        const clampedW = clampResizeEnd(type, startOffset, startWidth + delta, wallLength);
        updateOpening(type, item.id, { widthCm: clampedW });
        updateOpening(type, item.id, { widthCm: clampedW }, false);
      } else {
        const res = clampResizeStart(type, startOffset, startWidth, startOffset + delta, wallLength);
        updateOpening(type, item.id, { offsetCm: res.offsetCm, widthCm: res.widthCm });
        updateOpening(type, item.id, { offsetCm: res.offsetCm, widthCm: res.widthCm }, false);
      }
    };

    const onPointerUp = () => {
      setActiveOpeningId(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const list = type === 'door' ? useRoomStore.getState().room?.doors : useRoomStore.getState().room?.windows;
      const current = (list || []).find((o) => o.id === item.id);
      if (current && preResizeSnapshot && (current.widthCm !== startWidth || current.offsetCm !== startOffset)) {
        useRoomStore.getState().pushExplicitSnapshot(preResizeSnapshot);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <g className="room-boundary">
      {/* Floor background fill */}
      <rect
        x={0}
        y={0}
        width={widthCm}
        height={depthCm}
        fill="var(--color-linen)"
      />

      {/* Heavy Architectural Perimeter Wall (Basalt poche core) */}
      <motion.path
        d={wallPath}
        fill="none"
        stroke="#332B25"
        strokeWidth={wallThickness}
        strokeLinejoin="miter"
        initial={!isInitialAnimationDone ? 'initial' : false}
        animate={!isInitialAnimationDone ? 'animate' : false}
        variants={strokeVariants}
      />

      {/* High-contrast inner wall baseline (Carbon Drafting Ink) */}
      <rect
        x={0}
        y={0}
        width={widthCm}
        height={depthCm}
        fill="none"
        stroke="#141210"
        strokeWidth="3.2"
      />

      {/* ======================================================== */}
      {/* INTERACTIVE WINDOWS */}
      {/* ======================================================== */}
      {windows.map((win) => {
        const wall = win.wall || 'top';
        const isHorizontal = wall === 'top' || wall === 'bottom';
        const wallLen = isHorizontal ? widthCm : depthCm;
        const winOffset = Number.isFinite(win.offsetCm) ? win.offsetCm : Math.round(wallLen / 2 - 60);
        const winWidth = Number.isFinite(win.widthCm) ? win.widthCm : 120;
        const wx = isHorizontal ? winOffset : (wall === 'left' ? -wallThickness / 2 : widthCm - wallThickness / 2);
        const wy = isHorizontal ? (wall === 'top' ? -wallThickness / 2 : depthCm - wallThickness / 2) : winOffset;
        const ww = isHorizontal ? winWidth : wallThickness;
        const wh = isHorizontal ? wallThickness : winWidth;

        const isHovered = hoveredOpeningId === win.id;
        const isActive = activeOpeningId === win.id;

        return (
          <g
            key={win.id}
            className="interactive-window"
            onPointerEnter={() => setHoveredOpeningId(win.id)}
            onPointerLeave={() => setHoveredOpeningId(null)}
          >
            {/* Wall Cutout (clears heavy wall perimeter and inner baseline) */}
            <rect
              x={wx - 1}
              y={wy - 1}
              width={ww + 2}
              height={wh + 2}
              fill="var(--color-linen)"
            />

            {/* Draggable Window Body */}
            <g
              style={{ cursor: isHorizontal ? 'ew-resize' : 'ns-resize' }}
              onPointerDown={(e) => handleStartMove(e, 'window', win, wallLen)}
            >
              {/* Active / hover halo */}
              {(isHovered || isActive) && (
                <rect
                  x={wx - 2}
                  y={wy - 2}
                  width={ww + 4}
                  height={wh + 4}
                  fill="none"
                  stroke="var(--color-clay)"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Glass background fill (Architectural indigo steel glaze) */}
              <rect
                x={wx}
                y={wy}
                width={ww}
                height={wh}
                fill="rgba(90, 115, 142, 0.16)"
              />

              {/* Architectural Window Jambs (heavy masonry endcaps) */}
              {isHorizontal ? (
                <>
                  <line x1={wx} y1={wy} x2={wx} y2={wy + wh} stroke="#141210" strokeWidth="2.5" />
                  <line x1={wx + ww} y1={wy} x2={wx + ww} y2={wy + wh} stroke="#141210" strokeWidth="2.5" />
                </>
              ) : (
                <>
                  <line x1={wx} y1={wy} x2={wx + ww} y2={wy} stroke="#141210" strokeWidth="2.5" />
                  <line x1={wx} y1={wy + wh} x2={wx + ww} y2={wy + wh} stroke="#141210" strokeWidth="2.5" />
                </>
              )}

              {/* Outer Sill Line (Patan Brass architectural projection) */}
              {wall === 'top' && (
                <line x1={wx - 4} y1={wy} x2={wx + ww + 4} y2={wy} stroke="#A67C43" strokeWidth="2" />
              )}
              {wall === 'bottom' && (
                <line x1={wx - 4} y1={wy + wh} x2={wx + ww + 4} y2={wy + wh} stroke="#A67C43" strokeWidth="2" />
              )}
              {wall === 'left' && (
                <line x1={wx} y1={wy - 4} x2={wx} y2={wy + wh + 4} stroke="#A67C43" strokeWidth="2" />
              )}
              {wall === 'right' && (
                <line x1={wx + ww} y1={wy - 4} x2={wx + ww} y2={wy + wh + 4} stroke="#A67C43" strokeWidth="2" />
              )}

              {/* Interior Stool Line */}
              {wall === 'top' && (
                <line x1={wx} y1={wy + wh} x2={wx + ww} y2={wy + wh} stroke="#B0A494" strokeWidth="1.2" />
              )}
              {wall === 'bottom' && (
                <line x1={wx} y1={wy} x2={wx + ww} y2={wy} stroke="#B0A494" strokeWidth="1.2" />
              )}
              {wall === 'left' && (
                <line x1={wx + ww} y1={wy} x2={wx + ww} y2={wy + wh} stroke="#B0A494" strokeWidth="1.2" />
              )}
              {wall === 'right' && (
                <line x1={wx} y1={wy} x2={wx} y2={wy + wh} stroke="#B0A494" strokeWidth="1.2" />
              )}

              {/* Double Glass Glazing Lines */}
              {isHorizontal ? (
                <>
                  <line x1={wx} y1={wy + wh * 0.35} x2={wx + ww} y2={wy + wh * 0.35} stroke="#5A738E" strokeWidth="1.2" />
                  <line x1={wx} y1={wy + wh * 0.65} x2={wx + ww} y2={wy + wh * 0.65} stroke="#5A738E" strokeWidth="1.2" />
                  {/* Center mullion sash */}
                  <line x1={wx + ww / 2} y1={wy} x2={wx + ww / 2} y2={wy + wh} stroke="#3D536B" strokeWidth="1.8" />
                </>
              ) : (
                <>
                  <line x1={wx + ww * 0.35} y1={wy} x2={wx + ww * 0.35} y2={wy + wh} stroke="#5A738E" strokeWidth="1.2" />
                  <line x1={wx + ww * 0.65} y1={wy} x2={wx + ww * 0.65} y2={wy + wh} stroke="#5A738E" strokeWidth="1.2" />
                  {/* Center mullion sash */}
                  <line x1={wx} y1={wy + wh / 2} x2={wx + ww} y2={wy + wh / 2} stroke="#3D536B" strokeWidth="1.8" />
                </>
              )}
            </g>

            {/* Left/Start Resize Handle */}
            {(isHovered || isActive) && (
              <rect
                x={isHorizontal ? wx - 3 : wx}
                y={isHorizontal ? wy - 1 : wy - 3}
                width={isHorizontal ? 6 : ww}
                height={isHorizontal ? wh + 2 : 6}
                rx={1}
                fill="var(--color-clay)"
                stroke="#FFFFFF"
                strokeWidth="1"
                style={{ cursor: isHorizontal ? 'ew-resize' : 'ns-resize' }}
                onPointerDown={(e) => handleStartResize(e, 'window', win, wallLen, 'start')}
              />
            )}

            {/* Right/End Resize Handle */}
            {(isHovered || isActive) && (
              <rect
                x={isHorizontal ? wx + ww - 3 : wx}
                y={isHorizontal ? wy - 1 : wy + wh - 3}
                width={isHorizontal ? 6 : ww}
                height={isHorizontal ? wh + 2 : 6}
                rx={1}
                fill="var(--color-clay)"
                stroke="#FFFFFF"
                strokeWidth="1"
                style={{ cursor: isHorizontal ? 'ew-resize' : 'ns-resize' }}
                onPointerDown={(e) => handleStartResize(e, 'window', win, wallLen, 'end')}
              />
            )}

            {/* Dimension Badge */}
            <text
              x={isHorizontal ? wx + ww / 2 : wx + ww + 14}
              y={isHorizontal ? wy - 8 : wy + wh / 2 + 3}
              textAnchor={isHorizontal ? 'middle' : 'start'}
              fill={isActive ? 'var(--color-clay)' : 'var(--color-ink)'}
              fontSize="9.5"
              fontFamily="var(--font-sans)"
              fontWeight="600"
              pointerEvents="none"
            >
              Window {win.widthCm}cm
            </text>
          </g>
        );
      })}

      {/* ======================================================== */}
      {/* INTERACTIVE DOORS */}
      {/* ======================================================== */}
      {doors.map((door) => {
        const wall = door.wall || 'bottom';
        const isHorizontal = wall === 'top' || wall === 'bottom';
        const wallLen = isHorizontal ? widthCm : depthCm;
        const doorOffset = Number.isFinite(door.offsetCm) ? door.offsetCm : Math.round(wallLen / 2 - 45);
        const doorWidth = Number.isFinite(door.widthCm) ? door.widthCm : 90;
        const dx = isHorizontal ? doorOffset : (wall === 'left' ? -wallThickness / 2 : widthCm - wallThickness / 2);
        const dy = isHorizontal ? (wall === 'top' ? -wallThickness / 2 : depthCm - wallThickness / 2) : doorOffset;
        const dw = isHorizontal ? doorWidth : wallThickness;
        const dh = isHorizontal ? wallThickness : doorWidth;

        const isHovered = hoveredOpeningId === door.id;
        const isActive = activeOpeningId === door.id;

        return (
          <g
            key={door.id}
            className="interactive-door"
            onPointerEnter={() => setHoveredOpeningId(door.id)}
            onPointerLeave={() => setHoveredOpeningId(null)}
          >
            {/* Wall Cutout */}
            <rect
              x={dx}
              y={dy}
              width={dw}
              height={dh}
              fill="var(--color-linen)"
            />

            {/* 90-degree Door Swing Arc (Inward vs Outward) */}
            {(() => {
              const isOutward = door.swingDirection === 'outward';

              if (wall === 'bottom') {
                return isOutward ? (
                  <>
                    {/* Outward swing: swings out below the room (towards +Y) */}
                    <path
                      d={`M ${dx} ${depthCm + door.widthCm} A ${door.widthCm} ${door.widthCm} 0 0 0 ${dx + door.widthCm} ${depthCm}`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={dx}
                      y1={depthCm}
                      x2={dx}
                      y2={depthCm + door.widthCm}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <>
                    {/* Inward swing: swings into the room (towards -Y) */}
                    <path
                      d={`M ${dx} ${depthCm - door.widthCm} A ${door.widthCm} ${door.widthCm} 0 0 1 ${dx + door.widthCm} ${depthCm}`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={dx}
                      y1={depthCm}
                      x2={dx}
                      y2={depthCm - door.widthCm}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                );
              }

              if (wall === 'top') {
                return isOutward ? (
                  <>
                    {/* Outward swing: swings out above the room (towards -Y) */}
                    <path
                      d={`M ${dx} ${-door.widthCm} A ${door.widthCm} ${door.widthCm} 0 0 1 ${dx + door.widthCm} 0`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={dx}
                      y1={0}
                      x2={dx}
                      y2={-door.widthCm}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <>
                    {/* Inward swing: swings into the room (towards +Y) */}
                    <path
                      d={`M ${dx} ${door.widthCm} A ${door.widthCm} ${door.widthCm} 0 0 0 ${dx + door.widthCm} 0`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={dx}
                      y1={0}
                      x2={dx}
                      y2={door.widthCm}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                );
              }

              if (wall === 'left') {
                return isOutward ? (
                  <>
                    {/* Outward swing: swings out to the left of the room (towards -X) */}
                    <path
                      d={`M ${-door.widthCm} ${dy} A ${door.widthCm} ${door.widthCm} 0 0 0 0 ${dy + door.widthCm}`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={0}
                      y1={dy}
                      x2={-door.widthCm}
                      y2={dy}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <>
                    {/* Inward swing: swings into the room (towards +X) */}
                    <path
                      d={`M ${door.widthCm} ${dy} A ${door.widthCm} ${door.widthCm} 0 0 1 0 ${dy + door.widthCm}`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={0}
                      y1={dy}
                      x2={door.widthCm}
                      y2={dy}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                );
              }

              if (wall === 'right') {
                return isOutward ? (
                  <>
                    {/* Outward swing: swings out to the right of the room (towards +X) */}
                    <path
                      d={`M ${widthCm + door.widthCm} ${dy} A ${door.widthCm} ${door.widthCm} 0 0 1 ${widthCm} ${dy + door.widthCm}`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={widthCm}
                      y1={dy}
                      x2={widthCm + door.widthCm}
                      y2={dy}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                ) : (
                  <>
                    {/* Inward swing: swings into the room (towards -X) */}
                    <path
                      d={`M ${widthCm - door.widthCm} ${dy} A ${door.widthCm} ${door.widthCm} 0 0 0 ${widthCm} ${dy + door.widthCm}`}
                      fill="none"
                      stroke="#9E8870"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                    <line
                      x1={widthCm}
                      y1={dy}
                      x2={widthCm - door.widthCm}
                      y2={dy}
                      stroke="#2D231B" strokeWidth="2.8" strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </>
                );
              }

              return null;
            })()}

            {/* Draggable Door Body */}
            <g
              style={{ cursor: isHorizontal ? 'ew-resize' : 'ns-resize' }}
              onPointerDown={(e) => handleStartMove(e, 'door', door, wallLen)}
            >
              {(isHovered || isActive) && (
                <rect
                  x={dx - 2}
                  y={dy - 2}
                  width={dw + 4}
                  height={dh + 4}
                  fill="none"
                  stroke="var(--color-clay)"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}
              {/* Door Threshold on wall */}
              <rect
                x={dx}
                y={dy}
                width={dw}
                height={dh}
                fill="#EADCC6"
                stroke="#784A28"
                strokeWidth="1.2"
              />
            </g>

            {/* Left/Start Resize Handle */}
            {(isHovered || isActive) && (
              <rect
                x={isHorizontal ? dx - 3 : dx}
                y={isHorizontal ? dy - 1 : dy - 3}
                width={isHorizontal ? 6 : dw}
                height={isHorizontal ? dh + 2 : 6}
                rx={1}
                fill="var(--color-clay)"
                stroke="#FFFFFF"
                strokeWidth="1"
                style={{ cursor: isHorizontal ? 'ew-resize' : 'ns-resize' }}
                onPointerDown={(e) => handleStartResize(e, 'door', door, wallLen, 'start')}
              />
            )}

            {/* Right/End Resize Handle */}
            {(isHovered || isActive) && (
              <rect
                x={isHorizontal ? dx + dw - 3 : dx}
                y={isHorizontal ? dy - 1 : dy + dh - 3}
                width={isHorizontal ? 6 : dw}
                height={isHorizontal ? dh + 2 : 6}
                rx={1}
                fill="var(--color-clay)"
                stroke="#FFFFFF"
                strokeWidth="1"
                style={{ cursor: isHorizontal ? 'ew-resize' : 'ns-resize' }}
                onPointerDown={(e) => handleStartResize(e, 'door', door, wallLen, 'end')}
              />
            )}

            {/* Dimension Label */}
            {(() => {
              const isOutward = door.swingDirection === 'outward';
              let labelX = isHorizontal ? dx + dw / 2 : dx + dw + 14;
              let labelY = dy + dh / 2 + 3;

              if (wall === 'bottom') {
                labelY = isOutward ? depthCm + door.widthCm + 16 : depthCm + wallThickness + 14;
              } else if (wall === 'top') {
                labelY = isOutward ? -door.widthCm - 12 : -wallThickness - 6;
              } else if (wall === 'left') {
                labelX = isOutward ? -door.widthCm - 10 : dx + dw + 14;
              } else if (wall === 'right') {
                labelX = isOutward ? widthCm + door.widthCm + 14 : dx + dw + 14;
              }

              return (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={isHorizontal ? 'middle' : (wall === 'left' && isOutward ? 'end' : 'start')}
                  fill={isActive ? 'var(--color-clay)' : 'var(--color-ink)'}
                  fontSize="9.5"
                  fontFamily="var(--font-sans)"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  Door {door.widthCm}cm
                </text>
              );
            })()}
          </g>
        );
      })}
    </g>
  );
}
