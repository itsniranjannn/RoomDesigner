import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWalkStart, buildBlockers, isBlocked, PLAYER_RADIUS } from '../../engine/walk.js';

const EYE_HEIGHT = 1.6;
const SPEED = 1.6; // metres per second
const LOOK_SPEED = 0.0042;

/** First-person walkthrough: drag to look, W/A/S/D or arrows to move, Esc to leave. */
export function WalkControls({ room, onExit }) {
  const { camera, gl } = useThree();
  const keys = useRef({});
  const look = useRef({ yaw: 0, pitch: 0 });
  const position = useRef(new THREE.Vector2());
  const blockers = useMemo(() => buildBlockers(room), [room]);
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    const start = getWalkStart(roomRef.current);
    position.current.set(start.x, start.z);
    look.current = { yaw: start.yaw, pitch: -0.05 };
    camera.rotation.order = 'YXZ';
    camera.position.set(start.x, EYE_HEIGHT, start.z);
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
      look.current.pitch = Math.max(-1.2, Math.min(1.2, look.current.pitch - (e.clientY - lastY) * LOOK_SPEED));
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

    if (forward || strafe) {
      const len = Math.hypot(forward, strafe);
      const step = (SPEED * delta) / len;
      const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * step;
      const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * step;
      const r = roomRef.current;
      const maxX = r.widthCm / 200 - PLAYER_RADIUS;
      const maxZ = r.depthCm / 200 - PLAYER_RADIUS;
      const p = position.current;
      // Move per axis so the visitor slides along walls and furniture
      const nx = Math.max(-maxX, Math.min(maxX, p.x + dx));
      if (!isBlocked(nx, p.y, blockers)) p.x = nx;
      const nz = Math.max(-maxZ, Math.min(maxZ, p.y + dz));
      if (!isBlocked(p.x, nz, blockers)) p.y = nz;
    }

    camera.position.set(position.current.x, EYE_HEIGHT, position.current.y);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  });

  return null;
}
