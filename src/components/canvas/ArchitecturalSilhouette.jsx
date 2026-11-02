import { resolveSilhouette } from './silhouettes/index.js';

/**
 * ArchitecturalSilhouette.jsx
 * Professional, category-differentiated 2D architectural drafting graphics.
 * Used both on the 2D drafting canvas and in catalog swatch previews.
 * Thin dispatcher: each shapeType is drawn by a module under ./silhouettes.
 *
 * Coordinates: Centered at (0, 0) with dimensions widthCm x depthCm.
 */
export function ArchitecturalSilhouette({ item, widthCm, depthCm, isSwatch = false }) {
  const {
    color = '#8B6F47',
    fabricColor = '#FAF6EE',
    headboardColor = '#5A554E',
    accentColor = '#C4B8A5',
    cushionColor = '#4A5057',
    subColor = '#323639',
    handleColor = '#C4A869',
    shapeType = 'table',
  } = item;

  const Shape = resolveSilhouette(shapeType);

  return (
    <Shape
      item={item}
      widthCm={widthCm}
      depthCm={depthCm}
      isSwatch={isSwatch}
      hw={widthCm / 2}
      hd={depthCm / 2}
      color={color}
      fabricColor={fabricColor}
      headboardColor={headboardColor}
      accentColor={accentColor}
      cushionColor={cushionColor}
      subColor={subColor}
      handleColor={handleColor}
    />
  );
}
