import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { usePlanningStore } from '../../store/planningStore.js';
import {
  SERVICE_KINDS,
  positionService,
  serviceLabels,
  servicesOf,
} from '../../engine/planning.js';
import { turningSpace } from '../../engine/planningChecks.js';
import { PlacedService, ServiceGlyph, glyphBox } from './serviceSymbols.jsx';
import cursors from './Cursors.module.css';
import styles from './PlanningLayer.module.css';

const SEVERITY_COLOR = { error: '#8B2635', warning: '#B26B00', info: '#22485E' };
// The older clearance overlay already outlines these pieces, so they get no second badge there
const SHOWN_BY_CLEARANCE = new Set(['door-blocked', 'window-blocked', 'window-covered']);

function pointFromEvent(svgRef, e) {
  const svg = svgRef.current;
  const ctm = svg?.getScreenCTM();
  if (!svg || !ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/** A service point that can be selected and dragged along its wall (or over the floor). */
function ServiceNode({ service, label, selected, interactive, svgRef }) {
  const selectService = usePlanningStore((s) => s.selectService);
  const box = glyphBox(service.kind);

  const handleDown = (e) => {
    if (!interactive || e.button !== 0) return;
    e.stopPropagation();
    selectService(service.id);
    const start = pointFromEvent(svgRef, e);
    if (!start) return;
    const before = useRoomStore.getState().getCurrentSnapshot();
    const origin = { x: service.x, y: service.y };
    let moved = false;

    const onMove = (ev) => {
      const p = pointFromEvent(svgRef, ev);
      if (!p) return;
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) < 3) return;
      moved = true;
      useRoomStore.getState().moveService(service.id, origin.x + (p.x - start.x), origin.y + (p.y - start.y));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved && before) useRoomStore.getState().pushExplicitSnapshot(before);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <g
      transform={`translate(${service.x} ${service.y}) rotate(${service.rotationDeg || 0})`}
      onPointerDown={handleDown}
      onClick={(e) => interactive && e.stopPropagation()}
      className={interactive ? cursors.grab : undefined}
      pointerEvents={interactive ? 'all' : 'none'}
      data-service={service.kind}
      aria-label={label}
    >
      <title>{service.note ? `${label}: ${service.note}` : label}</title>
      {/* A generous, invisible target so small symbols are easy to grab */}
      <rect x={box.x - 4} y={box.y - 4} width={box.w + 8} height={box.h + 8} fill="transparent" />
      <ServiceGlyph kind={service.kind} />
      {selected && (
        <rect
          x={box.x - 2}
          y={box.y - 2}
          width={box.w + 4}
          height={box.h + 4}
          rx="4"
          fill="none"
          stroke="#22485E"
          strokeWidth="1.6"
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
    </g>
  );
}

/** Click-to-place surface with a ghost symbol that snaps to the nearest wall. */
function PlaceSurface({ room, svgRef, bounds, kind }) {
  const addService = useRoomStore((s) => s.addService);
  const selectService = usePlanningStore((s) => s.selectService);
  const [hover, setHover] = useState(null);

  const placed = hover ? positionService(room, kind, hover.x, hover.y) : null;
  const def = SERVICE_KINDS[kind];

  return (
    <g>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        className={cursors.crosshair}
        data-testid="service-surface"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => setHover(pointFromEvent(svgRef, e))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          const p = pointFromEvent(svgRef, e);
          if (!p) return;
          const id = addService(kind, p.x, p.y);
          if (id) {
            usePlanningStore.setState({ selectedServiceId: id });
          } else selectService(null);
        }}
      />
      {placed && (
        <g opacity="0.6" pointerEvents="none">
          <PlacedService kind={kind} {...placed} />
          {def.mount === 'wall' && (
            <circle cx={placed.x} cy={placed.y} r="1.8" fill="#22485E" />
          )}
        </g>
      )}
    </g>
  );
}

function TurningSpace({ room }) {
  const t = useMemo(() => turningSpace(room), [room]);
  const d = t.runs.map((r) => `M ${r.x0} ${r.y} h ${r.x1 - r.x0} v ${r.h} h ${-(r.x1 - r.x0)} z`).join(' ');
  return (
    <g pointerEvents="none" aria-hidden="true" data-testid="turning-space">
      {t.fits && <path d={d} fill="rgba(37, 112, 122, 0.20)" />}
      {t.best && (
        <g>
          <circle
            cx={t.best.x}
            cy={t.best.y}
            r={t.radius}
            fill="rgba(37, 112, 122, 0.10)"
            stroke="#25707A"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
          <text
            x={t.best.x}
            y={t.best.y + 3}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#1B5057"
            stroke="#F6F2EA"
            strokeWidth="3"
            paintOrder="stroke"
            fontFamily="var(--font-sans, sans-serif)"
          >
            150 cm turning circle
          </text>
        </g>
      )}
    </g>
  );
}

function IssueMarkers({ issues, showAll }) {
  return (
    <g pointerEvents="none" aria-hidden="true">
      {issues
        .filter((i) => i.focus.type !== 'spot')
        .filter((i) => showAll || !SHOWN_BY_CLEARANCE.has(i.code))
        .filter((i) => showAll || i.severity !== 'info')
        .map((i) => (
          <g key={i.id} transform={`translate(${i.point.x} ${i.point.y})`}>
            <circle r="10" fill={SEVERITY_COLOR[i.severity]} stroke="#fff" strokeWidth="1.6" />
            <text
              y="4"
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill="#fff"
              fontFamily="var(--font-sans, sans-serif)"
            >
              {i.severity === 'info' ? 'i' : '!'}
            </text>
          </g>
        ))}
    </g>
  );
}

/**
 * Everything the planning tools draw on the plan: service points, the click-to-place
 * surface, markers for plan-check issues, the turning-circle view and the "Show" highlight.
 */
export function PlanningLayer({ room, svgRef, bounds, checks }) {
  const panel = usePlanningStore((s) => s.panel);
  const placeKind = usePlanningStore((s) => s.placeKind);
  const selectedServiceId = usePlanningStore((s) => s.selectedServiceId);
  const showServices = usePlanningStore((s) => s.showServices);
  const showTurning = usePlanningStore((s) => s.showTurning);
  const highlight = usePlanningStore((s) => s.highlight);
  const clearHighlight = usePlanningStore((s) => s.clearHighlight);
  const showClearance = useRoomStore((s) => s.showClearance);

  const services = useMemo(() => servicesOf(room), [room]);
  const labels = useMemo(() => serviceLabels(services), [services]);
  const editing = panel === 'services';
  const lastKey = useRef(null);

  useEffect(() => {
    if (!highlight || lastKey.current === highlight.key) return undefined;
    lastKey.current = highlight.key;
    const t = setTimeout(clearHighlight, 5000);
    return () => clearTimeout(t);
  }, [highlight, clearHighlight]);

  const visibleServices = showServices || editing;
  const showMarkers = panel === 'checks' || showClearance;

  return (
    <g data-planning-layer>
      {showTurning && <TurningSpace room={room} />}
      {showMarkers && checks && (
        <IssueMarkers issues={checks.issues} showAll={panel === 'checks'} />
      )}
      {visibleServices && (
        <g>
          {services.map((s) => (
            <ServiceNode
              key={s.id}
              service={s}
              label={labels[s.id]}
              selected={editing && s.id === selectedServiceId}
              interactive={editing && !placeKind}
              svgRef={svgRef}
            />
          ))}
        </g>
      )}
      {editing && placeKind && (
        <PlaceSurface room={room} svgRef={svgRef} bounds={bounds} kind={placeKind} />
      )}
      {highlight && (
        <g
          key={highlight.key}
          transform={`translate(${highlight.x} ${highlight.y})`}
          pointerEvents="none"
          aria-hidden="true"
        >
          <circle r="30" className={styles.pulse} fill="none" stroke="#8B2635" strokeWidth="3" />
          <circle r="30" className={styles.ring} fill="rgba(139, 38, 53, 0.08)" stroke="#8B2635" strokeWidth="2" />
        </g>
      )}
    </g>
  );
}
