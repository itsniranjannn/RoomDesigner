import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useRoomStore, RESIZE_MIN_RATIO, RESIZE_MAX_RATIO } from '../../store/roomStore.js';
import { getFurnitureType } from '../../data/furnitureCatalog.js';
import styles from './CustomizeSection.module.css';

const PALETTE = ['#8B6F47', '#5C3524', '#C49746', '#22485E', '#3B4B42', '#8B2635', '#E6DDCB', '#2B2B2B'];

function NumberField({ label, value, placeholder, min, max, onCommit, suffix = 'cm' }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => setDraft(String(value ?? '')), [value]);

  const commit = () => {
    if (draft === '' || Number(draft) === Number(value)) return;
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value ?? ''));
      return;
    }
    onCommit(Math.max(min, Math.min(max, n)));
  };

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrap}>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          placeholder={placeholder}
          min={min}
          max={max}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <span className={styles.suffix}>{suffix}</span>
      </span>
    </label>
  );
}

/** Per-piece size and finish overrides (non-destructive: reset restores the catalog values). */
export function CustomizeSection({ item, def }) {
  const updateItemOverrides = useRoomStore((state) => state.updateItemOverrides);
  const base = getFurnitureType(item.furnitureTypeId);
  const hasOverrides = !!item.overrides && Object.keys(item.overrides).length > 0;
  const set = (patch) => updateItemOverrides(item.id, patch, true);
  const range = (key, floor) => ({
    min: Math.max(floor, Math.ceil((base?.[key] ?? def[key]) * RESIZE_MIN_RATIO)),
    max: Math.floor((base?.[key] ?? def[key]) * RESIZE_MAX_RATIO),
  });

  return (
    <div className={styles.section}>
      <div className={styles.head}>
        <span className={styles.heading}>Customize</span>
        {hasOverrides && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => updateItemOverrides(item.id, {
              widthCm: null, depthCm: null, heightCm: null, color: null, subColor: null, accentColor: null,
            }, true)}
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      <div className={styles.grid3}>
        <NumberField label="Width" value={def.widthCm} {...range('widthCm', 20)} onCommit={(v) => set({ widthCm: v })} />
        <NumberField label="Depth" value={def.depthCm} {...range('depthCm', 20)} onCommit={(v) => set({ depthCm: v })} />
        <NumberField label="Height" value={def.heightCm} {...range('heightCm', 1)} onCommit={(v) => set({ heightCm: v })} />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Finish colour</span>
        <div className={styles.swatches} role="group" aria-label="Finish colour">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.swatch} ${def.color?.toLowerCase() === c.toLowerCase() ? styles.swatchActive : ''}`}
              style={{ background: c }}
              onClick={() => set({ color: c })}
              aria-label={`Use colour ${c}`}
              title={c}
            />
          ))}
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(def.color || '') ? def.color : '#8b6f47'}
            onChange={(e) => updateItemOverrides(item.id, { color: e.target.value }, false)}
            onBlur={(e) => updateItemOverrides(item.id, { color: e.target.value }, true)}
            aria-label="Custom colour"
            className={styles.colorInput}
          />
        </div>
        {base && item.overrides?.color && <span className={styles.hint}>Catalog colour: {base.color}</span>}
      </div>

    </div>
  );
}
