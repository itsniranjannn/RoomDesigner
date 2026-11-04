import React, { useState } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { moveSpan, resizeSpan, OPENING_LIMITS, isResizable } from '../../engine/openings.js';
import { outlineEdges, pointOnEdge } from '../../engine/roomShape.js';
import cursors from './Cursors.module.css';

const WALL = 16; // cm drawn across a wall
const INK = '#141210';
const POCHE = '#332B25';

const pts = (list) => list.map((p) => `${p.x},${p.y}`).join(' ');

/**
 * Plan view of a room whose floor is not a rectangle (an L-shaped hall, a hall that is
 * open to the dining space, ...). Walls follow the outline edge by edge. An edge with
 * no wall is drawn dashed. Doors and windows sit on edges and slide along them; windows
 * stretch from their end handles, doors keep one standard width.
 */
export function OutlineBoundary({ room, svgRef }) {
  const updateOpening = useRoomStore((state) => state.updateOpening);
  const edges = outlineEdges(room);
  const doors = room.doors || [];
  const windows = room.windows || [];

  const [activeId, setActiveId] = useState(null);
  const [hoverId, setHoverId] = useState(null);

  // Handles keep a usable size on screen at any zoom
  const screenScale = svgRef?.current?.getScreenCTM?.()?.a || 1;
  const handleCm = Math.max(6, 11 / screenScale);

  const getSvgPoint = (clientX, clientY) => {
    const svg = svgRef?.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  const bounds = (item) => {
    const edge = edges[item.edge ?? 0];
    const margin = OPENING_LIMITS.cornerMargin;
    const others = [...doors, ...windows]
      .filter((o) => o.id !== item.id && (o.edge ?? 0) === (item.edge ?? 0))
      .map((o) => ({ start: o.offsetCm, width: o.widthCm }));
    return { lo: margin, hi: (edge?.len ?? 0) - margin, others };
  };

  const startDrag = (e, type, item, mode) => {
    e.stopPropagation();
    e.preventDefault();
    const edge = edges[item.edge ?? 0];
    if (!edge) return;
    setActiveId(item.id);
    const startPt = getSvgPoint(e.clientX, e.clientY);
    const startOffset = item.offsetCm;
    const startWidth = item.widthCm;
    const before = useRoomStore.getState().getCurrentSnapshot();

    const onMove = (ev) => {
      const p = getSvgPoint(ev.clientX, ev.clientY);
      const delta = (p.x - startPt.x) * edge.dx + (p.y - startPt.y) * edge.dy;
      if (mode === 'move') {
        const offsetCm = moveSpan({
          start: startOffset,
          width: startWidth,
          delta,
          ...bounds(item),
        });
        updateOpening(type, item.id, { offsetCm });
      } else {
        const res = resizeSpan({
          side: mode,
          start: startOffset,
          width: startWidth,
          pointer: mode === 'end' ? startOffset + startWidth + delta : startOffset + delta,
          ...bounds(item),
        });
        updateOpening(type, item.id, { offsetCm: res.start, widthCm: res.width });
      }
    };
    const onUp = () => {
      setActiveId(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const list = useRoomStore.getState().room?.[type === 'door' ? 'doors' : 'windows'] || [];
      const now = list.find((o) => o.id === item.id);
      if (now && before && (now.offsetCm !== startOffset || now.widthCm !== startWidth))
        useRoomStore.getState().pushExplicitSnapshot(before);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const gapQuad = (edge, a, b, pad = 1) => [
    pointOnEdge(edge, a, -(WALL / 2 + pad)),
    pointOnEdge(edge, b, -(WALL / 2 + pad)),
    pointOnEdge(edge, b, WALL / 2 + pad),
    pointOnEdge(edge, a, WALL / 2 + pad),
  ];

  const renderWindow = (win) => {
    const edge = edges[win.edge ?? 0];
    if (!edge || edge.open) return null;
    const a = win.offsetCm;
    const b = win.offsetCm + win.widthCm;
    const hot = hoverId === win.id || activeId === win.id;
    const cls = edge.dx !== 0 ? cursors.ewResize : cursors.nsResize;
    const angle = (Math.atan2(edge.dy, edge.dx) * 180) / Math.PI;
    const handle = (side) => {
      const c = pointOnEdge(edge, side === 'start' ? a : b, 0);
      return (
        <g transform={`translate(${c.x} ${c.y}) rotate(${angle})`} key={side}>
          <rect
            x={-handleCm / 2}
            y={-(WALL / 2 + 3)}
            width={handleCm}
            height={WALL + 6}
            rx={1}
            fill="var(--color-clay)"
            stroke="#FFFFFF"
            strokeWidth="1"
            className={cls}
            data-handle={side}
            onPointerDown={(e) => startDrag(e, 'window', win, side)}
          />
        </g>
      );
    };
    const mid = pointOnEdge(edge, (a + b) / 2, -(WALL / 2 + 8));
    return (
      <g
        key={win.id}
        onPointerEnter={() => setHoverId(win.id)}
        onPointerLeave={() => setHoverId(null)}
      >
        <polygon points={pts(gapQuad(edge, a, b))} fill="var(--color-linen)" />
        <g className={cls} onPointerDown={(e) => startDrag(e, 'window', win, 'move')}>
          {hot && (
            <polygon
              points={pts(gapQuad(edge, a, b, 3))}
              fill="none"
              stroke="var(--color-clay)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}
          <polygon points={pts(gapQuad(edge, a, b, 0))} fill="rgba(90, 115, 142, 0.16)" />
          {[a, b].map((t) => {
            const p = pointOnEdge(edge, t, -WALL / 2);
            const q = pointOnEdge(edge, t, WALL / 2);
            return (
              <line key={t} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={INK} strokeWidth="2.5" />
            );
          })}
          {(() => {
            const p = pointOnEdge(edge, a, 0);
            const q = pointOnEdge(edge, b, 0);
            return <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#3D536B" strokeWidth="1.8" />;
          })()}
        </g>
        {hot && isResizable('window') && (
          <>
            {handle('start')}
            {handle('end')}
          </>
        )}
        <text
          x={mid.x}
          y={mid.y}
          textAnchor="middle"
          fill={activeId === win.id ? 'var(--color-clay)' : 'var(--color-ink)'}
          fontSize="9.5"
          fontFamily="var(--font-sans)"
          fontWeight="600"
          pointerEvents="none"
        >
          Window {win.widthCm}cm
        </text>
      </g>
    );
  };

  const renderDoor = (door) => {
    const edge = edges[door.edge ?? 0];
    if (!edge || edge.open) return null;
    const a = door.offsetCm;
    const b = door.offsetCm + door.widthCm;
    const hot = hoverId === door.id || activeId === door.id;
    const cls = edge.dx !== 0 ? cursors.ewResize : cursors.nsResize;
    const outward = door.swingDirection === 'outward';
    const dir = outward ? -1 : 1;
    const hinge = pointOnEdge(edge, a, 0);
    const far = pointOnEdge(edge, b, 0);
    const tip = pointOnEdge(edge, a, dir * door.widthCm);
    // Sweep: from the leaf tip round to the far jamb
    const sweep = outward ? 1 : 0;
    const label = pointOnEdge(edge, (a + b) / 2, dir * (door.widthCm + 12));
    return (
      <g
        key={door.id}
        onPointerEnter={() => setHoverId(door.id)}
        onPointerLeave={() => setHoverId(null)}
      >
        <polygon points={pts(gapQuad(edge, a, b))} fill="var(--color-linen)" />
        <g pointerEvents="none">
          <path
            d={`M ${tip.x} ${tip.y} A ${door.widthCm} ${door.widthCm} 0 0 ${sweep} ${far.x} ${far.y}`}
            fill="none"
            stroke="#784A28"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
          <line x1={hinge.x} y1={hinge.y} x2={tip.x} y2={tip.y} stroke="#784A28" strokeWidth="2" />
        </g>
        <g className={cls} onPointerDown={(e) => startDrag(e, 'door', door, 'move')}>
          {hot && (
            <polygon
              points={pts(gapQuad(edge, a, b, 3))}
              fill="none"
              stroke="var(--color-clay)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}
          <polygon
            points={pts(gapQuad(edge, a, b, 0))}
            fill="#EADCC6"
            stroke="#784A28"
            strokeWidth="1.2"
          />
        </g>
        <text
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fill="var(--color-ink)"
          fontSize="9.5"
          fontFamily="var(--font-sans)"
          fontWeight="600"
          pointerEvents="none"
        >
          Door {door.widthCm}cm
        </text>
      </g>
    );
  };

  return (
    <g className="room-boundary">
      <polygon points={pts(room.outline.map(([x, y]) => ({ x, y })))} fill="var(--color-linen)" />

      {edges.map((e) =>
        e.open ? (
          <line
            key={`o${e.i}`}
            x1={e.p0.x}
            y1={e.p0.y}
            x2={e.p1.x}
            y2={e.p1.y}
            stroke="var(--color-clay)"
            strokeWidth="2.5"
            strokeDasharray="10 7"
            opacity="0.85"
            pointerEvents="none"
          />
        ) : (
          <g key={`w${e.i}`} pointerEvents="none">
            <line
              x1={e.p0.x}
              y1={e.p0.y}
              x2={e.p1.x}
              y2={e.p1.y}
              stroke={POCHE}
              strokeWidth={WALL}
              strokeLinecap="square"
            />
            <line
              x1={e.p0.x}
              y1={e.p0.y}
              x2={e.p1.x}
              y2={e.p1.y}
              stroke={INK}
              strokeWidth="3.2"
              strokeLinecap="square"
            />
          </g>
        )
      )}

      {windows.map(renderWindow)}
      {doors.map(renderDoor)}
    </g>
  );
}
