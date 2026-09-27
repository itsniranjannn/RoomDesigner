# Room Designer Studio

Room Designer Studio is a browser-based architectural floor-plan and interior-space
planning tool. It combines an editorial landing experience, an interactive 2D drafting
canvas, a real-time 3D room preview, and a curated furniture library influenced by
Nepali and Newari material culture.

The project is intentionally client-side and local-first: room designs are stored in
the browser, no server or account is required, and the application can be built as a
static Vite site.

## Contents

- [What the project does](#what-the-project-does)
- [Features](#features)
- [Technology](#technology)
- [Application structure](#application-structure)
- [Important files](#important-files)
- [State and data flow](#state-and-data-flow)
- [Design system](#design-system)
- [Furniture catalog](#furniture-catalog)
- [Running the project](#running-the-project)
- [Validation](#validation)
- [Known limitations](#known-limitations)
- [Future improvements](#future-improvements)

## What the project does

The application supports the following workflow:

1. Open the landing page and review the animated architectural presentation.
2. Create a new room using a room-size modal or open a locally saved room.
3. Place furniture from the catalog onto a 2D top-down drafting canvas.
4. Move, rotate, duplicate, delete, and reorder furniture.
5. Inspect coordinates, dimensions, rotation, and collision state.
6. Switch to the Three.js 3D Studio view to review the room spatially.
7. Save room changes locally and switch between multiple saved sheets.
8. Export a high-resolution 2D plan image.

The default room uses centimeter coordinates. The 2D editor is plan-oriented, while
the 3D view converts the same room and furniture data into meters for rendering.

## Features

### Landing page

- Architectural editorial layout with a two-column hero.
- Animated drafting grid, blueprint frame, dimensions, door swing, and mandala geometry.
- Nepali-inspired palette using lokta linen, rato simrik maroon, Patan brass, timber ink,
  and Himalayan indigo.
- Animated “Draft your space with precision.” heading and call-to-action.
- Animated original geometric Room Designer Studio logo.
- ABOUT and SHEETS navigation controls.
- Responsive behavior for smaller screens.
- Reduced-motion support for major motion effects.

### About page

- Uses the same brand identity and navbar language as the landing page.
- Monograph-style project information describing:
  - 2D drafting and 3D spatial modeling.
  - Nepalese architectural proportions.
  - Patan bell metal and kansa brass.
  - Lokta paper surfaces.
  - Tibetan-Nepali Galaicha geometries.
  - Timber joinery traditions.
- Subtle animated drafting plate with:
  - Rotating mandala rings.
  - Geometric registration marks.
  - Material callouts.
  - Architectural dimensions.
- Favicon and page metadata are defined in `index.html`.

### 2D drafting workspace

- Room boundary with walls, doors, windows, and opening geometry.
- Pan and zoom canvas.
- Grid overlay and snap assistance.
- Furniture drag and placement.
- Rotation controls and keyboard nudging.
- Collision warnings for overlapping furniture.
- Boundary containment checks.
- Layer ordering with send-back and bring-front actions.
- Selected-item inspector for coordinates, rotation, and dimensions.
- Duplicate and delete operations.

### 3D Studio

- React Three Fiber and Three.js rendering.
- Procedural room walls and opening cutouts.
- Camera orbit, pan, and zoom controls.
- Full-height wall toggle and reset-view action.
- Procedural furniture models built from Three.js primitives.
- Materials, shadows, floor, lighting, and architectural color treatments.
- TV and media-console surface placement:
  - A TV added after a media console inherits the console position.
  - A TV is elevated to the console height.
  - Adding a console after a TV repositions the existing TV onto it.

### Furniture catalog

The catalog is grouped into six categories:

- Living Room
- Bedroom
- Nepali Household
- Dining & Office
- Kitchen
- Decor & Accents

Furniture definitions contain real-world dimensions in centimeters, color/material
metadata, a `shapeType` used by both renderers, and optional placement metadata such as
`stackableOn` and `placement`.

Nepali/Newari-oriented pieces currently include examples such as:

- Pirka low stool.
- Charpai daybed.
- Gadda floor seating.
- Carved Jali screen.
- Puja shrine shelf.
- Karuwa and Diyo stand.
- Dhaka pattern rug.
- Carved wooden chowki.
- Patuka storage chest.
- Brass diya lamp.

The catalog is the source of truth for the catalog UI, 2D silhouettes, and 3D models.

### Local persistence and sheets

- IndexedDB stores room records in the `room_planner_db` database.
- The active room ID is tracked in `localStorage`.
- Changes are debounced before saving.
- Multiple rooms can be listed, opened, renamed, and deleted.
- The landing page displays the saved-sheet count.
- Designs remain on the current browser/device unless explicitly exported or otherwise
  copied by the user.

## Technology

### Runtime dependencies

- React 19
- React DOM 19
- Vite 6
- Zustand 5
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- Framer Motion
- Lucide React
- `idb` for IndexedDB access

### Development dependencies

- Vite React plugin
- Vitest

Exact versions are declared in `package.json` and locked in `package-lock.json`.

## Application structure

```text
Roomdesigner/
├── public/
│   ├── og-preview.png                 # Social/share preview image
│   └── room-studio-mark.svg           # Branded favicon
├── src/
│   ├── App.jsx                        # Application bootstrap and store initialization
│   ├── main.jsx                       # React DOM entry point
│   ├── components/
│   │   ├── canvas/                    # 2D plan canvas and SVG furniture silhouettes
│   │   ├── catalog/                   # Furniture catalog and catalog cards
│   │   ├── common/                    # Reusable buttons, selects, and brand mark
│   │   ├── inspector/                 # Selected furniture controls
│   │   ├── layout/                    # Landing, About, shell, sheets, and modal views
│   │   └── preview3d/                 # Three.js room and furniture rendering
│   ├── data/
│   │   ├── furnitureCatalog.js        # Furniture source of truth
│   │   └── persistence.js             # IndexedDB room storage
│   ├── design/
│   │   ├── global.css                 # Global resets and shared browser styles
│   │   ├── tokens.css                 # Palette, typography, spacing, shadows, layout
│   │   └── typography.css             # Font and text defaults
│   ├── engine/
│   │   ├── collision.js                # Furniture collision and boundary evaluation
│   │   ├── exportPlan.js               # 2D plan image export
│   │   ├── geometry.js                 # Rotation, angles, and geometry helpers
│   │   ├── openings.js                 # Door/window opening calculations
│   │   └── snapping.js                 # Grid snapping and room-boundary clamping
│   └── store/
│       └── roomStore.js                # Zustand room, furniture, history, and persistence state
├── index.html                          # Vite document shell, favicon, metadata, fonts
├── package.json                         # Scripts and dependencies
├── package-lock.json                    # Locked dependency tree
├── vite.config.js                       # Vite configuration
└── README.md                            # Project documentation
```

## Important files

| File | Responsibility |
| --- | --- |
| `src/components/layout/LandingPage.jsx` | Landing hero, animated plan graphic, branding, navigation |
| `src/components/layout/LandingPage.module.css` | Landing layout, typography, animation, responsive rules |
| `src/components/layout/AboutPage.jsx` | About/monograph content and animated architectural plate |
| `src/components/layout/AboutPage.module.css` | About page layout, navbar, card, and animation styles |
| `src/components/layout/AppShell.jsx` | Switches between landing, About, and studio workspace |
| `src/components/layout/TopBar.jsx` | Workspace toolbar, mode switching, rooms, undo/redo, export |
| `src/components/canvas/RoomCanvas.jsx` | Main 2D drafting surface |
| `src/components/canvas/ArchitecturalSilhouette.jsx` | Furniture-specific 2D SVG representations |
| `src/components/preview3d/Room3DView.jsx` | Three.js scene, camera, controls, and lighting |
| `src/components/preview3d/Furniture3DBox.jsx` | Procedural 3D furniture models |
| `src/data/furnitureCatalog.js` | Catalog definitions and furniture metadata |
| `src/data/persistence.js` | IndexedDB setup and room CRUD functions |
| `src/store/roomStore.js` | Central client state and editor actions |
| `src/design/tokens.css` | Shared visual language |
| `index.html` | Document title, favicon, theme color, and description |

## State and data flow

```text
Catalog definition
        │
        ▼
roomStore.addFurniture()
        │
        ├── clamp to room bounds
        ├── apply stack placement when applicable
        ├── record undo snapshot
        ├── evaluate collision/boundary state
        └── debounce IndexedDB save
        │
        ├── RoomCanvas + ArchitecturalSilhouette (2D)
        └── Room3DView + Furniture3DBox (3D)
```

The store keeps:

- Active room and all saved rooms.
- Furniture, doors, and windows.
- Selected furniture ID.
- Current view mode (`2d` or `3d`).
- Save status.
- Collision and boundary-collision ID sets.
- Undo and redo stacks.

Undo history is session state and is cleared when a room is initialized, created, or
switched. Persistent room data is stored separately in IndexedDB.

## Design system

The visual system is defined in `src/design/tokens.css`.

### Palette

| Token | Value | Meaning |
| --- | --- | --- |
| `--color-ink` | `#1A1615` | Aged sal timber and architectural linework |
| `--color-linen` | `#F6F2EA` | Lokta paper and raw muslin |
| `--color-linen-surface` | `#EDE6D9` | Layered drafting surface |
| `--color-maroon` | `#8B2635` | Rato simrik / deep Nepali crimson |
| `--color-brass` | `#C49746` | Patan kansa bell-metal accent |
| `--color-indigo` | `#22485E` | Himalayan indigo selection color |
| `--color-pine` | `#3B4B42` | Himalayan pine and juniper green |
| `--color-taupe` | `#D5C8B8` | Earthen plaster and mortar |
| `--color-walnut` | `#7A5B37` | Carved wood |

### Typography

- `Fraunces` is used for editorial and architectural display headings.
- `Space Grotesk` is used for interface, drafting, and body text.
- Monospaced labels are used for dimensions, classification tags, and technical metadata.
- Google Fonts are requested from `index.html`; local system fallbacks are included in CSS.

### Motion

Motion is used to communicate the drafting/architectural identity:

- Landing grid drift.
- Mandala rotation and pulse.
- Brand mark orbit.
- Heading and CTA entrance transitions.
- About-page drafting plate movement.
- SVG perimeter and opening draw-in effects.

Components use `prefers-reduced-motion` handling where the effect is continuous or
decorative.

## Running the project

### Requirements

- Node.js compatible with the installed Vite/React toolchain.
- npm.
- A modern browser with IndexedDB and WebGL support for the complete experience.

### Install

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Vite prints the local development URL, normally `http://localhost:5173`.

### Create a production build

```bash
npm run build
```

The production output is written to `dist/`.

### Preview the production build

```bash
npm run preview
```

### Test command

```bash
npm test -- --run
```

The repository currently does not contain test files matching the Vitest configuration,
so this command may report that no test files were found. The build command is currently
the primary automated validation.

## Validation

For a normal change, use:

```bash
npm run build
```

For UI changes, also verify manually:

1. Landing page loads without a blank state.
2. About page opens from the landing navbar.
3. New room creation opens the studio.
4. Furniture can be added and moved in 2D.
5. 3D Studio renders a room and furniture.
6. TV/media-console stacking works in both insertion orders.
7. A room persists after a browser reload.
8. Export produces a usable 2D plan image.
9. Narrow viewport behavior remains usable.

## Known limitations

- There is no backend, authentication, cloud sync, or multi-user collaboration.
- Room data is local to the current browser profile and device.
- IndexedDB data can be lost if browser site data is cleared.
- The application depends on WebGL for the 3D Studio view.
- The 3D library is procedural and uses primitives rather than imported high-detail
  furniture assets; shapes are illustrative, not manufacturing-grade models.
- TV stacking is currently a targeted media-console rule, not a general parent/child
  furniture hierarchy.
- The 2D editor represents plan position; vertical elevation is primarily reflected in
  the 3D view.
- Google Fonts may be blocked in offline, restricted, or privacy-hardened environments.
  CSS fallbacks keep the interface usable, but typography can differ.
- The codebase currently has no comprehensive automated component, engine, or end-to-end
  test suite.
- Large Three.js assets contribute significantly to the production bundle.
- Complex SVG scenes and animated geometry can be expensive on low-powered devices.
- Exported plans are image output, not editable CAD/DXF files.
- Room dimensions, furniture metadata, and visual proportions are currently edited
  through the application source/catalog rather than an admin data layer.

## Future improvements

Potential next steps include:

- Add focused unit tests for geometry, collision, snapping, openings, and stacking.
- Add component and end-to-end tests for room creation and persistence.
- Add a general furniture stacking/attachment model.
- Add editable wall lengths and more room-shape presets.
- Add richer door/window editing and architectural annotation tools.
- Add import/export formats such as JSON, SVG, DXF, or PDF.
- Add optional cloud synchronization and project sharing.
- Improve accessibility auditing across canvas and Three.js controls.
- Add local font assets or a font-loading strategy for fully offline typography.
- Optimize Three.js bundle loading and model rendering on mobile devices.
- Add more culturally specific Nepali/Newari catalog pieces and material textures.

## License and attribution

No license file is currently included in the repository. Add an explicit license before
distributing the project outside its intended development context.

The visual language and catalog references are original project work inspired by
Nepalese/Newari architectural materials and craft traditions. Brand, catalog, and
generated visual assets should be reviewed before commercial redistribution.
