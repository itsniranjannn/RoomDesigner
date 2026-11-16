import React, { useEffect, useRef, useState } from 'react';
import {
  ClipboardCheck,
  ImagePlus,
  Keyboard,
  MoveHorizontal,
  PanelLeft,
  Plug,
  Redo2,
  Ruler,
  ScanLine,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { readImage } from '../../engine/image.js';
import { usePlanningStore } from '../../store/planningStore.js';
import { Button } from '../common/Button.jsx';
import { NumberField, RangeField } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import { ToolButton, ToolGroup } from '../common/ToolButton.jsx';
import { useMediaQuery } from '../layout/hooks.js';
import styles from './CanvasToolbar.module.css';

// Clicks on the overlay must not reach the canvas underneath (it would clear the selection)
const stop = { onClick: (e) => e.stopPropagation(), onPointerDown: (e) => e.stopPropagation() };

export function CanvasToolbar({
  checks,
  onClearMeasurements,
  measurementCount,
  catalogOpen,
  onToggleCatalog,
}) {
  const room = useRoomStore((s) => s.room);
  const measureActive = useRoomStore((s) => s.measureActive);
  const showClearance = useRoomStore((s) => s.showClearance);
  const showDimensions = useRoomStore((s) => s.showDimensions);
  const toggleMeasure = useRoomStore((s) => s.toggleMeasure);
  const toggleClearance = useRoomStore((s) => s.toggleClearance);
  const toggleDimensions = useRoomStore((s) => s.toggleDimensions);
  const setTraceImage = useRoomStore((s) => s.setTraceImage);
  const updateTraceImage = useRoomStore((s) => s.updateTraceImage);
  const panel = usePlanningStore((s) => s.panel);
  const crosshairStatus = usePlanningStore((s) => s.crosshairStatus);
  const togglePanel = usePlanningStore((s) => s.togglePanel);
  const openModal = useRoomStore((s) => s.openModal);
  const undo = useRoomStore((s) => s.undo);
  const redo = useRoomStore((s) => s.redo);
  const canUndo = useRoomStore((s) => s.canUndo);
  const canRedo = useRoomStore((s) => s.canRedo);

  const placeNotice = useRoomStore((s) => s.placeNotice);
  const clearPlaceNotice = useRoomStore((s) => s.clearPlaceNotice);
  useEffect(() => {
    if (!placeNotice) return undefined;
    const t = setTimeout(clearPlaceNotice, 6000);
    return () => clearTimeout(t);
  }, [placeNotice, clearPlaceNotice]);

  const phone = useMediaQuery('(max-width: 640px)');
  // A landscape phone is wider than 640px but only ~375px tall: the strip lies down there too
  const compact = useMediaQuery('(max-width: 640px), (max-height: 520px)');
  const fileRef = useRef(null);
  const [error, setError] = useState(null);

  // role="toolbar" promises one stop in the tab order with the arrow keys moving between
  // the tools, so that is what it does. Eight separate tab stops is also most of what makes
  // the plan so far from the furniture list.
  const toolbarRef = useRef(null);
  const activeTool = useRef(0);
  const toolButtons = () =>
    Array.from(toolbarRef.current?.querySelectorAll('button:not([disabled])') || []);

  const markTabStop = (list, index) => {
    activeTool.current = index;
    list.forEach((b, i) => {
      b.tabIndex = i === index ? 0 : -1;
    });
  };

  // Runs after every render, so a tool that comes or goes cannot leave the strip without
  // its one tab stop
  useEffect(() => {
    const list = toolButtons();
    if (list.length === 0) return;
    markTabStop(list, Math.min(activeTool.current, list.length - 1));
  });

  const focusToolAt = (index) => {
    const list = toolButtons();
    if (list.length === 0) return;
    const next = ((index % list.length) + list.length) % list.length;
    markTabStop(list, next);
    list[next].focus();
  };

  const onToolbarKeyDown = (e) => {
    const list = toolButtons();
    const here = Math.max(0, list.indexOf(document.activeElement));
    // The arrows must follow the way the strip is actually lying, which includes a landscape
    // phone: wider than 640px, but short enough that the strip is a row
    const step = {
      [compact ? 'ArrowLeft' : 'ArrowUp']: -1,
      [compact ? 'ArrowRight' : 'ArrowDown']: 1,
    };
    let target = null;
    if (Object.hasOwn(step, e.key)) target = here + step[e.key];
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = list.length - 1;
    if (target === null) return;
    e.preventDefault();
    // The plan nudges the selection with the arrows, and this strip sits inside the plan
    e.stopPropagation();
    focusToolAt(target);
  };

  const handleTraceFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const img = await readImage(file, 1600);
      setTraceImage({ dataUrl: img.dataUrl, aspect: img.aspect });
    } catch (err) {
      setError(err.message);
    }
  };

  const side = compact ? 'bottom' : 'right';
  const trace = room?.traceImage;
  const attention = (checks?.counts.error || 0) + (checks?.counts.warning || 0);

  return (
    <div className={styles.chrome}>
      <div
        ref={toolbarRef}
        className={styles.toolbar}
        role="toolbar"
        aria-label="Plan tools"
        aria-orientation={compact ? 'horizontal' : 'vertical'}
        onKeyDown={onToolbarKeyDown}
        {...stop}
      >
        {/* No room for it in the top bar at this width, and it belongs with the plan tools */}
        {phone && onToggleCatalog && (
          <ToolGroup vertical={!compact}>
            <ToolButton
              active={catalogOpen}
              side={side}
              onClick={onToggleCatalog}
              label={catalogOpen ? 'Hide furniture list' : 'Show furniture list'}
            >
              <PanelLeft size={18} />
            </ToolButton>
          </ToolGroup>
        )}
        {phone && (
          <ToolGroup vertical={!compact}>
            <ToolButton
              label="Undo"
              shortcut="Ctrl+Z"
              side={side}
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 size={18} />
            </ToolButton>
            <ToolButton
              label="Redo"
              shortcut="Ctrl+Y"
              side={side}
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 size={18} />
            </ToolButton>
          </ToolGroup>
        )}
        <ToolGroup vertical={!compact}>
          <ToolButton
            active={measureActive}
            side={side}
            onClick={toggleMeasure}
            label="Measure distance"
            shortcut="M"
          >
            <Ruler size={18} />
          </ToolButton>
          <ToolButton
            active={showDimensions}
            side={side}
            onClick={toggleDimensions}
            label="Show distances to walls"
          >
            <MoveHorizontal size={18} />
          </ToolButton>
          <ToolButton
            active={showClearance}
            side={side}
            onClick={toggleClearance}
            label="Show clearance zones"
          >
            <ScanLine size={18} />
          </ToolButton>
        </ToolGroup>
        <ToolGroup vertical={!compact}>
          <ToolButton
            active={panel === 'services'}
            side={side}
            onClick={() => togglePanel('services')}
            label="Services: sockets, switches and pipes"
          >
            <Plug size={18} />
          </ToolButton>
          <ToolButton
            active={panel === 'checks'}
            side={side}
            onClick={() => togglePanel('checks')}
            label={attention > 0 ? `Plan checks (${attention} to look at)` : 'Plan checks'}
            className={styles.checksButton}
          >
            <ClipboardCheck size={18} />
            {attention > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {attention > 9 ? '9+' : attention}
              </span>
            )}
          </ToolButton>
        </ToolGroup>
        <ToolGroup vertical={!compact}>
          <ToolButton
            side={side}
            onClick={() => fileRef.current?.click()}
            label="Trace a floor-plan image"
          >
            <ImagePlus size={18} />
          </ToolButton>
          <ToolButton side={side} onClick={() => openModal('layout')} label="Suggest a layout">
            <Wand2 size={18} />
          </ToolButton>
        </ToolGroup>
        <ToolGroup vertical={!compact}>
          <ToolButton
            side={side}
            onClick={() => openModal('shortcuts')}
            label="Keyboard shortcuts"
            shortcut="?"
          >
            <Keyboard size={18} />
          </ToolButton>
        </ToolGroup>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleTraceFile}
          aria-label="Floor-plan image to trace"
        />
      </div>

      <div className={styles.stack}>
        {placeNotice && (
          <div {...stop}>
            <Notice kind="warn">{placeNotice}</Notice>
          </div>
        )}
        {measureActive && (
          <div className={styles.card} role="status" data-testid="measure-card" {...stop}>
            {/* The same line carries the keyboard crosshair's position and what it measured */}
            <span>
              {crosshairStatus ||
                'Click two points to measure, or move the crosshair with the arrow keys and press Enter for each point. Hold Shift to lock the angle.'}
            </span>
            {measurementCount > 0 && (
              <Button size="small" variant="ghost" onClick={onClearMeasurements}>
                Clear {measurementCount}
              </Button>
            )}
            <Button size="small" onClick={toggleMeasure}>
              Done
            </Button>
          </div>
        )}

        {trace && (
          <div className={styles.card} role="group" aria-label="Traced image" {...stop}>
            <RangeField
              label="Image opacity"
              className={styles.opacity}
              min={0.1}
              max={1}
              step={0.05}
              value={trace.opacity ?? 0.45}
              valueLabel={`${Math.round((trace.opacity ?? 0.45) * 100)}%`}
              onChange={(v) => updateTraceImage({ opacity: v })}
            />
            <NumberField
              label="Image width"
              className={styles.traceWidth}
              suffix="cm"
              min={50}
              max={5000}
              value={Math.round(trace.widthCm)}
              onCommit={(v) => updateTraceImage({ widthCm: v })}
            />
            <Button
              size="small"
              variant="ghost"
              icon={<X size={14} />}
              onClick={() => setTraceImage(null)}
            >
              Remove image
            </Button>
          </div>
        )}

        {error && (
          <div className={styles.errorWrap} {...stop}>
            <Notice kind="error">{error}</Notice>
            <Button size="small" variant="ghost" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
