/**
 * cost.js
 * Bill of materials with estimated prices (NPR). Prices are heuristic estimates
 * from category rates and volume unless a per-item price override is set.
 */

import { resolveItemDef } from '../data/furnitureCatalog.js';

// NPR per cubic metre of bounding volume, by category
const RATE_PER_M3 = {
  living: 42000,
  bedroom: 38000,
  nepali: 36000,
  dining_office: 40000,
  kitchen: 52000,
  decor: 30000,
  bathroom: 90000,
  custom: 35000,
};

export function estimatePriceNpr(def) {
  if (!def) return 0;
  if (Number.isFinite(def.priceNpr)) return Math.round(def.priceNpr);
  const volumeM3 = (def.widthCm * def.depthCm * (def.heightCm || 50)) / 1e6;
  const rate = RATE_PER_M3[def.category] || 35000;
  const raw = Math.max(1500, volumeM3 * rate);
  return Math.round(raw / 100) * 100;
}

/** Groups placed items by type + size + finish and totals the cost. */
export function buildBillOfMaterials(room) {
  const rows = new Map();
  let total = 0;
  for (const item of room?.placedFurniture || []) {
    const def = resolveItemDef(item);
    if (!def) continue;
    const unit = estimatePriceNpr(def);
    const key = `${item.furnitureTypeId}|${def.widthCm}x${def.depthCm}x${def.heightCm}|${def.color}|${unit}`;
    const row = rows.get(key) || {
      key,
      name: def.name,
      sizeLabel: `${def.widthCm} × ${def.depthCm} × ${def.heightCm} cm`,
      color: def.color,
      unitPrice: unit,
      qty: 0,
      subtotal: 0,
    };
    row.qty += 1;
    row.subtotal += unit;
    total += unit;
    rows.set(key, row);
  }
  return { rows: Array.from(rows.values()), total };
}

export function formatNpr(value) {
  return `NPR ${Math.round(value).toLocaleString('en-US')}`;
}

export function billToCsv(bill) {
  const lines = ['Item,Size,Qty,Unit price (NPR),Subtotal (NPR)'];
  for (const r of bill.rows) {
    lines.push(`"${r.name.replace(/"/g, '""')}","${r.sizeLabel}",${r.qty},${r.unitPrice},${r.subtotal}`);
  }
  lines.push(`Total,,,,${bill.total}`);
  return lines.join('\n');
}
