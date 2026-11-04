import React from 'react';
import {
  MousePointer2,
  PenLine,
  Eraser,
  DoorOpen,
  AppWindow,
  Footprints,
  RotateCw,
} from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { Segmented } from '../common/Field.jsx';
import { ToolButton, ToolGroup } from '../common/ToolButton.jsx';
import { useFlatUi } from '../../store/flatUiStore.js';
import styles from './FlatDesigner.module.css';

const TOOL_DEFS = [
  { id: 'select', label: 'Select', key: 'V', icon: MousePointer2 },
  { id: 'wall', label: 'Draw wall', key: 'W', icon: PenLine },
  { id: 'eraser', label: 'Erase wall', key: 'E', icon: Eraser },
  { id: 'door', label: 'Door', key: 'D', icon: DoorOpen },
  { id: 'window', label: 'Window', key: 'N', icon: AppWindow },
  { id: 'stairs', label: 'Stairs', key: 'S', icon: Footprints },
];

const STAIR_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'L', label: 'L' },
  { value: 'U', label: 'U' },
];

/** Floating tool rail inside the plan card. */
export function FlatToolbar() {
  const tool = useFlatUi((s) => s.tool);
  const setTool = useFlatUi((s) => s.setTool);
  const stairType = useFlatUi((s) => s.stairType);
  const setStairType = useFlatUi((s) => s.setStairType);
  const rotateStair = useFlatUi((s) => s.rotateStair);

  return (
    <div className={styles.rail}>
      <ToolGroup aria-label="Drawing tools" aria-orientation="vertical">
        {TOOL_DEFS.map(({ id, label, key, icon: Icon }) => (
          <ToolButton
            key={id}
            label={label}
            shortcut={key}
            active={tool === id}
            onClick={() => setTool(id)}
            aria-keyshortcuts={key}
          >
            <Icon size={18} aria-hidden="true" />
          </ToolButton>
        ))}
      </ToolGroup>
      {tool === 'stairs' && (
        <div className={styles.railOptions}>
          <Segmented
            options={STAIR_OPTIONS}
            value={stairType}
            onChange={setStairType}
            ariaLabel="Staircase shape"
            size="small"
          />
          <Button
            variant="secondary"
            size="small"
            icon={<RotateCw size={16} aria-hidden="true" />}
            onClick={rotateStair}
            title="Rotate 90 degrees (R)"
          >
            Rotate
          </Button>
        </div>
      )}
    </div>
  );
}
