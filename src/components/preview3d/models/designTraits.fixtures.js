/**
 * Design records saved before the channel, metal, mirror and pedestal traits existed, with the size each is
 * drawn at. Their 3D model and plan symbol must stay exactly as they were (see designTraits.test.jsx).
 */
const sofaPal = { body: '#7a8a9a', cushion: '#8a9aaa', leg: '#2a2622' };
const classicPal = {
  body: '#c9a56a',
  cushion: '#b89658',
  leg: '#4b2a17',
  frame: '#4b2a17',
  trim: '#c9a24a',
};
const bedPal = { body: '#8a7a6a', base: '#6a5a4a', pillow: '#f1ede5', accent: '#b8aa98' };
const woodPal = { body: '#8a6a4a' };
const deskPal = { body: '#3a3634', accent: '#6a6662', leg: '#2a2622' };

export const OLD_DESIGNS = {
  'sofa-plain': { type: 'sofa', palette: sofaPal, traits: { seats: 3 }, size: [2.2, 0.95, 0.85] },
  'sofa-rolled': {
    type: 'sofa',
    palette: sofaPal,
    traits: { seats: 2, tufted: 1, roll: 1, taper: 1, longSeat: 1 },
    size: [1.7, 0.9, 0.85],
  },
  'sofa-classic': {
    type: 'sofa',
    palette: classicPal,
    traits: { seats: 3, frame: 2, trim: 1, cab: 1, pat: 1, scat: 2, roll: 1 },
    size: [2.1, 0.95, 1.05],
  },
  'armchair-plain': { type: 'armchair', palette: sofaPal, traits: {}, size: [0.85, 0.85, 0.9] },
  'armchair-rolled': {
    type: 'armchair',
    palette: sofaPal,
    traits: { roll: 1, tufted: 1, taper: 1 },
    size: [0.8, 0.85, 0.9],
  },
  'tub-round': {
    type: 'tub-chair',
    palette: sofaPal,
    traits: { plan: 'round', base: 'feet' },
    size: [0.75, 0.75, 0.78],
  },
  'tub-bucket': {
    type: 'tub-chair',
    palette: sofaPal,
    traits: { plan: 'bucket', base: 'legs', tufted: 1 },
    size: [0.75, 0.72, 0.8],
  },
  'tub-pedestal': {
    type: 'tub-chair',
    palette: sofaPal,
    traits: { plan: 'round', base: 'pedestal' },
    size: [0.7, 0.7, 0.75],
  },
  'bed-plain': { type: 'bed', palette: bedPal, traits: { pillows: 2 }, size: [1.6, 2.1, 1.1] },
  'bed-channel': {
    type: 'bed',
    palette: bedPal,
    traits: { head: 'channel', legs: 1, foot: 1, tiers: 1, pillows: 3 },
    size: [1.8, 2.1, 1.2],
  },
  'bed-carved': {
    type: 'bed',
    palette: bedPal,
    traits: { crest: 2, framed: 1, foot: 2, legs: 2, pillows: 2 },
    size: [1.6, 2.1, 1.3],
  },
  'bed-skirt': {
    type: 'bed',
    palette: bedPal,
    traits: { skirt: 1, throw: 1, pillows: 1 },
    size: [1.0, 2.0, 1.0],
  },
  'wardrobe-2': { type: 'wardrobe', palette: woodPal, traits: { doors: 2 }, size: [1.0, 0.6, 2.0] },
  'wardrobe-3': { type: 'wardrobe', palette: woodPal, traits: { doors: 3 }, size: [1.8, 0.6, 2.1] },
  'wardrobe-loft': {
    type: 'wardrobe',
    palette: woodPal,
    traits: { doors: 4 },
    size: [2.0, 0.6, 2.4],
  },
  'desk-plain': { type: 'desk', palette: deskPal, traits: {}, size: [1.4, 0.7, 0.75] },
  'desk-thick': { type: 'desk', palette: deskPal, traits: { topH: 5 }, size: [1.6, 0.8, 0.76] },
};
