import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFlatStore } from '../../store/flatStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import {
  SPACE_KINDS,
  stairFootprint,
  snapRect,
  canPlace,
  levelObstacles,
  levelIndex,
  clampSpaceSize,
  snapToGrid,
} from '../../engine/flat.js';
import { StairGlyph, StairDefs } from './StairGlyph.jsx';
import styles from './FlatDesigner.module.css';

/** Local frame of a wall: u runs along the wall, v points into the room. */
function wallTransform(wall, space) {
  const { x, y, widthCm: W, depthCm: D } = space;
  switch (wall) {
    case 'top': return (off) => `translate(${x + off} ${y})`;
    case 'left': return (off) => `matrix(0 1 1 0 ${x} ${y + off})`;
    case 'right': return (off) => `matrix(0 1 -1 0 ${x + W} ${y + off})`;
    default: return (off) => `matrix(1 0 0 -1 ${x + off} ${y + D})`;
  }
}

function Openings({ space, room }) {
  if (!room) return null;
  return (
    <g pointerEvents="none">
      {(room.windows || []).map((w) => (
        <g key={w.id} transform={wallTransform(w.wall || 'top', space)(w.offsetCm)}>
          <rect x="0" y="-5" width={w.widthCm} height="10" fill="#DCE9F0" stroke="#22485E" strokeWidth="1.5" />
          <line x1="0" y1="0" x2={w.widthCm} y2="0" stroke="#22485E" strokeWidth="1" />
        </g>
      ))}
      {(room.doors || []).map((d) => (
        <g key={d.id} transform={wallTransform(d.wall || 'bottom', space)(d.offsetCm)}>
          <rect x="0" y="-5" width={d.widthCm} height="10" fill="#F6F2EA" />
          <line x1="0" y1="0" x2="0" y2={d.widthCm} stroke="#7A5B37" strokeWidth="3" />
          <path d={`M ${d.widthCm} 0 A ${d.widthCm} ${d.widthCm} 0 0 1 0 ${d.widthCm}`} fill="none" stroke="#7A5B37" strokeWidth="1.2" strokeDasharray="5 4" />
        </g>
      ))}
    </g>
  );
}

function FurnitureGlyphs({ space, room }) {
  if (!room) return null;
  return (
    <g transform={`translate(${space.x} ${space.y})`} pointerEvents="none">
      {(room.placedFurniture || []).map((item) => {
        const def = resolveItemDef(item);
        if (!def) return null;
        return (
          <rect
            key={item.id}
            x={item.x - def.widthCm / 2}
            y={item.y - def.depthCm / 2}
            width={def.widthCm}
            height={def.depthCm}
            rx="3"
            transform={`rotate(${item.rotationDeg || 0} ${item.x} ${item.y})`}
            fill={def.color || '#8B6F47'}
            fillOpacity="0.85"
            stroke="rgba(26,22,21,0.45)"
            strokeWidth="1"
          />
        );
      })}
    </g>
  );
}

export function FlatPlanCanvas() {
  const flat = useFlatStore((s) => s.flat);
  const rooms = useFlatStore((s) => s.rooms);
  const levelId = useFlatStore((s) => s.levelId);
  const selected = useFlatStore((s) => s.selected);
  const select = useFlatStore((s) => s.select);
  const moveSpace = useFlatStore((s) => s.moveSpace);
  const resizeSpace = useFlatStore((s) => s.resizeSpace);
  const updateStair = useFlatStore((s) => s.updateStair);
  const openSpace = useFlatStore((s) => s.openSpace);

  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { kind, id, rect, valid }
  const [notice, setNotice] = useState(null);

  const idx = flat ? levelIndex(flat, levelId) : 0;
  const spaces = useMemo(() => (flat ? flat.spaces.filter((s) => s.levelId === levelId) : []), [flat, levelId]);
  const stairs = useMemo(() => (flat ? flat.stairs.filter((s) => s.levelId === levelId) : []), [flat, levelId]);
  const below = flat && idx > 0 ? flat.levels[idx - 1].id : null;
  const ghostSpaces = useMemo(() => (flat && below ? flat.spaces.filter((s) => s.levelId === below) : []), [flat, below]);
  const openings = useMemo(() => (flat && below ? flat.stairs.filter((s) => s.levelId === below) : []), [flat, below]);

  const bounds = useMemo(() => {
    let maxX = 600;
    let maxY = 450;
    const all = [
      ...spaces, ...ghostSpaces,
      ...[...stairs, ...openings].map((s) => ({ x: s.x, y: s.y, ...{ widthCm: stairFootprint(s).widthCm, depthCm: stairFootprint(s).depthCm } })),
    ];
    for (const r of all) {
      maxX = Math.max(maxX, r.x + r.widthCm);
      maxY = Math.max(maxY, r.y + r.depthCm);
    }
    return { x: -100, y: -100, width: maxX + 250, height: maxY + 220 };
  }, [spaces, ghostSpaces, stairs, openings]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  // Keyboard: nudge, rotate stairs, escape
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const st = useFlatStore.getState();
      if (!st.selected) return;
      const step = e.shiftKey ? 50 : 10;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (e.key === 'Escape') { st.select(null); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (st.selected.type === 'stair') st.removeStair(st.selected.id);
        else if (window.confirm('Delete this space and everything in it?')) st.removeSpace(st.selected.id);
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && st.selected.type === 'stair') {
        const stair = st.flat.stairs.find((s) => s.id === st.selected.id);
        if (stair) st.updateStair(stair.id, { rotationDeg: (stair.rotationDeg || 0) + 90 });
        return;
      }
      if (!d) return;
      e.preventDefault();
      if (st.selected.type === 'space') {
        const s = st.flat.spaces.find((x) => x.id === st.selected.id);
        if (s) st.moveSpace(s.id, s.x + d[0], s.y + d[1]);
      } else {
        const s = st.flat.stairs.find((x) => x.id === st.selected.id);
        if (s) st.updateStair(s.id, { x: s.x + d[0], y: s.y + d[1] });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!flat) return null;

  const toPoint = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(ctm.inverse());
  };

  // Generic drag: move a space/stair, or resize a space by its corner handle
  const beginDrag = (e, kind, item) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const start = toPoint(e);
    if (!start) return;
    select({ type: kind === 'stair' ? 'stair' : 'space', id: item.id });
    const fp = kind === 'stair' ? stairFootprint(item) : { widthCm: item.widthCm, depthCm: item.depthCm };
    let latest = null;
    let moved = false;

    const onMove = (ev) => {
      const p = toPoint(ev);
      if (!p) return;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      let rect;
      if (kind === 'resize') {
        rect = {
          x: item.x,
          y: item.y,
          widthCm: clampSpaceSize(snapToGrid(item.widthCm + dx)),
          depthCm: clampSpaceSize(snapToGrid(item.depthCm + dy)),
        };
      } else {
        const neighbours = levelObstacles(flat, item.levelId, kind === 'stair' ? { stairId: item.id } : { spaceId: item.id });
        const snapped = snapRect({ x: item.x + dx, y: item.y + dy, widthCm: fp.widthCm, depthCm: fp.depthCm }, neighbours);
        rect = { ...snapped, widthCm: fp.widthCm, depthCm: fp.depthCm };
      }
      const ignore = kind === 'stair' ? { stairId: item.id } : { spaceId: item.id };
      latest = { kind, id: item.id, rect, valid: canPlace(flat, item.levelId, rect, ignore) };
      setDrag(latest);
    };

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag(null);
      if (!moved || !latest) return;
      if (!latest.valid) {
        setNotice('That would overlap another room or staircase.');
        return;
      }
      if (kind === 'resize') await resizeSpace(item.id, latest.rect.widthCm, latest.rect.depthCm);
      else if (kind === 'stair') updateStair(item.id, { x: latest.rect.x, y: latest.rect.y });
      else moveSpace(item.id, latest.rect.x, latest.rect.y);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const rectFor = (space) => {
    if (drag && drag.id === space.id && drag.kind !== 'stair') return { ...space, ...drag.rect };
    return space;
  };

  const fontBase = Math.max(15, bounds.width / 62);
  const handleR = Math.max(9, bounds.width / 100);

  return (
    <div className={styles.canvasWrap}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={() => select(null)}
        role="img"
        aria-label={`Floor plan of ${flat.name}, ${flat.levels[idx]?.name}`}
      >
        <StairDefs />
        <defs>
          <pattern id="flat-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#D5C8B8" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="#F6F2EA" />
        <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="url(#flat-grid)" />

        {/* Floor below, for alignment */}
        {ghostSpaces.map((s) => (
          <rect key={`g-${s.id}`} x={s.x} y={s.y} width={s.widthCm} height={s.depthCm} fill="none" stroke="#B8AE9E" strokeDasharray="10 8" strokeWidth="2" pointerEvents="none" />
        ))}
        {openings.map((s) => <StairGlyph key={`o-${s.id}`} stair={s} ghost />)}

        {spaces.map((space) => {
          const r = rectFor(space);
          const room = rooms[space.roomId];
          const isSel = selected?.type === 'space' && selected.id === space.id;
          const bad = drag && drag.id === space.id && !drag.valid;
          const kind = SPACE_KINDS[space.kind] || SPACE_KINDS.room;
          return (
            <g key={space.id}>
              <g
                onPointerDown={(e) => beginDrag(e, 'space', space)}
                onDoubleClick={(e) => { e.stopPropagation(); openSpace(space.id); }}
                style={{ cursor: 'grab' }}
                role="button"
                aria-label={`${space.name}, ${(r.widthCm / 100).toFixed(1)} by ${(r.depthCm / 100).toFixed(1)} metres. Double-click to open in the room designer.`}
              >
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.widthCm}
                  height={r.depthCm}
                  fill={bad ? '#F0CFCF' : kind.color}
                  stroke={isSel ? '#22485E' : '#1A1615'}
                  strokeWidth={isSel ? 7 : 5}
                />
                <FurnitureGlyphs space={r} room={room} />
                <Openings space={r} room={room} />
                <text x={r.x + r.widthCm / 2} y={r.y + r.depthCm / 2 - fontBase * 0.2} textAnchor="middle" fontSize={fontBase} fontWeight="600" fill="#1A1615" fontFamily="var(--font-serif, serif)" pointerEvents="none" stroke="#F6F2EA" strokeWidth={fontBase * 0.25} paintOrder="stroke">
                  {space.name}
                </text>
                <text x={r.x + r.widthCm / 2} y={r.y + r.depthCm / 2 + fontBase * 0.9} textAnchor="middle" fontSize={fontBase * 0.72} fill="#5C544E" fontFamily="var(--font-mono, monospace)" pointerEvents="none" stroke="#F6F2EA" strokeWidth={fontBase * 0.2} paintOrder="stroke">
                  {(r.widthCm / 100).toFixed(2)} × {(r.depthCm / 100).toFixed(2)} m
                </text>
              </g>
              {isSel && (
                <circle
                  cx={r.x + r.widthCm}
                  cy={r.y + r.depthCm}
                  r={handleR}
                  fill="#22485E"
                  stroke="#fff"
                  strokeWidth="2"
                  style={{ cursor: 'nwse-resize' }}
                  onPointerDown={(e) => beginDrag(e, 'resize', space)}
                  role="button"
                  aria-label="Resize room"
                />
              )}
            </g>
          );
        })}

        {stairs.map((stair) => {
          const isSel = selected?.type === 'stair' && selected.id === stair.id;
          const shown = drag && drag.id === stair.id && drag.kind === 'stair' ? { ...stair, x: drag.rect.x, y: drag.rect.y } : stair;
          return (
            <g
              key={stair.id}
              onPointerDown={(e) => beginDrag(e, 'stair', stair)}
              style={{ cursor: 'grab' }}
              opacity={drag && drag.id === stair.id && !drag.valid ? 0.5 : 1}
              role="button"
              aria-label={`Staircase, ${stair.type}`}
            >
              <StairGlyph stair={shown} selected={isSel} />
            </g>
          );
        })}

        {flat.spaces.length === 0 && flat.stairs.length === 0 && (
          <text x={bounds.width / 2 - 120} y={bounds.height / 2 - 120} textAnchor="middle" fontSize={fontBase * 1.2} fill="#5C544E" fontFamily="var(--font-serif, serif)">
            Add rooms from the left to start your flat
          </text>
        )}
      </svg>
      {notice && <div className={styles.notice} role="alert">{notice}</div>}
    </div>
  );
}
