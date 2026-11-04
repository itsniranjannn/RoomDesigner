import React, { useRef } from 'react';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { FURNITURE_CATEGORIES } from '../../data/furnitureCatalog.js';
import { ArchitecturalSilhouette } from '../canvas/ArchitecturalSilhouette.jsx';
import { Button } from '../common/Button.jsx';
import { RangeField, Segmented } from '../common/Field.jsx';
import { Section } from '../common/Section.jsx';
import { InspectorShell } from './InspectorShell.jsx';
import { FinishSection, SizeSection } from './PieceSections.jsx';
import styles from './Inspector.module.css';

const QUICK_ANGLES = [0, 90, 180, 270].map((deg) => ({ value: deg, label: `${deg}°` }));

export function PiecePanel({ item, def, onClose }) {
  const room = useRoomStore((state) => state.room);
  const deselectItem = useRoomStore((state) => state.deselectItem);
  const updateFurnitureRotation = useRoomStore((state) => state.updateFurnitureRotation);
  const reorderFurniture = useRoomStore((state) => state.reorderFurniture);
  const duplicateFurniture = useRoomStore((state) => state.duplicateFurniture);
  const removeFurniture = useRoomStore((state) => state.removeFurniture);

  // While the slider moves, rotation is applied live; one undo step is added when the gesture ends
  const sliderStart = useRef(null); // { snapshot, value }

  const rotation = Math.round(item.rotationDeg || 0) % 360;
  const index = room.placedFurniture.findIndex((p) => p.id === item.id);
  const lastIndex = room.placedFurniture.length - 1;
  const categoryName = FURNITURE_CATEGORIES.find((c) => c.id === def.category)?.name || '';

  const beginSlide = () => {
    if (sliderStart.current) return;
    sliderStart.current = { snapshot: useRoomStore.getState().getCurrentSnapshot(), value: rotation };
  };
  const endSlide = () => {
    const start = sliderStart.current;
    sliderStart.current = null;
    if (start && start.value !== rotation) useRoomStore.getState().pushExplicitSnapshot(start.snapshot);
  };

  const previewScale = Math.min(72 / def.widthCm, 44 / def.depthCm);

  return (
    <InspectorShell
      label="Selected piece"
      title={def.name}
      subtitle={categoryName || 'Selected piece'}
      media={
        <svg className={styles.pieceThumb} viewBox="-40 -25 80 50" aria-hidden="true">
          <ArchitecturalSilhouette item={def} widthCm={def.widthCm * previewScale} depthCm={def.depthCm * previewScale} isSwatch />
        </svg>
      }
      onClose={onClose}
      onBack={deselectItem}
      backLabel="Room overview"
      footer={
        <>
          <Button variant="secondary" icon={<Copy size={16} />} onClick={() => duplicateFurniture(item.id)}>Duplicate</Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => removeFurniture(item.id)}>Delete</Button>
        </>
      }
    >
      <SizeSection item={item} def={def} />
      <FinishSection item={item} def={def} />

      <Section title="Position & rotation">
        <div className={styles.grid2}>
          <div className={styles.readout}>
            <span className={styles.readoutLabel}>From left wall</span>
            <span className={styles.readoutValue}>{Math.round(item.x)} cm</span>
          </div>
          <div className={styles.readout}>
            <span className={styles.readoutLabel}>From top wall</span>
            <span className={styles.readoutValue}>{Math.round(item.y)} cm</span>
          </div>
        </div>
        <RangeField
          label="Rotation"
          min={0}
          max={359}
          value={rotation}
          valueLabel={`${rotation}°`}
          onChange={(v) => updateFurnitureRotation(item.id, v, false)}
          onPointerDown={beginSlide}
          onPointerUp={endSlide}
          onKeyDown={beginSlide}
          onKeyUp={endSlide}
          onBlur={endSlide}
        />
        <Segmented
          ariaLabel="Quick rotation"
          options={QUICK_ANGLES}
          value={rotation}
          onChange={(deg) => updateFurnitureRotation(item.id, deg, true)}
          size="small"
          fill
        />
        <p className={styles.note}>Drag the piece on the plan to move it. Press R to turn it in 15 degree steps.</p>
      </Section>

      <Section title="Layer order">
        <div className={styles.grid2}>
          <Button
            variant="secondary"
            size="small"
            icon={<ArrowDown size={14} />}
            onClick={() => reorderFurniture(item.id, 'down')}
            disabled={index <= 0}
          >
            Send backward
          </Button>
          <Button
            variant="secondary"
            size="small"
            icon={<ArrowUp size={14} />}
            onClick={() => reorderFurniture(item.id, 'up')}
            disabled={index === lastIndex}
          >
            Bring forward
          </Button>
        </div>
        <p className={styles.note}>Pieces further forward are drawn on top, such as a table over a rug.</p>
      </Section>
    </InspectorShell>
  );
}
