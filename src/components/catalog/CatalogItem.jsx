import React from 'react';
import { ArchitecturalSilhouette } from '../canvas/ArchitecturalSilhouette.jsx';
import styles from './CatalogItem.module.css';

export function CatalogItem({ item, onSelect }) {
  // Scale piece to fit nicely within the 100x70 SVG swatch box
  const maxDim = Math.max(item.widthCm, item.depthCm);
  const scale = 56 / maxDim;
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
    <div
      className={styles.card}
      draggable={true}
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
      title={`Drag onto room or click to add ${item.name}`}
    >
      <div className={styles.swatchPreview}>
        <svg
          width="100%"
          height="100%"
          viewBox="-50 -35 100 70"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <ArchitecturalSilhouette
            item={item}
            widthCm={previewW}
            depthCm={previewD}
            isSwatch={true}
          />
        </svg>
      </div>

      <div className={styles.cardContent}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={styles.itemDimensions}>
          {item.widthCm} × {item.depthCm} cm
        </span>
      </div>
    </div>
  );
}
