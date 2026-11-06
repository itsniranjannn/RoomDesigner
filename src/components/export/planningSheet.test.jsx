import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanSheet } from './PlanSheets.jsx';
import { buildRoomSheet } from '../../engine/sheetModel.js';
import { SERVICE_KIND_IDS } from '../../engine/planning.js';

const room = (extra = {}) => ({
  id: 'r',
  name: 'Kitchen',
  widthCm: 400,
  depthCm: 300,
  doors: [{ id: 'd', wall: 'bottom', offsetCm: 50, widthCm: 90, hingeSide: 'end' }],
  windows: [{ id: 'w', wall: 'top', offsetCm: 100, widthCm: 120, swing: 'inward' }],
  placedFurniture: [],
  services: SERVICE_KIND_IDS.map((kind, i) => ({
    id: `s${i}`,
    kind,
    x: 30 + i * 30,
    y: kind === 'drain' || kind === 'ceiling' ? 150 : 8,
    rotationDeg: 0,
  })),
  ...extra,
});

const draw = (r) =>
  renderToStaticMarkup(<PlanSheet model={buildRoomSheet(r)} width={1600} height={1200} />);

describe('exported plan with planning details', () => {
  it('draws every service symbol and a key naming each kind', () => {
    const svg = draw(room());
    expect(svg).not.toContain('var(--');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('undefined');
    expect(svg).toContain('Services');
    for (const label of ['Socket', 'Light switch', 'Drain', 'Radiator', 'Air conditioner'])
      expect(svg).toContain(label);
  });

  it('leaves out the key when there are no points', () => {
    const svg = draw(room({ services: [] }));
    expect(svg).not.toContain('>Services<');
  });

  it('draws service links with a key, and can leave them out', () => {
    const r = room({
      placedFurniture: [
        { id: 'sk', furnitureTypeId: 'sink-unit', x: 200, y: 40, rotationDeg: 0 },
        { id: 'wm', furnitureTypeId: 'washing-machine', x: 380, y: 250, rotationDeg: 0 },
      ],
    });
    const svg = draw(r);
    expect(svg).not.toContain('var(--');
    expect(svg).not.toContain('NaN');
    expect(svg).toContain('Service links');
    expect(svg).toContain('Within reach');
    expect(svg).toContain('data-link-status="far"');
    expect(svg).toContain('no water nearby');
    const off = renderToStaticMarkup(
      <PlanSheet model={buildRoomSheet(r, { links: false })} width={1600} height={1200} />
    );
    expect(off).not.toContain('Service links');
    expect(off).not.toContain('data-link-status');
  });

  it('puts the door hinge on the chosen side and draws the window leaves', () => {
    const model = buildRoomSheet(room());
    expect(model.doors[0].geom.hinge.x).toBe(140);
    expect(model.windows[0].leaves).toHaveLength(2);
    const plain = buildRoomSheet(
      room({ doors: [{ id: 'd', wall: 'bottom', offsetCm: 50, widthCm: 90 }] })
    );
    expect(plain.doors[0].geom.hinge.x).toBe(50);
  });

  it('is unchanged for rooms without any planning fields', () => {
    const model = buildRoomSheet(room({ services: undefined, windows: [] }));
    expect(model.services).toEqual([]);
    expect(model.serviceKey).toBeNull();
  });
});
