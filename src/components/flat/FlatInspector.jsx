import React, { useState } from 'react';
import { DoorOpen, Sparkles, Trash2, RotateCw, RectangleHorizontal } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import { Section } from '../common/Section.jsx';
import { ConfirmDialog } from '../common/ConfirmDialog.jsx';
import { InspectorShell } from '../inspector/InspectorShell.jsx';
import { Button } from '../common/Button.jsx';
import { TextField, NumberField, SelectField, Switch } from '../common/Field.jsx';
import {
  SPACE_KINDS,
  STAIR_TYPES,
  STAIR_LIMITS,
  stairGeometry,
  stairRunLength,
  flatSummary,
  levelIndex,
  kindOptions,
  isPassageKind,
} from '../../engine/flat.js';
import { stairWarnings, wallsOf, openingsOf } from '../../engine/flatPlan.js';
import { PASSAGE_LIMITS, isEditablePassage, passageDims } from '../../engine/flatPassage.js';
import { edgesOf, wallRunAt, edgesToRuns } from '../../engine/flatWalls.js';
import styles from './FlatDesigner.module.css';

const KIND_OPTIONS = kindOptions();
const stairOptions = Object.entries(STAIR_TYPES).map(([value, label]) => ({ value, label }));
const m2 = (cm2) => `${(cm2 / 10000).toFixed(1)} m²`;
const m = (cm) => `${(cm / 100).toFixed(2)} m`;

function NameField({ label, value, onCommit, maxLength = 60 }) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }
  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onCommit(next);
    else setDraft(value);
  };
  return (
    <TextField
      label={label}
      value={draft}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

/** Colour dot for a room kind. Drawn as SVG so the colour stays data, not inline CSS. */
function KindDot({ color }) {
  return (
    <svg className={styles.dot} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <circle cx="5" cy="5" r="4.25" fill={color} stroke="var(--color-ink-faint)" strokeWidth="1" />
    </svg>
  );
}

function Facts({ rows }) {
  return (
    <dl className={styles.facts}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const HEADING_WORDS = { 0: 'Right', 90: 'Down', 180: 'Left', 270: 'Up' };

/** Length, width and direction of a passage. */
function PassageSection({ space }) {
  const editPassage = useFlatStore((s) => s.editPassage);
  const dims = passageDims(space);
  const apply = (patch) => {
    const res = editPassage(space.id, patch);
    if (res.error) useFlatUi.getState().setNotice(res.error);
  };
  return (
    <Section title="Passage" collapsible={false}>
      <div className={styles.row2}>
        <NumberField
          label="Length"
          suffix="cm"
          value={dims.lengthCm}
          min={PASSAGE_LIMITS.lengthCm[0]}
          max={PASSAGE_LIMITS.lengthCm[1]}
          step={10}
          onCommit={(v) => apply({ lengthCm: v })}
        />
        <NumberField
          label="Width"
          suffix="cm"
          value={dims.widthCm}
          min={PASSAGE_LIMITS.widthCm[0]}
          max={PASSAGE_LIMITS.widthCm[1]}
          step={10}
          onCommit={(v) => apply({ widthCm: v })}
        />
      </div>
      <Button
        variant="secondary"
        icon={<RotateCw size={16} aria-hidden="true" />}
        onClick={() => apply({ turns: 1 })}
        title="Turn a quarter turn about its centre (R)"
      >
        Rotate ({HEADING_WORDS[dims.heading]})
      </Button>
      <p className={styles.helpText}>
        Turns in quarter turns about its centre, because walls run straight on the grid. A change
        that would hit another room is refused.
      </p>
    </Section>
  );
}

function SpaceInspector({ space }) {
  const room = useFlatStore((s) => s.rooms[space.roomId]);
  const setSpaceMeta = useFlatStore((s) => s.setSpaceMeta);
  const furnishSpace = useFlatStore((s) => s.furnishSpace);
  const openSpace = useFlatStore((s) => s.openSpace);
  const kind = SPACE_KINDS[space.kind] || SPACE_KINDS.room;
  const pieces = room?.placedFurniture?.length || 0;
  const [confirming, setConfirming] = useState(false);

  const furnish = () => {
    if (pieces > 0) setConfirming(true);
    else furnishSpace(space.id);
  };

  return (
    <div className={styles.inspectorBody}>
      <Section title="Details" collapsible={false}>
        <span className={styles.tag}>
          <KindDot color={kind.color} />
          {kind.label}
        </span>
        <NameField
          label="Name"
          value={space.name}
          onCommit={(name) => setSpaceMeta(space.id, { name })}
        />
        <SelectField
          label="Kind of room"
          options={KIND_OPTIONS}
          value={space.kind === 'corridor' ? 'passage' : space.kind}
          onChange={(k) => setSpaceMeta(space.id, { kind: k })}
        />
        <Facts
          rows={[
            ['Floor area', m2(space.areaCm2)],
            ...(space.rect ? [['Size', `${m(space.widthCm)} × ${m(space.depthCm)}`]] : []),
            ...(space.furnishable
              ? [
                  ['Doors', room?.doors?.length || 0],
                  ['Windows', room?.windows?.length || 0],
                  ['Furniture', `${pieces} pieces`],
                ]
              : []),
          ]}
        />
      </Section>
      {isEditablePassage(space) && <PassageSection space={space} />}
      <Section title="Furniture" collapsible={false}>
        {space.furnishable ? (
          <>
            <Button
              variant="primary"
              icon={<DoorOpen size={16} aria-hidden="true" />}
              onClick={() => openSpace(space.id)}
            >
              Furnish room
            </Button>
            <Button
              variant="secondary"
              icon={<Sparkles size={16} aria-hidden="true" />}
              onClick={furnish}
              disabled={isPassageKind(space.kind) || space.kind === 'room'}
            >
              Furnish with defaults
            </Button>
            <p className={styles.helpText}>
              Furnish room opens the room designer for this room. Defaults place the usual furniture
              for a {kind.label.toLowerCase()}.
            </p>
          </>
        ) : (
          <p className={styles.callout} role="note">
            Not furnishable until the walls form a rectangle. You can still name this area and see
            its size. Move or remove a wall to square it off.
          </p>
        )}
      </Section>
      {confirming && (
        <ConfirmDialog
          title="Replace the furniture?"
          message={`The ${pieces} pieces in "${space.name}" are replaced with the default furniture for a ${kind.label.toLowerCase()}.`}
          confirmLabel="Replace furniture"
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            furnishSpace(space.id);
          }}
        />
      )}
    </div>
  );
}

function OpeningInspector({ opening }) {
  const updateOpening = useFlatStore((s) => s.updateOpening);
  const removeOpening = useFlatStore((s) => s.removeOpening);
  const label = opening.type === 'door' ? 'Door' : 'Window';
  const change = (patch) => {
    if (!updateOpening(opening.id, patch))
      useFlatUi.getState().setNotice('That does not fit on this wall piece.');
  };
  return (
    <div className={styles.inspectorBody}>
      <Section title={label} collapsible={false}>
        <NumberField
          label="Width"
          suffix="cm"
          value={opening.widthCm}
          min={40}
          max={300}
          step={5}
          onCommit={(v) => change({ widthCm: v })}
        />
        {opening.type === 'door' && (
          <Switch
            label="Opens to the other side"
            checked={!!opening.flip}
            onChange={(flip) => change({ flip })}
          />
        )}
        <Button
          variant="danger"
          icon={<Trash2 size={16} aria-hidden="true" />}
          onClick={() => removeOpening(opening.id)}
        >
          Remove {label.toLowerCase()}
        </Button>
        <p className={styles.helpText}>
          To move it, remove it and place it again with the {label} tool.
        </p>
      </Section>
    </div>
  );
}

function WallInspector({ wallKey }) {
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  const eraseWall = useFlatStore((s) => s.eraseWall);
  const edges = edgesOf(wallsOf(flat, levelId));
  const run = wallRunAt(edges, wallKey);
  const first = edgesToRuns(new Set(run))[0];
  const length = first ? Math.abs(first.x2 - first.x1) + Math.abs(first.y2 - first.y1) : 0;
  return (
    <div className={styles.inspectorBody}>
      <Section title="Wall" collapsible={false}>
        <Facts rows={[['Length', m(length)]]} />
        <Button
          variant="danger"
          icon={<Trash2 size={16} aria-hidden="true" />}
          onClick={() => eraseWall(wallKey)}
        >
          Remove this wall
        </Button>
        <p className={styles.helpText}>
          Removing a wall between two rooms joins them into one room. Doors and windows on it go
          with it.
        </p>
      </Section>
    </div>
  );
}

function StairInspector({ stair }) {
  const flat = useFlatStore((s) => s.flat);
  const updateStair = useFlatStore((s) => s.updateStair);
  const removeStair = useFlatStore((s) => s.removeStair);
  const g = stairGeometry(stair);
  const warnings = stairWarnings(flat, stair);
  const idx = levelIndex(flat, stair.levelId);
  const above = flat.levels[idx + 1];
  return (
    <div className={styles.inspectorBody}>
      <Section title="Staircase" collapsible={false}>
        <SelectField
          label="Shape"
          options={stairOptions}
          value={stair.type}
          onChange={(type) => updateStair(stair.id, { type })}
        />
        <div className={styles.row2}>
          <NumberField
            label="Stair width"
            suffix="cm"
            value={stair.widthCm}
            min={STAIR_LIMITS.widthCm[0]}
            max={STAIR_LIMITS.widthCm[1]}
            step={5}
            onCommit={(v) => updateStair(stair.id, { widthCm: v })}
          />
          <NumberField
            label="Floor to floor"
            suffix="cm"
            value={stair.riseCm}
            min={STAIR_LIMITS.riseCm[0]}
            max={STAIR_LIMITS.riseCm[1]}
            step={5}
            onCommit={(v) => updateStair(stair.id, { riseCm: v })}
          />
        </div>
        <Facts
          rows={[
            ['Steps', g.steps],
            ['Riser', `${g.riserCm.toFixed(1)} cm`],
            ['Tread', '27 cm'],
            ['Run', m(stairRunLength(stair))],
          ]}
        />
        {g.riserCm > 18 && (
          <p className={`${styles.callout} ${styles.calloutBad}`} role="alert">
            Risers above 18 cm are steep. Add floor-to-floor height carefully.
          </p>
        )}
        {warnings.map((w) => (
          <p key={w} className={`${styles.callout} ${styles.calloutBad}`} role="alert">
            {w}
          </p>
        ))}
        <div className={styles.row2}>
          <Button
            variant="secondary"
            icon={<RotateCw size={16} aria-hidden="true" />}
            onClick={() => updateStair(stair.id, { rotationDeg: (stair.rotationDeg || 0) + 90 })}
          >
            Rotate
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 size={16} aria-hidden="true" />}
            onClick={() => removeStair(stair.id)}
          >
            Remove
          </Button>
        </div>
        <p className={styles.helpText}>
          {above
            ? `${above.name} shows a matching opening.`
            : 'Add another floor to see the opening above this staircase.'}{' '}
          Drag the staircase on the plan to move it.
        </p>
      </Section>
    </div>
  );
}

function SummaryInspector() {
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  const select = useFlatStore((s) => s.select);
  const renameLevel = useFlatStore((s) => s.renameLevel);
  const removeLevel = useFlatStore((s) => s.removeLevel);
  const [confirmingFloor, setConfirmingFloor] = useState(false);
  const summary = flatSummary(flat);
  const level = flat.levels[levelIndex(flat, levelId)];
  const spaces = flat.spaces.filter((s) => s.levelId === levelId);
  const doors = openingsOf(flat, levelId).filter((o) => o.type === 'door').length;
  const windows = openingsOf(flat, levelId).filter((o) => o.type === 'window').length;
  return (
    <div className={styles.inspectorBody}>
      <Section title="Overview" collapsible={false}>
        <Facts
          rows={[
            ['Total area', `${summary.areaM2.toFixed(1)} m²`],
            ['Rooms', summary.rooms],
            ['Floors', summary.levels],
            ['Staircases', summary.stairs],
            ['Doors / windows here', `${doors} / ${windows}`],
          ]}
        />
      </Section>
      <Section title="Add" collapsible={false}>
        <Button
          variant="secondary"
          icon={<RectangleHorizontal size={16} aria-hidden="true" />}
          onClick={() => useFlatUi.getState().setTool('passage')}
        >
          Add a passage
        </Button>
      </Section>
      <Section title={`Rooms on ${level?.name || 'this floor'}`} defaultOpen>
        {spaces.length === 0 ? (
          <p className={styles.helpText}>
            No rooms yet. Close a space with walls and it appears here.
          </p>
        ) : (
          <div className={styles.roomList}>
            {spaces.map((s) => (
              <Button
                key={s.id}
                variant="ghost"
                size="small"
                className={styles.roomRow}
                onClick={() => select({ type: 'space', id: s.id })}
              >
                <KindDot color={(SPACE_KINDS[s.kind] || SPACE_KINDS.room).color} />
                {s.name}
                <span className={styles.roomRowMeta}>{m2(s.areaCm2)}</span>
              </Button>
            ))}
          </div>
        )}
      </Section>
      <Section title="This floor" defaultOpen={false}>
        <NameField
          label="Floor name"
          value={level?.name || ''}
          maxLength={40}
          onCommit={(name) => renameLevel(level.id, name)}
        />
        {flat.levels.length > 1 && (
          <Button
            variant="danger"
            icon={<Trash2 size={16} aria-hidden="true" />}
            onClick={() => setConfirmingFloor(true)}
          >
            Remove this floor
          </Button>
        )}
      </Section>
      {confirmingFloor && (
        <ConfirmDialog
          title={`Remove "${level.name}"?`}
          message="The walls, doors, windows and stairs on this floor are removed with it."
          confirmLabel="Remove floor"
          onClose={() => setConfirmingFloor(false)}
          onConfirm={() => {
            setConfirmingFloor(false);
            removeLevel(level.id);
          }}
        />
      )}
    </div>
  );
}

export function FlatInspector() {
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  const selected = useFlatStore((s) => s.selected);
  const select = useFlatStore((s) => s.select);
  if (!flat) return null;
  const space = selected?.type === 'space' ? flat.spaces.find((s) => s.id === selected.id) : null;
  const stair = selected?.type === 'stair' ? flat.stairs.find((s) => s.id === selected.id) : null;
  const opening =
    selected?.type === 'opening'
      ? openingsOf(flat, levelId).find((o) => o.id === selected.id)
      : null;
  const wall =
    selected?.type === 'wall' && edgesOf(wallsOf(flat, levelId)).has(selected.id)
      ? selected.id
      : null;

  let title = flat.name;
  let subtitle = 'Select a room, wall, door, window or staircase on the plan to edit it.';
  let body = <SummaryInspector />;
  if (space) {
    title = space.name;
    subtitle = `${(SPACE_KINDS[space.kind] || SPACE_KINDS.room).label}, ${m2(space.areaCm2)}`;
    body = <SpaceInspector key={space.id} space={space} />;
  } else if (stair) {
    title = 'Staircase';
    subtitle = 'Drag it on the plan to move it.';
    body = <StairInspector key={stair.id} stair={stair} />;
  } else if (opening) {
    title = opening.type === 'door' ? 'Door' : 'Window';
    subtitle = 'Set its width, or remove it.';
    body = <OpeningInspector key={opening.id} opening={opening} />;
  } else if (wall) {
    title = 'Wall';
    subtitle = 'Part of the walls you drew.';
    body = <WallInspector key={wall} wallKey={wall} />;
  }

  return (
    <div className={styles.inspector}>
      <InspectorShell
        label="Details"
        title={title}
        subtitle={subtitle}
        onBack={selected && body.type !== SummaryInspector ? () => select(null) : undefined}
        backLabel="Flat overview"
      >
        {body}
      </InspectorShell>
    </div>
  );
}
