import React, { useState } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import styles from './NewRoomModal.module.css';

const ROOM_PRESETS = [
  { name: 'Living Room', width: 500, depth: 400 },
  { name: 'Master Bedroom', width: 450, depth: 400 },
  { name: 'Kitchen & Dining', width: 420, depth: 360 },
  { name: 'Kids Bedroom', width: 360, depth: 300 },
  { name: 'Home Office', width: 340, depth: 300 },
  { name: 'Open Studio', width: 600, depth: 500 },
];

export function NewRoomModal({ isOpen, onClose }) {
  const createRoom = useRoomStore((state) => state.createRoom);

  const [name, setName] = useState('');
  const [widthCm, setWidthCm] = useState(500);
  const [depthCm, setDepthCm] = useState(400);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    createRoom(name || 'New Room', Number(widthCm), Number(depthCm));
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Define new room</h2>
          <p className={styles.subtitle}>Specify internal architectural room dimensions.</p>
          <p className={styles.subtitle}>Choose an architectural archetype or customize dimensions.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Quick Room Presets */}
          <div className={styles.presetsSection}>
            <label className={styles.label}>Room Archetype</label>
            <div className={styles.presetsGrid}>
              {ROOM_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className={`${styles.presetPill} ${name === preset.name ? styles.presetActive : ''}`}
                  onClick={() => {
                    setName(preset.name);
                    setWidthCm(preset.width);
                    setDepthCm(preset.depth);
                  }}
                >
                  <span className={styles.presetName}>{preset.name}</span>
                  <span className={styles.presetDims}>{preset.width / 100}×{preset.depth / 100}m</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="room-name">
              Room label
            </label>
            <input
              id="room-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Master Bedroom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="room-width">
                Width
              </label>
              <div className={styles.inputGroup}>
                <input
                  id="room-width"
                  type="number"
                  min="200"
                  max="1500"
                  step="10"
                  className={styles.input}
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  required
                />
                <span className={styles.unit}>cm</span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="room-depth">
                Depth
              </label>
              <div className={styles.inputGroup}>
                <input
                  id="room-depth"
                  type="number"
                  min="200"
                  max="1500"
                  step="10"
                  className={styles.input}
                  value={depthCm}
                  onChange={(e) => setDepthCm(e.target.value)}
                  required
                />
                <span className={styles.unit}>cm</span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create room
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

