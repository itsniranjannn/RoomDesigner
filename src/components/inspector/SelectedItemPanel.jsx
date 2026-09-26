import React, { useRef } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { getFurnitureType } from '../../data/furnitureCatalog.js';
import { Button } from '../common/Button.jsx';
import { ArchitecturalSelect } from '../common/ArchitecturalSelect.jsx';
import { Copy, Trash2, X, Compass, Layers, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import styles from './SelectedItemPanel.module.css';

const WALL_OPTIONS = [
  { value: 'top', label: 'North Wall (Top)' },
  { value: 'bottom', label: 'South Wall (Bottom)' },
  { value: 'left', label: 'West Wall (Left)' },
  { value: 'right', label: 'East Wall (Right)' },
];

const SWING_OPTIONS = [
  { value: 'inward', label: 'Swing: Inward' },
  { value: 'outward', label: 'Swing: Outward' },
];

export function SelectedItemPanel() {
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const selectItem = useRoomStore((state) => state.selectItem);
  const deselectItem = useRoomStore((state) => state.deselectItem);
  const room = useRoomStore((state) => state.room);
  const updateFurnitureRotation = useRoomStore((state) => state.updateFurnitureRotation);
  const removeFurniture = useRoomStore((state) => state.removeFurniture);
  const duplicateFurniture = useRoomStore((state) => state.duplicateFurniture);
  const reorderFurniture = useRoomStore((state) => state.reorderFurniture);
  const moveFurnitureToIndex = useRoomStore((state) => state.moveFurnitureToIndex);

  const sliderStartSnapshot = useRef(null);
  const sliderStartVal = useRef(0);
  const dragItemIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);

  if (!room) return null;

  const placedFurniture = room.placedFurniture || [];
  const selectedItem = placedFurniture.find((i) => i.id === selectedItemId);
  const def = selectedItem ? getFurnitureType(selectedItem.furnitureTypeId) : null;

  const widthM = (room.widthCm / 100).toFixed(2);
  const depthM = (room.depthCm / 100).toFixed(2);
  const areaM2 = ((room.widthCm * room.depthCm) / 10000).toFixed(1);

  // If a piece is selected, render item properties inspector
  if (selectedItem && def) {
    const rotation = selectedItem.rotationDeg || 0;

    return (
      <aside
        className={styles.inspectorPanel}
        aria-label="Selected piece inspector"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.itemMeta}>
            <div className={styles.specCodeTag}>
              {def.category.toUpperCase()} // {def.id.toUpperCase()}
            </div>
            <h3 className={styles.title}>{def.name}</h3>
            {def.color && (
              <div className={styles.finishCallout}>
                <span
                  className={styles.finishSwatchDot}
                  style={{ backgroundColor: def.color }}
                  aria-hidden="true"
                />
                <span className={styles.finishLabel}>SPECIFIED FINISH</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="small"
            onClick={deselectItem}
            aria-label="Deselect piece"
          >
            <X size={14} />
          </Button>
        </div>

        <div className={styles.body}>
          {/* Real-world dimensions */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Dimensions</span>
            <div className={styles.dimensionGrid}>
              <div className={styles.dimBox}>
                <span className={styles.dimLabel}>Width</span>
                <span className={styles.dimValue}>{def.widthCm} cm</span>
              </div>
              <div className={styles.dimBox}>
                <span className={styles.dimLabel}>Depth</span>
                <span className={styles.dimValue}>{def.depthCm} cm</span>
              </div>
              <div className={styles.dimBox}>
                <span className={styles.dimLabel}>Height</span>
                <span className={styles.dimValue}>{def.heightCm} cm</span>
              </div>
            </div>
          </div>

          {/* Position Coordinates */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Room Coordinates</span>
            <div className={styles.positionRow}>
              <div className={styles.posBox}>
                <span className={styles.dimLabel}>X</span>
                <span className={styles.dimValue}>{Math.round(selectedItem.x)} cm</span>
              </div>
              <div className={styles.posBox}>
                <span className={styles.dimLabel}>Y</span>
                <span className={styles.dimValue}>{Math.round(selectedItem.y)} cm</span>
              </div>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Rotation</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span className={styles.sectionLabel}>Rotation & Transform</span>
              <span className={styles.angleReadout}>{Math.round(rotation)}°</span>
            </div>

            <div className={styles.rotationRow}>
              {/* Continuous Scrub Slider */}
              <div className={styles.sliderContainer}>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={rotation}
                  onMouseDown={() => {
                    sliderStartSnapshot.current = useRoomStore.getState().getCurrentSnapshot();
                    sliderStartVal.current = rotation;
                  }}
                  onTouchStart={() => {
                    sliderStartSnapshot.current = useRoomStore.getState().getCurrentSnapshot();
                    sliderStartVal.current = rotation;
                  }}
                  onChange={(e) => updateFurnitureRotation(selectedItem.id, Number(e.target.value), false)}
                  onMouseUp={() => {
                    if (sliderStartSnapshot.current && Math.round(rotation) !== Math.round(sliderStartVal.current)) {
                      useRoomStore.getState().pushExplicitSnapshot(sliderStartSnapshot.current);
                    }
                    sliderStartSnapshot.current = null;
                  }}
                  onTouchEnd={() => {
                    if (sliderStartSnapshot.current && Math.round(rotation) !== Math.round(sliderStartVal.current)) {
                      useRoomStore.getState().pushExplicitSnapshot(sliderStartSnapshot.current);
                    }
                    sliderStartSnapshot.current = null;
                  }}
                  onBlur={() => {
                    if (sliderStartSnapshot.current && Math.round(rotation) !== Math.round(sliderStartVal.current)) {
                      useRoomStore.getState().pushExplicitSnapshot(sliderStartSnapshot.current);
                    }
                    sliderStartSnapshot.current = null;
                  }}
                  className={styles.rangeSlider}
                  aria-label="Rotate piece"
                />
                <span className={styles.angleReadout}>{rotation}°</span>
              </div>

              {/* 1-Click Cardinal Wall Alignment Buttons */}
              <div className={styles.cardinalRow}>
                {[
                  { label: '0° N', deg: 0 },
                  { label: '90° E', deg: 90 },
                  { label: '180° S', deg: 180 },
                  { label: '270° W', deg: 270 },
                ].map(({ label, deg }) => (
                  <button
                    key={deg}
                    type="button"
                    className={`${styles.cardinalBtn} ${Math.round(rotation) % 360 === deg ? styles.cardinalActive : ''}`}
                    onClick={() => updateFurnitureRotation(selectedItem.id, deg, true)}
                    title={`Align to ${label}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Stepper Nudge Buttons */}
              <div className={styles.quickButtons}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => updateFurnitureRotation(selectedItem.id, rotation - 45, true)}
                  title="Rotate -45° counter-clockwise"
                >
                  -45°
                </button>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => updateFurnitureRotation(selectedItem.id, rotation - 15, true)}
                  title="Rotate -15° counter-clockwise"
                >
                  -15°
                </button>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => updateFurnitureRotation(selectedItem.id, rotation + 15, true)}
                  title="Rotate +15° clockwise"
                >
                  +15°
                </button>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => updateFurnitureRotation(selectedItem.id, rotation + 45, true)}
                  title="Rotate +45° clockwise"
                >
                  +45°
                </button>
              </div>
            </div>
          </div>

          {/* Shortcuts Guide */}
          <div className={styles.shortcutsNote}>
            <strong>Drafting tips:</strong>
            <br />
            • Arrow keys to nudge (1cm)
            <br />
            • Shift + Arrow to nudge (10cm)
            <br />
            • R to rotate 15° (Shift+R for 45°)
            <br />
            • Delete or Backspace to remove
          </div>

          {/* Stacking Order / Layering */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Stacking Order (Layers)</span>
            <div className={styles.actionRow}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => reorderFurniture(selectedItem.id, 'down')}
                disabled={placedFurniture.findIndex((item) => item.id === selectedItem.id) === 0}
                icon={<ArrowDown size={13} />}
                title="Send Backward (behind other pieces, e.g. put rug under table)"
              >
                Send Back
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => reorderFurniture(selectedItem.id, 'up')}
                disabled={placedFurniture.findIndex((item) => item.id === selectedItem.id) === placedFurniture.length - 1}
                icon={<ArrowUp size={13} />}
                title="Bring Forward (above other pieces, e.g. put table over rug)"
              >
                Bring Front
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <div className={styles.actionRow}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => duplicateFurniture(selectedItem.id)}
                icon={<Copy size={13} />}
              >
                Duplicate
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => removeFurniture(selectedItem.id)}
                icon={<Trash2 size={13} />}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Room Overview Mode (when no piece is selected)
  return (
    <aside
      className={styles.inspectorPanel}
      aria-label="Room inspector"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <div className={styles.itemMeta}>
          <h3 className={styles.title}>{room.name}</h3>
          <span className={styles.categoryTag}>Architectural Plan</span>
        </div>
      </div>

      <div className={styles.body}>
        {/* Room Metrics */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Room Dimensions</span>
          <div className={styles.dimensionGrid}>
            <div className={styles.dimBox}>
              <span className={styles.dimLabel}>Width</span>
              <span className={styles.dimValue}>{widthM}m</span>
            </div>
            <div className={styles.dimBox}>
              <span className={styles.dimLabel}>Depth</span>
              <span className={styles.dimValue}>{depthM}m</span>
            </div>
            <div className={styles.dimBox}>
              <span className={styles.dimLabel}>Area</span>
              <span className={styles.dimValue}>{areaM2}m²</span>
            </div>
          </div>
        </div>

        {/* Placed Furniture List */}
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className={styles.sectionLabel}>Placed Furniture</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
              {placedFurniture.length} items
            </span>
          </div>

          {placedFurniture.length === 0 ? (
            <p className={styles.emptyStateMsg}>
              No furniture placed yet. Click any piece in the left catalog to add.
            </p>
          ) : (
            <div className={styles.placedList}>
              {placedFurniture.map((item, index) => {
                const itemDef = getFurnitureType(item.furnitureTypeId);
                if (!itemDef) return null;
                const isBeingDragged = dragItemIndexRef.current === index;
                const isTargetOver = dragOverIndex === index;

                return (
                  <div
                    key={item.id}
                    className={`${styles.placedItemCard} ${
                      isBeingDragged ? styles.placedItemCardDragging : ''
                    } ${isTargetOver ? styles.placedItemCardDragOver : ''}`}
                    tabIndex={0}
                    role="button"
                    draggable
                    onDragStart={(e) => {
                      dragItemIndexRef.current = index;
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIndex !== index) {
                        setDragOverIndex(index);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === index) {
                        setDragOverIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const from = dragItemIndexRef.current;
                      const to = index;
                      dragItemIndexRef.current = null;
                      setDragOverIndex(null);
                      if (from !== null && from !== to) {
                        moveFurnitureToIndex(from, to);
                      }
                    }}
                    onDragEnd={() => {
                      dragItemIndexRef.current = null;
                      setDragOverIndex(null);
                    }}
                    aria-label={`Select ${itemDef.name}, ${itemDef.widthCm} by ${itemDef.depthCm} centimeters. Drag to reorder layer.`}
                    onClick={() => {
                      // Only select if user clicked intentionally, not finished dragging
                      if (dragItemIndexRef.current === null) {
                        selectItem(item.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectItem(item.id);
                      }
                    }}
                    title="Click to inspect · Drag up/down to reorder layers"
                  >
                    <div
                      className={styles.dragHandle}
                      title="Drag to change layer order"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={14} />
                    </div>
                    <div className={styles.placedItemInfo}>
                      <span className={styles.placedItemName}>{itemDef.name}</span>
                      <span className={styles.placedItemDims}>
                        {itemDef.widthCm} × {itemDef.depthCm} cm · {item.rotationDeg || 0}°
                      </span>
                    </div>
                    <div className={styles.placedItemControls} onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => removeFurniture(item.id)}
                        title="Remove piece"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Doors & Windows Section */}
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className={styles.sectionLabel}>Doors & Windows</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => useRoomStore.getState().addOpening('window', 'top')}
                title="Add window"
              >
                + Window
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => useRoomStore.getState().addOpening('door', 'bottom')}
                title="Add door"
              >
                + Door
              </Button>
            </div>
          </div>

          <div className={styles.openingsList}>
            {(room.windows || []).map((win) => (
              <div key={win.id} className={styles.openingCard}>
                <div className={styles.openingHeader}>
                  <div className={styles.openingHeaderLeft}>
                    <span className={styles.openingTypeTitle}>Window</span>
                    <span className={styles.openingDimsTag}>{win.widthCm} cm</span>
                  </div>
                  {(room.windows || []).length > 1 && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => useRoomStore.getState().removeOpening('window', win.id)}
                      title="Remove window"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>

                <div className={styles.openingControlsSingle}>
                  <ArchitecturalSelect
                    value={win.wall || 'top'}
                    onChange={(val) => useRoomStore.getState().updateOpening('window', win.id, { wall: val }, true)}
                    options={WALL_OPTIONS}
                    title="Select wall for window"
                  />
                  <span className={styles.openingPosTag}>Pos: {win.offsetCm}cm</span>
                </div>
              </div>
            ))}

            {(room.doors || []).map((door) => (
              <div key={door.id} className={styles.openingCard}>
                <div className={styles.openingHeader}>
                  <div className={styles.openingHeaderLeft}>
                    <span className={styles.openingTypeTitle}>Door</span>
                    <span className={styles.openingDimsTag}>{door.widthCm} cm</span>
                    <span className={styles.openingPosTag}>Pos: {door.offsetCm}cm</span>
                  </div>
                  {(room.doors || []).length > 1 && (
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => useRoomStore.getState().removeOpening('door', door.id)}
                      title="Remove door"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>

                <div className={styles.openingControlsRow}>
                  <div className={styles.selectCol}>
                    <ArchitecturalSelect
                      value={door.wall || 'bottom'}
                      onChange={(val) => useRoomStore.getState().updateOpening('door', door.id, { wall: val }, true)}
                      options={WALL_OPTIONS}
                      title="Select wall for door"
                    />
                  </div>

                  <div className={styles.selectCol}>
                    <ArchitecturalSelect
                      value={door.swingDirection === 'outward' ? 'outward' : 'inward'}
                      onChange={(val) => useRoomStore.getState().updateOpening('door', door.id, { swingDirection: val }, true)}
                      options={SWING_OPTIONS}
                      title="Door swing direction"
                      menuAlign="right"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drafting Guide */}
        <div className={styles.shortcutsNote}>
          <strong>Drafting Tips:</strong>
          <br />
          • Click pieces to drag and reposition
          <br />
          • Pieces snap flush against walls
          • Drag the top knob on a piece to rotate
          <br />
          • Overlapping items pulse softly
          • Drag doors/windows along walls to move
          <br />
          • Drag opening edge tabs to resize width
          <br />
          • Toggle 3D Studio in the top bar
        </div>
      </div>
    </aside>
  );
}
