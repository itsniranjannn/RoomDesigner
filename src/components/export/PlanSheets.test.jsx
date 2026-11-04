import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanSheet, doorPoints } from './PlanSheets.jsx';
import { buildRoomSheet, buildFlatSheet } from '../../engine/sheetModel.js';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog.js';
import { buildPresetFlat } from '../../engine/flatPresets.js';

const draw = (model) =>
  renderToStaticMarkup(<PlanSheet model={model} width={1600} height={1200} />);

// The exported picture is loaded as a stand-alone image, so it cannot use page CSS
const standalone = (svg) => {
  expect(svg.startsWith('<svg')).toBe(true);
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).not.toContain('var(--');
  expect(svg).not.toMatch(/class="/);
  expect(svg).not.toContain('NaN');
  expect(svg).not.toContain('undefined');
};

describe('plan sheet drawing', () => {
  it('draws a room with every catalog item as a stand-alone SVG', () => {
    let x = 20;
    let y = 20;
    let rowH = 0;
    const placed = [];
    for (const it of FURNITURE_CATALOG) {
      if (x + it.widthCm + 20 > 2000) {
        x = 20;
        y += rowH + 25;
        rowH = 0;
      }
      placed.push({
        id: it.id,
        furnitureTypeId: it.id,
        x: x + it.widthCm / 2,
        y: y + it.depthCm / 2,
        rotationDeg: 0,
      });
      x += it.widthCm + 25;
      rowH = Math.max(rowH, it.depthCm);
    }
    const model = buildRoomSheet({
      name: 'All',
      widthCm: 2000,
      depthCm: y + rowH + 20,
      doors: [{ id: 'd', wall: 'bottom', offsetCm: 100, widthCm: 90 }],
      windows: [{ id: 'w', wall: 'top', offsetCm: 800, widthCm: 200 }],
      placedFurniture: placed,
    });
    const svg = draw(model);
    standalone(svg);
    expect(svg.length).toBeGreaterThan(100000);
    expect((svg.match(/filter="url\(#furniture-drop-shadow\)"/g) || []).length).toBe(
      FURNITURE_CATALOG.length
    );
  });

  it('draws the doors with swing arcs and the windows with glazing', () => {
    const svg = draw(
      buildRoomSheet({
        name: 'R',
        widthCm: 400,
        depthCm: 300,
        doors: [
          { id: 'd1', wall: 'bottom', offsetCm: 50, widthCm: 90 },
          { id: 'd2', wall: 'right', offsetCm: 100, widthCm: 80, swingDirection: 'outward' },
        ],
        windows: [{ id: 'w', wall: 'top', offsetCm: 100, widthCm: 150 }],
        placedFurniture: [],
      })
    );
    standalone(svg);
    expect((svg.match(/stroke-dasharray="3 3"/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(svg).toContain('A 90 90');
    expect(svg).toContain('A 80 80');
    expect(svg).toContain('#5A738E');
  });

  it('swings a door the right way on every wall', () => {
    const door = (wall, outward) =>
      doorPoints({ wall, offsetCm: 50, widthCm: 90, outward }, 400, 300);
    expect(door('top', false).leaf).toEqual([50, 90]);
    expect(door('bottom', false).leaf).toEqual([50, 210]);
    expect(door('left', false).leaf).toEqual([90, 50]);
    expect(door('right', false).leaf).toEqual([310, 50]);
    expect(door('top', true).leaf).toEqual([50, -90]);
    expect(door('bottom', true).leaf).toEqual([50, 390]);
    expect(door('left', true).leaf).toEqual([-90, 50]);
    expect(door('right', true).leaf).toEqual([490, 50]);
    expect(door('top', false).far).toEqual([140, 0]);
    expect(door('left', false).far).toEqual([0, 140]);
  });

  it('draws a flat floor with walls, openings, stairs and the title block', () => {
    const { flat, rooms } = buildPresetFlat('2bhk', { name: 'Flat' });
    const stair = {
      id: 's',
      levelId: flat.levels[0].id,
      type: 'L',
      widthCm: 100,
      rotationDeg: 90,
      riseCm: 280,
      x: 100,
      y: 100,
    };
    const svg = draw(
      buildFlatSheet({ ...flat, stairs: [stair] }, rooms, flat.levels[0].id, {
        date: new Date(2026, 10, 4),
      })
    );
    standalone(svg);
    expect(svg).toContain('Hall');
    expect(svg).toContain('Scale 1:');
    expect(svg).toContain('4 November 2026');
    expect(svg).toContain('Up to ');
    expect(svg).toContain('<polygon');
  });
});

describe('rooms with an outline and open walls', () => {
  const L = [
    [0, 0],
    [300, 0],
    [300, 100],
    [100, 100],
    [100, 300],
    [0, 300],
  ];

  it('draws an L-shaped room with openings on its edges and a dashed open side', () => {
    const model = buildRoomSheet({
      name: 'Hall',
      widthCm: 300,
      depthCm: 300,
      outline: L,
      openEdges: [2],
      doors: [{ id: 'd', edge: 5, offsetCm: 10, widthCm: 90, swingDirection: 'outward' }],
      windows: [{ id: 'w', edge: 0, offsetCm: 60, widthCm: 120 }],
      placedFurniture: [],
    });
    expect(model.outline.edges).toHaveLength(6);
    const svg = draw(model);
    standalone(svg);
    expect(svg).toContain('stroke-dasharray="10 7"');
    expect(svg).toContain('clip-path="url(#outline-clip)"');
  });

  it('puts an L-shaped room area, not its bounding box, in the title block', () => {
    const model = buildRoomSheet({
      name: 'Hall',
      widthCm: 300,
      depthCm: 300,
      outline: L,
      doors: [],
      windows: [],
      placedFurniture: [],
    });
    expect(model.titleBlock).toBeTruthy();
    expect(JSON.stringify(model.titleBlock)).toContain('5.0');
  });

  it('draws open dividers on a flat sheet', () => {
    const { flat, rooms } = buildPresetFlat('2bhk');
    const model = buildFlatSheet(
      { ...flat, openWalls: { [flat.levels[0].id]: [{ x1: 0, y1: 0, x2: 0, y2: 100 }] } },
      rooms,
      flat.levels[0].id
    );
    expect(model.openRuns).toHaveLength(1);
    expect(draw(model)).toContain('stroke-dasharray');
  });
});
