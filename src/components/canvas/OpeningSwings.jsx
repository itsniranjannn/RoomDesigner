import React from 'react';
import { doorGeometry, windowLeaves } from '../../engine/planning.js';

const TONES = {
  rect: { arc: '#9E8870', arcWidth: 1.2, dash: '3 3', leaf: '#2D231B', leafWidth: 2.8 },
  outline: { arc: '#784A28', arcWidth: 1, dash: '3 2', leaf: '#784A28', leafWidth: 2 },
};

/**
 * A door leaf and its swing arc on the plan, for either hinge side and either swing
 * direction. The little dot marks the hinge.
 */
export function DoorSwing({ room, door, tone = 'rect' }) {
  const g = doorGeometry(room, door);
  if (!g) return null;
  const t = TONES[tone] || TONES.rect;
  return (
    <g pointerEvents="none" data-hinge={g.hingeAtStart ? 'start' : 'end'}>
      <path
        d={`M ${g.tip.x} ${g.tip.y} A ${g.radius} ${g.radius} 0 0 ${g.sweep} ${g.far.x} ${g.far.y}`}
        fill="none"
        stroke={t.arc}
        strokeWidth={t.arcWidth}
        strokeDasharray={t.dash}
      />
      <line
        x1={g.hinge.x}
        y1={g.hinge.y}
        x2={g.tip.x}
        y2={g.tip.y}
        stroke={t.leaf}
        strokeWidth={t.leafWidth}
        strokeLinecap="round"
      />
      <circle cx={g.hinge.x} cy={g.hinge.y} r="2.6" fill={t.leaf} />
    </g>
  );
}

/** The leaves of a window that opens: dashed arcs show where each leaf swings. */
export function WindowSwing({ room, win }) {
  const leaves = windowLeaves(room, win);
  if (leaves.length === 0) return null;
  return (
    <g pointerEvents="none" data-window-swing={win.swing}>
      {leaves.map((l, i) => (
        <g key={i}>
          <path
            d={`M ${l.tip.x} ${l.tip.y} A ${l.radius} ${l.radius} 0 0 ${l.sweep} ${l.far.x} ${l.far.y}`}
            fill="none"
            stroke="#5A738E"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <line
            x1={l.hinge.x}
            y1={l.hinge.y}
            x2={l.tip.x}
            y2={l.tip.y}
            stroke="#3D536B"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx={l.hinge.x} cy={l.hinge.y} r="2" fill="#3D536B" />
        </g>
      ))}
    </g>
  );
}
