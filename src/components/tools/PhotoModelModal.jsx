import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Camera, X, Sparkles, Save } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { NumberField, RangeField, TextField } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { readImage } from '../../engine/image.js';
import {
  VIEW_SLOTS,
  segmentObject,
  normalizeView,
  maskCoverage,
  proportionWarnings,
  buildModelFromViews,
  topDownImage,
  renderMesh,
  footprintOutline,
  meshAverageHex,
} from '../../engine/hull.js';
import { CustomMeshModel } from '../preview3d/models/customMesh.jsx';
import local from './PhotoModelModal.module.css';

const PHOTO_MAX = 480;
const PLAN_SIZE = 128;

function rgbaToDataUrl(rgba, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d').putImageData(new ImageData(rgba, size, size), 0, 0);
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
function ModelPreview({ model, dims, color }) {
  const w = dims.widthCm / 100;
  const d = dims.depthCm / 100;
  const h = dims.heightCm / 100;
  const reach = Math.max(w, d, h);
  const def = useMemo(() => ({ mesh: model, color }), [model, color]);
  return (
    <Canvas shadows camera={{ fov: 40 }}>
      <FitCamera distance={reach * 2.1 + 0.4} target={h / 2} />
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
      <directionalLight position={[-reach * 2, reach * 2, -reach * 2]} intensity={0.7} color="#F5EFE6" />
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
  const [model, setModel] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputs = useRef({});

  const segmented = useMemo(() => {
    const out = {};
    for (const [slot, photo] of Object.entries(photos)) {
      const mask = segmentObject(photo.rgba, photo.width, photo.height, tolerance);
      out[slot] = { mask, coverage: maskCoverage(mask) };
    }
    return out;
  }, [photos, tolerance]);

  // Photos or cut-out changes invalidate the previous model
  useEffect(() => {
    setModel(null);
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
  const modelColor = useMemo(() => (model ? meshAverageHex(model) : '#a0a0a0'), [model]);
  const proportions = useMemo(() => proportionWarnings(
    Object.fromEntries(Object.entries(photos).map(([slot, photo]) => [slot, { mask: segmented[slot].mask, width: photo.width, height: photo.height }])),
    dims
  ), [segmented, photos, dims]);
  const weakSlots = Object.entries(segmented).filter(([, s]) => s.coverage < 0.03 || s.coverage > 0.92);

  const handleBuild = () => {
    setBusy(true);
    setMessage(null);
    // Let the spinner paint before the synchronous carving work
    setTimeout(() => {
      try {
        const views = VIEW_SLOTS.filter((slot) => photos[slot.id]).map((slot) => {
          const photo = photos[slot.id];
          const norm = normalizeView(photo.rgba, segmented[slot.id].mask, photo.width, photo.height);
          if (!norm) throw new Error(`No object found in the ${slot.label.toLowerCase()} photo. Try a plainer background.`);
          return { slot: slot.id, angle: slot.angle, ...norm };
        });
        setModel(buildModelFromViews(views));
      } catch (err) {
        setModel(null);
        setMessage({ kind: 'error', text: err.message });
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const handleSave = async () => {
    if (!model) return;
    const topPixels = topDownImage(model, PLAN_SIZE);
    await addCustomFurniture({
      id: `custom-${Date.now().toString(36)}`,
      name: name.trim() || 'My furniture',
      category: 'custom',
      shapeType: 'custom-mesh',
      widthCm: dims.widthCm,
      depthCm: dims.depthCm,
      heightCm: dims.heightCm,
      color: modelColor,
      mesh: { positions: model.positions, colors: model.colors, indices: model.indices },
      topImage: rgbaToDataUrl(topPixels, PLAN_SIZE),
      topOutline: footprintOutline(topPixels, PLAN_SIZE),
      thumb: rgbaToDataUrl(renderMesh(model, { size: PLAN_SIZE }), PLAN_SIZE),
    });
    onClose();
  };

  const setDim = (key, value) => setDims((d) => ({ ...d, [key]: value }));

  return (
    <Modal
      title="Create furniture from photos"
      subtitle="Photograph a piece from a few sides. The 3D model is built on this device and your photos are never uploaded."
      onClose={onClose}
      width={820}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" icon={<Sparkles size={16} />} onClick={handleBuild} disabled={photoCount < 2 || busy}>
            {busy ? 'Building...' : model ? 'Rebuild model' : 'Build 3D model'}
          </Button>
          <Button variant="primary" icon={<Save size={16} />} onClick={handleSave} disabled={!model}>
            Save to My furniture
          </Button>
        </>
      }
    >
      <div className={local.columns}>
        <div className={local.left}>
          <TextField label="Name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />

          <div className={local.section}>
            <h3 className={local.sectionTitle}>Real size</h3>
            <div className={local.sizes}>
              {[['widthCm', 'Width'], ['depthCm', 'Depth'], ['heightCm', 'Height']].map(([key, label]) => (
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
          </div>

          <div className={local.section}>
            <h3 className={local.sectionTitle}>Photos <span className={local.sectionNote}>{photoCount} of 5, at least 2 needed</span></h3>
            <ul className={local.tips}>
              <li>Use a plain wall or sheet behind the piece and even light, without strong shadows.</li>
              <li>Hold the camera level at mid-height, the same distance for every photo, with the whole piece in frame.</li>
              <li>Turn the piece a quarter turn between photos. Front and one side are enough; more photos give a better shape.</li>
            </ul>
            <div className={local.slots}>
              {VIEW_SLOTS.map((slot) => {
                const photo = photos[slot.id];
                return (
                  <div key={slot.id} className={local.slot}>
                    <div className={local.slotHead}>
                      <span>{slot.label}</span>
                      {photo && (
                        <button type="button" className={local.iconBtn} onClick={() => removePhoto(slot.id)} aria-label={`Remove ${slot.label} photo`}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {photo ? (
                      <CutoutPreview photo={photo} mask={segmented[slot.id].mask} />
                    ) : (
                      <button type="button" className={local.addPhoto} onClick={() => inputs.current[slot.id]?.click()}>
                        <Camera size={18} aria-hidden="true" />
                        <span>Add photo</span>
                      </button>
                    )}
                    <input
                      ref={(el) => { inputs.current[slot.id] = el; }}
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
            onChange={setTolerance}
            hint="Works best with a plain, evenly lit background. Raise it if background stays visible; lower it if parts of the piece disappear."
          />
        </div>

        <div className={local.right}>
          <div className={local.preview} aria-label="3D model preview">
            {model ? (
              <ModelPreview model={model} dims={dims} color={modelColor} />
            ) : (
              <p className={local.placeholder}>
                {photoCount < 2 ? 'Add a front and a side photo to begin.' : 'Press "Build 3D model" to preview it here.'}
              </p>
            )}
          </div>
          {model && (
            <p className={local.note}>
              Shown at its real size; each grid square is 50 cm. Drag to rotate. A model built from silhouettes fills in
              hollow parts the photos cannot show, such as the space under a table top.
            </p>
          )}
          <p className={local.note}>
            Furniture made from photos stays on this device. Shared links and JSON files keep its position but not its model.
          </p>
        </div>
      </div>

      {proportions.map((text) => (
        <Notice key={text} kind="warn">{text} Check the size above or retake the photo straight on.</Notice>
      ))}
      {weakSlots.length > 0 && (
        <Notice kind="warn">
          The cut-out looks unreliable for: {weakSlots.map(([slot]) => VIEW_SLOTS.find((v) => v.id === slot).label).join(', ')}.
          Adjust the background removal or retake the photo on a plain background.
        </Notice>
      )}
      {message && <Notice kind="error">{message.text}</Notice>}
    </Modal>
  );
}
