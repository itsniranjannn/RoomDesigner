import React, { useRef, useState } from 'react';
import { DoorOpen, GripVertical, Plus, Square, Trash2 } from 'lucide-react';
import { useRoomStore, ROOM_MAX_CM, ROOM_MIN_CM } from '../../store/roomStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import {
  isResizable,
  moveSpan,
  resizeSpan,
  OPENING_LIMITS,
  WINDOW_MAX_CM,
  WINDOW_MIN_CM,
} from '../../engine/openings.js';
import {
  hasOutline,
  openingWallLength,
  outlineEdges,
  polygonArea,
} from '../../engine/roomShape.js';
import { hingeSides } from '../../engine/planning.js';
import { Button } from '../common/Button.jsx';
import { NumberField, SelectField } from '../common/Field.jsx';
import { Section, IconButton } from '../common/Section.jsx';
import { focusWhenReady } from '../layout/hooks.js';
import { InspectorShell } from './InspectorShell.jsx';
import { StylePanel } from '../preview3d/StylePicker.jsx';
import { styleOfRoom } from '../../data/stylePresets.js';
import styles from './Inspector.module.css';

const WALL_OPTIONS = [
  { value: 'top', label: 'Top wall' },
  { value: 'bottom', label: 'Bottom wall' },
  { value: 'left', label: 'Left wall' },
  { value: 'right', label: 'Right wall' },
];

const WINDOW_OPEN_OPTIONS = [
  { value: 'none', label: 'Does not open (fixed or sliding)' },
  { value: 'inward', label: 'Opens into the room' },
  { value: 'outward', label: 'Opens outwards' },
];

const SWING_OPTIONS = [
  { value: 'inward', label: 'Into the room' },
  { value: 'outward', label: 'Out of the room' },
];

/** Which side the leaf is hinged on, as seen standing inside the room facing the wall. */
function HingeField({ room, opening, type, onChange }) {
  const sides = hingeSides(room, opening, type);
  const current = opening.hingeSide === 'end' ? 'end' : 'start';
  return (
    <SelectField
      label="Hinged on"
      hint="As you face the wall from inside the room."
      options={[
        { value: sides.left, label: 'Left side' },
        { value: sides.right, label: 'Right side' },
      ]}
      value={current}
      onChange={(hingeSide) =>
        onChange(type, opening.id, { hingeSide: hingeSide === 'end' ? 'end' : undefined }, true)
      }
    />
  );
}

/**
 * The free stretch of wall an opening may use, and its neighbours on the same wall: the same
 * limits the drag on the plan works to (see RoomBoundary and OutlineBoundary), so a number typed
 * here and a drag end up in the same place. `step: 1` keeps a typed number exactly as typed; a
 * drag snaps to 10 cm because a pointer cannot be that precise.
 */
function openingBounds(room, type, opening) {
  const outlined = hasOutline(room);
  const margin = OPENING_LIMITS.cornerMargin;
  const edge = opening.edge ?? 0;
  const wall = opening.wall || (type === 'door' ? 'bottom' : 'top');
  const wallLength = outlined
    ? openingWallLength(room, { edge })
    : wall === 'left' || wall === 'right'
      ? room.depthCm
      : room.widthCm;
  const others = [
    ...(room.doors || []).map((o) => ({ o, wall: o.wall || 'bottom' })),
    ...(room.windows || []).map((o) => ({ o, wall: o.wall || 'top' })),
  ]
    .filter(
      ({ o, wall: w }) => o.id !== opening.id && (outlined ? (o.edge ?? 0) === edge : w === wall)
    )
    .map(({ o }) => ({ start: o.offsetCm, width: o.widthCm }));
  return { wallLength, lo: margin, hi: wallLength - margin, others, step: 1 };
}

/**
 * Where an opening sits along its wall, and how wide it is. Dragging on the plan was the only
 * way to move one, which left anyone working from the keyboard with the wall and the swing but
 * no way to say where on that wall the door goes.
 */
function OpeningPlacement({ room, type, opening, name }) {
  const updateOpening = useRoomStore((state) => state.updateOpening);
  const { wallLength, ...bounds } = openingBounds(room, type, opening);
  const margin = OPENING_LIMITS.cornerMargin;
  const maxOffset = Math.max(margin, wallLength - margin - opening.widthCm);
  const maxWidth = Math.min(WINDOW_MAX_CM, Math.max(WINDOW_MIN_CM, wallLength - margin * 2));
  // Which end of the wall the position is measured from, in the words the plan shows
  const fromEnd = hasOutline(room)
    ? 'the start of the wall'
    : opening.wall === 'left' || opening.wall === 'right'
      ? 'the top corner'
      : 'the left corner';

  return (
    <div className={styles.grid2}>
      <NumberField
        label="Position"
        suffix="cm"
        min={margin}
        max={maxOffset}
        step={5}
        value={opening.offsetCm}
        hint={`Along the wall, from ${fromEnd}.`}
        onCommit={(v) =>
          updateOpening(
            type,
            opening.id,
            {
              offsetCm: moveSpan({
                start: opening.offsetCm,
                width: opening.widthCm,
                delta: v - opening.offsetCm,
                ...bounds,
              }),
            },
            true
          )
        }
      />
      {isResizable(type) ? (
        <NumberField
          label="Width"
          suffix="cm"
          min={WINDOW_MIN_CM}
          max={maxWidth}
          step={5}
          value={opening.widthCm}
          hint={`${WINDOW_MIN_CM} to ${maxWidth} cm on this wall.`}
          onCommit={(v) => {
            const next = resizeSpan({
              side: 'end',
              start: opening.offsetCm,
              width: opening.widthCm,
              pointer: opening.offsetCm + v,
              ...bounds,
            });
            updateOpening(type, opening.id, { offsetCm: next.start, widthCm: next.width }, true);
          }}
        />
      ) : (
        <div className={styles.stat}>
          <span className={styles.statValue}>{opening.widthCm} cm</span>
          <span className={styles.statLabel}>Width ({name.toLowerCase()}s are one size)</span>
        </div>
      )}
    </div>
  );
}

function OpeningRow({ type, opening, index, canRemove, room }) {
  const updateOpening = useRoomStore((state) => state.updateOpening);
  const removeOpening = useRoomStore((state) => state.removeOpening);
  const isDoor = type === 'door';
  const name = isDoor ? 'Door' : 'Window';
  const outlined = hasOutline(room);
  const edgeOptions = outlined
    ? outlineEdges(room)
        .filter((e) => !e.open)
        .map((e) => ({
          value: String(e.i),
          label: `Wall ${e.i + 1} (${(e.len / 100).toFixed(1)} m)`,
        }))
    : [];
  // Under the dropdown, like the hint on "Hinged on" below: in a column beside it the note wrapped
  // to five ragged lines and split "90" from "cm".
  const sizeNote = isResizable(type)
    ? 'Set its width below, or drag its ends on the plan.'
    : 'A single door of one standard width. It slides along the wall but is not stretched.';

  return (
    <div className={styles.opening} data-opening={`${type}-${index + 1}`}>
      <div className={styles.openingHead}>
        <span className={styles.openingTitle}>
          {isDoor ? (
            <DoorOpen size={16} aria-hidden="true" />
          ) : (
            <Square size={16} aria-hidden="true" />
          )}
          {name} {index + 1}
        </span>
        {canRemove && (
          <IconButton
            label={`Remove ${name.toLowerCase()} ${index + 1}`}
            danger
            onClick={() => removeOpening(type, opening.id)}
          >
            <Trash2 size={16} />
          </IconButton>
        )}
      </div>
      {outlined ? (
        <SelectField
          label="Wall"
          hint={sizeNote}
          options={edgeOptions}
          value={String(opening.edge ?? 0)}
          onChange={(edge) => updateOpening(type, opening.id, { edge: Number(edge) }, true)}
        />
      ) : (
        <SelectField
          label="Wall"
          hint={sizeNote}
          options={WALL_OPTIONS}
          value={opening.wall || (isDoor ? 'bottom' : 'top')}
          onChange={(wall) => updateOpening(type, opening.id, { wall }, true)}
        />
      )}
      <OpeningPlacement room={room} type={type} opening={opening} name={name} />
      {isDoor ? (
        <>
          <SelectField
            label="Opens"
            options={SWING_OPTIONS}
            value={opening.swingDirection === 'outward' ? 'outward' : 'inward'}
            onChange={(swingDirection) => updateOpening(type, opening.id, { swingDirection }, true)}
          />
          <HingeField room={room} opening={opening} type={type} onChange={updateOpening} />
        </>
      ) : (
        <>
          <SelectField
            label="Window opens"
            options={WINDOW_OPEN_OPTIONS}
            value={
              opening.swing === 'inward' || opening.swing === 'outward' ? opening.swing : 'none'
            }
            onChange={(swing) =>
              updateOpening(type, opening.id, { swing: swing === 'none' ? undefined : swing }, true)
            }
          />
          {opening.swing && opening.widthCm <= 90 && (
            <HingeField room={room} opening={opening} type={type} onChange={updateOpening} />
          )}
        </>
      )}
    </div>
  );
}

function PieceList({ pieces }) {
  const selectItem = useRoomStore((state) => state.selectItem);
  const removeFurniture = useRoomStore((state) => state.removeFurniture);
  const moveFurnitureToIndex = useRoomStore((state) => state.moveFurnitureToIndex);
  const dragFrom = useRef(null);
  const [overIndex, setOverIndex] = useState(null);

  return (
    <ul className={styles.pieceList}>
      {pieces.map((piece, index) => {
        const def = resolveItemDef(piece);
        if (!def) return null;
        return (
          <li
            key={piece.id}
            className={`${styles.pieceRow} ${overIndex === index ? styles.pieceRowOver : ''}`}
            draggable
            onDragStart={(e) => {
              dragFrom.current = index;
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(index));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (overIndex !== index) setOverIndex(index);
            }}
            onDragLeave={() => overIndex === index && setOverIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const from = dragFrom.current;
              dragFrom.current = null;
              setOverIndex(null);
              if (from !== null && from !== index) moveFurnitureToIndex(from, index);
            }}
            onDragEnd={() => {
              dragFrom.current = null;
              setOverIndex(null);
            }}
          >
            <span className={styles.grip} title="Drag to change layer order" aria-hidden="true">
              <GripVertical size={16} />
            </span>
            <button
              type="button"
              className={styles.pieceSelect}
              onClick={() => {
                selectItem(piece.id);
                // This row is about to be replaced by the piece's own panel, so focus is
                // handed to that panel instead of being dropped onto <body>
                focusWhenReady('[data-inspector-back]');
              }}
            >
              <span className={styles.pieceRowName}>{def.name}</span>
              <span className={styles.pieceRowMeta}>
                {def.widthCm} x {def.depthCm} cm
              </span>
            </button>
            <IconButton
              label={`Remove ${def.name}`}
              danger
              onClick={() => removeFurniture(piece.id)}
            >
              <Trash2 size={16} />
            </IconButton>
          </li>
        );
      })}
    </ul>
  );
}

/** What a resize did, in plain words, for the line that is read out after it. */
function resizeWords({ widthCm, depthCm, movedPieces, movedOpenings, movedServices }) {
  const parts = [`The room is now ${widthCm} by ${depthCm} cm.`];
  if (movedPieces > 0)
    parts.push(
      movedPieces === 1
        ? '1 piece was brought inside the new walls.'
        : `${movedPieces} pieces were brought inside the new walls.`
    );
  if (movedOpenings > 0)
    parts.push(
      movedOpenings === 1
        ? '1 door or window was moved to fit its wall.'
        : `${movedOpenings} doors and windows were moved to fit their walls.`
    );
  if (movedServices > 0)
    parts.push(
      movedServices === 1
        ? '1 service point was moved onto the new walls.'
        : `${movedServices} service points were moved onto the new walls.`
    );
  parts.push('Undo puts the old size back.');
  return parts.join(' ');
}

/**
 * Width and depth of the room. A room used to be stuck at the size it was created with, so the
 * only way to change it was to start again and place the furniture a second time.
 */
function RoomSizeFields({ room }) {
  const resizeRoom = useRoomStore((state) => state.resizeRoom);
  const [done, setDone] = useState(null);
  const apply = (patch) => {
    const result = resizeRoom(patch.widthCm ?? room.widthCm, patch.depthCm ?? room.depthCm);
    if (result) setDone(resizeWords(result));
  };
  return (
    <>
      <div className={styles.grid2} data-room-size>
        <NumberField
          label="Width"
          suffix="cm"
          min={ROOM_MIN_CM}
          max={ROOM_MAX_CM}
          step={10}
          value={room.widthCm}
          onCommit={(v) => apply({ widthCm: v })}
        />
        <NumberField
          label="Depth"
          suffix="cm"
          min={ROOM_MIN_CM}
          max={ROOM_MAX_CM}
          step={10}
          value={room.depthCm}
          onCommit={(v) => apply({ depthCm: v })}
        />
      </div>
      <p className={styles.note}>
        Between {ROOM_MIN_CM} and {ROOM_MAX_CM} cm, as when a room is created. Furniture and
        openings that no longer fit are moved inside the new walls rather than lost.
      </p>
      {done && (
        <p className={styles.note} role="status">
          {done}
        </p>
      )}
    </>
  );
}

export function RoomPanel({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const addOpening = useRoomStore((state) => state.addOpening);
  const applyStyle = useRoomStore((state) => state.applyStyle);
  const resetStyle = useRoomStore((state) => state.resetStyle);
  const pieces = room.placedFurniture || [];
  const doors = room.doors || [];
  const windows = room.windows || [];
  // A room of a flat takes its shape from the walls drawn there, so its size is changed in the
  // flat designer and not here; the same goes for a room that is not a plain rectangle.
  const ownSize = !hasOutline(room) && !room.flatId;

  const area = (
    (hasOutline(room) ? polygonArea(room.outline) : room.widthCm * room.depthCm) / 10000
  ).toFixed(1);

  return (
    <InspectorShell
      label="Room details"
      title={room.name}
      subtitle="Select a piece on the plan to edit it."
      onClose={onClose}
    >
      <Section title="Room">
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {(room.widthCm / 100).toFixed(2)} x {(room.depthCm / 100).toFixed(2)} m
              {hasOutline(room) ? ' (outer)' : ''}
            </span>
            <span className={styles.statLabel}>Size</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{area} m²</span>
            <span className={styles.statLabel}>Area</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{pieces.length}</span>
            <span className={styles.statLabel}>{pieces.length === 1 ? 'Piece' : 'Pieces'}</span>
          </div>
        </div>
        {ownSize ? (
          <RoomSizeFields room={room} />
        ) : (
          <p className={styles.note}>
            {hasOutline(room)
              ? 'This room is not a plain rectangle, so its shape follows the walls it was drawn with.'
              : 'This room belongs to a flat. Change its size by moving the walls in the flat designer.'}
          </p>
        )}
      </Section>

      <Section title="Style">
        <StylePanel
          current={styleOfRoom(room)}
          hasStyle={!!room.styleApplied}
          onPick={(id) => applyStyle(id)}
          onReset={resetStyle}
        />
      </Section>

      <Section title="Doors and windows">
        {doors.map((door, i) => (
          <OpeningRow
            key={door.id}
            type="door"
            opening={door}
            room={room}
            index={i}
            canRemove={doors.length > 1}
          />
        ))}
        {windows.map((win, i) => (
          <OpeningRow
            key={win.id}
            type="window"
            opening={win}
            room={room}
            index={i}
            canRemove={windows.length > 1}
          />
        ))}
        <div className={styles.grid2}>
          <Button
            size="small"
            variant="secondary"
            icon={<Plus size={14} />}
            onClick={() => addOpening('door', 'bottom')}
          >
            Add door
          </Button>
          <Button
            size="small"
            variant="secondary"
            icon={<Plus size={14} />}
            onClick={() => addOpening('window', 'top')}
          >
            Add window
          </Button>
        </div>
        <p className={styles.note}>
          Set the position above to place a door or window exactly, or drag it along its wall on the
          plan.
        </p>
      </Section>

      <Section title={`Pieces (${pieces.length})`}>
        {pieces.length === 0 ? (
          <p className={styles.empty}>
            Nothing here yet. Choose a piece from the furniture list to add it.
          </p>
        ) : (
          <>
            <PieceList pieces={pieces} />
            <p className={styles.note}>Drag a row to change which piece sits on top.</p>
          </>
        )}
      </Section>
    </InspectorShell>
  );
}
