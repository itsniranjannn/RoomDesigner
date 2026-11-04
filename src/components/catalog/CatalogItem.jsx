import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ArchitecturalSilhouette } from '../canvas/ArchitecturalSilhouette.jsx';
import styles from './CatalogItem.module.css';

export function CatalogItem({ item, onSelect, onDelete }) {
  // Fit the plan symbol inside the 100 x 70 preview box
  const scale = Math.min(84 / item.widthCm, 54 / item.depthCm);
  const previewW = item.widthCm * scale;
  const previewD = item.depthCm * scale;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        furnitureTypeId: item.id,
        widthCm: item.widthCm,
        depthCm: item.depthCm,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={styles.cell}>
      <div
        className={styles.card}
        draggable
        onDragStart={handleDragStart}
        onClick={() => onSelect(item.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item.id);
          }
        }}
        aria-label={`Add ${item.name}, ${item.widthCm} by ${item.depthCm} centimeters`}
        title="Click to add, or drag into the room"
      >
        <div className={styles.preview}>
          <svg
            width="100%"
            height="100%"
            viewBox="-50 -35 100 70"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <ArchitecturalSilhouette item={item} widthCm={previewW} depthCm={previewD} isSwatch />
          </svg>
          <span className={styles.plus} aria-hidden="true">
            <Plus size={14} />
          </span>
        </div>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.size}>
          {item.widthCm} x {item.depthCm} cm
        </span>
      </div>
      {onDelete && (
        <button
          type="button"
          className={styles.remove}
          aria-label={`Delete ${item.name} from My furniture`}
          title="Delete from My furniture"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
