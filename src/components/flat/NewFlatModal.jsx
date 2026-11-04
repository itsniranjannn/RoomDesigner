import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { TextField, SelectField, NumberField } from '../common/Field.jsx';
import { PRESETS } from '../../engine/flatPresets.js';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import styles from './NewFlatModal.module.css';

const OPTIONS = PRESETS.map((p) => ({ value: p.value, label: p.label }));

export function NewFlatModal({ onClose }) {
  const createNewFlat = useFlatStore((s) => s.createNewFlat);
  const [name, setName] = useState('My Flat');
  const [preset, setPreset] = useState('2bhk');
  const [widthM, setWidthM] = useState(8);
  const [depthM, setDepthM] = useState(6);
  const [busy, setBusy] = useState(false);
  const note = PRESETS.find((p) => p.value === preset)?.note;

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    await createNewFlat(name.trim() || 'My Flat', preset, { widthCm: widthM * 100, depthCm: depthM * 100 });
    useFlatUi.getState().setTool(preset === 'blank' ? 'wall' : 'select');
    useFlatUi.getState().requestFit();
    onClose();
  };

  return (
    <Modal
      title="Design a flat"
      subtitle="Draw walls to make rooms, then add doors, windows and stairs."
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>Create flat</Button>
        </>
      }
    >
      <form className={styles.form} onSubmit={submit} onKeyDown={(e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && submit(e)}>
        <TextField label="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <SelectField label="Start from" options={OPTIONS} value={preset} onChange={setPreset} hint={note} />
        {preset === 'shell' && (
          <div className={styles.sizeRow}>
            <NumberField label="Width" suffix="m" value={widthM} min={2} max={24} step={0.5} onCommit={setWidthM} />
            <NumberField label="Depth" suffix="m" value={depthM} min={2} max={24} step={0.5} onCommit={setDepthM} />
          </div>
        )}
      </form>
    </Modal>
  );
}
