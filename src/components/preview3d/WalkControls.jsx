import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { getWalkStart, buildBlockers, isBlocked, PLAYER_RADIUS } from '../../engine/walk.js';
import {
  stepWalker,
  nearestFree,
  clearestYaw,
  TURN_SPEED,
  TAP_SECONDS,
} from '../../engine/walkMove.js';
import { walkInput } from './WalkHud.jsx';

export const EYE_HEIGHT = 1.6;
const LOOK_SPEED = 0.0042;
const EYE_EASE = 8; // how quickly the eye follows a staircase
const WALK_NEAR = 0.05; // the camera may come this close to a wall without clipping into it

/** Keys that drive the walk, by physical key (so WASD works on any layout) and by character. */
const BY_CODE = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  KeyD: 'right',
  ArrowLeft: 'turnL',
  ArrowRight: 'turnR',
};
const BY_KEY = { w: 'forward', s: 'back', a: 'left', d: 'right' };
const actionOf = (e) => BY_CODE[e.code] || BY_KEY[e.key?.toLowerCase()] || null;
const isRun = (e) => e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift';

/** Typing in a field must never move the visitor. */
const isTyping = (target) =>
  !!target &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName || ''));

/** Walking rules for a single room: its start, walls (the room bounds) and furniture. */
function roomEnv(room) {
  const blockers = buildBlockers(room);
  const maxX = room.widthCm / 200 - PLAYER_RADIUS;
  const maxZ = room.depthCm / 200 - PLAYER_RADIUS;
  const blocked = (x, z) => Math.abs(x) > maxX || Math.abs(z) > maxZ || isBlocked(x, z, blockers);
  const start = getWalkStart(room);
  // Never begin inside a piece of furniture or against a wall
  const clear = nearestFree(start.x, start.z, (x, z) => !blocked(x, z)) || start;
  return {
    start: {
      ...start,
      x: clear.x,
      z: clear.z,
      yaw: clearestYaw(clear.x, clear.z, start.yaw, (x, z) => !blocked(x, z)),
      levelIdx: 0,
      floorM: 0,
    },
    isBlocked: blocked,
    surface: (x, z, levelIdx) => ({ levelIdx, floorM: 0 }),
  };
}

/**
 * First-person walkthrough: drag to look, W/A/S/D or the up/down arrows to move, A/D (or the
 * pad on screen) to sidestep, the left/right arrows to turn, Shift to run, Esc to leave.
 *
 * Pass `room` to walk one room, or `env` to walk anything else:
 *   env.start      { x, z, yaw, levelIdx, floorM }  where the visitor begins (metres)
 *   env.isBlocked  (x, z, levelIdx) => boolean       true when a position is inside something
 *   env.surface    (x, z, levelIdx) => { levelIdx, floorM, blocked? }  the floor under a position
 * `onLevelChange(levelIdx)` is called when a staircase takes the visitor to another floor.
 *
 * The camera's data-walk attribute (x, z, yaw in metres and radians) always shows where the
 * visitor stands.
 */
export function WalkControls({ room, env: envProp, onExit, onLevelChange }) {
  const { camera, gl } = useThree();
  // Seconds each tapped key still has to run, so even a very short tap moves the visitor
  const tapUntil = useRef({});
  const look = useRef({ yaw: 0, pitch: 0 });
  const body = useRef({ x: 0, z: 0, vx: 0, vz: 0 });
  const walk = useRef({ levelIdx: 0, floorM: 0, eyeY: EYE_HEIGHT });
  const env = useMemo(() => envProp || roomEnv(room), [envProp, room]);
  const envRef = useRef(env);
  envRef.current = env;
  const onLevelRef = useRef(onLevelChange);
  onLevelRef.current = onLevelChange;
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    const start = envRef.current.start;
    body.current = { x: start.x, z: start.z, vx: 0, vz: 0 };
    look.current = { yaw: start.yaw, pitch: -0.05 };
    walk.current = {
      levelIdx: start.levelIdx || 0,
      floorM: start.floorM || 0,
      eyeY: (start.floorM || 0) + EYE_HEIGHT,
    };
    const before = { near: camera.near, fov: camera.fov };
    camera.rotation.order = 'YXZ';
    camera.position.set(start.x, walk.current.eyeY, start.z);
    camera.fov = 70;
    camera.near = WALK_NEAR;
    camera.updateProjectionMatrix();
    walkInput.reset();

    // Focus must not stay on the toolbar button that started the walk: it would swallow keys
    const active = document.activeElement;
    if (active && active !== document.body && typeof active.blur === 'function') active.blur();

    const setKey = (action, repeat) => {
      walkInput.keys[action] = true;
      // A first press is never lost, however briefly the key is down
      if (!repeat) tapUntil.current[action] = TAP_SECONDS;
      walkInput.notify();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onExitRef.current();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (isRun(e)) {
        walkInput.run = true;
        return;
      }
      const action = actionOf(e);
      if (!action) return;
      e.preventDefault();
      setKey(action, e.repeat);
    };
    const onKeyUp = (e) => {
      if (isRun(e)) {
        walkInput.run = false;
        return;
      }
      const action = actionOf(e);
      if (!action) return;
      walkInput.keys[action] = false;
      walkInput.notify();
    };
    // Keys released while the window is out of focus never report keyup: let go of everything
    const releaseAll = () => {
      walkInput.keys = {};
      walkInput.run = false;
      walkInput.notify();
    };
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };

    const el = gl.domElement;
    const touchAction = el.style.touchAction;
    el.style.touchAction = 'none';
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
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibility);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.style.touchAction = touchAction;
      delete el.dataset.walk;
      walkInput.reset();
      camera.fov = before.fov;
      camera.near = before.near;
      camera.updateProjectionMatrix();
      camera.rotation.order = 'XYZ';
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    // A tap keeps moving the visitor for a moment, even when the key is up before the next frame
    const taps = tapUntil.current;
    const held = (name) => !!(walkInput.keys[name] || walkInput.pad[name] || taps[name] > 0);
    const forward = (held('forward') ? 1 : 0) - (held('back') ? 1 : 0);
    const strafe = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
    const turn = (held('turnL') ? 1 : 0) - (held('turnR') ? 1 : 0);
    const rules = envRef.current;
    const w = walk.current;
    const b = body.current;
    const dt = Math.min(delta, 0.25);
    for (const name of Object.keys(taps)) taps[name] -= dt;

    if (turn) look.current.yaw += turn * TURN_SPEED * dt;
    const { yaw, pitch } = look.current;

    const next = stepWalker(
      b,
      { forward, strafe, run: walkInput.run || !!walkInput.pad.run },
      yaw,
      dt,
      (nx, nz) => {
        const floor = rules.surface(nx, nz, w.levelIdx);
        return !floor.blocked && !rules.isBlocked(nx, nz, floor.levelIdx);
      }
    );
    body.current = next;
    if (next.moved) {
      const floor = rules.surface(next.x, next.z, w.levelIdx);
      w.floorM = floor.floorM;
      if (floor.levelIdx !== w.levelIdx) {
        w.levelIdx = floor.levelIdx;
        onLevelRef.current?.(floor.levelIdx);
      }
    }

    // The eye glides up and down staircases
    const targetY = w.floorM + EYE_HEIGHT;
    w.eyeY += (targetY - w.eyeY) * Math.min(1, dt * EYE_EASE);
    camera.position.set(next.x, w.eyeY, next.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    gl.domElement.dataset.walk = `${next.x.toFixed(3)},${next.z.toFixed(3)},${yaw.toFixed(3)},${w.levelIdx}`;
  });

  return null;
}
