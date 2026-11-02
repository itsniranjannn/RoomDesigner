import React, { useMemo, useState } from 'react';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { getRotatedRectCorners } from '../../engine/geometry.js';
import { getClearanceZones, evaluateClearance, describeIssue } from '../../engine/clearance.js';
import { getWallDistances, distanceCm, formatCm } from '../../engine/measure.js';

const toPoints = (corners) => corners.map((c) => `${c.x},${c.y}`).join(' ');

/** Imported floor-plan photo drawn under the furniture for tracing. */
export function TraceLayer({ room }) {
  const t = room.traceImage;
  if (!t) return null;
  const width = t.widthCm || room.widthCm;
  const height = width / (t.aspect || 1);
  return (
    <image
      href={t.dataUrl}
      x={t.x || 0}
      y={t.y || 0}
      width={width}
      height={height}
      opacity={t.opacity ?? 0.45}
      preserveAspectRatio="none"
      pointerEvents="none"
      aria-hidden="true"
    />
  );
}

/** Door swing / window strips and highlights for pieces that break a clearance rule. */
export function ClearanceLayer({ room }) {
  const zones = useMemo(() => getClearanceZones(room), [room]);
  const issues = useMemo(() => evaluateClearance(room), [room]);
  const flagged = new Set(issues.map((i) => i.itemId));

  return (
    <g pointerEvents="none" aria-hidden="true">
      {zones.map((zone) => (
        <polygon
          key={`${zone.kind}-${zone.openingId}`}
          points={toPoints(zone.corners)}
          fill={zone.kind === 'door' ? 'rgba(34, 72, 94, 0.08)' : 'rgba(196, 151, 70, 0.10)'}
          stroke={zone.kind === 'door' ? '#22485E' : '#C49746'}
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      ))}
      {(room.placedFurniture || []).filter((i) => flagged.has(i.id)).map((item) => {
        const def = resolveItemDef(item);
        if (!def) return null;
        const corners = getRotatedRectCorners(item.x, item.y, def.widthCm, def.depthCm, item.rotationDeg || 0);
        return (
          <g key={item.id}>
            <polygon points={toPoints(corners)} fill="none" stroke="#B26B00" strokeWidth="2.2" strokeDasharray="6 3" />
            <circle cx={item.x} cy={item.y} r="9" fill="#B26B00" />
            <text x={item.x} y={item.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">!</text>
          </g>
        );
      })}
    </g>
  );
}

export function useClearanceIssues(room) {
  return useMemo(() => (room ? evaluateClearance(room) : []), [room]);
}

export { describeIssue };

function DimLine({ x1, y1, x2, y2, value }) {
  if (value < 3) return null;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22485E" strokeWidth="1" strokeDasharray="3 2" />
      <circle cx={x1} cy={y1} r="1.6" fill="#22485E" />
      <circle cx={x2} cy={y2} r="1.6" fill="#22485E" />
      <text
        x={mx}
        y={my - 3}
        textAnchor="middle"
        fontSize="10"
        fontFamily="var(--font-mono, monospace)"
        fill="#22485E"
        stroke="#F6F2EA"
        strokeWidth="3"
        paintOrder="stroke"
      >
        {formatCm(value)}
      </text>
    </g>
  );
}

/** Live distances from the selected piece to each wall. */
export function DimensionLayer({ room, itemId }) {
  const item = (room.placedFurniture || []).find((i) => i.id === itemId);
  const def = resolveItemDef(item);
  if (!item || !def) return null;
  const d = getWallDistances(item, def.widthCm, def.depthCm, room.widthCm, room.depthCm);
  const cx = (d.aabb.minX + d.aabb.maxX) / 2;
  const cy = (d.aabb.minY + d.aabb.maxY) / 2;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <DimLine x1={0} y1={cy} x2={d.aabb.minX} y2={cy} value={d.left} />
      <DimLine x1={d.aabb.maxX} y1={cy} x2={room.widthCm} y2={cy} value={d.right} />
      <DimLine x1={cx} y1={0} x2={cx} y2={d.aabb.minY} value={d.top} />
      <DimLine x1={cx} y1={d.aabb.maxY} x2={cx} y2={room.depthCm} value={d.bottom} />
    </g>
  );
}

function snapPoint(point, room, snapRadius = 8) {
  const candidates = [
    { x: 0, y: 0 },
    { x: room.widthCm, y: 0 },
    { x: 0, y: room.depthCm },
    { x: room.widthCm, y: room.depthCm },
  ];
  for (const item of room.placedFurniture || []) {
    const def = resolveItemDef(item);
    if (!def) continue;
    candidates.push(...getRotatedRectCorners(item.x, item.y, def.widthCm, def.depthCm, item.rotationDeg || 0));
  }
  let best = null;
  let bestDist = snapRadius;
  for (const c of candidates) {
    const dist = distanceCm(point, c);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  if (best) return { x: best.x, y: best.y };
  // Snap to room edges
  const x = Math.abs(point.x) < snapRadius ? 0 : Math.abs(point.x - room.widthCm) < snapRadius ? room.widthCm : point.x;
  const y = Math.abs(point.y) < snapRadius ? 0 : Math.abs(point.y - room.depthCm) < snapRadius ? room.depthCm : point.y;
  return { x, y };
}

/** Click two points to measure; Shift locks to horizontal/vertical. */
export function MeasureLayer({ room, svgRef, bounds, measurements, setMeasurements }) {
  const [start, setStart] = useState(null);
  const [hover, setHover] = useState(null);

  const toRoomPoint = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    let snapped = snapPoint({ x: p.x, y: p.y }, room);
    if (e.shiftKey && start) {
      if (Math.abs(snapped.x - start.x) > Math.abs(snapped.y - start.y)) snapped = { x: snapped.x, y: start.y };
      else snapped = { x: start.x, y: snapped.y };
    }
    return snapped;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    const p = toRoomPoint(e);
    if (!p) return;
    if (!start) {
      setStart(p);
      return;
    }
    if (distanceCm(start, p) > 1) setMeasurements((prev) => [...prev, { a: start, b: p }]);
    setStart(null);
    setHover(null);
  };

  const live = start && hover ? { a: start, b: hover } : null;

  return (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onPointerMove={(e) => setHover(toRoomPoint(e))}
        onClick={handleClick}
        data-testid="measure-surface"
      />
      <g pointerEvents="none">
        {[...measurements, ...(live ? [live] : [])].map((m, i) => {
          const len = distanceCm(m.a, m.b);
          const mx = (m.a.x + m.b.x) / 2;
          const my = (m.a.y + m.b.y) / 2;
          return (
            <g key={i}>
              <line x1={m.a.x} y1={m.a.y} x2={m.b.x} y2={m.b.y} stroke="#8B2635" strokeWidth="1.6" />
              <circle cx={m.a.x} cy={m.a.y} r="3" fill="#8B2635" />
              <circle cx={m.b.x} cy={m.b.y} r="3" fill="#8B2635" />
              <rect x={mx - 26} y={my - 20} width="52" height="16" rx="3" fill="#1A1615" />
              <text x={mx} y={my - 8.5} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono, monospace)" fill="#F6F2EA">
                {formatCm(len)}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}
