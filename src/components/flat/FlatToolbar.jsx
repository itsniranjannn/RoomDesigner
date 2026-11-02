import React from 'react';
import { MousePointer2, PenLine, Eraser, DoorOpen, AppWindow, Footprints, RotateCw } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { Segmented } from '../common/Field.jsx';
import { useFlatUi } from '../../store/flatUiStore.js';
import styles from './FlatDesigner.module.css';

export const TOOL_DEFS = [
  { id: 'select', label: 'Select', key: 'V', icon: MousePointer2, tip: 'Select and move: click a room, wall, door, window or staircase' },
  { id: 'wall', label: 'Wall', key: 'W', icon: PenLine, tip: 'Draw walls: drag, or click twice. Walls snap to the grid' },
  { id: 'eraser', label: 'Erase wall', key: 'E', icon: Eraser, tip: 'Remove a wall piece between two corners to open up a room' },
  { id: 'door', label: 'Door', key: 'D', icon: DoorOpen, tip: 'Click a wall to add a door, click a door to remove it' },
  { id: 'window', label: 'Window', key: 'N', icon: AppWindow, tip: 'Click a wall to add a window, click a window to remove it' },
  { id: 'stairs', label: 'Stairs', key: 'S', icon: Footprints, tip: 'Place a staircase: click the plan, press R to rotate' },
];

const STAIR_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'L', label: 'L' },
  { value: 'U', label: 'U' },
];

export function FlatToolbar({ disabled = false }) {
  const tool = useFlatUi((s) => s.tool);
  const setTool = useFlatUi((s) => s.setTool);
  const stairType = useFlatUi((s) => s.stairType);
  const setStairType = useFlatUi((s) => s.setStairType);
  const rotateStair = useFlatUi((s) => s.rotateStair);

  return (
    <aside className={styles.toolbar} aria-label="Drawing tools">
      <h2 className={styles.toolbarTitle}>Tools</h2>
      {TOOL_DEFS.map(({ id, label, key, icon: Icon, tip }) => {
        const on = tool === id && !disabled;
        return (
          <Button
            key={id}
            variant="secondary"
            className={`${styles.toolBtn} ${on ? styles.toolOn : ''}`}
            icon={<Icon size={18} aria-hidden="true" />}
            onClick={() => setTool(id)}
            disabled={disabled}
            aria-pressed={on}
            aria-keyshortcuts={key}
            title={`${tip} (${key})`}
          >
            <span className={styles.toolLabel}>{label}</span>
            <kbd className={styles.kbd}>{key}</kbd>
          </Button>
        );
      })}
      {tool === 'stairs' && !disabled && (
        <div className={styles.toolOptions}>
          <Segmented options={STAIR_OPTIONS} value={stairType} onChange={setStairType} ariaLabel="Staircase shape" />
          <Button variant="secondary" size="small" icon={<RotateCw size={16} aria-hidden="true" />} onClick={rotateStair} title="Rotate 90 degrees (R)">
            Rotate
          </Button>
        </div>
      )}
      {disabled ? (
        <p className={styles.helpText}>Switch back to the plan to draw.</p>
      ) : (
        <p className={styles.helpText}>Hold Space and drag to move around the plan. Scroll to zoom.</p>
      )}
    </aside>
  );
}
