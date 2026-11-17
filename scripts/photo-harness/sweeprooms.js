// Builds room files (the format the Share dialog's "Open a design file" takes) holding every piece a photo can
// produce, so the models can be looked at in the room's 3D view and on the plan.
//   node scripts/photo-harness/sweeprooms.js <outDir>
// Each room is a page of the sweep: the default record of every type, the fullest record of every type, every
// type at the smallest and the largest size the store allows, and one page per type with every trait option.
import fs from 'node:fs';
import path from 'node:path';
import { DESIGN_TYPES, sanitizeDesign, TYPICAL_WIDTH_CM } from '../../src/engine/design.js';
import { TRAIT_CONTROLS } from '../../src/engine/traitControls.js';

const outDir = process.argv[2] || 'sweep';
fs.mkdirSync(outDir, { recursive: true });

const PALETTE = {
  body: '#9a7b5c',
  cushion: '#c8bca8',
  accent: '#7c6a58',
  leg: '#4a3a2c',
  arm: '#9a7b5c',
  frame: '#6b4f33',
  trim: '#c8a24a',
  base: '#7a6248',
  sheet: '#efe7da',
  pillow: '#f6f1e6',
  panel: '#8a6a4a',
  door: '#d8d2c6',
  scatter: '#b06a5a',
  top: '#d8d2c6',
  shelf: '#c8bca8',
};

/** The record a type gets with nothing read from a photo beyond its type. */
const baseRecord = (type) => ({ v: 1, type, palette: { ...PALETTE }, traits: {} });

/** Every trait option the dialog offers for a type, one record each. */
function variants(type) {
  const out = [{ name: `${type}-default`, design: baseRecord(type) }];
  const full = baseRecord(type);
  for (const control of TRAIT_CONTROLS[type] || []) {
    for (const [value] of control.options || []) {
      const design = baseRecord(type);
      design.traits = { ...design.traits, [control.key]: value };
      out.push({ name: `${type}-${control.key}-${value}`, design });
    }
    // the fullest record: the last option of every control at once
    const options = control.options || [];
    if (options.length) full.traits[control.key] = options[options.length - 1][0];
  }
  out.push({ name: `${type}-everything`, design: full });
  return out;
}

const size = (type, scale) => {
  const w = TYPICAL_WIDTH_CM[type] || 80;
  const k = scale === 'tiny' ? 10 / w : scale === 'huge' ? 600 / w : 1;
  const clamp = (v) => Math.max(10, Math.min(600, Math.round(v * k)));
  return { widthCm: clamp(w), depthCm: clamp(w * 0.6), heightCm: clamp(w * 0.8) };
};

/** One room file holding the given pieces in a grid. */
function roomFile(name, pieces) {
  const perRow = Math.ceil(Math.sqrt(pieces.length * 1.4));
  const cell = Math.min(
    1400 / perRow,
    Math.max(...pieces.map((p) => Math.max(p.widthCm, p.depthCm))) + 25
  );
  const side = Math.max(200, Math.min(1500, Math.round(cell * perRow + 60)));
  const customTypes = pieces.map((p, i) => ({
    id: `custom-sweep-${i}`,
    name: p.name,
    widthCm: p.widthCm,
    depthCm: p.depthCm,
    heightCm: p.heightCm,
    color: p.design.palette.body,
    design: sanitizeDesign(p.design),
  }));
  const placedFurniture = pieces.map((p, i) => ({
    id: `item-sweep-${i}`,
    furnitureTypeId: `custom-sweep-${i}`,
    x: Math.round(cell * (0.5 + (i % perRow))) + 20,
    y: Math.round(cell * (0.5 + Math.floor(i / perRow))) + 20,
    rotationDeg: 0,
  }));
  const data = {
    app: 'room-designer-studio',
    name,
    widthCm: side,
    depthCm: side,
    customTypes,
    placedFurniture,
  };
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 1));
  return { name, pieces: pieces.length, side };
}

const types = DESIGN_TYPES.map((t) => t.id);
const pages = [];
const chunk = (list, n) =>
  list.reduce((a, v, i) => (i % n ? a[a.length - 1].push(v) : a.push([v]), a), []);

// every type, plain and at its usual size, then the fullest record of every type
for (const [label, pick] of [
  ['plain', (t) => variants(t)[0]],
  ['full', (t) => variants(t).at(-1)],
]) {
  chunk(types, 6).forEach((group, i) => {
    pages.push(
      roomFile(
        `sweep-${label}-${i + 1}`,
        group.map((t) => ({ ...pick(t), ...size(t, 'normal') }))
      )
    );
  });
}
// the sizes the store allows at either end
chunk(types, 6).forEach((group, i) => {
  pages.push(
    roomFile(
      `sweep-tiny-${i + 1}`,
      group.map((t) => ({ ...variants(t).at(-1), ...size(t, 'tiny') }))
    )
  );
});
chunk(types, 4).forEach((group, i) => {
  pages.push(
    roomFile(
      `sweep-huge-${i + 1}`,
      group.map((t) => ({ ...variants(t).at(-1), ...size(t, 'huge') }))
    )
  );
});
// one page per type with every trait option on it
for (const type of types) {
  chunk(variants(type), 6).forEach((group, i) => {
    pages.push(
      roomFile(
        `sweep-${type}-${i + 1}`,
        group.map((v) => ({ ...v, ...size(type, 'normal') }))
      )
    );
  });
}
console.log(`${pages.length} rooms in ${outDir}`);
for (const p of pages)
  console.log(`  ${p.name.padEnd(28)} ${String(p.pieces).padStart(3)} pieces, room ${p.side} cm`);
