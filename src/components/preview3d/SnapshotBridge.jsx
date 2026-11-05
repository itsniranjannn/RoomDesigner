import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { registerSnapshotSource } from '../../engine/snapshot3d.js';
import { renderSize } from '../../engine/renderSettings.js';

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
 * Lives inside a <Canvas>. While mounted it lets the export menus capture the current view: the scene is
 * rendered again at a larger size (antialiased, with big shadow maps) and read straight back, then the
 * canvas is restored. Options: `size` (a key of RENDER_SIZES), `background` ('scene', 'white' or
 * 'transparent') and `highQuality` (bigger shadow maps).
 */
export function SnapshotBridge() {
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
          gl.render(scene, camera);
          return {
            dataUrl: canvas.toDataURL('image/png'),
            width: out.width,
            height: out.height,
            alpha: !!gl.getContextAttributes()?.alpha,
          };
        } finally {
          scene.background = prevBackground;
          gl.setClearColor(prevClear, prevAlpha);
          restoreShadows(saved);
          gl.setPixelRatio(ratio);
          gl.setSize(prevSize.width || cssW, prevSize.height || cssH, false);
          gl.render(scene, camera);
        }
      }),
    [gl, scene, camera]
  );
  return null;
}
