import React from 'react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import { usePlanningStore } from '../../store/planningStore.js';
import styles from './FlatDesigner.module.css';

// Every tool can also be used from the keyboard: the arrow keys move a crosshair over the
// plan and Enter uses the tool where it stands, so each hint says so.
const BY_KEYBOARD = ' Or move the crosshair with the arrow keys and press Enter.';
const HINTS = {
  select:
    'Click to edit. Double-click a room to furnish it. Pan with the Hand tool (H), Space + drag, or right-drag.' +
    BY_KEYBOARD,
  pan: 'Drag the plan to move it. Scroll to zoom. Press V to go back to Select.',
  wall:
    'Drag, or click twice, to draw a wall. Click the same spot again or press Esc to finish.' +
    BY_KEYBOARD,
  eraser: 'Click a wall to remove the piece between two corners.' + BY_KEYBOARD,
  door: 'Click a wall to add a door. Click an existing door to remove it.' + BY_KEYBOARD,
  window: 'Click a wall to add a window. Click an existing window to remove it.' + BY_KEYBOARD,
  stairs: 'Click the plan to place the staircase. Press R to rotate it.' + BY_KEYBOARD,
  passage: 'Click the plan to add a passage.' + BY_KEYBOARD,
};

export function FlatStatusBar({ viewMode }) {
  const cursor = useFlatUi((s) => s.cursor);
  const tool = useFlatUi((s) => s.tool);
  const zoom = useFlatUi((s) => s.zoomPercent);
  const crosshairStatus = usePlanningStore((s) => s.crosshairStatus);
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  if (!flat) return null;
  const spaces = flat.spaces.filter((s) => s.levelId === levelId);
  const area = spaces.reduce((n, s) => n + s.areaCm2, 0) / 10000;
  return (
    <footer className={styles.status} aria-label="Status">
      <span className={styles.statusCursor} aria-label="Pointer position">
        {viewMode === '2d' && cursor
          ? `x ${(cursor.x / 100).toFixed(2)} m   y ${(cursor.y / 100).toFixed(2)} m`
          : ''}
      </span>
      {/* The one live line: the tool's hint, replaced by what the crosshair is doing */}
      <span className={styles.statusHint} role="status" data-testid="flat-status">
        {viewMode === '3d'
          ? 'Drag to orbit, right-drag to pan, scroll to zoom. Floors above the one you are editing are hidden.'
          : crosshairStatus || HINTS[tool]}
      </span>
      {/* This floor only; the Overview panel counts the whole flat and says so */}
      <span className={styles.statusFacts}>
        <span>
          {spaces.length} {spaces.length === 1 ? 'room' : 'rooms'} on this floor
        </span>
        <span>{area.toFixed(1)} m²</span>
        {viewMode === '2d' && <span>{zoom}% zoom</span>}
      </span>
    </footer>
  );
}
