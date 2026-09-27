import React from 'react';
import { getRotatedRectCorners } from '../../engine/geometry.js';
import { getFurnitureType } from '../../data/furnitureCatalog.js';

/**
 * CollisionLayer.jsx
 * Architectural spatial clash detection layer.
 * Uses 45-degree diagonal warning cross-hatch pattern with pulsing terracotta/maroon borders.
 * Conveys clear architectural conflict without jarring neon reds.
 */
export function CollisionLayer({ placedFurniture, collidingItemIds }) {
  if (!collidingItemIds || collidingItemIds.size === 0) return null;

  return (
    <g className="collision-layer" pointerEvents="none">
      <defs>
        {/* Architectural 45-degree diagonal collision hatch pattern */}
        <pattern
          id="architecturalCollisionHatch"
          width="10"
          height="10"
          patternTransform="rotate(45 0 0)"
          patternUnits="userSpaceOnUse"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="10"
            stroke="#B25D34"
            strokeWidth="1.4"
            opacity="0.65"
          />
        </pattern>
      </defs>

      <style>{`
        @keyframes architecturalClashPulse {
          0% {
            opacity: 0.45;
            stroke-width: 1.8px;
          }
          50% {
            opacity: 0.95;
            stroke-width: 2.8px;
          }
          100% {
            opacity: 0.45;
            stroke-width: 1.8px;
          }
        }
        .colliding-pulse-border {
          animation: architecturalClashPulse 1.6s ease-in-out infinite;
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
            {/* Base soft clay warning tint */}
            <polygon
              points={pathPoints}
              fill="rgba(178, 93, 52, 0.16)"
            />

            {/* Architectural diagonal cross-hatching fill */}
            <polygon
              points={pathPoints}
              fill="url(#architecturalCollisionHatch)"
            />

            {/* Pulsing dashed deep-maroon warning outline */}
            <polygon
              className="colliding-pulse-border"
              points={pathPoints}
              fill="none"
              stroke="#8B2635"
              strokeDasharray="5 3"
            />
          </g>
        );
      })}
    </g>
  );
}
