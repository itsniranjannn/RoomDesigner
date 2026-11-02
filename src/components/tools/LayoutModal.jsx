import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Wand2, Minus, Plus } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { suggestLayout } from '../../engine/layout.js';
import { FURNITURE_CATALOG, getFurnitureType } from '../../data/furnitureCatalog.js';
import styles from '../common/Modal.module.css';

const PRESETS = {
  Bedroom: { 'bed-queen': 1, nightstand: 2, 'wardrobe-2door': 1, 'chest-drawers': 1, 'rug-living': 1 },
  'Living room': { 'sofa-3seat': 1, armchair: 2, 'coffee-table': 1, 'media-console': 1, 'tv-43': 1, 'rug-living': 1, 'floor-plant': 1 },
  Dining: { 'dining-table-large': 1, 'dining-chair': 6, 'sideboard-buffet': 1 },
  Study: { 'desk-executive': 1, 'desk-chair': 1, bookshelf: 2, 'floor-lamp': 1 },
  'Nepali sitting room': { 'nepali-dhaka-rug': 1, 'nepali-pirka': 3, 'nepali-chowki': 1, 'nepali-puja-mandir': 1 },
};

function expand(counts) {
  const ids = [];
  for (const [id, n] of Object.entries(counts)) for (let i = 0; i < n; i++) ids.push(id);
  return ids;
}

export function LayoutModal({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const applyLayout = useRoomStore((state) => state.applyLayout);
  const [counts, setCounts] = useState(PRESETS.Bedroom);
  const [mode, setMode] = useState('replace');
  const [result, setResult] = useState(null);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const setCount = (id, delta) =>
    setCounts((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });

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
      subtitle="Pick what the room needs. Furniture is placed against walls and clear of doors and windows."
      onClose={onClose}
      width={620}
      footer={
        <>
          <Button variant="ghost" size="small" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="small" icon={<Wand2 size={12} />} onClick={handleApply} disabled={total === 0}>
            Arrange {total} piece{total === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className={styles.field}>
        <span className={styles.label}>Start from a preset</span>
        <div className={styles.row}>
          {Object.keys(PRESETS).map((name) => (
            <button key={name} type="button" className={styles.chipBtn} onClick={() => setCounts(PRESETS[name])}>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Pieces ({total})</span>
        {Object.entries(counts).map(([id, n]) => (
          <div key={id} className={styles.row} style={{ justifyContent: 'space-between' }}>
            <span>{getFurnitureType(id)?.name || id}</span>
            <span className={styles.row} style={{ gap: 6 }}>
              <button type="button" className={styles.chipBtn} onClick={() => setCount(id, -1)} aria-label={`Fewer ${id}`}>
                <Minus size={10} />
              </button>
              <span style={{ minWidth: 18, textAlign: 'center' }}>{n}</span>
              <button type="button" className={styles.chipBtn} onClick={() => setCount(id, 1)} aria-label={`More ${id}`}>
                <Plus size={10} />
              </button>
            </span>
          </div>
        ))}
        <select
          className={styles.input}
          value=""
          onChange={(e) => e.target.value && setCount(e.target.value, 1)}
          aria-label="Add another piece"
        >
          <option value="">+ Add another piece…</option>
          {FURNITURE_CATALOG.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>When applying</span>
        <div className={styles.row}>
          <label><input type="radio" name="layout-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace current furniture</label>
          <label><input type="radio" name="layout-mode" checked={mode === 'add'} onChange={() => setMode('add')} /> Add to current furniture</label>
        </div>
        <p className={styles.note}>You can undo with Ctrl+Z.</p>
      </div>

      {result && result.unplaced.length > 0 && (
        <p className={styles.statusError} role="alert">
          {result.placed} placed. {result.unplaced.length} piece(s) did not fit:{' '}
          {result.unplaced.map((id) => getFurnitureType(id)?.name || id).join(', ')}. Try a larger room or fewer pieces.
        </p>
      )}
    </Modal>
  );
}
