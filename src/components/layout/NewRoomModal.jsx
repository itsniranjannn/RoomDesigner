import React, { useState } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { Modal } from '../common/Modal.jsx';
import { TextField, NumberField } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import styles from './NewRoomModal.module.css';

const ROOM_PRESETS = [
  { name: 'Living room', width: 500, depth: 400 },
  { name: 'Master bedroom', width: 450, depth: 400 },
  { name: 'Kitchen and dining', width: 420, depth: 360 },
  { name: "Kids' bedroom", width: 360, depth: 300 },
  { name: 'Home office', width: 340, depth: 300 },
  { name: 'Open studio', width: 600, depth: 500 },
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
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);

  const applyPreset = (preset) => {
    setPresetName(preset.name);
    setName(preset.name);
    setWidthCm(preset.width);
    setDepthCm(preset.depth);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    // Read the boxes directly so a value typed just before Enter is not lost
    const data = e?.currentTarget ? new FormData(e.currentTarget) : null;
    const clampCm = (raw, fallback) => {
      const n = Number(raw);
      if (raw === null || raw === '' || !Number.isFinite(n)) return fallback;
      return Math.max(MIN_CM, Math.min(MAX_CM, n));
    };
    const w = clampCm(data?.get('width'), widthCm);
    const d = clampCm(data?.get('depth'), depthCm);
    if (busy) return;
    setBusy(true);
    setFailed(null);
    try {
      // The room is stored before it opens: if that fails, say so and stay here
      await createRoom(name.trim() || 'New Room', w, d);
      onClose();
    } catch {
      setFailed(
        'This room could not be saved on this device, so it was not created. There may be no storage space left. Delete a design you no longer need, then try again.'
      );
    } finally {
      setBusy(false);
    }
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
          <Button variant="primary" type="submit" form="new-room-form" disabled={busy}>
            {busy ? 'Creating…' : 'Create room'}
          </Button>
        </>
      }
    >
      <form id="new-room-form" className={styles.form} onSubmit={handleSubmit}>
        {failed && <Notice kind="error">{failed}</Notice>}
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
          placeholder="For example, Master bedroom"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />

        <div className={styles.sizeRow}>
          <NumberField
            label="Width"
            name="width"
            suffix="cm"
            min={MIN_CM}
            max={MAX_CM}
            step="any"
            value={widthCm}
            hint={`${meters(widthCm)}. Allowed ${MIN_CM} to ${MAX_CM}.`}
            onCommit={(v) => {
              setWidthCm(v);
              setPresetName(null);
            }}
          />
          <NumberField
            label="Depth"
            name="depth"
            suffix="cm"
            min={MIN_CM}
            max={MAX_CM}
            step="any"
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
