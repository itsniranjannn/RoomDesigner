import React from 'react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import styles from './FlatDesigner.module.css';

const HINTS = {
  select: 'Click to edit. Double-click a room to furnish it. Hold Space and drag to pan.',
  wall: 'Drag, or click twice, to draw a wall. Click the same spot again or press Esc to finish.',
  eraser: 'Click a wall to remove the piece between two corners.',
  door: 'Click a wall to add a door. Click an existing door to remove it.',
  window: 'Click a wall to add a window. Click an existing window to remove it.',
  stairs: 'Click the plan to place the staircase. Press R to rotate it.',
};

export function FlatStatusBar({ viewMode }) {
  const cursor = useFlatUi((s) => s.cursor);
  const tool = useFlatUi((s) => s.tool);
  const zoom = useFlatUi((s) => s.zoomPercent);
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  if (!flat) return null;
  const spaces = flat.spaces.filter((s) => s.levelId === levelId);
  const area = spaces.reduce((n, s) => n + s.areaCm2, 0) / 10000;
  return (
    <footer className={styles.status} aria-label="Status">
      <span className={styles.statusCursor} aria-label="Pointer position">
        {viewMode === '2d' && cursor ? `x ${(cursor.x / 100).toFixed(2)} m   y ${(cursor.y / 100).toFixed(2)} m` : ''}
      </span>
      <span className={styles.statusHint}>
        {viewMode === '3d' ? 'Drag to look around, scroll to zoom, right-drag to pan.' : HINTS[tool]}
      </span>
      <span className={styles.statusFacts}>
        <span>{area.toFixed(1)} m² on this floor</span>
        <span>{spaces.length} {spaces.length === 1 ? 'room' : 'rooms'}</span>
        {viewMode === '2d' && <span>{zoom}% zoom</span>}
      </span>
    </footer>
  );
}
