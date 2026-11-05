import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Camera,
  X,
  Sparkles,
  Save,
  LayoutGrid,
  Layers,
  HelpCircle,
  AlertTriangle,
  Minus,
  Plus,
  Crosshair,
} from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { NumberField, RangeField, TextField } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { readImage, imageFromPixels } from '../../engine/image.js';
import {
  detectSheetViews,
  cropSheetView,
  assignSheetViews,
  chooseSideSlot,
  prepareCrop,
  estimateProportions,
  estimatePartialProportions,
  dimensionsFromProportions,
} from '../../engine/sheet.js';
import {
  VIEW_SLOTS,
  segmentObject,
  normalizeView,
  maskCoverage,
  proportionWarnings,
  footprintOutline,
  cutoutImage,
  fitBackground,
} from '../../engine/hull.js';
import { CustomMeshModel } from '../preview3d/models/customMesh.jsx';
import {
  DESIGN_TYPES,
  PALETTE_SLOTS,
  SHORT_LABEL,
  TYPICAL_WIDTH_CM,
  buildDesign,
  typeCandidates,
  designMainColor,
  inferDimensions,
  detectionConfidence,
  withMirroredSides,
} from '../../engine/design.js';
import {
  VIEW_AXES,
  photoQuality,
  photoAspect,
  normalizeMask,
  fitScore,
  describeFit,
  fitHint,
  matchPhotoDims,
  silhouetteFromRender,
} from '../../engine/photoFit.js';
import { CaptureGuide, SLOT_HINTS, guideSeen, markGuideSeen } from './PhotoGuide.jsx';
import local from './PhotoModelModal.module.css';

const PHOTO_MAX = 480;
const SHEET_MAX = 1800;
const SHEET_SLOT_CHOICES = [
  ['', 'Not used'],
  ['front', 'Front'],
  ['right', 'Right side'],
  ['left', 'Left side'],
  ['back', 'Back'],
  ['top', 'Top'],
];

/** One detected view of a sheet picture: a small crop with the slot it is assigned to. */
function SheetThumb({ rgba, width, height, detection, view }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const crop = cropSheetView(rgba, width, height, detection, view, 0.04);
    const scale = Math.min(1, 160 / Math.max(crop.width, crop.height));
    const src = document.createElement('canvas');
    src.width = crop.width;
    src.height = crop.height;
    src.getContext('2d').putImageData(new ImageData(crop.rgba, crop.width, crop.height), 0, 0);
    canvas.width = Math.max(1, Math.round(crop.width * scale));
    canvas.height = Math.max(1, Math.round(crop.height * scale));
    canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
  }, [rgba, width, height, detection, view]);
  return <canvas ref={ref} className={local.cutout} aria-label="Detected view" />;
}
const PLAN_SIZE = 128;

/** The option closest to a measured value, so a reading between two choices still shows one of them. */
function traitValue(value, control) {
  const v = value ?? control.fallback;
  if (typeof control.fallback !== 'number') return v;
  return control.options.reduce(
    (best, [o]) => (Math.abs(o - v) < Math.abs(best - v) ? o : best),
    control.options[0][0]
  );
}

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
/** Look-and-feel choices per type: the traits read from the photos, which the user can correct. */
const TRAIT_CONTROLS = {
  bed: [
    { key: 'pillows', label: 'Pillows', fallback: 2, options: range(1, 4) },
    {
      key: 'legs',
      label: 'Base',
      fallback: 0,
      options: [
        [0, 'Solid base'],
        [1, 'On short feet'],
      ],
    },
    {
      key: 'head',
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
        ['pedestal', 'Swivel pedestal'],
      ],
    },
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
        [0, 'Plinth'],
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
  ],
  armchair: [
    { key: 'arm', label: 'Arms', fallback: 0.17, options: [...ARMS, [0.17, 'Chunky']] },
    ...UPHOLSTERY,
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
  table: [{ key: 'roundLegs', label: 'Legs', fallback: 0, options: LEGS }],
  'coffee-table': [{ key: 'roundLegs', label: 'Legs', fallback: 0, options: LEGS }],
  desk: [{ key: 'roundLegs', label: 'Legs', fallback: 0, options: LEGS }],
  wardrobe: [{ key: 'doors', label: 'Doors', fallback: 2, options: range(1, 6) }],
  bookshelf: [{ key: 'shelves', label: 'Compartments', fallback: 4, options: range(2, 8) }],
  nightstand: [{ key: 'drawers', label: 'Drawers', fallback: 2, options: range(1, 4) }],
};

function rgbaToDataUrl(rgba, size, height = size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(rgba, size, height), 0, 0);
  return canvas.toDataURL('image/png');
}

const THUMB_SIZE = 128;

/** The cut-out photo centred on a square transparent canvas, for the catalog card. */
function squareThumb(cut) {
  const src = document.createElement('canvas');
  src.width = cut.width;
  src.height = cut.height;
  src.getContext('2d').putImageData(new ImageData(cut.rgba, cut.width, cut.height), 0, 0);
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  const scale = (THUMB_SIZE - 8) / Math.max(cut.width, cut.height);
  const w = cut.width * scale;
  const h = cut.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, (THUMB_SIZE - w) / 2, (THUMB_SIZE - h) / 2, w, h);
  return canvas.toDataURL('image/png');
}

/** Source photo with the removed background greyed out so users can judge the cut-out. */
function CutoutPreview({ photo, mask }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !photo) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(photo.width, photo.height);
    for (let p = 0; p < mask.length; p++) {
      const i = p * 4;
      if (mask[p]) {
        image.data[i] = photo.rgba[i];
        image.data[i + 1] = photo.rgba[i + 1];
        image.data[i + 2] = photo.rgba[i + 2];
      } else {
        image.data[i] = 214;
        image.data[i + 1] = 208;
        image.data[i + 2] = 196;
      }
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [photo, mask]);
  return <canvas ref={ref} className={local.cutout} aria-label="Photo with background removed" />;
}

const DETECTED_PREFIX = {
  good: 'Detected:',
  fair: 'Looks like a',
  rough: 'Best guess from one photo:',
};
const typeLabel = (id) => DESIGN_TYPES.find((t) => t.id === id)?.label || 'furniture';
const VIEW_LABEL = { front: 'Front', right: 'Right', back: 'Back', left: 'Left', top: 'Top' };
/** Where the camera stands for each photo angle (the piece faces +z; the right photo is taken from +x). */
const VIEW_DIRECTION = {
  front: [0, 0, 1],
  right: [1, 0, 0],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  top: [0, 1, 0.02],
};
const CAMERA_FOV = 22;

/** The piece's size across the picture, up the picture, and along the line of sight, for a photo angle. */
function viewExtent(view, w, d, h) {
  if (view === 'front' || view === 'back') return { across: w, up: h, along: d };
  if (view === 'top') return { across: w, up: d, along: h };
  return { across: d, up: h, along: w };
}

/** Puts the camera at the angle of the chosen photo and far enough back that the whole piece fits. */
function PresetCamera({ view, dims, nonce }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const { widthCm, depthCm, heightCm } = dims;
  useEffect(() => {
    const w = widthCm / 100;
    const d = depthCm / 100;
    const h = heightCm / 100;
    const { across, up, along } = viewExtent(view, w, d, h);
    const aspect = Math.max(0.3, size.width / Math.max(1, size.height));
    const half = Math.max(up / 2, across / 2 / aspect) * 1.14;
    const dist = half / Math.tan((CAMERA_FOV * Math.PI) / 360) + along / 2;
    const target = new THREE.Vector3(0, h / 2, 0);
    const dir = new THREE.Vector3(...VIEW_DIRECTION[view]).normalize();
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
    camera.near = 0.05;
    camera.far = dist * 6 + 10;
    camera.updateProjectionMatrix();
  }, [camera, view, widthCm, depthCm, heightCm, nonce, size.width, size.height]);
  return null;
}

const PROBE_SIZE = 96;

/**
 * The model's silhouette as the photo angle sees it: rendered flat white on black with an orthographic camera
 * framed on the piece's size box, so the picture can be compared pixel for pixel with the photo's cut-out.
 */
function renderSilhouette(gl, scene, view, dims) {
  const w = dims.widthCm / 100;
  const d = dims.depthCm / 100;
  const h = dims.heightCm / 100;
  const { across, up, along } = viewExtent(view, w, d, h);
  const cam = new THREE.OrthographicCamera(
    -across / 2,
    across / 2,
    up / 2,
    -up / 2,
    0.01,
    along + 20
  );
  const centre = new THREE.Vector3(0, h / 2, 0);
  const dir = new THREE.Vector3(...VIEW_DIRECTION[view]);
  if (view === 'top') dir.set(0, 1, 0);
  cam.up.set(0, view === 'top' ? 0 : 1, view === 'top' ? -1 : 0);
  cam.position.copy(centre).addScaledVector(dir.normalize(), along / 2 + 5);
  cam.lookAt(centre);
  const target = new THREE.WebGLRenderTarget(PROBE_SIZE, PROBE_SIZE);
  const hidden = [];
  scene.traverse((o) => {
    if (o.userData?.probeHide && o.visible) {
      o.visible = false;
      hidden.push(o);
    }
  });
  const override = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const prevOverride = scene.overrideMaterial;
  const prevBackground = scene.background;
  const prevTarget = gl.getRenderTarget();
  const prevColor = gl.getClearColor(new THREE.Color());
  const prevAlpha = gl.getClearAlpha();
  const pixels = new Uint8Array(PROBE_SIZE * PROBE_SIZE * 4);
  try {
    scene.overrideMaterial = override;
    scene.background = null;
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 1);
    gl.clear();
    gl.render(scene, cam);
    gl.readRenderTargetPixels(target, 0, 0, PROBE_SIZE, PROBE_SIZE, pixels);
  } finally {
    scene.overrideMaterial = prevOverride;
    scene.background = prevBackground;
    gl.setRenderTarget(prevTarget);
    gl.setClearColor(prevColor, prevAlpha);
    hidden.forEach((o) => (o.visible = true));
    override.dispose();
    target.dispose();
  }
  return silhouetteFromRender(pixels, PROBE_SIZE, PROBE_SIZE);
}

/** Reports the model's silhouette for the current photo angle and size whenever any of them change. */
function SilhouetteProbe({ view, dims, signature, onResult }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        onResult({ mask: renderSilhouette(gl, scene, view, dims), view, dims });
      } catch {
        onResult(null);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [gl, scene, view, dims, signature, onResult]);
  return null;
}

/** The user's cut-out photo as a see-through sheet laid over the model, sized to the piece's box for that angle. */
function PhotoOverlay({ photo, mask, view, dims, opacity }) {
  const texture = useMemo(() => {
    const cut = cutoutImage(photo.rgba, mask, photo.width, photo.height, PHOTO_MAX);
    if (!cut) return null;
    const canvas = document.createElement('canvas');
    canvas.width = cut.width;
    canvas.height = cut.height;
    canvas.getContext('2d').putImageData(new ImageData(cut.rgba, cut.width, cut.height), 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [photo, mask]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  const w = dims.widthCm / 100;
  const d = dims.depthCm / 100;
  const h = dims.heightCm / 100;
  const { across, up } = viewExtent(view, w, d, h);
  const rotation = {
    front: [0, 0, 0],
    back: [0, Math.PI, 0],
    right: [0, Math.PI / 2, 0],
    left: [0, -Math.PI / 2, 0],
    top: [-Math.PI / 2, 0, 0],
  }[view];
  return (
    <mesh
      position={[0, h / 2, 0]}
      rotation={rotation}
      renderOrder={20}
      userData={{ probeHide: true }}
    >
      <planeGeometry args={[across, up]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** The finished model at its real size, drawn with the same component the room view uses. */
function ModelPreview({ design, dims, color, view, nonce, overlay, onSilhouette }) {
  const w = dims.widthCm / 100;
  const d = dims.depthCm / 100;
  const h = dims.heightCm / 100;
  const reach = Math.max(w, d, h);
  const def = useMemo(() => ({ design, color }), [design, color]);
  return (
    <Canvas shadows camera={{ fov: CAMERA_FOV }}>
      <PresetCamera view={view} dims={dims} nonce={nonce} />
      <ambientLight intensity={1.15} color="#FAF7F0" />
      <hemisphereLight groundColor="#E0D5C5" color="#FFFFFF" intensity={0.7} />
      <directionalLight
        castShadow
        position={[reach * 2, reach * 3, reach * 1.5]}
        intensity={1.25}
        color="#FFF8EE"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-reach * 2}
        shadow-camera-right={reach * 2}
        shadow-camera-top={reach * 2}
        shadow-camera-bottom={-reach * 2}
        shadow-camera-far={reach * 10}
        shadow-normalBias={0.02}
      />
      <directionalLight
        position={[-reach * 2, reach * 2, -reach * 2]}
        intensity={0.7}
        color="#F5EFE6"
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ probeHide: true }}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#E4DACB" roughness={1} />
      </mesh>
      <gridHelper
        args={[6, 12, '#B9AE9C', '#CFC5B4']}
        position={[0, 0.002, 0]}
        userData={{ probeHide: true }}
      />
      <CustomMeshModel def={def} widthM={w} depthM={d} heightM={h} mainColor={color} />
      {onSilhouette && (
        <SilhouetteProbe view={view} dims={dims} signature={design} onResult={onSilhouette} />
      )}
      {overlay && (
        <PhotoOverlay
          photo={overlay.photo}
          mask={overlay.mask}
          view={view}
          dims={dims}
          opacity={overlay.opacity}
        />
      )}
      <OrbitControls
        enablePan={false}
        enableRotate={!overlay}
        enableZoom={!overlay}
        target={[0, h / 2, 0]}
      />
    </Canvas>
  );
}

/** A size with minus and plus buttons (shift moves by 10) and a box to type in. */
function Stepper({ label, value, onChange }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const set = (v) => onChange(Math.min(600, Math.max(5, Math.round(v))));
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && draft !== '') set(n);
    else setDraft(String(value));
  };
  return (
    <div className={local.stepper} role="group" aria-label={label}>
      <span>{label}</span>
      <div className={local.stepperRow}>
        <button
          type="button"
          className={local.stepBtn}
          aria-label={`Make the ${label.toLowerCase()} smaller`}
          onClick={(e) => set(value - (e.shiftKey ? 10 : 1))}
        >
          <Minus size={13} aria-hidden="true" />
        </button>
        <input
          className={local.stepValue}
          type="number"
          inputMode="numeric"
          min={5}
          max={600}
          value={draft}
          aria-label={`${label} in centimeters`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        <button
          type="button"
          className={local.stepBtn}
          aria-label={`Make the ${label.toLowerCase()} larger`}
          onClick={(e) => set(value + (e.shiftKey ? 10 : 1))}
        >
          <Plus size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** The user's photo as taken, scaled to fit its frame. */
function PhotoPane({ photo }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !photo) return;
    canvas.width = photo.width;
    canvas.height = photo.height;
    canvas
      .getContext('2d')
      .putImageData(new ImageData(photo.rgba, photo.width, photo.height), 0, 0);
  }, [photo]);
  return <canvas ref={ref} className={local.photoCanvas} aria-label="Your photo" />;
}

export function PhotoModelModal({ onClose }) {
  const addCustomFurniture = useRoomStore((state) => state.addCustomFurniture);
  const [name, setName] = useState('My furniture');
  const [dims, setDims] = useState({ widthCm: 80, depthCm: 50, heightCm: 80 });
  const [photos, setPhotos] = useState({}); // slotId -> { width, height, rgba, thumbUrl }
  const [tolerance, setTolerance] = useState(60);
  const nameTouched = useRef(false); // until the user types a name, it follows the detected type
  const toleranceTouched = useRef(false); // once the user moves the slider, it is theirs
  const [design, setDesign] = useState(null); // type, palette and traits read from the photos
  const [typeChoice, setTypeChoice] = useState(''); // '' = detect from the photos
  const [typeOpen, setTypeOpen] = useState(false); // the type picker stays hidden until "Not right?"
  const [mirror, setMirror] = useState(true); // reuse a lone side photo, mirrored, for the other side
  const [viewChoice, setViewChoice] = useState('front'); // which photo is shown beside the model
  const [viewNonce, setViewNonce] = useState(0); // re-aims the camera when the same view is picked again
  const [overlayOn, setOverlayOn] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null); // { rgba, width, height, detection, slots: [slot|''] }
  const [keepRatio, setKeepRatio] = useState(true);
  const [anchor, setAnchor] = useState('widthCm');
  const [sizeEdited, setSizeEdited] = useState(false); // false: the size follows the type's usual size
  const [guideOpen, setGuideOpen] = useState(() => !guideSeen()); // shown the first time it is opened
  const [candidates, setCandidates] = useState(null); // { list, agreement } of likely types
  const [probe, setProbe] = useState(null); // the model's silhouette from the active photo angle
  const inputs = useRef({});
  const sheetInput = useRef(null);
  const dimsRef = useRef(dims);
  dimsRef.current = dims;

  // A lone side photo can stand in, mirrored, for the missing side
  const lonelySide = Boolean(photos.left) !== Boolean(photos.right);
  const allPhotos = useMemo(
    () => (mirror && lonelySide ? withMirroredSides(photos) : photos),
    [photos, mirror, lonelySide]
  );

  const segmented = useMemo(() => {
    const out = {};
    for (const [slot, photo] of Object.entries(allPhotos)) {
      const mask = segmentObject(photo.rgba, photo.width, photo.height, tolerance);
      out[slot] = { mask, coverage: maskCoverage(mask) };
    }
    return out;
  }, [allPhotos, tolerance]);

  // A clean backdrop (a studio shot on white) can use a fine threshold, which keeps white and pale pieces;
  // a noisy one (a phone photo) needs a coarser one
  useEffect(() => {
    if (toleranceTouched.current) return;
    const list = Object.values(photos);
    if (!list.length) return;
    const noisy = list.some((p) => fitBackground(p.rgba, p.width, p.height).noise > 1.5);
    setTolerance(noisy ? 60 : 16);
  }, [photos]);

  // Photos or cut-out changes invalidate the previous model
  useEffect(() => {
    setDesign(null);
    setCandidates(null);
    setProbe(null);
  }, [segmented]);

  const loadPhoto = async (slot, file) => {
    if (!file) return;
    setMessage(null);
    try {
      const img = await readImage(file, PHOTO_MAX);
      setPhotos((prev) => ({ ...prev, [slot]: img }));
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    }
  };

  const removePhoto = (slot) =>
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });

  const photoCount = Object.keys(photos).length;
  const shownViews = VIEW_SLOTS.filter((slot) => allPhotos[slot.id]).map((slot) => slot.id);
  const activeView = shownViews.includes(viewChoice) ? viewChoice : shownViews[0] || 'front';
  const modelColor = design ? designMainColor(design) : '#a0a0a0';
  const cutouts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(allPhotos).map(([slot, photo]) => [
          slot,
          { mask: segmented[slot].mask, width: photo.width, height: photo.height },
        ])
      ),
    [segmented, allPhotos]
  );
  const proportions = useMemo(
    () =>
      proportionWarnings(
        Object.fromEntries(Object.entries(cutouts).filter(([slot]) => photos[slot])),
        dims
      ),
    [cutouts, photos, dims]
  );
  const ratios = useMemo(() => estimateProportions(cutouts), [cutouts]);
  const partial = useMemo(() => estimatePartialProportions(cutouts), [cutouts]);
  const ratioKey = ratios ? `${ratios.widthCm.toFixed(3)}/${ratios.depthCm.toFixed(3)}` : '';
  // New photos change the shape: rescale the other sizes around the one the user last set
  useEffect(() => {
    if (!keepRatio || !ratios) return;
    setDims(dimensionsFromProportions(ratios, anchor, dimsRef.current[anchor]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioKey, keepRatio]);
  // Problems with each photo, in plain words, as soon as it is added
  const qualityItems = useMemo(
    () =>
      VIEW_SLOTS.filter((slot) => photos[slot.id] && segmented[slot.id]).flatMap((slot) =>
        photoQuality(photos[slot.id], segmented[slot.id].mask).map((q) => ({
          slot: slot.id,
          label: slot.label,
          ...q,
        }))
      ),
    [photos, segmented]
  );
  const flagged = new Set(qualityItems.map((q) => q.slot));
  const handleSilhouette = useCallback((result) => setProbe(result), []);
  // How closely the model's outline matches the cut-out of the photo being compared
  const fit = useMemo(() => {
    const photo = allPhotos[activeView];
    const cut = segmented[activeView];
    if (!probe || probe.view !== activeView || !photo || !cut) return null;
    const model = normalizeMask(probe.mask, PROBE_SIZE, PROBE_SIZE, 64);
    const target = normalizeMask(cut.mask, photo.width, photo.height, 64);
    const axes = VIEW_AXES[activeView];
    if (!model || !target) return null;
    const modelAspect =
      (model.frac.w * probe.dims[axes.across]) / (model.frac.h * probe.dims[axes.up]);
    const targetAspect = photoAspect(cut.mask, photo.width, photo.height);
    return {
      ...fitScore(model, target, modelAspect, targetAspect),
      frac: model.frac,
      modelAspect,
      photoAspect: targetAspect,
    };
  }, [probe, activeView, allPhotos, segmented]);
  const weakSlots = Object.entries(segmented).filter(
    ([slot, s]) => photos[slot] && (s.coverage < 0.03 || s.coverage > 0.92)
  );

  const loadSheet = async (file) => {
    if (!file) return;
    setMessage(null);
    try {
      const img = await readImage(file, SHEET_MAX, 'image/png');
      const detection = detectSheetViews(img.rgba, img.width, img.height);
      if (detection.views.length < 2) {
        setMessage({
          kind: 'error',
          text: 'Only one object was found in that picture. Use the Add photo buttons for single photos.',
        });
        return;
      }
      const slots = assignSheetViews(detection.views);
      // Which side photo is which needs the other views: try both ways round and keep the better fit
      const crops = detection.views.map((v) =>
        cropSheetView(img.rgba, img.width, img.height, detection, v)
      );
      const prepared = (slot) => {
        const i = slots.indexOf(slot);
        return i >= 0 ? prepareCrop(crops[i]) : null;
      };
      const sideIndex = slots.indexOf('right');
      if (sideIndex >= 0) {
        const side = prepareCrop(crops[sideIndex]);
        if (side)
          slots[sideIndex] = chooseSideSlot({
            front: prepared('front'),
            top: prepared('top'),
            side,
          });
      }
      setSheet({ rgba: img.rgba, width: img.width, height: img.height, detection, slots });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    }
  };

  const applySheet = () => {
    if (!sheet) return;
    const next = {};
    const used = new Set();
    sheet.detection.views.forEach((v, i) => {
      const slot = sheet.slots[i];
      if (!slot || used.has(slot)) return;
      used.add(slot);
      const crop = cropSheetView(sheet.rgba, sheet.width, sheet.height, sheet.detection, v);
      next[slot] = imageFromPixels(crop.rgba, crop.width, crop.height, PHOTO_MAX);
    });
    if (Object.keys(next).length < 1) {
      setMessage({ kind: 'error', text: 'Give at least one of the views a role.' });
      return;
    }
    setPhotos(next);
    // A clean render on pure white can use a fine threshold, which keeps white pillows and linen
    const noisy = Object.values(next).some(
      (p) => fitBackground(p.rgba, p.width, p.height).noise > 1.5
    );
    toleranceTouched.current = true;
    setTolerance(noisy ? 35 : 16);
    setKeepRatio(true);
    setSizeEdited(false);
    setSheet(null);
  };

  const handleBuild = (forceType = typeChoice) => {
    setBusy(true);
    setMessage(null);
    // Let the spinner paint before the analysis
    setTimeout(() => {
      try {
        const views = {};
        for (const slot of VIEW_SLOTS) {
          const photo = allPhotos[slot.id];
          if (!photo) continue;
          const norm = normalizeView(
            photo.rgba,
            segmented[slot.id].mask,
            photo.width,
            photo.height,
            96
          );
          if (!norm)
            throw new Error(
              `No object found in the ${slot.label.toLowerCase()} photo. Try a plainer background.`
            );
          // The same photo with its gaps left open, to read slatted backs
          const open = normalizeView(
            photo.rgba,
            segmentObject(photo.rgba, photo.width, photo.height, tolerance, { keepGaps: true }),
            photo.width,
            photo.height,
            96
          );
          if (open) norm.open = open.mask;
          views[slot.id] = norm;
        }
        const hints = { widthPerHeight: partial.widthPerHeight };
        let result = buildDesign(views, dims, forceType || undefined, sizeEdited, hints);
        // Photos give proportions, not size: until a real size is entered, use the type's usual one.
        // What the photos cannot show (the depth, from a lone front photo) is the usual for the type too
        if (!sizeEdited && TYPICAL_WIDTH_CM[result.type]) {
          const fit = (width) =>
            ratios
              ? dimensionsFromProportions(ratios, 'widthCm', width)
              : inferDimensions(result.type, partial, width);
          let next = fit(TYPICAL_WIDTH_CM[result.type]);
          if (result.type === 'sofa') {
            // Count the seats at a full sofa width first; a one or two seater is then narrower
            const seats = buildDesign(views, next, result.type, true, hints).traits.seats;
            if (seats <= 2) next = fit(80 + seats * 35);
          }
          setDims(next);
          setAnchor('widthCm');
          result = buildDesign(views, next, result.type, true, hints);
        }
        setDesign(result);
        // The likeliest types, for when the first guess is not steady or rests on few photos
        setCandidates(typeCandidates(views, dims, sizeEdited, hints, result.type));
        setTypeOpen(false);
        setViewChoice((v) => (shownViews.includes(v) ? v : shownViews[0]));
        if (!nameTouched.current) {
          const label =
            result.type === 'lounge'
              ? 'lounge chair'
              : result.type === 'sofa' && result.traits.seats <= 2
                ? 'loveseat'
                : DESIGN_TYPES.find((t) => t.id === result.type)?.label || 'furniture';
          setName(`My ${label.toLowerCase()}`);
        }
      } catch (err) {
        setDesign(null);
        setMessage({ kind: 'error', text: err.message });
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const setPaletteColour = (key, value) =>
    setDesign((d) => ({ ...d, palette: { ...d.palette, [key]: value } }));
  const setTrait = (key, value) =>
    setDesign((d) => ({ ...d, traits: { ...d.traits, [key]: value } }));

  const handleSave = async () => {
    if (!design) return;
    // The user's own top photo, cut out, is what the 2D plan shows; its outline is the footprint
    let planImage;
    let topOutline = [];
    const topPhoto = allPhotos.top;
    if (topPhoto) {
      const mask = segmented.top.mask;
      const cut = cutoutImage(topPhoto.rgba, mask, topPhoto.width, topPhoto.height);
      if (cut) planImage = rgbaToDataUrl(cut.rgba, cut.width, cut.height);
      const norm = normalizeView(topPhoto.rgba, mask, topPhoto.width, topPhoto.height, PLAN_SIZE);
      if (norm) {
        const alpha = new Uint8ClampedArray(PLAN_SIZE * PLAN_SIZE * 4);
        for (let p = 0; p < norm.mask.length; p++) alpha[p * 4 + 3] = norm.mask[p] ? 255 : 0;
        topOutline = footprintOutline(alpha, PLAN_SIZE);
      }
    }
    // Catalog card: the piece itself, from the front photo when there is one
    const thumbSlot = ['front', 'right', 'left', 'back', 'top'].find((id) => allPhotos[id]);
    let thumb;
    if (thumbSlot) {
      const photo = allPhotos[thumbSlot];
      const cut = cutoutImage(photo.rgba, segmented[thumbSlot].mask, photo.width, photo.height);
      if (cut) thumb = squareThumb(cut);
    }
    try {
      await addCustomFurniture({
        id: `custom-${Date.now().toString(36)}`,
        name: name.trim() || 'My furniture',
        category: 'custom',
        shapeType: 'custom-mesh',
        widthCm: dims.widthCm,
        depthCm: dims.depthCm,
        heightCm: dims.heightCm,
        color: modelColor,
        design,
        planImage,
        topOutline,
        thumb,
      });
    } catch {
      setMessage({ kind: 'error', text: 'This piece could not be saved on this device.' });
      return;
    }
    onClose();
  };

  // Fine-tuning against the photo: one size at a time, no longer tied to the photos' proportions
  const nudgeDim = (key, value) => {
    setSizeEdited(true);
    setAnchor(key);
    setKeepRatio(false);
    setDims((d) => ({ ...d, [key]: value }));
  };

  // Scales the model so its silhouette bounds take the proportions of the photo's cut-out
  const matchPhoto = () => {
    if (!fit) return;
    setSizeEdited(true);
    setKeepRatio(false);
    setDims((d) => matchPhotoDims(d, activeView, fit.photoAspect, fit.frac, anchor));
  };

  const setDim = (key, value) => {
    setSizeEdited(true);
    setAnchor(key);
    if (keepRatio && ratios) setDims(dimensionsFromProportions(ratios, key, value));
    else setDims((d) => ({ ...d, [key]: value }));
  };

  return (
    <Modal
      title="Create furniture from photos"
      subtitle="Photograph a piece from a few sides. A catalog-style 3D model is made from what the photos show, on this device. Your photos are never uploaded."
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            icon={<Sparkles size={16} />}
            onClick={() => handleBuild()}
            disabled={photoCount < 1 || busy}
          >
            {busy ? 'Working...' : design ? 'Rebuild model' : 'Build 3D model'}
          </Button>
          <Button
            variant="primary"
            icon={<Save size={16} />}
            onClick={handleSave}
            disabled={!design}
          >
            Save to My furniture
          </Button>
        </>
      }
    >
      <div className={local.columns}>
        <div className={local.left}>
          <TextField
            label="Name"
            value={name}
            maxLength={60}
            onChange={(e) => {
              nameTouched.current = true;
              setName(e.target.value);
            }}
          />

          <div className={local.section}>
            <h3 className={local.sectionTitle}>Real size</h3>
            <div className={local.sizes}>
              {[
                ['widthCm', 'Width'],
                ['depthCm', 'Depth'],
                ['heightCm', 'Height'],
              ].map(([key, label]) => (
                <NumberField
                  key={key}
                  label={label}
                  suffix="cm"
                  min={5}
                  max={600}
                  value={dims[key]}
                  onCommit={(v) => setDim(key, v)}
                />
              ))}
            </div>
            {ratios && (
              <label className={local.check}>
                <input
                  type="checkbox"
                  checked={keepRatio}
                  onChange={(e) => setKeepRatio(e.target.checked)}
                />
                <span>
                  Keep the photos' proportions: enter one real size and the others follow.
                </span>
              </label>
            )}
          </div>

          <div className={local.section}>
            <h3 className={local.sectionTitle}>
              Photos{' '}
              <span className={local.sectionNote}>
                {photoCount} of 5. One is enough, more are more accurate
              </span>
            </h3>
            <div>
              <button
                type="button"
                className={local.helpBtn}
                aria-expanded={guideOpen}
                onClick={() => {
                  if (guideOpen) markGuideSeen();
                  setGuideOpen((open) => !open);
                }}
              >
                <HelpCircle size={14} aria-hidden="true" /> How to photograph it
              </button>
            </div>
            {guideOpen && (
              <CaptureGuide
                onClose={() => {
                  markGuideSeen();
                  setGuideOpen(false);
                }}
              />
            )}
            <div className={local.sheetRow}>
              <Button
                variant="secondary"
                size="small"
                icon={<LayoutGrid size={14} />}
                onClick={() => sheetInput.current?.click()}
              >
                Split one picture into views
              </Button>
              <span className={local.sectionNote}>
                For a product sheet that shows the piece from several sides.
              </span>
              <input
                ref={sheetInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                aria-label="Picture with several views"
                onChange={(e) => {
                  loadSheet(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            {sheet && (
              <div
                className={local.sheetPanel}
                role="group"
                aria-label="Views found in the picture"
              >
                <p className={local.note}>
                  Found {sheet.detection.views.length} views. Check what each one shows, then use
                  them. A three-quarter view is not needed.
                </p>
                <div className={local.slots}>
                  {sheet.detection.views.map((v, i) => (
                    <div key={v.id} className={local.slot}>
                      <SheetThumb
                        rgba={sheet.rgba}
                        width={sheet.width}
                        height={sheet.height}
                        detection={sheet.detection}
                        view={v}
                      />
                      <select
                        className={local.select}
                        value={sheet.slots[i] || ''}
                        aria-label={`Role of view ${i + 1}`}
                        onChange={(e) =>
                          setSheet((cur) => ({
                            ...cur,
                            slots: cur.slots.map((x, j) => (j === i ? e.target.value : x)),
                          }))
                        }
                      >
                        {SHEET_SLOT_CHOICES.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className={local.sheetActions}>
                  <Button variant="ghost" size="small" onClick={() => setSheet(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="small" onClick={applySheet}>
                    Use these views
                  </Button>
                </div>
              </div>
            )}
            <div className={local.slots}>
              {VIEW_SLOTS.map((slot) => {
                const photo = allPhotos[slot.id];
                const copy = photo?.mirroredFrom;
                return (
                  <div key={slot.id} className={local.slot}>
                    <div className={local.slotHead}>
                      <span>
                        {slot.label}
                        {flagged.has(slot.id) && !copy && (
                          <span
                            className={local.slotFlag}
                            title="This photo could be better: see the tips below"
                          >
                            {' '}
                            <AlertTriangle size={12} aria-label="Photo could be better" />
                          </span>
                        )}
                      </span>
                      {photo && !copy && (
                        <button
                          type="button"
                          className={local.iconBtn}
                          onClick={() => removePhoto(slot.id)}
                          aria-label={`Remove ${slot.label} photo`}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {photo ? (
                      <CutoutPreview photo={photo} mask={segmented[slot.id].mask} />
                    ) : (
                      <button
                        type="button"
                        className={local.addPhoto}
                        onClick={() => inputs.current[slot.id]?.click()}
                      >
                        <Camera size={18} aria-hidden="true" />
                        <span>Add photo</span>
                      </button>
                    )}
                    {!photo && <span className={local.slotHint}>{SLOT_HINTS[slot.id]}</span>}
                    {copy && (
                      <span className={local.mirrorTag}>
                        Mirrored from the {VIEW_LABEL[copy].toLowerCase()} photo.{' '}
                        <button
                          type="button"
                          className={local.linkBtn}
                          onClick={() => inputs.current[slot.id]?.click()}
                        >
                          Use my own
                        </button>
                      </span>
                    )}
                    <input
                      ref={(el) => {
                        inputs.current[slot.id] = el;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      aria-label={`${slot.label} photo`}
                      onChange={(e) => {
                        loadPhoto(slot.id, e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                );
              })}
            </div>
            {qualityItems.length > 0 && (
              <ul className={local.checks} aria-label="Photo checks">
                {qualityItems.map((q) => (
                  <li key={`${q.slot}-${q.id}`} className={local.check1}>
                    <AlertTriangle size={14} aria-hidden="true" />
                    <span>
                      <strong>{q.label} photo.</strong> {q.text}{' '}
                      <span className={local.checkFix}>{q.fix}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {lonelySide && (
              <label className={local.check}>
                <input
                  type="checkbox"
                  checked={mirror}
                  onChange={(e) => setMirror(e.target.checked)}
                />
                <span>
                  Only one side is photographed: use it, mirrored, for the other side too. Most
                  furniture is the same on both sides.
                </span>
              </label>
            )}
            {photoCount === 1 && (
              <p className={local.note}>
                With one photo the depth and shape are inferred from the usual proportions of this
                kind of furniture. Add a second photo from the side for a more accurate model.
              </p>
            )}
          </div>

          <RangeField
            label="Background removal"
            min={15}
            max={160}
            value={tolerance}
            onChange={(v) => {
              toleranceTouched.current = true;
              setTolerance(v);
            }}
            hint="Works best with a plain, evenly lit background. Raise it if background stays visible; lower it if parts of the piece disappear."
          />
        </div>

        <div className={local.right}>
          {shownViews.length > 1 && (
            <div className={local.viewTabs} role="group" aria-label="Photo to compare with">
              {shownViews.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={local.viewTab}
                  aria-pressed={id === activeView}
                  onClick={() => {
                    setViewChoice(id);
                    setViewNonce((n) => n + 1);
                  }}
                >
                  {VIEW_LABEL[id]}
                </button>
              ))}
            </div>
          )}
          <div className={local.compare}>
            {photoCount > 0 && (
              <figure className={local.photoFrame}>
                <PhotoPane photo={allPhotos[activeView]} />
                <figcaption>Your {VIEW_LABEL[activeView].toLowerCase()} photo</figcaption>
              </figure>
            )}
            <div className={local.preview} aria-label="3D model preview">
              {design ? (
                <ModelPreview
                  design={design}
                  dims={dims}
                  color={modelColor}
                  view={activeView}
                  nonce={viewNonce}
                  onSilhouette={handleSilhouette}
                  overlay={
                    overlayOn && allPhotos[activeView]
                      ? {
                          photo: allPhotos[activeView],
                          mask: segmented[activeView].mask,
                          opacity: overlayOpacity,
                        }
                      : null
                  }
                />
              ) : (
                <p className={local.placeholder}>
                  {photoCount < 1
                    ? 'Add a photo of the piece to begin. One is enough.'
                    : 'Press "Build 3D model" to preview it here.'}
                </p>
              )}
            </div>
          </div>
          {design && (
            <div className={local.overlayRow}>
              <label className={local.check}>
                <input
                  type="checkbox"
                  checked={overlayOn}
                  onChange={(e) => setOverlayOn(e.target.checked)}
                />
                <span>
                  <Layers size={13} aria-hidden="true" /> Overlay my photo on the model
                </span>
              </label>
              {overlayOn && (
                <input
                  type="range"
                  min={0.15}
                  max={0.9}
                  step={0.05}
                  value={overlayOpacity}
                  aria-label="Photo overlay strength"
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                />
              )}
            </div>
          )}
          {design && (
            <div className={local.fit} role="group" aria-label="Fit the size to your photo">
              <div className={local.fitHead}>
                <h3 className={local.fitTitle}>
                  Fit to your {VIEW_LABEL[activeView].toLowerCase()} photo
                </h3>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<Crosshair size={14} />}
                  onClick={matchPhoto}
                  disabled={!fit}
                >
                  Match photo
                </Button>
              </div>
              <div className={local.steppers}>
                <Stepper
                  label="Width"
                  value={dims.widthCm}
                  onChange={(v) => nudgeDim('widthCm', v)}
                />
                <Stepper
                  label="Depth"
                  value={dims.depthCm}
                  onChange={(v) => nudgeDim('depthCm', v)}
                />
                <Stepper
                  label="Height"
                  value={dims.heightCm}
                  onChange={(v) => nudgeDim('heightCm', v)}
                />
              </div>
              {fit ? (
                <div className={local.meter} aria-live="polite">
                  <div className={local.meterLine}>
                    <span>
                      <strong>{describeFit(fit.score).label}</strong> with this photo
                    </span>
                    <span>{Math.round(fit.score * 100)}%</span>
                  </div>
                  <div
                    className={local.meterBar}
                    role="meter"
                    aria-label="How closely the model matches the photo"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(fit.score * 100)}
                  >
                    <div
                      className={local.meterFill}
                      data-level={describeFit(fit.score).level}
                      style={{ width: `${Math.round(fit.score * 100)}%` }}
                    />
                  </div>
                  <p className={local.note}>
                    {fitHint(activeView, fit.modelAspect, fit.photoAspect) ||
                      'The proportions agree with the photo.'}{' '}
                    Turn on the overlay above to see the difference, and use the buttons to adjust
                    (hold Shift for 10 cm).
                  </p>
                </div>
              ) : (
                <p className={local.note}>Measuring the model against the photo...</p>
              )}
            </div>
          )}
          {design && (
            <div className={local.section}>
              <div className={local.detected} aria-live="polite">
                <p className={local.detectedLine}>
                  {DETECTED_PREFIX[detectionConfidence(Object.keys(photos))]}{' '}
                  <strong>{typeLabel(design.type)}</strong>
                  {typeOpen ? null : (
                    <>
                      {' '}
                      <button
                        type="button"
                        className={local.linkBtn}
                        onClick={() => setTypeOpen(true)}
                      >
                        More types
                      </button>
                    </>
                  )}
                </p>
                {candidates &&
                  (detectionConfidence(Object.keys(photos)) !== 'good' ||
                    candidates.agreement < 0.75) && (
                    <div className={local.chips} role="group" aria-label="Looks like">
                      <span>Looks like:</span>
                      {candidates.list.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className={local.chip}
                          aria-pressed={id === design.type}
                          disabled={busy}
                          onClick={() => {
                            setTypeChoice(id);
                            handleBuild(id);
                          }}
                        >
                          {SHORT_LABEL[id] || typeLabel(id)}
                        </button>
                      ))}
                    </div>
                  )}
                {typeOpen && (
                  <label className={local.designRow}>
                    <span>Type of furniture</span>
                    <select
                      className={local.select}
                      value={design.type}
                      aria-label="Type of furniture"
                      onChange={(e) => {
                        setTypeChoice(e.target.value);
                        handleBuild(e.target.value);
                      }}
                    >
                      {DESIGN_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <p className={local.summary}>
                  {dims.widthCm} x {dims.depthCm} x {dims.heightCm} cm (width x depth x height).
                  {!sizeEdited &&
                    ' The size is the usual one for this type: enter the real width above.'}
                </p>
              </div>
              <details className={local.details}>
                <summary>Adjust details</summary>
                <div className={local.detailsBody}>
                  <p className={local.note}>
                    Read from your photos. Change anything that looks off: the model updates as you
                    go.
                  </p>
                  {(TRAIT_CONTROLS[design.type] || []).map((c) => (
                    <label key={c.key} className={local.designRow}>
                      <span>{c.label}</span>
                      <select
                        className={local.select}
                        value={String(traitValue(design.traits[c.key], c))}
                        aria-label={c.label}
                        onChange={(e) =>
                          setTrait(
                            c.key,
                            typeof c.fallback === 'number' ? Number(e.target.value) : e.target.value
                          )
                        }
                      >
                        {c.options.map(([value, text]) => (
                          <option key={value} value={String(value)}>
                            {text}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <div
                    className={local.palette}
                    role="group"
                    aria-label="Colours found in the photos"
                  >
                    {(PALETTE_SLOTS[design.type] || []).map(([key, label]) => (
                      <label key={key} className={local.paletteItem}>
                        <input
                          type="color"
                          value={design.palette[key] || '#888888'}
                          aria-label={label}
                          onChange={(e) => setPaletteColour(key, e.target.value)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </details>
              {photoCount === 1 && (
                <p className={local.note}>
                  Built from one photo: add a second one from the side for a more accurate depth and
                  shape.
                </p>
              )}
              <p className={local.note}>
                Shown at its real size; each grid square is 50 cm. The camera starts at the angle of
                the photo you pick; drag to rotate. The model uses the same parts as the built-in
                furniture, with the shape, proportions and colours read from your photos.
              </p>
            </div>
          )}
          <p className={local.note}>
            Furniture made from photos stays on this device. Your top photo is shown on the 2D plan.
            Shared links and JSON files keep the model's type, colours and size, but not the photos.
          </p>
        </div>
      </div>

      {proportions.map((text) => (
        <Notice key={text} kind="warn">
          {text} Check the size above or retake the photo straight on.
        </Notice>
      ))}
      {weakSlots.length > 0 && (
        <Notice kind="warn">
          The cut-out looks unreliable for:{' '}
          {weakSlots.map(([slot]) => VIEW_SLOTS.find((v) => v.id === slot).label).join(', ')}.
          Adjust the background removal or retake the photo on a plain background.
        </Notice>
      )}
      {message && <Notice kind="error">{message.text}</Notice>}
    </Modal>
  );
}
