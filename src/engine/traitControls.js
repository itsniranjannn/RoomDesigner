/**
 * traitControls.js
 * What the photo dialog offers under "Adjust details": per type, the traits a photo can read and the choices a
 * person can correct them to. Kept here, apart from the dialog, so the same list can be checked and swept
 * without loading the interface.
 */

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => [lo + i, String(lo + i)]);
const ARMS = [
  [0.05, 'Slim'],
  [0.1, 'Standard'],
  [0.15, 'Wide'],
  [0.2, 'Very wide'],
];
const LEGS = [
  [0, 'Square'],
  [1, 'Round'],
];
const TUFTED = {
  key: 'tufted',
  label: 'Buttons',
  fallback: 0,
  options: [
    [0, 'Plain'],
    [1, 'Tufted with buttons'],
  ],
};
const TOP_THICKNESS = {
  key: 'topH',
  label: 'Top thickness',
  fallback: 3.5,
  options: [
    [2, 'Thin (glass or veneer)'],
    [3.5, 'Standard'],
    [6, 'Thick slab'],
  ],
};
const CLASSIC_SEAT = [
  {
    key: 'frame',
    label: 'Wood frame',
    fallback: 0,
    options: [
      [0, 'None (cloth to the feet)'],
      [1, 'Exposed wood frame'],
      [2, 'Carved frame with a crest'],
    ],
  },
  {
    key: 'cane',
    label: 'Side panels',
    fallback: 0,
    options: [
      [0, 'Upholstered'],
      [1, 'Cane weave'],
    ],
  },
  {
    key: 'cab',
    label: 'Legs',
    fallback: 0,
    options: [
      [0, 'Straight or tapered'],
      [1, 'Curved (cabriole)'],
    ],
  },
  {
    key: 'trim',
    label: 'Trim',
    fallback: 0,
    options: [
      [0, 'None'],
      [1, 'Gold carving and trim'],
    ],
  },
  { key: 'scat', label: 'Scatter cushions', fallback: 0, options: range(0, 4) },
  {
    key: 'pat',
    label: 'Cloth',
    fallback: 0,
    options: [
      [0, 'Plain'],
      [1, 'Floral pattern'],
    ],
  },
];
const UPHOLSTERY = [
  {
    key: 'roll',
    label: 'Arm shape',
    fallback: 0,
    options: [
      [0, 'Straight'],
      [1, 'Rounded and padded'],
    ],
  },
  {
    key: 'tufted',
    label: 'Back cushions',
    fallback: 0,
    options: [
      [0, 'Plain'],
      [1, 'Tufted with buttons'],
    ],
  },
  {
    key: 'taper',
    label: 'Feet',
    fallback: 0,
    options: [
      [0, 'Short round feet'],
      [1, 'Tapered wooden legs'],
    ],
  },
];
const CHANNELS = {
  key: 'chan',
  label: 'Stitching',
  fallback: 0,
  options: [
    [0, 'Plain'],
    [1, 'Upright channels'],
  ],
};
const yesNo = (key, label, no, yes) => ({
  key,
  label,
  fallback: 0,
  options: [
    [0, no],
    [1, yes],
  ],
});
/** A tube metal bed has no upholstered headboard: its headboard choices are not offered. */
const upholsteredHead = (t) => !t.metal;
/**
 * Look-and-feel choices per type: the traits read from the photos, which the user can correct. A control with
 * `when` is offered only when it applies (drawer choices once there are drawers).
 */
export const TRAIT_CONTROLS = {
  bed: [
    { key: 'pillows', label: 'Pillows', fallback: 2, options: range(1, 4) },
    {
      key: 'legs',
      label: 'Base',
      fallback: 0,
      options: [
        [0, 'Solid base'],
        [1, 'On short feet'],
        [2, 'On round bun feet'],
      ],
    },
    {
      key: 'head',
      when: upholsteredHead,
      label: 'Headboard',
      fallback: 'panel',
      options: [
        ['flat', 'Flat'],
        ['panel', 'Panel'],
        ['channel', 'Channel stitched'],
        ['tufted', 'Tufted'],
        ['slat', 'Slatted'],
      ],
    },
    {
      key: 'crest',
      when: upholsteredHead,
      label: 'Headboard top',
      fallback: 0,
      options: [
        [0, 'Straight'],
        [1, 'Arched crest'],
        [2, 'Carved scroll crest'],
      ],
    },
    {
      key: 'framed',
      when: upholsteredHead,
      label: 'Headboard frame',
      fallback: 0,
      options: [
        [0, 'No frame'],
        [1, 'Wood frame around the panel'],
      ],
    },
    {
      key: 'foot',
      label: 'Footboard',
      fallback: 0,
      options: [
        [0, 'None'],
        [1, 'With a straight footboard'],
        [2, 'Curved sleigh footboard'],
      ],
    },
    {
      key: 'headW',
      when: upholsteredHead,
      label: 'Headboard width',
      fallback: 1,
      options: [
        [0.75, 'Narrow'],
        [0.85, 'A little narrower than the bed'],
        [1, 'As wide as the bed'],
        [1.1, 'Wider than the bed'],
      ],
    },
    {
      key: 'tiers',
      label: 'Pillow layout',
      fallback: 0,
      options: [
        [0, 'One row'],
        [1, 'Two tiers (square pillows behind)'],
      ],
    },
    {
      key: 'lumbar',
      label: 'Bolster in front',
      fallback: 1,
      options: [
        [0, 'None'],
        [1, 'Bolster or small cushion'],
      ],
    },
    {
      key: 'fold',
      label: 'Sheet at the head',
      fallback: 1,
      options: [
        [1, 'Folded back over the duvet'],
        [0, 'Tucked in'],
      ],
    },
    {
      key: 'throw',
      label: 'Throw blanket',
      fallback: 0,
      options: [
        [0, 'None'],
        [1, 'Throw across the foot'],
      ],
    },
    {
      key: 'store',
      label: 'Storage',
      fallback: 0,
      options: [
        [0, 'None'],
        [1, 'Drawers in the base'],
      ],
    },
    {
      key: 'skirt',
      label: 'Bed skirt',
      fallback: 0,
      options: [
        [0, 'None'],
        [1, 'Pleated skirt to the floor'],
      ],
    },
    yesNo('metal', 'Frame', 'Wood or upholstered', 'Metal tubes'),
    yesNo('rails', 'Side rails', 'None', 'Guard rails along the sides'),
    yesNo('casters', 'Wheels', 'None', 'Castors under the legs'),
  ],
  'corner-sofa': [
    {
      key: 'side',
      label: 'Chaise on the',
      fallback: 'right',
      options: [
        ['right', 'Right'],
        ['left', 'Left'],
      ],
    },
    { key: 'seats', label: 'Seats along the back', fallback: 2, options: range(1, 4) },
    { key: 'arm', label: 'Arms', fallback: 0.08, options: ARMS },
    { ...TUFTED, label: 'Back cushions' },
    UPHOLSTERY[2],
  ],
  'tub-chair': [
    {
      key: 'plan',
      label: 'Shape',
      fallback: 'round',
      options: [
        ['round', 'Round tub'],
        ['bucket', 'Bucket'],
      ],
    },
    {
      key: 'base',
      label: 'Base',
      fallback: 'feet',
      options: [
        ['feet', 'Short feet'],
        ['legs', 'Slim legs'],
        ['metal', 'Thin metal legs'],
        ['pedestal', 'Swivel pedestal'],
      ],
    },
    yesNo('wrap', 'Sides', 'Level all round', 'Sloping down to the front'),
    TUFTED,
  ],
  ottoman: [
    {
      key: 'shape',
      label: 'Shape',
      fallback: 'square',
      options: [
        ['square', 'Square or rectangular'],
        ['round', 'Round pouf'],
      ],
    },
    {
      key: 'feet',
      label: 'Feet',
      fallback: 'short',
      options: [
        ['none', 'On the floor'],
        ['short', 'Short feet'],
        ['tall', 'Tall legs'],
      ],
    },
    TUFTED,
  ],
  daybed: [
    {
      key: 'back',
      label: 'Back',
      fallback: 'panel',
      options: [
        ['panel', 'Solid panel'],
        ['slat', 'Slatted'],
        ['none', 'No back'],
      ],
    },
    {
      key: 'ends',
      label: 'End panels',
      fallback: 2,
      options: [
        [2, 'Both ends'],
        [1, 'One end'],
        [0, 'None'],
      ],
    },
  ],
  etagere: [
    { key: 'shelves', label: 'Rows of shelves', fallback: 4, options: range(2, 7) },
    { key: 'cols', label: 'Columns', fallback: 1, options: range(1, 4) },
    {
      key: 'base',
      label: 'Lower part',
      fallback: 'open',
      options: [
        ['open', 'Open'],
        ['doors', 'Closed with doors'],
        ['drawers', 'Drawers'],
      ],
    },
    {
      key: 'back',
      label: 'Back',
      fallback: 1,
      options: [
        [1, 'Closed back panel'],
        [0, 'Open back'],
      ],
    },
  ],
  stool: [
    {
      key: 'seat',
      label: 'Seat',
      fallback: 'round',
      options: [
        ['round', 'Round'],
        ['square', 'Square'],
      ],
    },
    {
      key: 'back',
      label: 'Back',
      fallback: 0,
      options: [
        [0, 'No back'],
        [1, 'Low back'],
      ],
    },
    {
      key: 'rest',
      label: 'Footrest',
      fallback: 0,
      options: [
        [0, 'None'],
        [1, 'With footrest'],
      ],
    },
  ],
  cabinet: [
    {
      key: 'front',
      label: 'Fronts',
      fallback: 'doors',
      options: [
        ['doors', 'Doors'],
        ['drawers', 'Drawers'],
        ['mixed', 'Doors and drawers'],
      ],
    },
    { key: 'n', label: 'Sections', fallback: 2, options: range(1, 5) },
    {
      key: 'legs',
      label: 'Base',
      fallback: 0,
      options: [
        [0, 'Solid base to the floor'],
        [1, 'Legs'],
      ],
    },
  ],
  sofa: [
    { key: 'seats', label: 'Seats', fallback: 3, options: range(1, 5) },
    {
      key: 'longSeat',
      label: 'Seat cushion',
      fallback: 0,
      options: [
        [0, 'One per seat'],
        [1, 'One long cushion'],
      ],
    },
    { key: 'arm', label: 'Arms', fallback: 0.1, options: ARMS },
    ...UPHOLSTERY,
    CHANNELS,
    yesNo('step', 'Arm layers', 'One block', 'Stepped layers'),
    ...CLASSIC_SEAT,
  ],
  armchair: [
    { key: 'arm', label: 'Arms', fallback: 0.17, options: [...ARMS, [0.17, 'Chunky']] },
    ...UPHOLSTERY,
    CHANNELS,
    ...CLASSIC_SEAT,
  ],
  lounge: [{ key: 'slats', label: 'Back rails', fallback: 3, options: range(2, 5) }],
  chair: [
    {
      key: 'back',
      label: 'Back',
      fallback: 'slat',
      options: [
        ['slat', 'Slatted'],
        ['solid', 'Solid'],
        ['open', 'Top rail only'],
      ],
    },
  ],
  table: [{ key: 'roundLegs', label: 'Legs', fallback: 0, options: LEGS }, TOP_THICKNESS],
  'coffee-table': [
    { key: 'roundLegs', label: 'Legs', fallback: 0, options: LEGS },
    {
      key: 'cab',
      label: 'Carved legs',
      fallback: 0,
      options: [
        [0, 'As above'],
        [1, 'Curved (cabriole)'],
      ],
    },
    {
      key: 'trim',
      label: 'Trim',
      fallback: 0,
      options: [
        [0, 'None'],
        [1, 'Gold carving and trim'],
      ],
    },
  ],
  desk: [
    { key: 'roundLegs', label: 'Legs', fallback: 0, options: LEGS },
    {
      key: 'ped',
      label: 'Drawer unit',
      fallback: 'none',
      options: [
        ['none', 'None'],
        ['left', 'On the left'],
        ['right', 'On the right'],
        ['both', 'On both sides'],
      ],
    },
    {
      key: 'drawers',
      label: 'Drawers in the unit',
      fallback: 3,
      options: range(1, 4),
      when: (t) => t.ped && t.ped !== 'none',
    },
    {
      key: 'base',
      label: 'Base',
      fallback: 'legs',
      options: [
        ['legs', 'Four legs'],
        ['sled', 'Metal sled (C-shaped) ends'],
        ['panel', 'Solid panel ends'],
      ],
    },
    yesNo('modesty', 'Front panel', 'Open', 'Panel across the front'),
  ],
  wardrobe: [
    { key: 'doors', label: 'Doors', fallback: 2, options: range(1, 6) },
    {
      key: 'mirror',
      label: 'Mirror',
      fallback: 0,
      options: [
        [0, 'None'],
        [1, 'Full-height mirror door'],
        [2, 'Oval mirror in a door'],
      ],
    },
    { key: 'drawers', label: 'Drawers', fallback: 0, options: range(0, 4) },
    {
      key: 'dside',
      when: (t) => t.drawers > 0,
      label: 'Drawers under',
      fallback: 'full',
      options: [
        ['full', 'The whole width'],
        ['left', 'The left door'],
        ['right', 'The right door'],
      ],
    },
    {
      key: 'handle',
      label: 'Handles',
      fallback: 'bar',
      options: [
        ['bar', 'Long bars'],
        ['knob', 'Knobs'],
        ['ring', 'Rings'],
      ],
    },
    yesNo('upper', 'Top cupboards', 'None', 'A row of top cupboards'),
    yesNo('niche', 'Middle', 'All doors', 'Open shelf with a mirror'),
    yesNo('fluted', 'Door faces', 'Flat', 'Fluted (fine upright grooves)'),
  ],
  bookshelf: [{ key: 'shelves', label: 'Compartments', fallback: 4, options: range(2, 8) }],
  nightstand: [{ key: 'drawers', label: 'Drawers', fallback: 2, options: range(1, 4) }],
};
