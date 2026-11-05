import { resolveItemDef } from '../../data/furnitureCatalog.js';

/** Shape types of the lamps in the catalog. */
const LAMP_SHAPES = new Set(['lamp', 'lamp-tripod', 'lamp-torchiere', 'table-lamp']);

export const isLampShape = (shapeType) => LAMP_SHAPES.has(shapeType);

/**
 * Where the light of each lamp sits, in metres relative to the room centre (x, y up, z).
 * Pieces standing on a surface add the surface height (elevation) to the height of the shade.
 * @returns {{ id: string, x: number, y: number, z: number, tall: boolean }[]}
 */
export function collectLamps(items, roomWidthCm, roomDepthCm, resolve = resolveItemDef) {
  const out = [];
  for (const item of items || []) {
    const def = resolve(item);
    if (!def || !isLampShape(def.shapeType)) continue;
    const h = (def.heightCm || 50) / 100;
    out.push({
      id: item.id,
      x: (item.x - roomWidthCm / 2) / 100,
      y: (item.elevationCm || 0) / 100 + h * 0.88,
      z: (item.y - roomDepthCm / 2) / 100,
      tall: h > 1,
    });
  }
  return out;
}
