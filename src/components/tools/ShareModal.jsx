import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Link2, FileJson, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { encodeRoomToHash } from '../../engine/share.js';
import { exportRoomPlanAsPNG, exportRoomPlanAsPDF, exportRoomAsJSON } from '../../engine/exportPlan.js';
import styles from '../common/Modal.module.css';

export function ShareModal({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const importRoomData = useRoomStore((state) => state.importRoomData);
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null); // { kind: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false);

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
      const hash = await encodeRoomToHash(room);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      await navigator.clipboard.writeText(url);
    }, 'Link copied. Anyone opening it gets their own copy of this design; nothing is uploaded.');

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
    <Modal title="Export & share" subtitle={room ? room.name : undefined} onClose={onClose} width={520}>
      <div className={styles.field}>
        <span className={styles.label}>Share</span>
        <Button variant="secondary" icon={<Link2 size={13} />} onClick={copyLink} disabled={busy}>
          Copy share link
        </Button>
        <p className={styles.note}>The design is packed into the link itself, so it stays private and works offline.</p>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Export</span>
        <div className={styles.row}>
          <Button variant="secondary" size="small" icon={<ImageIcon size={12} />} disabled={busy}
            onClick={() => run(() => exportRoomPlanAsPNG(room), 'PNG downloaded.')}>PNG</Button>
          <Button variant="secondary" size="small" icon={<FileText size={12} />} disabled={busy}
            onClick={() => run(() => exportRoomPlanAsPDF(room), 'PDF downloaded.')}>PDF</Button>
          <Button variant="secondary" size="small" icon={<FileJson size={12} />} disabled={busy}
            onClick={() => run(async () => exportRoomAsJSON(room), 'JSON downloaded.')}>JSON</Button>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Import</span>
        <Button variant="secondary" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()} disabled={busy}>
          Import design from JSON
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} aria-label="Import JSON file" />
        <p className={styles.note}>Imports open as a new sheet. Your current room is kept.</p>
      </div>

      {message && (
        <p className={message.kind === 'ok' ? styles.status : styles.statusError} role="status">
          {message.text}
        </p>
      )}
    </Modal>
  );
}
