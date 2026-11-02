import React, { useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useRoomStore, RESIZE_MIN_RATIO, RESIZE_MAX_RATIO } from '../../store/roomStore.js';
import { getFurnitureType } from '../../data/furnitureCatalog.js';
import { Button } from '../common/Button.jsx';
import { NumberField } from '../common/Field.jsx';
import { Section } from '../common/Section.jsx';
import styles from './Inspector.module.css';

const PALETTE = [
  { hex: '#8B6F47', name: 'Teak' },
  { hex: '#5C3524', name: 'Walnut' },
  { hex: '#C49746', name: 'Brass' },
  { hex: '#22485E', name: 'Indigo' },
  { hex: '#3B4B42', name: 'Pine green' },
  { hex: '#8B2635', name: 'Maroon' },
  { hex: '#E6DDCB', name: 'Linen' },
  { hex: '#2B2B2B', name: 'Charcoal' },
];

const SIZE_KEYS = ['widthCm', 'depthCm', 'heightCm'];

/** Width, depth and height of one placed piece. Reset restores the catalog size. */
export function SizeSection({ item, def }) {
  const updateItemOverrides = useRoomStore((state) => state.updateItemOverrides);
  const base = getFurnitureType(item.furnitureTypeId);
  const hasSizeOverride = SIZE_KEYS.some((key) => item.overrides?.[key] !== undefined);
  const set = (patch) => updateItemOverrides(item.id, patch, true);
  const range = (key, floor) => ({
    min: Math.max(floor, Math.ceil((base?.[key] ?? def[key]) * RESIZE_MIN_RATIO)),
    max: Math.floor((base?.[key] ?? def[key]) * RESIZE_MAX_RATIO),
  });

  return (
    <Section
      title="Size"
      action={
        hasSizeOverride && (
          <Button
            variant="ghost"
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={() => set({ widthCm: null, depthCm: null, heightCm: null })}
          >
            Reset size
          </Button>
        )
      }
    >
      <div className={styles.grid3}>
        <NumberField label="Width" value={def.widthCm} {...range('widthCm', 20)} onCommit={(v) => set({ widthCm: v })} />
        <NumberField label="Depth" value={def.depthCm} {...range('depthCm', 20)} onCommit={(v) => set({ depthCm: v })} />
        <NumberField label="Height" value={def.heightCm} {...range('heightCm', 1)} onCommit={(v) => set({ heightCm: v })} />
      </div>
      <p className={styles.note}>Sizes are in centimetres. A piece can be scaled between 40% and 250% of its original size.</p>
    </Section>
  );
}

/** Main colour of one placed piece: preset swatches plus a custom picker. */
export function FinishSection({ item, def }) {
  const updateItemOverrides = useRoomStore((state) => state.updateItemOverrides);
  const base = getFurnitureType(item.furnitureTypeId);
  const current = (def.color || '').toLowerCase();
  const customValue = /^#[0-9a-f]{6}$/i.test(def.color || '') ? def.color : '#8b6f47';
  const isPreset = PALETTE.some((p) => p.hex.toLowerCase() === current);
  const pickerStart = useRef(null); // { snapshot, colour } captured when the picker gets focus

  // Dragging in the picker changes the colour live; one undo step is added when it closes
  const beginPick = () => {
    if (pickerStart.current) return;
    pickerStart.current = { snapshot: useRoomStore.getState().getCurrentSnapshot(), colour: current };
  };
  const endPick = (value) => {
    const start = pickerStart.current;
    pickerStart.current = null;
    if (start && value.toLowerCase() !== start.colour) useRoomStore.getState().pushExplicitSnapshot(start.snapshot);
  };

  return (
    <Section
      title="Finish"
      action={
        item.overrides?.color && (
          <Button
            variant="ghost"
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={() => updateItemOverrides(item.id, { color: null, subColor: null, accentColor: null }, true)}
          >
            Reset colour
          </Button>
        )
      }
    >
      <div className={styles.swatches} role="group" aria-label="Colour">
        {PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            className={`${styles.swatch} ${current === c.hex.toLowerCase() ? styles.swatchOn : ''}`}
            style={{ background: c.hex }}
            onClick={() => updateItemOverrides(item.id, { color: c.hex }, true)}
            aria-label={c.name}
            aria-pressed={current === c.hex.toLowerCase()}
            title={c.name}
          />
        ))}
        <label className={`${styles.customColour} ${!isPreset && current ? styles.swatchOn : ''}`} title="Pick any colour">
          <input
            type="color"
            value={customValue}
            onFocus={beginPick}
            onChange={(e) => {
              beginPick();
              updateItemOverrides(item.id, { color: e.target.value }, false);
            }}
            onBlur={(e) => endPick(e.target.value)}
            aria-label="Custom colour"
          />
          <span className={styles.customText}>Custom</span>
        </label>
      </div>
      {base && item.overrides?.color && <p className={styles.note}>Original colour: {base.color}</p>}
    </Section>
  );
}
