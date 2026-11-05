import React, { useMemo } from 'react';
import * as THREE from 'three';
import { outlineEdges, pointOnEdge } from '../../engine/roomShape.js';

const WALL_COLOR = '#F2EDE4';
const CAP_COLOR = '#1A1615';
const FLOOR_COLOR = '#E5DDCF';
const TRIM_COLOR = '#5C3826';
const THICK = 0.14;
const CAP_H = 0.04;

/**
 * Floor and walls of a room whose plan is not a rectangle. Walls follow the outline edge
 * by edge (an open edge has none); doors and windows are cut into them. Positions use the
 * same room-centred metres as the rectangular room, so furniture lines up with the plan.
 */
export function OutlineWalls({ room, isFullHeight = false, materials = null }) {
  const { widthCm, depthCm, outline } = room;
  const edges = useMemo(() => outlineEdges(room), [room]);
  const H = isFullHeight ? 2.4 : 0.45;
  const sill = isFullHeight ? 0.9 : 0.18;
  const head = isFullHeight ? 2.0 : H;

  const floorShape = useMemo(() => {
    const shape = new THREE.Shape();
    outline.forEach(([x, y], i) => {
      const px = (x - widthCm / 2) / 100;
      const pz = (y - depthCm / 2) / 100;
      if (i === 0) shape.moveTo(px, -pz);
      else shape.lineTo(px, -pz);
    });
    shape.closePath();
    return shape;
  }, [outline, widthCm, depthCm]);

  // plan cm -> world metres
  const world = (p) => [(p.x - widthCm / 2) / 100, (p.y - depthCm / 2) / 100];

  const piece = (key, edge, from, to, z0, z1, color, thick = THICK, extra = {}) => {
    if (to - from < 0.5 || z1 - z0 < 0.005) return null;
    const mid = pointOnEdge(edge, (from + to) / 2, -THICK * 50);
    const [x, z] = world(mid);
    const len = (to - from) / 100;
    const size = edge.dx !== 0 ? [len, z1 - z0, thick] : [thick, z1 - z0, len];
    return (
      <mesh key={key} position={[x, (z0 + z1) / 2, z]} castShadow receiveShadow {...extra}>
        <boxGeometry args={size} />
        {color === WALL_COLOR && materials?.wall ? (
          <primitive object={materials.wall} attach="material" />
        ) : (
          <meshStandardMaterial color={color} roughness={0.85} />
        )}
      </mesh>
    );
  };

  const renderEdge = (edge) => {
    if (edge.open) return null;
    const prev = edges[(edge.i - 1 + edges.length) % edges.length];
    const next = edges[(edge.i + 1) % edges.length];
    const convex = (a, b) => a.dx * b.dy - a.dy * b.dx > 0;
    const startExt = convex(prev, edge) ? THICK * 100 : 0;
    const endExt = convex(edge, next) ? THICK * 100 : 0;
    const from = -startExt;
    const to = edge.len + endExt;

    const ops = [
      ...(room.windows || []).map((o) => ({ ...o, type: 'window' })),
      ...(room.doors || []).map((o) => ({ ...o, type: 'door' })),
    ]
      .filter((o) => (o.edge ?? 0) === edge.i)
      .sort((p, q) => p.offsetCm - q.offsetCm);

    const out = [];
    let cursor = from;
    ops.forEach((o, n) => {
      const a = Math.max(0, o.offsetCm);
      const b = Math.min(edge.len, o.offsetCm + o.widthCm);
      out.push(piece(`s${edge.i}-${n}`, edge, cursor, a, 0, H, WALL_COLOR));
      out.push(piece(`c${edge.i}-${n}`, edge, cursor, a, H, H + CAP_H, CAP_COLOR, THICK + 0.03));
      if (o.type === 'window') {
        out.push(piece(`ws${edge.i}-${n}`, edge, a, b, 0, sill, WALL_COLOR));
        if (isFullHeight) out.push(piece(`wh${edge.i}-${n}`, edge, a, b, head, H, WALL_COLOR));
        out.push(
          piece(`wt${edge.i}-${n}`, edge, a, b, sill, sill + 0.03, TRIM_COLOR, THICK + 0.04)
        );
        out.push(
          piece(`wg${edge.i}-${n}`, edge, a, b, sill + 0.03, head, '#A3D2E2', 0.015, {
            castShadow: false,
          })
        );
      } else {
        if (isFullHeight) out.push(piece(`dh${edge.i}-${n}`, edge, a, b, 2.04, H, WALL_COLOR));
        else out.push(piece(`dc${edge.i}-${n}`, edge, a, b, H, H + CAP_H, CAP_COLOR, THICK + 0.03));
        for (const [k, at] of [
          ['l', a],
          ['r', b - 4],
        ])
          out.push(
            piece(
              `dp${k}${edge.i}-${n}`,
              edge,
              at,
              at + 4,
              0,
              isFullHeight ? 2.04 : H,
              TRIM_COLOR,
              THICK + 0.01
            )
          );
        out.push(door(edge, o, n));
      }
      cursor = b;
    });
    out.push(piece(`s${edge.i}-end`, edge, cursor, to, 0, H, WALL_COLOR));
    out.push(piece(`c${edge.i}-end`, edge, cursor, to, H, H + CAP_H, CAP_COLOR, THICK + 0.03));
    return <group key={`e${edge.i}`}>{out}</group>;
  };

  const door = (edge, o, n) => {
    const outward = o.swingDirection === 'outward';
    const sign = outward ? -1 : 1;
    const theta = (70 * Math.PI) / 180;
    const dir = {
      x: Math.cos(theta) * edge.dx + sign * Math.sin(theta) * edge.nx,
      y: Math.cos(theta) * edge.dy + sign * Math.sin(theta) * edge.ny,
    };
    const hingePlan = pointOnEdge(edge, o.offsetCm + 2, -THICK * 50);
    const [hx, hz] = world(hingePlan);
    const w = (o.widthCm / 100) * 0.96;
    const leafH = isFullHeight ? 2.0 : Math.min(2.0, H);
    const phi = Math.atan2(-dir.y, dir.x);
    return (
      <group key={`dl${edge.i}-${n}`} position={[hx, 0, hz]} rotation={[0, phi, 0]}>
        <mesh position={[w / 2, leafH / 2, 0]} castShadow>
          <boxGeometry args={[w, leafH, 0.035]} />
          <meshStandardMaterial color="#FAF6EE" roughness={0.5} />
        </mesh>
      </group>
    );
  };

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[floorShape]} />
        {materials?.floor ? (
          <primitive object={materials.floor} attach="material" />
        ) : (
          <meshStandardMaterial color={FLOOR_COLOR} roughness={0.8} side={THREE.DoubleSide} />
        )}
      </mesh>
      {edges.map(renderEdge)}
    </group>
  );
}
