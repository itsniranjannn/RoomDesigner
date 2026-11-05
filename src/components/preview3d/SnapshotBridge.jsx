import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { registerSnapshotSource } from '../../engine/snapshot3d.js';

/**
 * Lives inside a <Canvas>. While mounted it lets the export menus capture the current view: the scene is
 * rendered again at `scale` times the on-screen size and read straight back, then the canvas is restored.
 */
export function SnapshotBridge() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(
    () =>
      registerSnapshotSource((scale = 2) => {
        const canvas = gl.domElement;
        const ratio = gl.getPixelRatio();
        const prevSize = gl.getSize(new THREE.Vector2());
        const width = Math.round(canvas.clientWidth);
        const height = Math.round(canvas.clientHeight);
        // Cap the output so a huge window cannot exceed what the GPU can allocate
        const max = Math.min(gl.capabilities.maxTextureSize || 4096, 6000);
        const k = Math.min(scale, max / Math.max(width, height));
        try {
          gl.setPixelRatio(1);
          gl.setSize(Math.round(width * k), Math.round(height * k), false);
          gl.render(scene, camera);
          return {
            dataUrl: canvas.toDataURL('image/png'),
            width: Math.round(width * k),
            height: Math.round(height * k),
          };
        } finally {
          gl.setPixelRatio(ratio);
          gl.setSize(prevSize.width || width, prevSize.height || height, false);
          gl.render(scene, camera);
        }
      }),
    [gl, scene, camera]
  );
  return null;
}
