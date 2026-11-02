import React, { useRef, useState } from 'react';
import {
  Ruler,
  ScanLine,
  MoveHorizontal,
  ImagePlus,
  Wand2,
  Keyboard,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { readImage } from '../../engine/image.js';
import { describeIssue } from './OverlayLayers.jsx';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import styles from './CanvasToolbar.module.css';

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

  const fileRef = useRef(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
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

  const Tool = ({ active, onClick, label, children }) => (
    <button
      type="button"
      className={`${styles.tool} ${active ? styles.toolActive : ''}`}
      onClick={onClick}
      aria-pressed={active === undefined ? undefined : !!active}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );

  const nameOf = (id) => {
    const item = (room.placedFurniture || []).find((i) => i.id === id);
    return resolveItemDef(item)?.name || 'Piece';
  };

  return (
    <div className={styles.wrap} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div className={styles.bar} role="toolbar" aria-label="Drafting tools">
        <Tool active={measureActive} onClick={toggleMeasure} label="Measure distance (M)"><Ruler size={15} /></Tool>
        <Tool active={showDimensions} onClick={toggleDimensions} label="Show distances to walls"><MoveHorizontal size={15} /></Tool>
        <Tool active={showClearance} onClick={toggleClearance} label="Show clearance zones"><ScanLine size={15} /></Tool>
        <span className={styles.divider} />
        <Tool onClick={() => fileRef.current?.click()} label="Trace a floor-plan image"><ImagePlus size={15} /></Tool>
        <Tool onClick={() => openModal('layout')} label="Suggest a layout"><Wand2 size={15} /></Tool>
        <Tool onClick={() => openModal('shortcuts')} label="Keyboard shortcuts (?)"><Keyboard size={15} /></Tool>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleTraceFile} aria-label="Trace image file" />
      </div>

      {issues.length > 0 && (
        <div className={styles.issues}>
          <button type="button" className={styles.issueBtn} onClick={() => setIssuesOpen((o) => !o)} aria-expanded={issuesOpen}>
            <AlertTriangle size={13} /> {issues.length} clearance {issues.length === 1 ? 'issue' : 'issues'}
          </button>
          {issuesOpen && (
            <ul className={styles.issueList}>
              {issues.map((issue, i) => (
                <li key={`${issue.itemId}-${issue.kind}-${i}`}>
                  <button type="button" onClick={() => selectItem(issue.itemId)}>
                    <strong>{nameOf(issue.itemId)}</strong> · {describeIssue(issue)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {measureActive && (
        <div className={styles.panel} role="status">
          Click two points to measure (Shift locks the angle).
          {measurementCount > 0 && (
            <button type="button" className={styles.link} onClick={onClearMeasurements}>Clear {measurementCount}</button>
          )}
        </div>
      )}

      {room?.traceImage && (
        <div className={styles.panel}>
          <span>Trace</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={room.traceImage.opacity ?? 0.45}
            onChange={(e) => updateTraceImage({ opacity: Number(e.target.value) })}
            aria-label="Trace image opacity"
          />
          <label className={styles.inline}>
            Width cm
            <input
              type="number"
              min="50"
              max="5000"
              value={Math.round(room.traceImage.widthCm)}
              onChange={(e) => updateTraceImage({ widthCm: Math.max(50, Math.min(5000, Number(e.target.value) || 50)) })}
              aria-label="Trace image width in centimeters"
            />
          </label>
          <button type="button" className={styles.link} onClick={() => setTraceImage(null)} aria-label="Remove trace image">
            <X size={12} /> Remove
          </button>
        </div>
      )}

      {error && <div className={`${styles.panel} ${styles.error}`} role="alert">{error}</div>}
    </div>
  );
}
