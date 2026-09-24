# RoomLayoutPlanner — Architectural Floor Plan & 3D Spatial Designer

RoomLayoutPlanner is an architectural floor plan designer and 3D interior visualizer that combines traditional Nepali Himalayan craftsmanship (Agran Sal timber, Rato Simrik crimson, Kansa Patan brass, Lokta paper, and handcrafted Galaicha textiles) with modern CAD drafting standards (Separating Axis Theorem collision detection, magnetic wall snapping, dynamic opening cutouts, and WebGL rendering).

---

## Technical Stack

- **Framework:** React 19, Vite 6
- **3D Spatial Graphics:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **State Management:** Zustand with transactional 50-step undo/redo history
- **Persistence:** IndexedDB with multi-room profiles and debounced auto-save
- **Animation & Icons:** Framer Motion, Lucide React
- **Test Runner:** Vitest (40/40 tests passing)

---

## Architectural Color Tokens & Typography

Defined in `src/design/tokens.css` and `src/design/typography.css`:

- `--color-ink` (`#1A1615`): Agran / Aged Sal Wood Timber
- `--color-linen` (`#F6F2EA`): Raw Muslin & Handmade Lokta Paper
- `--color-maroon` (`#8B2635`): Rato Simrik / Nepali Crimson Madder
- `--color-brass` (`#C49746`): Patan Kansa Bell-Metal Brass
- `--color-indigo` (`#22485E`): Himalayan Nil / High-Altitude Indigo (Selection state)
- `--color-pine` (`#3B4B42`): Himalayan Pine & Juniper Green
- `--color-taupe` (`#D5C8B8`): Rato Mato / Natural Earthen Plaster Mortar
- **Typography:** `Fraunces` (Display Serif headers) and `Space Grotesk` (Precision Drafting Sans)

---

## Core Directory Structure & Key Files

```
Roomdesigner/
├── src/
│   ├── main.jsx                     # Application root bootstrap
│   ├── App.jsx                      # Main router (LandingPage <-> AppShell)
│   ├── store/
│   │   └── roomStore.js             # Central Zustand store (undo/redo, collisions, rooms)
│   ├── engine/
│   │   ├── geometry.js              # SAT math, vector rotations, bounding boxes
│   │   ├── collision.js             # OBB collision detection & boundary containment
│   │   ├── snapping.js              # Assistive grid (10cm) & magnetic wall snapping
│   │   ├── openings.js              # Door & window wall piercing mathematics
│   │   └── exportPlan.js            # Architectural PNG export engine
│   ├── data/
│   │   ├── furnitureCatalog.js      # 41 piece encyclopedia across 6 categories
│   │   └── persistence.js           # IndexedDB storage and multi-room management
│   ├── design/
│   │   ├── tokens.css               # Architectural color palette & spacing
│   │   ├── typography.css           # Fraunces & Space Grotesk type scale
│   │   └── global.css               # Global canvas resets & scrollbars
│   └── components/
│       ├── layout/
│       │   ├── LandingPage.jsx      # Editorial drafting board hero with animated strokes
│       │   ├── AppShell.jsx         # 3-pane CAD workspace (catalog, canvas, inspector)
│       │   ├── TopBar.jsx           # Mode switch (2D/3D), undo/redo, export, rooms
│       │   └── NewRoomModal.jsx     # Room dimensions & preset modal
│       ├── canvas/
│       │   ├── RoomCanvas.jsx       # Pan/zoom drafting plane
│       │   ├── RoomBoundary.jsx     # Plaster walls, coping, door/window openings
│       │   ├── GridOverlay.jsx      # Dynamic millimeter/centimeter grid
│       │   ├── CollisionLayer.jsx   # Visual warning hulls for collisions
│       │   ├── FurniturePiece.jsx   # Drag/rotate controller
│       │   └── ArchitecturalSilhouette.jsx # 2D SVG blueprint top-down graphics
│       ├── preview3d/
│       │   ├── Room3DView.jsx       # Three.js canvas, CameraRig, parquet floor
│       │   ├── Room3DWalls.jsx      # Procedural wall spliced around doors/windows
│       │   └── Furniture3DBox.jsx   # 36 procedural 3D models with Three.js primitives
│       ├── catalog/
│       │   └── FurnitureCatalog.jsx # Categorized furniture library
│       └── inspector/
│           └── SelectedItemPanel.jsx# Contextual coordinate, rotation, dimension editor
```

---

## Verification & Testing

Run unit tests:
```bash
npm test -- --run
```

Run production build:
```bash
npm run build
```

