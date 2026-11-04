import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWalkStart, buildBlockers, isBlocked, PLAYER_RADIUS } from '../../engine/walk.js';

export const EYE_HEIGHT = 1.6;
const SPEED = 1.6; // metres per second
const LOOK_SPEED = 0.0042;
const EYE_EASE = 8; // how quickly the eye follows a staircase

/** Walking rules for a single room: its start, walls (the room bounds) and furniture. */
function roomEnv(room) {
  const blockers = buildBlockers(room);
  const maxX = room.widthCm / 200 - PLAYER_RADIUS;
  const maxZ = room.depthCm / 200 - PLAYER_RADIUS;
  return {
    start: { ...getWalkStart(room), levelIdx: 0, floorM: 0 },
    isBlocked: (x, z) => Math.abs(x) > maxX || Math.abs(z) > maxZ || isBlocked(x, z, blockers),
    surface: (x, z, levelIdx) => ({ levelIdx, floorM: 0 }),
  };
}

/**
 * First-person walkthrough: drag to look, W/A/S/D or arrows to move, Esc to leave.
 *
 * Pass `room` to walk one room, or `env` to walk anything else:
 *   env.start      { x, z, yaw, levelIdx, floorM }  where the visitor begins (metres)
 *   env.isBlocked  (x, z, levelIdx) => boolean       true when a position is inside something
 *   env.surface    (x, z, levelIdx) => { levelIdx, floorM, blocked? }  the floor under a position
 * `onLevelChange(levelIdx)` is called when a staircase takes the visitor to another floor.
 */
export function WalkControls({ room, env: envProp, onExit, onLevelChange }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const look = useRef({ yaw: 0, pitch: 0 });
  const position = useRef(new THREE.Vector2());
  const walk = useRef({ levelIdx: 0, floorM: 0, eyeY: EYE_HEIGHT });
  const env = useMemo(() => envProp || roomEnv(room), [envProp, room]);
  const envRef = useRef(env);
  envRef.current = env;
  const onLevelRef = useRef(onLevelChange);
  onLevelRef.current = onLevelChange;

  useEffect(() => {
    const start = envRef.current.start;
    position.current.set(start.x, start.z);
    look.current = { yaw: start.yaw, pitch: -0.05 };
    walk.current = {
      levelIdx: start.levelIdx || 0,
      floorM: start.floorM || 0,
      eyeY: (start.floorM || 0) + EYE_HEIGHT,
    };
    camera.rotation.order = 'YXZ';
    camera.position.set(start.x, walk.current.eyeY, start.z);
    camera.fov = 70;
    camera.updateProjectionMatrix();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onExit();
        return;
      }
      keys.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!dragging) return;
      look.current.yaw -= (e.clientX - lastX) * LOOK_SPEED;
      look.current.pitch = Math.max(
        -1.2,
        Math.min(1.2, look.current.pitch - (e.clientY - lastY) * LOOK_SPEED)
      );
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = (e) => {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      camera.fov = 45;
      camera.updateProjectionMatrix();
      camera.rotation.order = 'XYZ';
    };
  }, [camera, gl, onExit]);

  useFrame((_, delta) => {
    const k = keys.current;
    const forward = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
    const strafe = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0);
    const { yaw, pitch } = look.current;
    const rules = envRef.current;
    const w = walk.current;
    const p = position.current;

    if (forward || strafe) {
      const len = Math.hypot(forward, strafe);
      const step = (SPEED * Math.min(delta, 0.05)) / len;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * step;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * step;
      // Move per axis so the visitor slides along walls and furniture
      for (const [nx, nz] of [
        [p.x + dx, p.y],
        [p.x, p.y + dz],
      ]) {
        const floor = rules.surface(nx, nz, w.levelIdx);
        if (floor.blocked || rules.isBlocked(nx, nz, floor.levelIdx)) continue;
        p.set(nx, nz);
        w.floorM = floor.floorM;
        if (floor.levelIdx !== w.levelIdx) {
          w.levelIdx = floor.levelIdx;
          onLevelRef.current?.(floor.levelIdx);
        }
      }
    }

    // The eye glides up and down staircases
    const targetY = w.floorM + EYE_HEIGHT;
    w.eyeY += (targetY - w.eyeY) * Math.min(1, delta * EYE_EASE);
    camera.position.set(p.x, w.eyeY, p.y);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  });

  return null;
}
