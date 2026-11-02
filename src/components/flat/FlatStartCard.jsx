import React, { useState } from 'react';
import { Button } from '../common/Button.jsx';
import { NumberField } from '../common/Field.jsx';
import { PRESETS } from '../../engine/flatPresets.js';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import styles from './FlatDesigner.module.css';

/** Shown over an empty plan: pick a starting point or start drawing walls. */
export function FlatStartCard({ onDismiss }) {
  const applyPreset = useFlatStore((s) => s.applyPreset);
  const [widthM, setWidthM] = useState(8);
  const [depthM, setDepthM] = useState(6);

  const start = (preset, options) => {
    if (applyPreset(preset, options)) {
      useFlatUi.getState().requestFit();
      useFlatUi.getState().setTool('select');
    }
  };

  return (
    <div className={styles.startWrap}>
      <section className={styles.startCard} aria-label="Start your flat">
        <div>
          <h2 className={styles.startTitle}>Start your flat</h2>
          <p className={styles.startText}>
            Pick a ready-made layout to adjust, or draw your own walls. Rooms appear by themselves once walls close a space.
          </p>
        </div>
        <div className={styles.presetGrid}>
          {PRESETS.filter((p) => !['blank', 'shell'].includes(p.value)).map((p) => (
            <Button key={p.value} variant="secondary" className={styles.presetBtn} onClick={() => start(p.value)}>
              {p.label}
              <span className={styles.presetNote}>{p.note}</span>
            </Button>
          ))}
        </div>
        <div className={styles.shellRow}>
          <NumberField label="Outer shell width" suffix="m" value={widthM} min={2} max={24} step={0.5} onCommit={setWidthM} />
          <NumberField label="Outer shell depth" suffix="m" value={depthM} min={2} max={24} step={0.5} onCommit={setDepthM} />
          <Button variant="secondary" onClick={() => start('shell', { widthCm: widthM * 100, depthCm: depthM * 100 })}>
            Add shell
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            useFlatUi.getState().setTool('wall');
            onDismiss();
          }}
        >Start with a blank plan</Button>
      </section>
    </div>
  );
}
