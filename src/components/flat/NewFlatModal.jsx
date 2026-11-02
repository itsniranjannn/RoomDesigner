import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { useFlatStore } from '../../store/flatStore.js';
import styles from '../common/Modal.module.css';

export function NewFlatModal({ onClose }) {
  const createNewFlat = useFlatStore((s) => s.createNewFlat);
  const [name, setName] = useState('My Flat');
  const [template, setTemplate] = useState('2bhk');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    await createNewFlat(name.trim() || 'My Flat', template);
    onClose();
  };

  return (
    <Modal
      title="Design a flat"
      subtitle="Lay out rooms, bathrooms, corridors and stairs, then furnish each one."
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="ghost" size="small" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="small" onClick={submit} disabled={busy}>Create flat</Button>
        </>
      }
    >
      <form onSubmit={submit} className={styles.field} style={{ gap: 14 }}>
        <label className={styles.field}>
          <span className={styles.label}>Name</span>
          <input className={styles.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <legend className={styles.label} style={{ marginBottom: 6 }}>Start from</legend>
          <label>
            <input type="radio" name="flat-template" checked={template === '2bhk'} onChange={() => setTemplate('2bhk')} />{' '}
            Two-bedroom flat <span className={styles.note}>(living, kitchen, hallway, 2 bedrooms, bathroom: all furnished)</span>
          </label>
          <label>
            <input type="radio" name="flat-template" checked={template === 'empty'} onChange={() => setTemplate('empty')} />{' '}
            Empty plan <span className={styles.note}>(add every room yourself)</span>
          </label>
        </fieldset>
      </form>
    </Modal>
  );
}
