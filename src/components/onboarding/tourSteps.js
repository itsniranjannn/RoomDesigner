/**
 * Steps for the two first-run tours. `target` is a CSS selector for the element the tip
 * points at; when it is missing or off screen (a closed drawer on a phone, say) the tip is
 * shown centered instead. `placement` is the preferred side.
 */
export const TOUR_STEPS = {
  room: [
    {
      id: 'furniture',
      target: '[data-tour="catalog"]',
      placement: 'right',
      title: 'Add furniture',
      body: 'Click a piece in the list to place it, or drag it onto the plan. Search and the category chips help you find things quickly.',
    },
    {
      id: 'view',
      target: '[role="group"][aria-label="View"]',
      placement: 'bottom',
      title: '2D plan or 3D view',
      body: 'Work on the plan in 2D, then switch to 3D to orbit the room or start a walkthrough at eye height.',
    },
    {
      id: 'openings',
      target: '[data-tour="inspector"]',
      placement: 'left',
      title: 'Doors and windows',
      body: 'Select the room (click an empty spot) to set its size and to add or move doors and windows along the walls.',
    },
    {
      id: 'planning',
      target: '[role="toolbar"][aria-label="Plan tools"]',
      placement: 'right',
      title: 'Services and Plan checks',
      body: 'Mark sockets, switches and pipes with Services. Plan checks warns about blocked doors, tight gaps and furniture that does not fit.',
    },
    {
      id: 'share',
      target: 'button[aria-label="Share and export"]',
      placement: 'bottom',
      title: 'Share and export',
      body: 'Copy a link to this design, or save a picture or a printable plan. Your rooms stay on this device.',
    },
    {
      id: 'help',
      target: 'button[aria-label^="Keyboard shortcuts"]',
      placement: 'right',
      title: 'Help is always here',
      body: 'Press ? for keyboard shortcuts. You can take this tour again from that window.',
    },
  ],
  flat: [
    {
      id: 'walls',
      target: '[role="group"][aria-label="Drawing tools"]',
      placement: 'right',
      title: 'Draw your walls',
      body: 'Pick Draw wall (W) and drag on the plan. Close a loop of walls and it becomes a room you can name and furnish.',
    },
    {
      id: 'openings',
      target: 'button[aria-label^="Door"]',
      placement: 'right',
      title: 'Doors and windows',
      body: 'Choose Door (D) or Window (N), then click a wall to place one. Stairs and passages link floors and rooms.',
    },
    {
      id: 'view',
      target: '[role="group"][aria-label="View"]',
      placement: 'bottom',
      title: 'Plan or 3D',
      body: 'Switch to 3D to see the whole flat and walk through it. Doors you pass open the way.',
    },
    {
      id: 'floors',
      target: '[role="group"][aria-label="Floors"]',
      placement: 'top',
      title: 'Floors',
      body: 'Add a floor to design upstairs. Each floor has its own walls, and stairs connect them.',
    },
    {
      id: 'export',
      target: 'button[aria-label="Export this floor"]',
      placement: 'bottom',
      title: 'Export',
      body: 'Save this floor as a picture or a printable plan. Press ? any time to take this tour again.',
    },
  ],
};
