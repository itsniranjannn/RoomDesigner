import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Notice } from '../common/Notice.jsx';
import { Segmented, Switch } from '../common/Field.jsx';
import {
  RENDER_SIZES,
  RENDER_BACKGROUNDS,
  loadRenderPrefs,
  saveRenderPrefs,
} from '../../engine/renderSettings.js';
import styles from './RenderImageDialog.module.css';

const SIZE_OPTIONS = RENDER_SIZES.map((s) => ({
  value: s.value,
  label: s.value === 'max' ? '4096 px' : s.label.slice(s.label.indexOf('(') + 1, -1),
  ariaLabel: s.label,
}));
const BACKGROUND_OPTIONS = RENDER_BACKGROUNDS.map((b) => ({
  value: b.value,
  label: b.label,
  ariaLabel: `${b.label} background`,
}));

/** The three choices of a render: size, background and title block. Remembered on this device. */
export function RenderOptions({ value, onChange, disabled = false }) {
  const set = (patch) => {
    const next = { ...value, ...patch };
    saveRenderPrefs(next);
    onChange(next);
  };
  return (
    <div className={styles.options} aria-disabled={disabled}>
      <div className={styles.row}>
        <span className={styles.label}>Size</span>
        <Segmented
          ariaLabel="Render size"
          options={SIZE_OPTIONS}
          value={value.size}
          onChange={(size) => !disabled && set({ size })}
          size="small"
        />
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Background</span>
        <Segmented
          ariaLabel="Render background"
          options={BACKGROUND_OPTIONS}
          value={value.background}
          onChange={(background) => !disabled && set({ background })}
          size="small"
        />
      </div>
      <Switch
        label="Title block with the name"
        checked={value.titleBlock}
        onChange={(titleBlock) => !disabled && set({ titleBlock })}
      />
    </div>
  );
}

/**
 * A small dialog to render the open 3D view as a high-resolution picture. `run(prefs, onProgress)` makes and
 * downloads the picture and returns its file name.
 */
export function RenderImageDialog({ title, subtitle, run, onClose }) {
  const [prefs, setPrefs] = useState(loadRenderPrefs);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [message, setMessage] = useState(null);

  const start = async () => {
    setBusy(true);
    setMessage(null);
    setProgress('Getting ready…');
    try {
      const name = await run(prefs, setProgress);
      setMessage({ kind: 'ok', text: `Saved as ${name}. Check your downloads folder.` });
    } catch (err) {
      setMessage({ kind: 'error', text: err?.message || 'The picture could not be rendered.' });
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button icon={<Camera size={16} aria-hidden="true" />} onClick={start} disabled={busy}>
            {busy ? 'Rendering…' : 'Render image'}
          </Button>
        </>
      }
    >
      <p className={styles.help}>
        Renders the 3D view as it is on screen, sharper and with fine shadows, as a PNG. Large sizes
        can take a few seconds.
      </p>
      <RenderOptions value={prefs} onChange={setPrefs} disabled={busy} />
      {busy && (
        <p className={styles.progress} role="status">
          {progress}
        </p>
      )}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
    </Modal>
  );
}
