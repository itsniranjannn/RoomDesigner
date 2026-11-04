import React, { useState } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { Modal } from '../common/Modal.jsx';
import { TextField, NumberField } from '../common/Field.jsx';
import styles from './NewRoomModal.module.css';

const ROOM_PRESETS = [
  { name: 'Living Room', width: 500, depth: 400 },
  { name: 'Master Bedroom', width: 450, depth: 400 },
  { name: 'Kitchen & Dining', width: 420, depth: 360 },
  { name: 'Kids Bedroom', width: 360, depth: 300 },
  { name: 'Home Office', width: 340, depth: 300 },
  { name: 'Open Studio', width: 600, depth: 500 },
];

const MIN_CM = 200;
const MAX_CM = 1500;
const meters = (cm) => `${(cm / 100).toFixed(1)} m`;

function NewRoomForm({ onClose }) {
  const createRoom = useRoomStore((state) => state.createRoom);
  const [name, setName] = useState('');
  const [widthCm, setWidthCm] = useState(500);
  const [depthCm, setDepthCm] = useState(400);
  const [presetName, setPresetName] = useState(null);

  const applyPreset = (preset) => {
    setPresetName(preset.name);
    setName(preset.name);
    setWidthCm(preset.width);
    setDepthCm(preset.depth);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    createRoom(name.trim() || 'New Room', widthCm, depthCm);
    onClose();
  };

  return (
    <Modal
      title="New room"
      subtitle="Pick a starting size or enter your own. You can change the name later."
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-room-form">
            Create room
          </Button>
        </>
      }
    >
      <form id="new-room-form" className={styles.form} onSubmit={handleSubmit}>
        <div role="group" aria-label="Starting size" className={styles.presets}>
          {ROOM_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`${styles.preset} ${presetName === preset.name ? styles.presetOn : ''}`}
              aria-pressed={presetName === preset.name}
              onClick={() => applyPreset(preset)}
            >
              <span className={styles.presetName}>{preset.name}</span>
              <span className={styles.presetSize}>
                {meters(preset.width)} x {meters(preset.depth)}
              </span>
            </button>
          ))}
        </div>

        <TextField
          label="Room name"
          placeholder="For example, Master Bedroom"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />

        <div className={styles.sizeRow}>
          <NumberField
            label="Width"
            suffix="cm"
            min={MIN_CM}
            max={MAX_CM}
            step={10}
            value={widthCm}
            hint={`${meters(widthCm)}. Allowed ${MIN_CM} to ${MAX_CM}.`}
            onCommit={(v) => {
              setWidthCm(v);
              setPresetName(null);
            }}
          />
          <NumberField
            label="Depth"
            suffix="cm"
            min={MIN_CM}
            max={MAX_CM}
            step={10}
            value={depthCm}
            hint={`${meters(depthCm)}. Allowed ${MIN_CM} to ${MAX_CM}.`}
            onCommit={(v) => {
              setDepthCm(v);
              setPresetName(null);
            }}
          />
        </div>
      </form>
    </Modal>
  );
}

export function NewRoomModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <NewRoomForm onClose={onClose} />;
}
