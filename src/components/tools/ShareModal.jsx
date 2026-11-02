import React, { useRef, useState } from 'react';
import { Link2, FileJson, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { TextField } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { encodeRoomToHash } from '../../engine/share.js';
import { exportRoomPlanAsPNG, exportRoomPlanAsPDF, exportRoomAsJSON } from '../../engine/exportPlan.js';
import styles from './Tools.module.css';

export function ShareModal({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const importRoomData = useRoomStore((state) => state.importRoomData);
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null); // { kind: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false);
  const [manualLink, setManualLink] = useState(null); // shown when the browser blocks copying

  const run = async (fn, okText) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ kind: 'ok', text: okText });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () =>
    run(async () => {
      setManualLink(null);
      const hash = await encodeRoomToHash(room);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        setManualLink(url);
        throw new Error('Your browser would not copy the link automatically. Copy it from the box below.');
      }
    }, 'Link copied. Anyone who opens it gets their own copy of this design. Nothing is uploaded.');

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    run(async () => {
      if (file.size > 5 * 1024 * 1024) throw new Error('That file is too large to be a room design.');
      const data = JSON.parse(await file.text());
      await importRoomData(data);
      onClose();
    }, 'Design imported.');
  };

  return (
    <Modal title="Share & export" subtitle={room ? room.name : undefined} onClose={onClose} width={560}>
      <ul className={styles.options}>
        <li className={styles.option}>
          <div className={styles.optionText}>
            <h3 className={styles.optionTitle}>Share a link</h3>
            <p className={styles.optionHelp}>The design is packed into the link itself, so it stays private and nothing is uploaded.</p>
          </div>
          <div className={styles.optionActions}>
            <Button icon={<Link2 size={16} />} onClick={copyLink} disabled={busy}>Copy link</Button>
          </div>
        </li>

        <li className={styles.option}>
          <div className={styles.optionText}>
            <h3 className={styles.optionTitle}>Download</h3>
            <p className={styles.optionHelp}>A picture, a printable plan, or a file you can open again later.</p>
          </div>
          <div className={styles.optionActions}>
            <Button icon={<ImageIcon size={16} />} disabled={busy} onClick={() => run(() => exportRoomPlanAsPNG(room), 'Picture downloaded.')}>PNG</Button>
            <Button icon={<FileText size={16} />} disabled={busy} onClick={() => run(() => exportRoomPlanAsPDF(room), 'Plan downloaded.')}>PDF</Button>
            <Button icon={<FileJson size={16} />} disabled={busy} onClick={() => run(async () => exportRoomAsJSON(room), 'Design file downloaded.')}>JSON</Button>
          </div>
        </li>

        <li className={styles.option}>
          <div className={styles.optionText}>
            <h3 className={styles.optionTitle}>Open a design file</h3>
            <p className={styles.optionHelp}>Opens as a new room. Your current room is kept.</p>
          </div>
          <div className={styles.optionActions}>
            <Button icon={<Upload size={16} />} onClick={() => fileRef.current?.click()} disabled={busy}>Choose file</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} aria-label="Design file to open" />
        </li>
      </ul>

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {manualLink && (
        <TextField label="Share link" value={manualLink} readOnly onFocus={(e) => e.target.select()} />
      )}
    </Modal>
  );
}
