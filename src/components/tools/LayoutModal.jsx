import React, { useState } from 'react';
import { Wand2, Minus, Plus } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { SelectField, Segmented } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import { IconButton } from '../common/Section.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { suggestLayout } from '../../engine/layout.js';
import { FURNITURE_CATALOG, getFurnitureType } from '../../data/furnitureCatalog.js';
import styles from './Tools.module.css';

const PRESETS = {
  Bedroom: { 'bed-queen': 1, nightstand: 2, 'wardrobe-2door': 1, 'chest-drawers': 1, 'rug-living': 1 },
  'Living room': { 'sofa-3seat': 1, armchair: 2, 'coffee-table': 1, 'media-console': 1, 'tv-43': 1, 'rug-living': 1, 'floor-plant': 1 },
  Dining: { 'dining-table-large': 1, 'dining-chair': 6, 'sideboard-buffet': 1 },
  Study: { 'desk-executive': 1, 'desk-chair': 1, bookshelf: 2, 'floor-lamp': 1 },
  'Nepali sitting room': { 'nepali-dhaka-rug': 1, 'nepali-pirka': 3, 'nepali-chowki': 1, 'nepali-puja-mandir': 1 },
};

const MODE_OPTIONS = [
  { value: 'replace', label: 'Replace furniture' },
  { value: 'add', label: 'Add to furniture' },
];

const ADD_OPTIONS = [
  { value: '', label: 'Choose a piece...' },
  ...FURNITURE_CATALOG.map((f) => ({ value: f.id, label: f.name })),
];

function expand(counts) {
  const ids = [];
  for (const [id, n] of Object.entries(counts)) for (let i = 0; i < n; i++) ids.push(id);
  return ids;
}

export function LayoutModal({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const applyLayout = useRoomStore((state) => state.applyLayout);
  const [preset, setPreset] = useState('Bedroom');
  const [counts, setCounts] = useState(PRESETS.Bedroom);
  const [mode, setMode] = useState('replace');
  const [result, setResult] = useState(null);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const setCount = (id, delta) => {
    setPreset(null);
    setCounts((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  };

  const handleApply = () => {
    const base = mode === 'add' ? room : { ...room, placedFurniture: [] };
    const { placed, unplaced } = suggestLayout(base, expand(counts));
    applyLayout(placed, mode);
    setResult({ placed: placed.length, unplaced });
    if (unplaced.length === 0) onClose();
  };

  return (
    <Modal
      title="Suggest a layout"
      subtitle="Choose what the room needs. Pieces are placed along the walls and kept clear of doors and windows."
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Wand2 size={16} />} onClick={handleApply} disabled={total === 0}>
            Arrange {total} {total === 1 ? 'piece' : 'pieces'}
          </Button>
        </>
      }
    >
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Start from</h3>
        <div className={styles.chips} role="group" aria-label="Starting set">
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              type="button"
              className={`${styles.chip} ${preset === name ? styles.chipOn : ''}`}
              aria-pressed={preset === name}
              onClick={() => {
                setPreset(name);
                setCounts(PRESETS[name]);
                setResult(null);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Pieces ({total})</h3>
        {total === 0 ? (
          <p className={styles.emptyList}>No pieces yet. Pick a starting set or add a piece below.</p>
        ) : (
          <ul className={styles.pieceList}>
            {Object.entries(counts).map(([id, n]) => {
              const name = getFurnitureType(id)?.name || id;
              return (
                <li key={id} className={styles.pieceItem}>
                  <span className={styles.pieceName}>{name}</span>
                  <span className={styles.stepper}>
                    <IconButton label={`Fewer ${name}`} onClick={() => setCount(id, -1)}><Minus size={16} /></IconButton>
                    <span className={styles.stepCount} aria-live="polite">{n}</span>
                    <IconButton label={`More ${name}`} onClick={() => setCount(id, 1)}><Plus size={16} /></IconButton>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <SelectField
          label="Add another piece"
          options={ADD_OPTIONS}
          value=""
          onChange={(id) => id && setCount(id, 1)}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>When arranging</h3>
        <Segmented ariaLabel="When arranging" options={MODE_OPTIONS} value={mode} onChange={setMode} fill />
        <p>You can undo this with Ctrl+Z.</p>
      </div>

      {result && result.unplaced.length > 0 && (
        <Notice kind="warn">
          {result.placed} placed. {result.unplaced.length} did not fit:{' '}
          {result.unplaced.map((id) => getFurnitureType(id)?.name || id).join(', ')}. Try a larger room or fewer pieces.
        </Notice>
      )}
    </Modal>
  );
}
