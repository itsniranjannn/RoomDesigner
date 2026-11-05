import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Camera, X, Sparkles, Save, LayoutGrid } from 'lucide-react';
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
  TYPICAL_WIDTH_CM,
  buildDesign,
  designMainColor,
} from '../../engine/design.js';
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
      key: 'channels',
      label: 'Headboard',
      fallback: 0,
      options: [
        [0, 'Plain'],
        [1, 'Channel stitched'],
      ],
    },
  ],
  sofa: [
    { key: 'seats', label: 'Seats', fallback: 3, options: range(1, 5) },
    { key: 'arm', label: 'Arms', fallback: 0.1, options: ARMS },
  ],
  armchair: [{ key: 'arm', label: 'Arms', fallback: 0.17, options: [...ARMS, [0.17, 'Chunky']] }],
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

/** Moves the camera back so the whole piece fits, whatever its real size. */
function FitCamera({ distance, target }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.position.set(distance * 0.75, target + distance * 0.45, distance * 0.85);
    camera.lookAt(0, target, 0);
    camera.updateProjectionMatrix();
  }, [camera, distance, target]);
  return null;
}

/** The finished model at its real size, drawn with the same component the room view uses. */
function ModelPreview({ design, dims, color }) {
  const w = dims.widthCm / 100;
  const d = dims.depthCm / 100;
  const h = dims.heightCm / 100;
  const reach = Math.max(w, d, h);
  const def = useMemo(() => ({ design, color }), [design, color]);
  return (
    <Canvas shadows camera={{ fov: 40 }}>
      <FitCamera distance={reach * 1.55 + 0.3} target={h / 2} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#E4DACB" roughness={1} />
      </mesh>
      <gridHelper args={[6, 12, '#B9AE9C', '#CFC5B4']} position={[0, 0.002, 0]} />
      <CustomMeshModel def={def} widthM={w} depthM={d} heightM={h} mainColor={color} />
      <OrbitControls autoRotate autoRotateSpeed={2.2} enablePan={false} target={[0, h / 2, 0]} />
    </Canvas>
  );
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
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null); // { rgba, width, height, detection, slots: [slot|''] }
  const [keepRatio, setKeepRatio] = useState(true);
  const [anchor, setAnchor] = useState('widthCm');
  const [sizeEdited, setSizeEdited] = useState(false); // false: the size follows the type's usual size
  const inputs = useRef({});
  const sheetInput = useRef(null);
  const dimsRef = useRef(dims);
  dimsRef.current = dims;

  const segmented = useMemo(() => {
    const out = {};
    for (const [slot, photo] of Object.entries(photos)) {
      const mask = segmentObject(photo.rgba, photo.width, photo.height, tolerance);
      out[slot] = { mask, coverage: maskCoverage(mask) };
    }
    return out;
  }, [photos, tolerance]);

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
  const modelColor = design ? designMainColor(design) : '#a0a0a0';
  const proportions = useMemo(
    () =>
      proportionWarnings(
        Object.fromEntries(
          Object.entries(photos).map(([slot, photo]) => [
            slot,
            { mask: segmented[slot].mask, width: photo.width, height: photo.height },
          ])
        ),
        dims
      ),
    [segmented, photos, dims]
  );
  const ratios = useMemo(
    () =>
      estimateProportions(
        Object.fromEntries(
          Object.entries(photos).map(([slot, photo]) => [
            slot,
            { mask: segmented[slot].mask, width: photo.width, height: photo.height },
          ])
        )
      ),
    [segmented, photos]
  );
  const ratioKey = ratios ? `${ratios.widthCm.toFixed(3)}/${ratios.depthCm.toFixed(3)}` : '';
  // New photos change the shape: rescale the other sizes around the one the user last set
  useEffect(() => {
    if (!keepRatio || !ratios) return;
    setDims(dimensionsFromProportions(ratios, anchor, dimsRef.current[anchor]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioKey, keepRatio]);
  const weakSlots = Object.entries(segmented).filter(
    ([, s]) => s.coverage < 0.03 || s.coverage > 0.92
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
    if (Object.keys(next).length < 2) {
      setMessage({ kind: 'error', text: 'Give at least two of the views a different role.' });
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
          const photo = photos[slot.id];
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
        let result = buildDesign(views, dims, forceType || undefined, sizeEdited);
        // Photos give proportions, not size: until a real size is entered, use the type's usual one
        if (!sizeEdited && ratios && TYPICAL_WIDTH_CM[result.type]) {
          const next = dimensionsFromProportions(ratios, 'widthCm', TYPICAL_WIDTH_CM[result.type]);
          setDims(next);
          setAnchor('widthCm');
          result = buildDesign(views, next, result.type, true);
        }
        setDesign(result);
        if (!nameTouched.current) {
          const label = DESIGN_TYPES.find((t) => t.id === result.type)?.label || 'furniture';
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
    const topPhoto = photos.top;
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
    const thumbSlot = ['front', 'right', 'left', 'back', 'top'].find((id) => photos[id]);
    let thumb;
    if (thumbSlot) {
      const photo = photos[thumbSlot];
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
            disabled={photoCount < 2 || busy}
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
              Photos <span className={local.sectionNote}>{photoCount} of 5, at least 2 needed</span>
            </h3>
            <ul className={local.tips}>
              <li>
                Use a plain wall or sheet behind the piece and even light, without strong shadows.
              </li>
              <li>
                Hold the camera level at mid-height, the same distance for every photo, with the
                whole piece in frame.
              </li>
              <li>
                Turn the piece a quarter turn between photos. Front and one side are enough; more
                photos give a better shape.
              </li>
            </ul>
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
                const photo = photos[slot.id];
                return (
                  <div key={slot.id} className={local.slot}>
                    <div className={local.slotHead}>
                      <span>{slot.label}</span>
                      {photo && (
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
          <div className={local.preview} aria-label="3D model preview">
            {design ? (
              <ModelPreview design={design} dims={dims} color={modelColor} />
            ) : (
              <p className={local.placeholder}>
                {photoCount < 2
                  ? 'Add a front and a side photo to begin.'
                  : 'Press "Build 3D model" to preview it here.'}
              </p>
            )}
          </div>
          {design && (
            <div className={local.section}>
              <p className={local.summary} aria-live="polite">
                Detected: <strong>{DESIGN_TYPES.find((t) => t.id === design.type)?.label}</strong>,{' '}
                {dims.widthCm} x {dims.depthCm} x {dims.heightCm} cm (width x depth x height).
                {!sizeEdited &&
                  ' The size is the usual one for this type: enter the real width above.'}
              </p>
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
              <div className={local.palette} role="group" aria-label="Colours found in the photos">
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
              <p className={local.note}>
                Shown at its real size; each grid square is 50 cm. Drag to rotate. The model uses
                the same parts as the built-in furniture, with the shape, proportions and colours
                read from your photos.
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
