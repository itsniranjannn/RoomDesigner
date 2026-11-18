import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasLoader } from './CanvasLoader.jsx';

/**
 * Keeps a message on screen until the 3D view has really drawn something, and puts one back if
 * the browser takes the graphics context away.
 *
 * `Suspense` covers only the download of the 3D code. Building the scene -- walls, every piece of
 * furniture, the shadows -- takes seconds longer on a phone, and the app used to withdraw its own
 * "Loading 3D view" at the end of the download and leave an empty box with working buttons round
 * it, which reads as a view that has failed. This goes inside the canvas, reports the first frame
 * actually rendered, and reports a lost context too: that blanks the canvas without unmounting
 * anything, so nothing else would notice.
 */
export function FirstFrame({ onState }) {
  const drawn = useRef(false);
  const gl = useThree((state) => state.gl);
  useFrame(() => {
    if (drawn.current) return;
    drawn.current = true;
    onState('drawn');
  });
  useEffect(() => {
    const canvas = gl?.domElement;
    if (!canvas) return undefined;
    const lost = () => onState('lost');
    const back = () => onState('drawn');
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', back);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', back);
    };
  }, [gl, onState]);
  return null;
}

/**
 * For a view that holds a `<Canvas>`: `[overlay, onState]`. Put `overlay` over the canvas and
 * `<FirstFrame onState={onState} />` inside it. The overlay is null once a frame has been drawn.
 */
export function useFirstFrame() {
  const [state, setState] = useState('waiting');
  const onState = useCallback((next) => setState(next), []);
  const overlay =
    state === 'drawn' ? null : (
      <CanvasLoader label={state === 'lost' ? 'Rebuilding the 3D view' : 'Building the 3D view'} />
    );
  return [overlay, onState];
}
