import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, X, Sparkles, Save } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { readImage } from '../../engine/image.js';
import {
  VIEW_SLOTS,
  segmentObject,
  normalizeView,
  maskCoverage,
  buildModelFromViews,
  topDownImage,
} from '../../engine/hull.js';
import styles from '../common/Modal.module.css';
import local from './PhotoModelModal.module.css';

const PREVIEW_MAX = 360;

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

function ModelMesh({ model, widthCm, depthCm, heightCm }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(model.positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(model.colors, 3, true));
    g.computeVertexNormals();
    return g;
  }, [model]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} scale={[widthCm / 100, heightCm / 100, depthCm / 100]} castShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.8} />
    </mesh>
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
      const img = await readImage(file, PREVIEW_MAX);
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
        setModel(buildModelFromViews(views, 40));
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
    const topPixels = topDownImage(model.positions, model.colors, 96);
    const average = [0, 0, 0];
    for (let i = 0; i < model.colors.length; i += 3 * 7) {
      average[0] += model.colors[i];
      average[1] += model.colors[i + 1];
      average[2] += model.colors[i + 2];
    }
    const n = Math.max(1, Math.floor(model.colors.length / (3 * 7)));
    const hex = '#' + average.map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('');

    await addCustomFurniture({
      id: `custom-${Date.now().toString(36)}`,
      name: name.trim() || 'My furniture',
      category: 'custom',
      shapeType: 'custom-mesh',
      widthCm: dims.widthCm,
      depthCm: dims.depthCm,
      heightCm: dims.heightCm,
      color: hex,
      mesh: { positions: model.positions, colors: model.colors },
      topImage: rgbaToDataUrl(topPixels, 96),
      thumb: (photos.front || Object.values(photos)[0])?.thumbUrl,
    });
    onClose();
  };

  const setDim = (key, value) => {
    const n = Math.max(5, Math.min(600, Number(value) || 5));
    setDims((d) => ({ ...d, [key]: n }));
  };

  return (
    <Modal
      title="Create furniture from photos"
      subtitle="Photograph a piece from a few sides. The 3D model is built on this device; photos are never uploaded."
      onClose={onClose}
      width={800}
      footer={
        <>
          <Button variant="ghost" size="small" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" size="small" icon={<Sparkles size={12} />} onClick={handleBuild} disabled={photoCount < 2 || busy}>
            {busy ? 'Building…' : model ? 'Rebuild model' : 'Build 3D model'}
          </Button>
          <Button variant="primary" size="small" icon={<Save size={12} />} onClick={handleSave} disabled={!model}>
            Save to My Furniture
          </Button>
        </>
      }
    >
      <div className={local.columns}>
        <div className={local.left}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="pm-name">Name</label>
            <input id="pm-name" className={styles.input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Real size (cm)</span>
            <div className={styles.row}>
              {[['widthCm', 'Width'], ['depthCm', 'Depth'], ['heightCm', 'Height']].map(([key, label]) => (
                <label key={key} className={local.dim}>
                  {label}
                  <input
                    className={styles.input}
                    type="number"
                    min="5"
                    max="600"
                    value={dims[key]}
                    onChange={(e) => setDim(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Photos ({photoCount}/5 · need at least 2)</span>
            <div className={local.slots}>
              {VIEW_SLOTS.map((slot) => {
                const photo = photos[slot.id];
                return (
                  <div key={slot.id} className={local.slot}>
                    <div className={local.slotHead}>
                      <span>{slot.label}</span>
                      {photo && (
                        <button type="button" className={local.iconBtn} onClick={() => removePhoto(slot.id)} aria-label={`Remove ${slot.label} photo`}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    {photo ? (
                      <CutoutPreview photo={photo} mask={segmented[slot.id].mask} />
                    ) : (
                      <button type="button" className={local.addPhoto} onClick={() => inputs.current[slot.id]?.click()}>
                        <Camera size={16} />
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

          <div className={styles.field}>
            <label className={styles.label} htmlFor="pm-tol">Background removal strength: {tolerance}</label>
            <input id="pm-tol" type="range" min="15" max="160" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
            <p className={styles.note}>
              Works best with a plain, evenly lit background and the same camera distance for every side. Raise the
              strength if background stays visible; lower it if parts of the piece disappear.
            </p>
          </div>
        </div>

        <div className={local.right}>
          <div className={local.preview} aria-label="3D model preview">
            {model ? (
              <Canvas camera={{ position: [1.4, 1.1, 1.6], fov: 40 }} shadows>
                <ambientLight intensity={1.1} />
                <directionalLight position={[3, 5, 2]} intensity={1.3} castShadow />
                <group position={[0, -dims.heightCm / 200, 0]}>
                  <ModelMesh model={model} {...dims} />
                </group>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -dims.heightCm / 200 - 0.001, 0]} receiveShadow>
                  <planeGeometry args={[4, 4]} />
                  <shadowMaterial opacity={0.25} />
                </mesh>
                <OrbitControls autoRotate autoRotateSpeed={2.2} enablePan={false} />
              </Canvas>
            ) : (
              <p className={local.placeholder}>
                {photoCount < 2 ? 'Add a front and a side photo to begin.' : 'Press “Build 3D model” to preview it here.'}
              </p>
            )}
          </div>
          {model && (
            <p className={styles.note}>
              {model.voxelCount.toLocaleString()} blocks · {model.triangleCount.toLocaleString()} triangles. Drag to rotate.
              Models made from silhouettes look blocky and cannot show hollow parts; they are for planning, not rendering.
            </p>
          )}
        </div>
      </div>

      {weakSlots.length > 0 && (
        <p className={styles.noteWarn} role="status">
          The cut-out looks unreliable for: {weakSlots.map(([slot]) => VIEW_SLOTS.find((v) => v.id === slot).label).join(', ')}.
          Adjust the background removal strength or retake the photo on a plain background.
        </p>
      )}
      {message && <p className={styles.statusError} role="alert">{message.text}</p>}
      <p className={styles.note}>
        Furniture made from photos is stored on this device only. Shared links and JSON files keep its position but
        not its model.
      </p>
    </Modal>
  );
}
