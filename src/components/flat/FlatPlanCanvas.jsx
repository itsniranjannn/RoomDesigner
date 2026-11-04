import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import {
  SPACE_KINDS,
  stairFootprint,
  stairRect,
  levelIndex,
  snapToGrid,
  createStair,
} from '../../engine/flat.js';
import { wallsOf, openingsOf, stairWarnings } from '../../engine/flatPlan.js';
import {
  CELL,
  edgesOf,
  analyzeRuns,
  hitTestEdge,
  wallRunAt,
  edgesToRuns,
  planOpening,
  openingAtPoint,
  wallStretches,
  regionRects,
  regionLabelPoint,
  regionAtPoint,
  orthoEnd,
  clampCoord,
  runEndpoints,
  parseEdge,
  defaultSwing,
  EXTERIOR_THICK_CM,
  INTERIOR_THICK_CM,
} from '../../engine/flatWalls.js';
import {
  clampPassageSize,
  isEditablePassage,
  passageDims,
  passageOrigin,
  passageRect,
  previewPassage,
  snapPassageToWalls,
} from '../../engine/flatPassage.js';
import { StairGlyph, StairDefs } from './StairGlyph.jsx';
import styles from './FlatPlan.module.css';

const EMPTY = [];
const MIN_K = 0.05;
const MAX_K = 3;
const DOOR_W = 90;
const WINDOW_W = 120;

const clampK = (k) => Math.max(MIN_K, Math.min(MAX_K, k));
/** Shortens text so it fits a width in px at roughly charPx per character. */
const fitText = (text, widthPx, charPx) => {
  const max = Math.max(3, Math.floor(widthPx / charPx));
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
};
const fmtM = (cm) => `${(cm / 100).toFixed(2)} m`;

/** Where an opening's gap is drawn: wall thickness at its first edge. */
function thicknessAt(op, analysis) {
  const i = Math.floor(op.start / CELL);
  const line = Math.round(op.line / CELL);
  const key = op.axis === 'h' ? `h${i},${line}` : `v${line},${i}`;
  return analysis.isExteriorEdge(key) ? EXTERIOR_THICK_CM : INTERIOR_THICK_CM;
}

function Opening({ op, thick, swing = 1, selected, hot, ghost, invalid }) {
  const s = swing * (op.flip ? -1 : 1);
  const w = op.widthCm;
  const h = op.axis === 'h';
  const gap = {
    x: h ? op.start : op.line - thick / 2 - 1,
    y: h ? op.line - thick / 2 - 1 : op.start,
    width: h ? w : thick + 2,
    height: h ? thick + 2 : w,
  };
  const cls = [styles.gap, invalid ? styles.gapInvalid : '', hot ? styles.gapHot : '']
    .filter(Boolean)
    .join(' ');
  return (
    <g pointerEvents="none" opacity={ghost ? 0.85 : 1}>
      <rect {...gap} className={cls} />
      {op.type === 'window' ? (
        <g className={styles.windowGlyph}>
          <rect
            x={h ? op.start : op.line - 3}
            y={h ? op.line - 3 : op.start}
            width={h ? w : 6}
            height={h ? 6 : w}
          />
          <line
            x1={h ? op.start : op.line}
            y1={h ? op.line : op.start}
            x2={h ? op.start + w : op.line}
            y2={h ? op.line : op.start + w}
          />
        </g>
      ) : (
        <g className={styles.doorGlyph}>
          {h ? (
            <>
              <line x1={op.start} y1={op.line} x2={op.start} y2={op.line + s * w} />
              <path
                d={`M ${op.start + w} ${op.line} A ${w} ${w} 0 0 ${s > 0 ? 1 : 0} ${op.start} ${op.line + s * w}`}
              />
            </>
          ) : (
            <>
              <line x1={op.line} y1={op.start} x2={op.line + s * w} y2={op.start} />
              <path
                d={`M ${op.line} ${op.start + w} A ${w} ${w} 0 0 ${s > 0 ? 0 : 1} ${op.line + s * w} ${op.start}`}
              />
            </>
          )}
        </g>
      )}
      {selected && <rect {...gap} className={styles.selectBox} />}
    </g>
  );
}

/** Arrow along a passage's long axis, pointing the way it faces. */
function PassageArrow({ rect, heading, px }) {
  const cx = rect.x + rect.widthCm / 2;
  const cy = rect.y + rect.depthCm / 2;
  const horizontal = heading % 180 === 0;
  const sign = heading === 0 || heading === 90 ? 1 : -1;
  const half = Math.max(0, (horizontal ? rect.widthCm : rect.depthCm) / 2 - 18);
  const len = Math.min(half, 60 * Math.max(1, px * 2));
  const head = Math.min(14, len);
  const [dx, dy] = horizontal ? [sign, 0] : [0, sign];
  const tipX = cx + dx * len;
  const tipY = cy + dy * len;
  const tailX = cx - dx * len;
  const tailY = cy - dy * len;
  const bx = tipX - dx * head;
  const by = tipY - dy * head;
  const nx = -dy * head * 0.6;
  const ny = dx * head * 0.6;
  if (len < 8) return null;
  return (
    <g className={styles.passageArrow}>
      <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} />
      <path d={`M ${bx + nx} ${by + ny} L ${tipX} ${tipY} L ${bx - nx} ${by - ny}`} />
    </g>
  );
}

function FurnitureGlyphs({ space, room }) {
  if (!room || !space.furnishable) return null;
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
            className={styles.furniture}
          />
        );
      })}
    </g>
  );
}

function runRects(keys, thick) {
  return edgesToRuns(new Set(keys)).map((r, i) => {
    const h = r.y1 === r.y2;
    return (
      <rect
        key={i}
        x={h ? r.x1 - thick / 2 : r.x1 - thick / 2}
        y={h ? r.y1 - thick / 2 : r.y1 - thick / 2}
        width={h ? r.x2 - r.x1 + thick : thick}
        height={h ? thick : r.y2 - r.y1 + thick}
      />
    );
  });
}

export function FlatPlanCanvas() {
  const flat = useFlatStore((s) => s.flat);
  const flatId = flat?.id;
  const rooms = useFlatStore((s) => s.rooms);
  const levelId = useFlatStore((s) => s.levelId);
  const selected = useFlatStore((s) => s.selected);
  const select = useFlatStore((s) => s.select);
  const openSpace = useFlatStore((s) => s.openSpace);
  const tool = useFlatUi((s) => s.tool);
  const stairType = useFlatUi((s) => s.stairType);
  const stairRotation = useFlatUi((s) => s.stairRotation);
  const passageSpec = useFlatUi((s) => s.passage);
  const cursor = useFlatUi((s) => s.cursor);
  const fitNonce = useFlatUi((s) => s.fitNonce);
  const zoomRequest = useFlatUi((s) => s.zoomRequest);
  const notice = useFlatUi((s) => s.notice);

  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ tx: 0, ty: 0, k: 0.5 });
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const [, setDraftState] = useState(null); // re-renders when the wall being drawn changes
  const draftRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [dragStair, setDragStairState] = useState(null);
  const dragStairRef = useRef(null);
  const setDragStair = useCallback((d) => {
    dragStairRef.current = d;
    setDragStairState(d);
  }, []);
  const [panning, setPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const gesture = useRef(null);
  const autoFit = useRef(true);
  const [fitted, setFitted] = useState(false);

  const setDraft = useCallback((d) => {
    draftRef.current = d;
    setDraftState(d);
  }, []);

  useEffect(() => {
    viewRef.current = view;
    useFlatUi.getState().setZoomPercent(Math.round(view.k * 100));
  }, [view]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // ---------- derived level data ----------
  const idx = flat ? levelIndex(flat, levelId) : 0;
  const runs = useMemo(() => (flat ? wallsOf(flat, levelId) : EMPTY), [flat, levelId]);
  const edges = useMemo(() => edgesOf(runs), [runs]);
  const analysis = useMemo(() => analyzeRuns(runs), [runs]);
  const openings = useMemo(() => (flat ? openingsOf(flat, levelId) : EMPTY), [flat, levelId]);
  const stretches = useMemo(() => wallStretches(edges, analysis.isExteriorEdge), [edges, analysis]);
  const spaces = useMemo(
    () => (flat ? flat.spaces.filter((s) => s.levelId === levelId) : []),
    [flat, levelId]
  );
  const stairs = useMemo(
    () => (flat ? flat.stairs.filter((s) => s.levelId === levelId) : []),
    [flat, levelId]
  );
  const belowId = flat && idx > 0 ? flat.levels[idx - 1].id : null;
  const belowRuns = useMemo(
    () => (flat && belowId ? wallsOf(flat, belowId) : EMPTY),
    [flat, belowId]
  );
  const openingStairs = useMemo(
    () => (flat && belowId ? flat.stairs.filter((s) => s.levelId === belowId) : []),
    [flat, belowId]
  );
  const endpoints = useMemo(() => runEndpoints(runs), [runs]);

  // ---------- view helpers ----------
  const fit = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const st = useFlatStore.getState();
    const fl = st.flat;
    if (!fl) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const take = (x, y) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    for (const lvl of fl.levels)
      for (const r of wallsOf(fl, lvl.id)) {
        take(r.x1, r.y1);
        take(r.x2, r.y2);
      }
    for (const sx of fl.stairs) {
      const r = stairRect(sx);
      take(r.x, r.y);
      take(r.x + r.widthCm, r.y + r.depthCm);
    }
    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 900;
      maxY = 650;
    }
    const pad = 72;
    const bw = Math.max(200, maxX - minX);
    const bh = Math.max(200, maxY - minY);
    const k = clampK(Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 1.2));
    setView({ k, tx: w / 2 - ((minX + maxX) / 2) * k, ty: h / 2 - ((minY + maxY) / 2) * k });
    setFitted(true);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the plan fitted while the stage settles; a manual zoom or pan switches this off
  useEffect(() => {
    autoFit.current = true;
  }, [flatId, fitNonce]);
  useEffect(() => {
    if (flatId && size.w && autoFit.current) fit();
  }, [flatId, size.w, size.h, fitNonce, fit]);

  const zoomAt = useCallback((mx, my, factor) => {
    autoFit.current = false;
    setView((v) => {
      const k = clampK(v.k * factor);
      return { k, tx: mx - ((mx - v.tx) * k) / v.k, ty: my - ((my - v.ty) * k) / v.k };
    });
  }, []);

  useEffect(() => {
    if (!zoomRequest) return;
    const { w, h } = sizeRef.current;
    zoomAt(w / 2, h / 2, zoomRequest.factor);
  }, [zoomRequest, zoomAt]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0016));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt, flat?.id]);

  const toWorld = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (e.clientX - rect.left - v.tx) / v.k,
      y: (e.clientY - rect.top - v.ty) / v.k,
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
    };
  }, []);

  // ---------- keyboard: space to pan, Escape to back out ----------
  useEffect(() => {
    const editing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    const down = (e) => {
      if (editing()) return;
      if (e.code === 'Space' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        setSpaceDown(true);
      }
      if (e.key === 'Escape') {
        if (draftRef.current) {
          setDraft(null);
          setHover(null);
        } else if (useFlatStore.getState().selected) {
          useFlatStore.getState().select(null);
        } else if (useFlatUi.getState().tool !== 'select') {
          useFlatUi.getState().setTool('select');
        }
      }
      if (e.key === 'Enter' && draftRef.current) setDraft(null);
    };
    const up = (e) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [setDraft]);

  // Leaving the wall tool abandons a half-drawn wall
  useEffect(() => {
    if (tool !== 'wall') setDraft(null);
    setHover(null);
  }, [tool, levelId, setDraft]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => useFlatUi.getState().setNotice(null), 2800);
    return () => clearTimeout(t);
  }, [notice]);

  // ---------- snapping ----------
  const snapPoint = (p) => ({ x: clampCoord(p.x), y: clampCoord(p.y) });

  /** Nearest vertex that shares an x or y with a point, for alignment guides. */
  const guidesFor = (pt) => {
    let gx = null;
    let gy = null;
    for (const v of endpoints) {
      if (v.x === pt.x && v.y !== pt.y && (!gx || Math.abs(v.y - pt.y) < Math.abs(gx.y - pt.y)))
        gx = v;
      if (v.y === pt.y && v.x !== pt.x && (!gy || Math.abs(v.x - pt.x) < Math.abs(gy.x - pt.x)))
        gy = v;
    }
    return { gx, gy, onVertex: endpoints.some((v) => v.x === pt.x && v.y === pt.y) };
  };

  const snapStair = (x, y, fp) => {
    const T = 14;
    let nx = snapToGrid(x);
    let ny = snapToGrid(y);
    const guides = [];
    for (const r of runs) {
      if (r.y1 === r.y2) {
        for (const c of [r.y1, r.y1 - fp.depthCm])
          if (Math.abs(c - y) <= T) {
            ny = c;
            guides.push({ axis: 'h', at: r.y1 });
          }
      } else {
        for (const c of [r.x1, r.x1 - fp.widthCm])
          if (Math.abs(c - x) <= T) {
            nx = c;
            guides.push({ axis: 'v', at: r.x1 });
          }
      }
    }
    return { x: Math.max(0, nx), y: Math.max(0, ny), guides };
  };

  const hitTol = Math.max(6, Math.min(26, 10 / view.k));

  const stairDraft = useMemo(() => {
    if (!flat) return null;
    return createStair(flat, { levelId, type: stairType, rotationDeg: stairRotation, x: 0, y: 0 });
  }, [flat, levelId, stairType, stairRotation]);

  /** The passage being placed with its top-left corner snapped to the grid and nearby walls. */
  const passageGhost = (p) => {
    const size = clampPassageSize(passageSpec);
    const spec = { ...size, heading: passageSpec.heading };
    const origin = passageOrigin(p.x, p.y, spec);
    const first = passageRect({ ...origin, ...spec });
    const nudge = snapPassageToWalls(runs, first, Math.max(10, Math.min(40, 18 / view.k)));
    const x = Math.max(0, origin.x + nudge.dx);
    const y = Math.max(0, origin.y + nudge.dy);
    return {
      type: 'passage',
      spec: { ...spec, x, y },
      plan: previewPassage(flat, levelId, { ...spec, x, y }),
    };
  };

  // ---------- pointer handling ----------
  const computeHover = (p) => {
    const sp = snapPoint(p);
    if (tool === 'wall') {
      const d = draftRef.current;
      if (d) {
        const end = orthoEnd(d.sx, d.sy, p.x, p.y);
        return { type: 'wall', ...d, ex: end.x, ey: end.y, guides: guidesFor(end) };
      }
      return { type: 'point', x: sp.x, y: sp.y, guides: guidesFor(sp) };
    }
    if (tool === 'eraser') {
      const key = hitTestEdge(edges, p.x, p.y, hitTol);
      return key ? { type: 'erase', key, keys: wallRunAt(edges, key) } : null;
    }
    if (tool === 'door' || tool === 'window') {
      const existing = openingAtPoint(openings, p.x, p.y, hitTol + 4);
      if (existing && existing.type === tool) return { type: 'remove-opening', op: existing };
      const plan = planOpening(edges, openings, {
        type: tool,
        x: p.x,
        y: p.y,
        widthCm: tool === 'door' ? DOOR_W : WINDOW_W,
        tolCm: hitTol,
      });
      return plan ? { type: 'opening', plan } : null;
    }
    if (tool === 'passage') return passageGhost(p);
    if (tool === 'stairs' && stairDraft) {
      const fp = stairFootprint(stairDraft);
      const snapped = snapStair(p.x - fp.widthCm / 2, p.y - fp.depthCm / 2, fp);
      const stair = { ...stairDraft, x: snapped.x, y: snapped.y };
      return { type: 'stair', stair, guides: snapped.guides, warnings: stairWarnings(flat, stair) };
    }
    return null;
  };

  const onPointerMove = (e) => {
    if (!flat) return;
    const p = toWorld(e);
    useFlatUi.getState().setCursor({ x: p.x, y: p.y });
    const g = gesture.current;
    if (g?.type === 'pan') {
      setView({ ...g.view, tx: g.view.tx + (p.sx - g.sx), ty: g.view.ty + (p.sy - g.sy) });
      g.moved = true;
      if (Math.hypot(p.sx - g.sx, p.sy - g.sy) > 3) autoFit.current = false;
      return;
    }
    if (g?.type === 'stair') {
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      if (!g.moved && Math.hypot(dx, dy) * viewRef.current.k < 4) return;
      g.moved = true;
      const fp = stairFootprint(g.stair);
      const snapped = snapStair(g.stair.x + dx, g.stair.y + dy, fp);
      setDragStair({ id: g.stair.id, x: snapped.x, y: snapped.y, guides: snapped.guides });
      return;
    }
    if (g?.type === 'wall-drag') {
      const d = draftRef.current;
      if (d)
        setDraft({
          ...d,
          ex: orthoEnd(d.sx, d.sy, p.x, p.y).x,
          ey: orthoEnd(d.sx, d.sy, p.x, p.y).y,
        });
    }
    setHover(computeHover(p));
  };

  const finishWall = (d) => {
    if (d && (d.ex !== d.sx || d.ey !== d.sy))
      useFlatStore.getState().addWall(d.sx, d.sy, d.ex, d.ey);
    setHover(null);
  };

  const onPointerDown = (e) => {
    if (!flat) return;
    svgRef.current.focus({ preventScroll: true });
    const p = toWorld(e);
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      svgRef.current.setPointerCapture(e.pointerId);
      gesture.current = { type: 'pan', sx: p.sx, sy: p.sy, view: viewRef.current, moved: false };
      autoFit.current = false;
      setPanning(true);
      return;
    }
    if (e.button === 2) {
      setDraft(null);
      return;
    }
    if (e.button !== 0) return;
    svgRef.current.setPointerCapture(e.pointerId);

    if (tool === 'wall') {
      const sp = snapPoint(p);
      const d = draftRef.current;
      if (d && d.mode === 'click') {
        const end = orthoEnd(d.sx, d.sy, p.x, p.y);
        if (end.x === d.sx && end.y === d.sy) {
          setDraft(null);
        } else {
          finishWall({ ...d, ex: end.x, ey: end.y });
          setDraft({ sx: end.x, sy: end.y, ex: end.x, ey: end.y, mode: 'click' });
        }
        return;
      }
      setDraft({ sx: sp.x, sy: sp.y, ex: sp.x, ey: sp.y, mode: 'drag' });
      gesture.current = { type: 'wall-drag' };
      return;
    }

    if (tool === 'eraser') {
      const key = hitTestEdge(edges, p.x, p.y, hitTol);
      if (key) useFlatStore.getState().eraseWall(key);
      setHover(null);
      return;
    }

    if (tool === 'door' || tool === 'window') {
      const h = computeHover(p);
      if (h?.type === 'remove-opening') {
        useFlatStore.getState().removeOpening(h.op.id);
      } else if (h?.type === 'opening') {
        if (h.plan.valid) useFlatStore.getState().placeOpening(h.plan.op);
        else useFlatUi.getState().setNotice(h.plan.reason);
      } else {
        useFlatUi.getState().setNotice('Click on a wall to place a ' + tool + '.');
      }
      setHover(null);
      return;
    }

    if (tool === 'passage') {
      const h = computeHover(p);
      if (h?.type !== 'passage') return;
      if (!h.plan.valid) {
        useFlatUi.getState().setNotice(h.plan.reason);
        return;
      }
      const res = useFlatStore.getState().placePassage(h.spec);
      if (res.error) {
        useFlatUi.getState().setNotice(res.error);
        return;
      }
      useFlatUi.getState().setTool('select');
      if (!res.connected)
        useFlatUi.getState().setNotice('Passage added. Use the Door tool to open it onto a room.');
      setHover(null);
      return;
    }

    if (tool === 'stairs') {
      const h = computeHover(p);
      if (h?.type === 'stair') {
        useFlatStore.getState().addStair(h.stair.type, h.stair.x, h.stair.y, h.stair.rotationDeg);
        useFlatUi.getState().setTool('select');
      }
      return;
    }

    // Select tool: openings, then stairs, then walls, then rooms
    const op = openingAtPoint(openings, p.x, p.y, hitTol + 4);
    if (op) {
      select({ type: 'opening', id: op.id });
      return;
    }
    const stair = [...stairs].reverse().find((st) => {
      const r = stairRect(st);
      return p.x >= r.x && p.x <= r.x + r.widthCm && p.y >= r.y && p.y <= r.y + r.depthCm;
    });
    if (stair) {
      select({ type: 'stair', id: stair.id });
      gesture.current = { type: 'stair', stair, x: p.x, y: p.y, moved: false };
      return;
    }
    const key = hitTestEdge(edges, p.x, p.y, hitTol);
    if (key) {
      select({ type: 'wall', id: key });
      return;
    }
    const region = regionAtPoint(analysis, p.x, p.y);
    if (region && spaces[region.index]) {
      select({ type: 'space', id: spaces[region.index].id });
      return;
    }
    gesture.current = {
      type: 'pan',
      sx: p.sx,
      sy: p.sy,
      view: viewRef.current,
      moved: false,
      background: true,
    };
  };

  const onPointerUp = (e) => {
    const g = gesture.current;
    gesture.current = null;
    if (svgRef.current?.hasPointerCapture?.(e.pointerId))
      svgRef.current.releasePointerCapture(e.pointerId);
    setPanning(false);
    if (!g) return;
    if (g.type === 'pan' && g.background && !g.moved) select(null);
    const dropped = dragStairRef.current;
    if (g.type === 'stair' && g.moved && dropped) {
      useFlatStore.getState().updateStair(g.stair.id, { x: dropped.x, y: dropped.y });
    }
    setDragStair(null);
    if (g.type === 'wall-drag') {
      const d = draftRef.current;
      if (d && (d.ex !== d.sx || d.ey !== d.sy)) {
        finishWall(d);
        setDraft(null);
      } else if (d) {
        setDraft({ ...d, mode: 'click' });
      }
    }
  };

  const onDoubleClick = (e) => {
    if (tool !== 'select') return;
    const p = toWorld(e);
    const region = regionAtPoint(analysis, p.x, p.y);
    const space = region && spaces[region.index];
    if (space?.furnishable) openSpace(space.id);
  };

  const onPointerLeave = () => {
    useFlatUi.getState().setCursor(null);
    if (!gesture.current) setHover(null);
  };

  const k = view.k;
  const px = 1 / k;
  const toScreen = (x, y) => [x * k + view.tx, y * k + view.ty];

  // ---------- layers ----------
  const planLayer = useMemo(() => {
    if (!flat) return null;
    const selWall = selected?.type === 'wall' ? wallRunAt(edges, selected.id) : [];
    const selSpaceId = selected?.type === 'space' ? selected.id : null;
    return (
      <>
        {belowRuns.length > 0 && (
          <g className={styles.belowWalls} pointerEvents="none">
            {edgesToRuns(edgesOf(belowRuns)).map((r, i) => (
              <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
            ))}
          </g>
        )}
        {openingStairs.map((s) => (
          <StairGlyph key={`o-${s.id}`} stair={s} ghost />
        ))}
        {spaces.map((space) => (
          <g key={space.id}>
            {regionRects(space).map((r, i) => (
              <rect
                key={i}
                x={r.x}
                y={r.y}
                width={r.widthCm}
                height={r.depthCm}
                fill={(SPACE_KINDS[space.kind] || SPACE_KINDS.room).color}
                className={space.id === selSpaceId ? styles.roomSelected : styles.room}
              />
            ))}
            {space.id === selSpaceId &&
              regionRects(space).map((r, i) => (
                <rect
                  key={`t${i}`}
                  x={r.x}
                  y={r.y}
                  width={r.widthCm}
                  height={r.depthCm}
                  className={styles.roomTint}
                  pointerEvents="none"
                />
              ))}
            {space.id === selSpaceId && isEditablePassage(space) && (
              <PassageArrow rect={space} heading={passageDims(space).heading} px={1} />
            )}
            <FurnitureGlyphs space={space} room={rooms[space.roomId]} />
          </g>
        ))}
        <g className={styles.wall}>
          {stretches.map((s, i) =>
            s.axis === 'h' ? (
              <rect
                key={i}
                x={s.from - s.thick / 2}
                y={s.line - s.thick / 2}
                width={s.to - s.from + s.thick}
                height={s.thick}
              />
            ) : (
              <rect
                key={i}
                x={s.line - s.thick / 2}
                y={s.from - s.thick / 2}
                width={s.thick}
                height={s.to - s.from + s.thick}
              />
            )
          )}
        </g>
        {selWall.length > 0 && (
          <g className={styles.wallSelected} pointerEvents="none">
            {runRects(selWall, INTERIOR_THICK_CM + 8)}
          </g>
        )}
        {openings.map((op) => (
          <Opening
            key={op.id}
            op={op}
            thick={thicknessAt(op, analysis)}
            swing={defaultSwing(analysis, op)}
            selected={selected?.type === 'opening' && selected.id === op.id}
          />
        ))}
      </>
    );
  }, [
    flat,
    selected,
    edges,
    analysis,
    belowRuns,
    openingStairs,
    spaces,
    rooms,
    stretches,
    openings,
  ]);

  if (!flat) return null;

  // Overlay content in world units
  const overlay = [];
  const labels = [];
  const hv = tool === 'passage' ? (cursor ? passageGhost(cursor) : null) : hover;
  if (hv?.type === 'wall') {
    const thick = INTERIOR_THICK_CM;
    const horizontal = hv.sy === hv.ey;
    overlay.push(
      <rect
        key="draft"
        className={styles.draftWall}
        x={Math.min(hv.sx, hv.ex) - thick / 2}
        y={Math.min(hv.sy, hv.ey) - thick / 2}
        width={horizontal ? Math.abs(hv.ex - hv.sx) + thick : thick}
        height={horizontal ? thick : Math.abs(hv.ey - hv.sy) + thick}
      />
    );
    const len = Math.abs(hv.ex - hv.sx) + Math.abs(hv.ey - hv.sy);
    if (len > 0)
      labels.push({
        key: 'len',
        x: (hv.sx + hv.ex) / 2,
        y: (hv.sy + hv.ey) / 2,
        text: fmtM(len),
        pill: true,
        dy: -14,
      });
  }
  const guides = hv?.type === 'wall' || hv?.type === 'point' ? hv.guides : null;
  if (guides) {
    const end = hv.type === 'wall' ? { x: hv.ex, y: hv.ey } : { x: hv.x, y: hv.y };
    overlay.push(
      <circle
        key="snap"
        cx={end.x}
        cy={end.y}
        r={(guides?.onVertex ? 7 : 4.5) * px}
        className={guides?.onVertex ? styles.snapVertex : styles.snapDot}
      />
    );
    if (guides?.gx)
      overlay.push(
        <line
          key="gx"
          x1={guides.gx.x}
          y1={guides.gx.y}
          x2={end.x}
          y2={end.y}
          className={styles.guide}
        />
      );
    if (guides?.gy)
      overlay.push(
        <line
          key="gy"
          x1={guides.gy.x}
          y1={guides.gy.y}
          x2={end.x}
          y2={end.y}
          className={styles.guide}
        />
      );
  }
  if (hv?.type === 'erase') {
    overlay.push(
      <g key="erase" className={styles.eraseHint} pointerEvents="none">
        {runRects(hv.keys, INTERIOR_THICK_CM + 6)}
      </g>
    );
    const rs = edgesToRuns(new Set(hv.keys))[0];
    if (rs)
      labels.push({
        key: 'erase',
        x: (rs.x1 + rs.x2) / 2,
        y: (rs.y1 + rs.y2) / 2,
        text: `Remove ${fmtM(Math.abs(rs.x2 - rs.x1) + Math.abs(rs.y2 - rs.y1))}`,
        pill: true,
        dy: -16,
      });
  }
  if (hv?.type === 'opening') {
    overlay.push(
      <Opening
        key="ghost"
        op={hv.plan.op}
        thick={INTERIOR_THICK_CM}
        swing={defaultSwing(analysis, hv.plan.op)}
        ghost
        invalid={!hv.plan.valid}
      />
    );
    labels.push({
      key: 'op',
      x: hv.plan.op.axis === 'h' ? hv.plan.op.start + hv.plan.op.widthCm / 2 : hv.plan.op.line,
      y: hv.plan.op.axis === 'h' ? hv.plan.op.line : hv.plan.op.start + hv.plan.op.widthCm / 2,
      text: hv.plan.valid
        ? `${tool === 'door' ? 'Door' : 'Window'} ${hv.plan.op.widthCm} cm`
        : hv.plan.reason,
      pill: true,
      dy: -22,
    });
  }
  if (hv?.type === 'remove-opening') {
    overlay.push(
      <Opening
        key="rm"
        op={hv.op}
        thick={INTERIOR_THICK_CM}
        swing={defaultSwing(analysis, hv.op)}
        hot
      />
    );
    labels.push({
      key: 'rm',
      x: hv.op.axis === 'h' ? hv.op.start + hv.op.widthCm / 2 : hv.op.line,
      y: hv.op.axis === 'h' ? hv.op.line : hv.op.start + hv.op.widthCm / 2,
      text: `Remove this ${hv.op.type}`,
      pill: true,
      dy: -22,
    });
  }
  if (hv?.type === 'stair') {
    overlay.push(<StairGlyph key="sg" stair={hv.stair} preview invalid={hv.warnings.length > 0} />);
    for (const gd of hv.guides || []) {
      overlay.push(
        gd.axis === 'h' ? (
          <line
            key={`g${gd.axis}${gd.at}`}
            x1={hv.stair.x - 80}
            x2={hv.stair.x + 400}
            y1={gd.at}
            y2={gd.at}
            className={styles.guide}
          />
        ) : (
          <line
            key={`g${gd.axis}${gd.at}`}
            y1={hv.stair.y - 80}
            y2={hv.stair.y + 400}
            x1={gd.at}
            x2={gd.at}
            className={styles.guide}
          />
        )
      );
    }
    if (hv.warnings.length)
      labels.push({
        key: 'sw',
        x: hv.stair.x + 20,
        y: hv.stair.y,
        text: hv.warnings[0],
        pill: true,
        dy: -14,
        warn: true,
      });
  }

  if (hv?.type === 'passage') {
    const r = hv.plan.rect;
    overlay.push(
      <g key="passage" pointerEvents="none">
        <rect
          x={r.x}
          y={r.y}
          width={r.widthCm}
          height={r.depthCm}
          className={hv.plan.valid ? styles.passageGhost : styles.passageGhostBad}
        />
        <PassageArrow rect={r} heading={hv.spec.heading} px={px} />
      </g>
    );
    labels.push({
      key: 'passage',
      x: r.x + r.widthCm / 2,
      y: r.y,
      text: hv.plan.valid
        ? `Passage ${fmtM(hv.spec.lengthCm)} � ${fmtM(hv.spec.widthCm)}`
        : hv.plan.reason,
      pill: true,
      dy: -16,
      warn: !hv.plan.valid,
    });
  }

  const wallSel = selected?.type === 'wall' ? wallRunAt(edges, selected.id) : [];
  if (wallSel.length > 0 && tool === 'select') {
    const rs = edgesToRuns(new Set(wallSel))[0];
    const { axis } = parseEdge(selected.id);
    labels.push({
      key: 'wsel',
      x: (rs.x1 + rs.x2) / 2,
      y: (rs.y1 + rs.y2) / 2,
      text: fmtM(Math.abs(rs.x2 - rs.x1) + Math.abs(rs.y2 - rs.y1)),
      pill: true,
      dy: axis === 'h' ? -18 : 0,
      dx: axis === 'v' ? 24 : 0,
    });
  }

  const visibleStairs = stairs.map((st) =>
    dragStair && dragStair.id === st.id ? { ...st, x: dragStair.x, y: dragStair.y } : st
  );
  const gridStep = k < 0.18 ? 500 : k < 0.45 ? 100 : 50;
  const wx0 = -view.tx / k;
  const wy0 = -view.ty / k;
  const wx1 = (size.w - view.tx) / k;
  const wy1 = (size.h - view.ty) / k;
  const gridLines = [];
  for (let x = Math.floor(wx0 / gridStep) * gridStep; x <= wx1; x += gridStep)
    gridLines.push(
      <line
        key={`x${x}`}
        x1={x}
        y1={wy0}
        x2={x}
        y2={wy1}
        className={x % 100 === 0 ? styles.gridMajor : styles.gridMinor}
      />
    );
  for (let y = Math.floor(wy0 / gridStep) * gridStep; y <= wy1; y += gridStep)
    gridLines.push(
      <line
        key={`y${y}`}
        x1={wx0}
        y1={y}
        x2={wx1}
        y2={y}
        className={y % 100 === 0 ? styles.gridMajor : styles.gridMinor}
      />
    );

  const cursorClass =
    panning || spaceDown
      ? styles.cursorGrab
      : {
          wall: styles.cursorCross,
          eraser: styles.cursorEraser,
          door: styles.cursorCross,
          window: styles.cursorCross,
          stairs: styles.cursorCross,
          passage: styles.cursorCross,
        }[tool] || '';

  return (
    <div ref={wrapRef} className={`${styles.canvasWrap} ${cursorClass}`}>
      <svg
        ref={svgRef}
        className={`${styles.svg} ${fitted ? '' : styles.unfitted}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        role="application"
        aria-label={`Floor plan of ${flat.name}, ${flat.levels[idx]?.name}. Choose a tool on the left, then click the plan. Delete removes the selection.`}
      >
        <StairDefs />
        <g>{gridLines.length < 400 ? gridLines : null}</g>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${k})`}>
          {planLayer}
          {visibleStairs.map((stair) => (
            <g key={stair.id} opacity={dragStair?.id === stair.id ? 0.8 : 1}>
              <StairGlyph
                stair={stair}
                selected={selected?.type === 'stair' && selected.id === stair.id}
              />
            </g>
          ))}
          {overlay}
        </g>
        <g pointerEvents="none">
          {spaces.map((space) => {
            const pt = regionLabelPoint(space);
            const [sx, sy] = toScreen(pt.x, pt.y);
            const wide = space.widthCm * k;
            const small = wide < 70 || space.depthCm * k < 50;
            if (wide < 36) return null;
            return (
              <g key={space.id} transform={`translate(${sx} ${sy})`}>
                <text className={styles.roomName} textAnchor="middle" y={small ? 4 : -4}>
                  {fitText(space.name, wide - 10, 7.6)}
                </text>
                {!small && (
                  <text className={styles.roomMeta} textAnchor="middle" y={14}>
                    {(space.areaCm2 / 10000).toFixed(1)} m²
                    {space.furnishable ? '' : ' · not a rectangle'}
                  </text>
                )}
              </g>
            );
          })}
          {stairs.map((st) => {
            const r = stairRect(st);
            const [sx, sy] = toScreen(r.x + r.widthCm / 2, r.y);
            return (
              <text key={st.id} x={sx} y={sy - 8} textAnchor="middle" className={styles.roomMeta}>
                Up to {flat.levels[idx + 1]?.name || 'next floor'}
              </text>
            );
          })}
          {labels.map((l) => {
            const [sx, sy] = toScreen(l.x, l.y);
            const w = l.text.length * 7 + 16;
            return (
              <g key={l.key} transform={`translate(${sx + (l.dx || 0)} ${sy + (l.dy || 0)})`}>
                <rect
                  x={-w / 2}
                  y={-12}
                  width={w}
                  height={22}
                  rx="6"
                  className={l.warn ? styles.pillWarn : styles.pill}
                />
                <text
                  textAnchor="middle"
                  y={3}
                  className={l.warn ? styles.pillTextWarn : styles.pillText}
                >
                  {l.text}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {notice && (
        <div className={styles.notice} role="alert">
          {notice}
        </div>
      )}
    </div>
  );
}
