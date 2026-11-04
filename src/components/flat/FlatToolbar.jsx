import React from 'react';
import {
  MousePointer2,
  PenLine,
  Eraser,
  DoorOpen,
  AppWindow,
  Footprints,
  RectangleHorizontal,
  RotateCw,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { Segmented, NumberField, SelectField } from '../common/Field.jsx';
import { ToolButton, ToolGroup } from '../common/ToolButton.jsx';
import { useFlatUi } from '../../store/flatUiStore.js';
import { useFlatStore } from '../../store/flatStore.js';
import { STAIR_LIMITS, levelIndex } from '../../engine/flat.js';
import { PASSAGE_LIMITS, clampPassageSize } from '../../engine/flatPassage.js';
import styles from './FlatDesigner.module.css';

const TOOL_DEFS = [
  { id: 'select', label: 'Select', key: 'V', icon: MousePointer2 },
  { id: 'wall', label: 'Draw wall', key: 'W', icon: PenLine },
  { id: 'eraser', label: 'Erase wall', key: 'E', icon: Eraser },
  { id: 'door', label: 'Door', key: 'D', icon: DoorOpen },
  { id: 'window', label: 'Window', key: 'N', icon: AppWindow },
  { id: 'stairs', label: 'Stairs', key: 'S', icon: Footprints },
  { id: 'passage', label: 'Passage', key: 'P', icon: RectangleHorizontal },
];

const WALL_STYLE_OPTIONS = [
  { value: 'solid', label: 'Wall' },
  { value: 'open', label: 'Open divider' },
];

const STAIR_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'L', label: 'L' },
  { value: 'U', label: 'U' },
];

export const STAIR_DIRECTIONS = [
  { value: 0, label: 'Up', ariaLabel: 'Climbs up the plan', icon: <ArrowUp size={15} /> },
  { value: 90, label: 'Right', ariaLabel: 'Climbs to the right', icon: <ArrowRight size={15} /> },
  { value: 180, label: 'Down', ariaLabel: 'Climbs down the plan', icon: <ArrowDown size={15} /> },
  { value: 270, label: 'Left', ariaLabel: 'Climbs to the left', icon: <ArrowLeft size={15} /> },
];

/** Floating tool rail inside the plan card. */
export function FlatToolbar() {
  const tool = useFlatUi((s) => s.tool);
  const setTool = useFlatUi((s) => s.setTool);
  const wallStyle = useFlatUi((s) => s.wallStyle);
  const setWallStyle = useFlatUi((s) => s.setWallStyle);
  const stairType = useFlatUi((s) => s.stairType);
  const setStairType = useFlatUi((s) => s.setStairType);
  const rotateStair = useFlatUi((s) => s.rotateStair);
  const stairRotation = useFlatUi((s) => s.stairRotation);
  const setStairRotation = useFlatUi((s) => s.setStairRotation);
  const stairWidth = useFlatUi((s) => s.stairWidth);
  const stairToLevelId = useFlatUi((s) => s.stairToLevelId);
  const setStairOptions = useFlatUi((s) => s.setStairOptions);
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  const upper = flat ? flat.levels.slice(levelIndex(flat, levelId) + 1) : [];
  const toValue = upper.some((l) => l.id === stairToLevelId) ? stairToLevelId : upper[0]?.id || '';
  const passage = useFlatUi((s) => s.passage);
  const setPassage = useFlatUi((s) => s.setPassage);
  const rotatePassage = useFlatUi((s) => s.rotatePassage);
  const setSize = (patch) => setPassage(clampPassageSize({ ...passage, ...patch }));

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
      {tool === 'wall' && (
        <div className={styles.railOptions}>
          <Segmented
            options={WALL_STYLE_OPTIONS}
            value={wallStyle}
            onChange={setWallStyle}
            ariaLabel="Wall style"
            size="small"
          />
          <p className={styles.railHint}>
            {wallStyle === 'open'
              ? 'An open divider splits the space into named zones with no wall.'
              : 'Drag on the plan to draw a wall.'}
          </p>
        </div>
      )}
      {tool === 'stairs' && (
        <div className={styles.railOptions}>
          <Segmented
            options={STAIR_OPTIONS}
            value={stairType}
            onChange={setStairType}
            ariaLabel="Staircase shape"
            size="small"
          />
          <Segmented
            options={STAIR_DIRECTIONS}
            value={stairRotation}
            onChange={setStairRotation}
            ariaLabel="Direction the staircase climbs"
            size="small"
          />
          <NumberField
            label="Width"
            suffix="cm"
            value={stairWidth}
            min={STAIR_LIMITS.widthCm[0]}
            max={STAIR_LIMITS.widthCm[1]}
            step={5}
            onCommit={(v) => setStairOptions({ stairWidth: v })}
          />
          {upper.length > 0 ? (
            <SelectField
              label="Climbs to"
              options={upper.map((l) => ({ value: l.id, label: l.name }))}
              value={toValue}
              onChange={(v) => setStairOptions({ stairToLevelId: v })}
            />
          ) : (
            <p className={styles.railHint}>Add a floor above to climb to it.</p>
          )}
          <Button
            variant="secondary"
            size="small"
            icon={<RotateCw size={16} aria-hidden="true" />}
            onClick={rotateStair}
            title="Rotate 90 degrees (R)"
          >
            Rotate
          </Button>
          <p className={styles.railHint}>
            Click the plan to place it. The ghost turns red where it does not fit.
          </p>
        </div>
      )}
      {tool === 'passage' && (
        <div className={styles.railOptions}>
          <div className={styles.row2}>
            <NumberField
              label="Length"
              suffix="cm"
              value={passage.lengthCm}
              min={PASSAGE_LIMITS.lengthCm[0]}
              max={PASSAGE_LIMITS.lengthCm[1]}
              step={10}
              onCommit={(v) => setSize({ lengthCm: v })}
            />
            <NumberField
              label="Width"
              suffix="cm"
              value={passage.widthCm}
              min={PASSAGE_LIMITS.widthCm[0]}
              max={PASSAGE_LIMITS.widthCm[1]}
              step={10}
              onCommit={(v) => setSize({ widthCm: v })}
            />
          </div>
          <Button
            variant="secondary"
            size="small"
            icon={<RotateCw size={16} aria-hidden="true" />}
            onClick={rotatePassage}
            title="Turn the passage a quarter turn (R). Walls run straight, so it turns in 90 degree steps."
          >
            Rotate
          </Button>
          <p className={styles.railHint}>Click the plan to place it.</p>
        </div>
      )}
    </div>
  );
}
