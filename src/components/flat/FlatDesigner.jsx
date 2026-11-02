import React, { Suspense, useEffect, useState } from 'react';
import { ChevronLeft, Plus, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Layers, Box } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import { Button } from '../common/Button.jsx';
import { IconButton } from '../common/Section.jsx';
import { TextField, Segmented } from '../common/Field.jsx';
import { FlatPlanCanvas } from './FlatPlanCanvas.jsx';
import { FlatToolbar } from './FlatToolbar.jsx';
import { FlatInspector } from './FlatInspector.jsx';
import { FlatStatusBar } from './FlatStatusBar.jsx';
import { FlatStartCard } from './FlatStartCard.jsx';
import styles from './FlatDesigner.module.css';

const Flat3DView = React.lazy(() => import('./Flat3DView.jsx').then((m) => ({ default: m.Flat3DView })));

const VIEW_OPTIONS = [
  { value: '2d', label: 'Plan', icon: <Layers size={16} aria-hidden="true" />, title: 'Plan view' },
  { value: '3d', label: '3D', icon: <Box size={16} aria-hidden="true" />, title: '3D view' },
];

const TOOL_KEYS = { v: 'select', w: 'wall', e: 'eraser', d: 'door', n: 'window', s: 'stairs' };

const typing = () => {
  const el = document.activeElement;
  return el && (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.isContentEditable);
};

export function FlatDesigner() {
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  const viewMode = useFlatStore((s) => s.viewMode);
  const canUndo = useFlatStore((s) => s.canUndo);
  const canRedo = useFlatStore((s) => s.canRedo);
  const setViewMode = useFlatStore((s) => s.setViewMode);
  const setLevel = useFlatStore((s) => s.setLevel);
  const addLevel = useFlatStore((s) => s.addLevel);
  const closeFlat = useFlatStore((s) => s.closeFlat);
  const renameFlat = useFlatStore((s) => s.renameFlat);
  const undo = useFlatStore((s) => s.undo);
  const redo = useFlatStore((s) => s.redo);
  const requestZoom = useFlatUi((s) => s.requestZoom);
  const requestFit = useFlatUi((s) => s.requestFit);
  const [name, setName] = useState(flat?.name || '');
  const [dismissedFor, setDismissedFor] = useState(null);
  useEffect(() => setName(flat?.name || ''), [flat?.id, flat?.name]);

  // Keyboard shortcuts for tools, undo / redo, delete and rotate
  useEffect(() => {
    const onKey = (e) => {
      if (typing() || e.altKey) return;
      const st = useFlatStore.getState();
      const ui = useFlatUi.getState();
      if (st.mode !== 'flat') return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod) {
        if (key === 'z') {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) st.redo();
          else st.undo();
        } else if (key === 'y') {
          e.preventDefault();
          e.stopPropagation();
          st.redo();
        }
        return;
      }
      if (st.viewMode !== '2d') return;
      if (TOOL_KEYS[key] && !e.shiftKey) {
        ui.setTool(TOOL_KEYS[key]);
        return;
      }
      if (key === 'r') {
        if (ui.tool === 'stairs') ui.rotateStair();
        else if (st.selected?.type === 'stair') {
          const stair = st.flat.stairs.find((x) => x.id === st.selected.id);
          if (stair) st.updateStair(stair.id, { rotationDeg: (stair.rotationDeg || 0) + 90 });
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (st.selected && st.deleteSelected()) e.preventDefault();
        return;
      }
      const step = e.shiftKey ? 50 : 10;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d && st.selected?.type === 'stair') {
        e.preventDefault();
        const stair = st.flat.stairs.find((x) => x.id === st.selected.id);
        if (stair) st.updateStair(stair.id, { x: stair.x + d[0], y: stair.y + d[1] });
      }
    };
    // Capture phase so the studio-wide undo shortcut does not also fire
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  if (!flat) return null;
  const hasContent = flat.levels.some((l) => (flat.walls?.[l.id] || []).length > 0) || flat.stairs.length > 0;
  const showStart = !hasContent && viewMode === '2d' && dismissedFor !== flat.id;
  const levelOptions = flat.levels.map((l) => ({ value: l.id, label: l.name }));

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerGroup}>
          <Button variant="ghost" icon={<ChevronLeft size={18} aria-hidden="true" />} onClick={closeFlat} aria-label="Back to your studio">
            Studio
          </Button>
          <TextField
            className={styles.nameField}
            aria-label="Flat name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => (name.trim() ? renameFlat(name) : setName(flat.name))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>

        <div className={styles.headerGroup}>
          <Segmented options={levelOptions} value={levelId} onChange={setLevel} ariaLabel="Floors" />
          <IconButton label="Add a floor" onClick={addLevel} disabled={flat.levels.length >= 6}>
            <Plus size={18} aria-hidden="true" />
          </IconButton>
        </div>

        <span className={styles.headerSpacer} />

        <div className={styles.headerGroup}>
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 size={18} aria-hidden="true" />
          </IconButton>
          <IconButton label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
            <Redo2 size={18} aria-hidden="true" />
          </IconButton>
        </div>

        {viewMode === '2d' && (
          <div className={styles.headerGroup} role="group" aria-label="Zoom">
            <IconButton label="Zoom out" onClick={() => requestZoom(1 / 1.25)}>
              <ZoomOut size={18} aria-hidden="true" />
            </IconButton>
            <IconButton label="Zoom in" onClick={() => requestZoom(1.25)}>
              <ZoomIn size={18} aria-hidden="true" />
            </IconButton>
            <IconButton label="Fit to screen" onClick={requestFit}>
              <Maximize size={18} aria-hidden="true" />
            </IconButton>
          </div>
        )}

        <Segmented options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} ariaLabel="View" />
      </header>

      <div className={styles.body}>
        <FlatToolbar disabled={viewMode !== '2d'} />
        <main className={styles.stage}>
          {viewMode === '2d' ? (
            <FlatPlanCanvas />
          ) : (
            <Suspense fallback={<div className={styles.loading}>Loading 3D view...</div>}>
              <Flat3DView />
            </Suspense>
          )}
          {showStart && <FlatStartCard onDismiss={() => setDismissedFor(flat.id)} />}
        </main>
        <FlatInspector />
      </div>

      <FlatStatusBar viewMode={viewMode} />
    </div>
  );
}
