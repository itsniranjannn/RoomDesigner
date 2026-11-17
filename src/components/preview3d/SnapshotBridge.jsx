import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { registerSnapshotSource } from '../../engine/snapshot3d.js';
import { renderSize } from '../../engine/renderSettings.js';
import { fitRoomView } from './cameraFit.js';

/** Largest shadow map used while rendering a picture (the screen uses 1024 to 2048). */
const EXPORT_SHADOW_MAP = 4096;

/** Gives every directional or spot shadow a bigger map, remembering the old size; the map is rebuilt on the next render. */
function enlargeShadows(scene, size, saved) {
  scene.traverse((obj) => {
    const shadow = obj.isLight && obj.castShadow ? obj.shadow : null;
    if (!shadow || shadow.isPointLightShadow) return;
    saved.set(obj, shadow.mapSize.clone());
    shadow.mapSize.set(size, size);
    shadow.map?.dispose();
    shadow.map = null;
  });
}

function restoreShadows(saved) {
  for (const [light, size] of saved) {
    light.shadow.mapSize.copy(size);
    light.shadow.map?.dispose();
    light.shadow.map = null;
  }
}

/**
 * Moves the camera back so the whole room fits the picture being taken, keeping the angle the person is
 * looking from, and gives back a function that puts the camera where it was.
 */
export function framePicture(camera, fit, aspect) {
  const target = new THREE.Vector3(0, fit.lookY ?? 0, 0);
  const saved = {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    aspect: camera.aspect,
  };
  // Keep the angle the person is looking from, and stand back far enough for the whole room
  const dir = camera.position.clone().sub(target);
  if (dir.lengthSq() < 1e-9) dir.set(0.75, 0.85, 0.9);
  const spot = fitRoomView({
    ...fit,
    direction: [dir.x, dir.y, dir.z],
    fovDeg: camera.fov,
    aspect,
  });
  camera.position.set(...spot.spot);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  camera.lookAt(target.x, spot.lookY, target.z);
  return () => {
    camera.position.copy(saved.position);
    camera.quaternion.copy(saved.quaternion);
    camera.aspect = saved.aspect;
    camera.updateProjectionMatrix();
  };
}

/**
 * Lives inside a <Canvas>. While mounted it lets the export menus capture the current view: the scene is
 * rendered again at a larger size (antialiased, with big shadow maps) and read straight back, then the
 * canvas is restored. A picture frames the whole room rather than keeping the screen's crop, where the
 * caller passes the room as `fit`. Options: `size` (a key of RENDER_SIZES), `background` ('scene', 'white'
 * or 'transparent') and `highQuality` (bigger shadow maps).
 */
export function SnapshotBridge({ fit = null }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(
    () =>
      registerSnapshotSource((opts = {}) => {
        const canvas = gl.domElement;
        const ratio = gl.getPixelRatio();
        const prevSize = gl.getSize(new THREE.Vector2());
        const cssW = Math.round(canvas.clientWidth);
        const cssH = Math.round(canvas.clientHeight);
        const out = renderSize(cssW, cssH, opts.size || 'standard', gl.capabilities.maxTextureSize);

        let restoreCamera = null;
        const prevBackground = scene.background;
        const prevAlpha = gl.getClearAlpha();
        const prevClear = gl.getClearColor(new THREE.Color());
        const saved = new Map();
        try {
          if (opts.background === 'white') scene.background = new THREE.Color('#ffffff');
          else if (opts.background === 'transparent') {
            scene.background = null;
            gl.setClearColor(0x000000, 0);
          }
          if (opts.highQuality) {
            const max = Math.min(EXPORT_SHADOW_MAP, gl.capabilities.maxTextureSize || 2048);
            enlargeShadows(scene, max, saved);
          }
          gl.setPixelRatio(1);
          gl.setSize(out.width, out.height, false);
          if (fit) restoreCamera = framePicture(camera, fit, out.width / out.height);
          gl.render(scene, camera);
          return {
            dataUrl: canvas.toDataURL('image/png'),
            width: out.width,
            height: out.height,
            alpha: !!gl.getContextAttributes()?.alpha,
          };
        } finally {
          restoreCamera?.();
          scene.background = prevBackground;
          gl.setClearColor(prevClear, prevAlpha);
          restoreShadows(saved);
          gl.setPixelRatio(ratio);
          gl.setSize(prevSize.width || cssW, prevSize.height || cssH, false);
          gl.render(scene, camera);
        }
      }),
    [gl, scene, camera, fit]
  );
  return null;
}
