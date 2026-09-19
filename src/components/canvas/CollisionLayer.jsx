import React from 'react';
import { getRotatedRectCorners } from '../../engine/geometry.js';
import { getFurnitureType } from '../../data/furnitureCatalog.js';

/**
 * CollisionLayer.jsx
 * Renders subtle warning halos and dashed outlines over colliding furniture items.
 * Adheres strictly to the spec: soft clay pulse at low opacity, never jarring red.
 */
export function CollisionLayer({ placedFurniture, collidingItemIds }) {
  if (!collidingItemIds || collidingItemIds.size === 0) return null;

  return (
    <g className="collision-layer" pointerEvents="none">
      <style>{`
        @keyframes softCollisionPulse {
          0% {
            opacity: 0.25;
            stroke-width: 2.5px;
          }
          50% {
            opacity: 0.65;
            stroke-width: 4px;
          }
          100% {
            opacity: 0.25;
            stroke-width: 2.5px;
          }
        }
        .colliding-pulse {
          animation: softCollisionPulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {placedFurniture.map((item) => {
        if (!collidingItemIds.has(item.id)) return null;

        const def = getFurnitureType(item.furnitureTypeId);
        const width = def ? def.widthCm : 50;
        const depth = def ? def.depthCm : 50;

        const corners = getRotatedRectCorners(
          item.x,
          item.y,
          width + 6,
          depth + 6,
          item.rotationDeg || 0
        );

        const pathPoints = corners.map((p) => `${p.x},${p.y}`).join(' ');

        return (
          <g key={`collision-${item.id}`}>
            {/* Soft clay warning fill */}
            <polygon
              points={pathPoints}
              fill="var(--color-warning)"
              opacity="0.3"
            />
            {/* Pulsing dashed clay outline */}
            <polygon
              className="colliding-pulse"
              points={pathPoints}
              fill="none"
              stroke="var(--color-clay)"
              strokeDasharray="4 4"
            />
          </g>
        );
      })}
    </g>
  );
}

