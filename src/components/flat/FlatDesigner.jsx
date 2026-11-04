import React, { Suspense, useEffect, useState } from 'react';
import { Plus, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Layers, Box } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import { IconButton } from '../common/Section.jsx';
import { Segmented } from '../common/Field.jsx';
import { EditableTitle } from '../common/EditableTitle.jsx';
import { SaveStatus } from '../common/SaveStatus.jsx';
import { ToolButton, ToolGroup } from '../common/ToolButton.jsx';
import { CanvasLoader } from '../common/CanvasLoader.jsx';
import { AppHeader } from '../layout/SiteHeader.jsx';
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
  const [dismissedFor, setDismissedFor] = useState(null);

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
  const plan = viewMode === '2d';

  return (
    <div className={styles.shell}>
      <AppHeader
        onHome={closeFlat}
        homeLabel="Back to your studio"
        start={
          <>
            <EditableTitle value={flat.name} onCommit={renameFlat} label="Flat name" maxLength={80} />
            <SaveStatus />
          </>
        }
        center={
          <>
            <div className={styles.history} role="group" aria-label="History">
              <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
                <Undo2 size={18} aria-hidden="true" />
              </IconButton>
              <IconButton label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
                <Redo2 size={18} aria-hidden="true" />
              </IconButton>
            </div>
            <Segmented options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} ariaLabel="View" className={styles.viewSwitch} />
          </>
        }
      />

      <div className={styles.body}>
        <section className={styles.stage} aria-label={plan ? 'Flat plan' : 'Flat in 3D'}>
          <div className={styles.stageBody}>
            {plan ? (
              <FlatPlanCanvas />
            ) : (
              <Suspense fallback={<CanvasLoader label="Loading 3D view" />}>
                <Flat3DView />
              </Suspense>
            )}

            {plan && <FlatToolbar />}

            <div className={styles.floors}>
              <Segmented options={levelOptions} value={levelId} onChange={setLevel} ariaLabel="Floors" size="small" />
              <IconButton label="Add a floor" onClick={addLevel} disabled={flat.levels.length >= 6}>
                <Plus size={18} aria-hidden="true" />
              </IconButton>
            </div>

            {plan && (
              <ToolGroup vertical={false} className={styles.zoom} aria-label="Zoom">
                <ToolButton label="Zoom out" side="top" onClick={() => requestZoom(1 / 1.25)}>
                  <ZoomOut size={18} aria-hidden="true" />
                </ToolButton>
                <ToolButton label="Zoom in" side="top" onClick={() => requestZoom(1.25)}>
                  <ZoomIn size={18} aria-hidden="true" />
                </ToolButton>
                <ToolButton label="Fit to screen" side="top" onClick={requestFit}>
                  <Maximize size={18} aria-hidden="true" />
                </ToolButton>
              </ToolGroup>
            )}

            {showStart && <FlatStartCard onDismiss={() => setDismissedFor(flat.id)} />}
          </div>
          <FlatStatusBar viewMode={viewMode} />
        </section>
        <FlatInspector />
      </div>
    </div>
  );
}
