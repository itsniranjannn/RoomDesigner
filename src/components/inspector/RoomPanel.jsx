import React, { useRef, useState } from 'react';
import { DoorOpen, GripVertical, Plus, Square, Trash2 } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { isResizable } from '../../engine/openings.js';
import { hasOutline, outlineEdges, polygonArea } from '../../engine/roomShape.js';
import { hingeSides } from '../../engine/planning.js';
import { Button } from '../common/Button.jsx';
import { SelectField } from '../common/Field.jsx';
import { Section, IconButton } from '../common/Section.jsx';
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

  return (
    <div className={styles.opening}>
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
      <div className={styles.wallRow}>
        {outlined ? (
          <SelectField
            label="Wall"
            options={edgeOptions}
            value={String(opening.edge ?? 0)}
            onChange={(edge) => updateOpening(type, opening.id, { edge: Number(edge) }, true)}
          />
        ) : (
          <SelectField
            label="Wall"
            options={WALL_OPTIONS}
            value={opening.wall || (isDoor ? 'bottom' : 'top')}
            onChange={(wall) => updateOpening(type, opening.id, { wall }, true)}
          />
        )}
        <p className={styles.note}>
          {isResizable(type)
            ? `${opening.widthCm} cm wide. Drag its ends on the plan to stretch it.`
            : `Single door, ${opening.widthCm} cm. It slides along the wall but is not stretched.`}
        </p>
      </div>
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
              onClick={() => selectItem(piece.id)}
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

export function RoomPanel({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const addOpening = useRoomStore((state) => state.addOpening);
  const applyStyle = useRoomStore((state) => state.applyStyle);
  const resetStyle = useRoomStore((state) => state.resetStyle);
  const pieces = room.placedFurniture || [];
  const doors = room.doors || [];
  const windows = room.windows || [];

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
      </Section>

      <Section title="Style">
        <StylePanel
          current={styleOfRoom(room)}
          hasStyle={!!room.styleApplied}
          onPick={(id) => applyStyle(id)}
          onReset={resetStyle}
        />
      </Section>

      <Section title="Doors & windows">
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
        <p className={styles.note}>Drag a door or window along its wall on the plan to move it.</p>
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
