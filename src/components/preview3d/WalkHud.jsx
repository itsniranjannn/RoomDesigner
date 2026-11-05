import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, LogOut } from 'lucide-react';
import styles from './WalkHud.module.css';

/**
 * What the walkthrough is being told to do. The keyboard and the on-screen pad both write here
 * and WalkControls reads it every frame; the HUD listens to light up the keys that are held.
 */
export const walkInput = {
  /** pad buttons held down with a pointer or finger: forward, back, left, right, turnL, turnR */
  pad: {},
  /** keys held on the keyboard, same names */
  keys: {},
  run: false,
  listeners: new Set(),
  notify() {
    for (const fn of this.listeners) fn();
  },
  reset() {
    this.pad = {};
    this.keys = {};
    this.run = false;
    this.notify();
  },
};

/** The on-screen keys. `name` is the action they trigger. */
const PAD = [
  { name: 'forward', label: 'W', area: 'w', icon: <ArrowUp size={14} aria-hidden="true" /> },
  { name: 'left', label: 'A', area: 'a', icon: <ArrowLeft size={14} aria-hidden="true" /> },
  { name: 'back', label: 'S', area: 's', icon: <ArrowDown size={14} aria-hidden="true" /> },
  { name: 'right', label: 'D', area: 'd', icon: <ArrowRight size={14} aria-hidden="true" /> },
];

/**
 * Walkthrough overlay: a W A S D pad that lights up as keys are pressed and that can also be
 * pressed with a mouse or finger (touch screens have no keyboard), a run toggle and a leave button.
 */
export function WalkHud({ onExit }) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    walkInput.listeners.add(fn);
    return () => {
      walkInput.listeners.delete(fn);
    };
  }, []);

  const held = (name) => !!(walkInput.pad[name] || walkInput.keys[name]);
  const press = (name, on) => {
    if (!!walkInput.pad[name] === on) return;
    walkInput.pad[name] = on;
    walkInput.notify();
  };

  return (
    <div className={styles.hud} aria-label="Walkthrough controls">
      <div className={styles.pad} role="group" aria-label="Move with W A S D">
        {PAD.map((k) => (
          <button
            key={k.name}
            type="button"
            tabIndex={-1}
            className={`${styles.key} ${held(k.name) ? styles.keyHeld : ''}`}
            style={{ gridArea: k.area }}
            aria-label={`Walk ${k.name === 'back' ? 'backwards' : k.name}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              press(k.name, true);
            }}
            onPointerUp={() => press(k.name, false)}
            onPointerCancel={() => press(k.name, false)}
            onLostPointerCapture={() => press(k.name, false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className={styles.letter}>{k.label}</span>
            {k.icon}
          </button>
        ))}
      </div>
      <button
        type="button"
        tabIndex={-1}
        className={`${styles.wide} ${walkInput.run || walkInput.pad.run ? styles.keyHeld : ''}`}
        aria-pressed={!!walkInput.pad.run}
        onClick={() => {
          walkInput.pad.run = !walkInput.pad.run;
          walkInput.notify();
        }}
        title="Hold Shift to run, or tap here to keep running"
      >
        Run (Shift)
      </button>
      <button
        type="button"
        tabIndex={-1}
        className={styles.wide}
        onClick={onExit}
        aria-label="Leave the walkthrough"
      >
        <LogOut size={13} aria-hidden="true" /> Esc
      </button>
    </div>
  );
}
