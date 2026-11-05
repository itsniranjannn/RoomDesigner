import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ImagePlus,
  Keyboard,
  MoveHorizontal,
  Redo2,
  Ruler,
  ScanLine,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { readImage } from '../../engine/image.js';
import { describeIssue } from './OverlayLayers.jsx';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { Button } from '../common/Button.jsx';
import { NumberField, RangeField } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import { Popover } from '../common/Popover.jsx';
import { ToolButton, ToolGroup } from '../common/ToolButton.jsx';
import { useMediaQuery } from '../layout/hooks.js';
import styles from './CanvasToolbar.module.css';

// Clicks on the overlay must not reach the canvas underneath (it would clear the selection)
const stop = { onClick: (e) => e.stopPropagation(), onPointerDown: (e) => e.stopPropagation() };

export function CanvasToolbar({ issues, onClearMeasurements, measurementCount }) {
  const room = useRoomStore((s) => s.room);
  const measureActive = useRoomStore((s) => s.measureActive);
  const showClearance = useRoomStore((s) => s.showClearance);
  const showDimensions = useRoomStore((s) => s.showDimensions);
  const toggleMeasure = useRoomStore((s) => s.toggleMeasure);
  const toggleClearance = useRoomStore((s) => s.toggleClearance);
  const toggleDimensions = useRoomStore((s) => s.toggleDimensions);
  const setTraceImage = useRoomStore((s) => s.setTraceImage);
  const updateTraceImage = useRoomStore((s) => s.updateTraceImage);
  const selectItem = useRoomStore((s) => s.selectItem);
  const openModal = useRoomStore((s) => s.openModal);
  const undo = useRoomStore((s) => s.undo);
  const redo = useRoomStore((s) => s.redo);
  const canUndo = useRoomStore((s) => s.canUndo);
  const canRedo = useRoomStore((s) => s.canRedo);

  const phone = useMediaQuery('(max-width: 640px)');
  const fileRef = useRef(null);
  const [error, setError] = useState(null);

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

  const nameOf = (id) => {
    const item = (room.placedFurniture || []).find((i) => i.id === id);
    return resolveItemDef(item)?.name || 'Piece';
  };

  const side = phone ? 'bottom' : 'right';
  const trace = room?.traceImage;

  return (
    <div className={styles.chrome}>
      <div
        className={styles.toolbar}
        role="toolbar"
        aria-label="Plan tools"
        aria-orientation={phone ? 'horizontal' : 'vertical'}
        {...stop}
      >
        {phone && (
          <ToolGroup vertical={!phone}>
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
        <ToolGroup vertical={!phone}>
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
        <ToolGroup vertical={!phone}>
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
        <ToolGroup vertical={!phone}>
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
        {issues.length > 0 && (
          <div {...stop}>
            <Popover
              label="Clearance issues"
              align="start"
              renderTrigger={(props) => (
                <button type="button" className={styles.issueChip} {...props}>
                  <AlertTriangle size={16} aria-hidden="true" />
                  {issues.length} clearance {issues.length === 1 ? 'issue' : 'issues'}
                </button>
              )}
            >
              {({ close }) => (
                <ul className={styles.issueList}>
                  {issues.map((issue, i) => (
                    <li key={`${issue.itemId}-${issue.kind}-${i}`}>
                      <button
                        type="button"
                        className={styles.issueRow}
                        onClick={() => {
                          selectItem(issue.itemId);
                          close();
                        }}
                      >
                        <strong>{nameOf(issue.itemId)}</strong>
                        <span>{describeIssue(issue)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Popover>
          </div>
        )}

        {measureActive && (
          <div className={styles.card} role="status" {...stop}>
            <span>Click two points to measure. Hold Shift to lock the angle.</span>
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
