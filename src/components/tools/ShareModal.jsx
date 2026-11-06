import React, { useEffect, useRef, useState } from 'react';
import { Link2, FileJson, FileText, Image as ImageIcon, Upload, Box, Camera } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { TextField } from '../common/Field.jsx';
import { Notice } from '../common/Notice.jsx';
import { useRoomStore } from '../../store/roomStore.js';
import { usePlanningStore } from '../../store/planningStore.js';
import { encodeRoomToHash } from '../../engine/share.js';
import {
  exportRoomPlanAsPNG,
  exportRoomPlanAsPDF,
  exportRoom3DAsPNG,
  exportRoomRenderAsPNG,
  exportRoomAsJSON,
} from '../../engine/exportPlan.js';
import { canCapture3D } from '../../engine/snapshot3d.js';
import { loadRenderPrefs } from '../../engine/renderSettings.js';
import { RenderOptions } from '../preview3d/RenderImageDialog.jsx';
import styles from './Tools.module.css';

export function ShareModal({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const importRoomData = useRoomStore((state) => state.importRoomData);
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null); // { kind: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [renderPrefs, setRenderPrefs] = useState(loadRenderPrefs);
  const [manualLink, setManualLink] = useState(null); // shown when the browser blocks copying

  const run = async (fn, okText, key = null) => {
    setBusy(true);
    setBusyKey(key);
    setMessage(null);
    try {
      const result = await fn();
      setMessage({
        kind: 'ok',
        text:
          typeof result === 'string' ? `Saved as ${result}. Check your downloads folder.` : okText,
      });
    } catch (err) {
      setMessage({ kind: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setBusy(false);
      setBusyKey(null);
    }
  };

  // The 3D view registers itself a moment after it appears, so check again while the dialog is open
  const [has3D, setHas3D] = useState(canCapture3D());
  useEffect(() => {
    const t = setInterval(() => setHas3D(canCapture3D()), 400);
    return () => clearInterval(t);
  }, []);
  const downloads = [
    {
      key: 'png',
      title: 'Floor plan picture',
      help: 'Top-down plan with each piece drawn as in the editor, door swings, windows, sizes and a key.',
      label: 'PNG',
      icon: <ImageIcon size={16} />,
      run: () => exportRoomPlanAsPNG(room, { links: usePlanningStore.getState().showLinks }),
    },
    {
      key: 'png3d',
      title: '3D picture',
      help: 'The 3D view as it is on screen, at twice the size, with a title strip.',
      note: has3D ? null : 'Switch to the 3D view first, then export.',
      label: 'PNG',
      icon: <Box size={16} />,
      disabled: !has3D,
      run: () => exportRoom3DAsPNG(room),
    },
    {
      key: 'pdf',
      title: 'Printable plan',
      help: 'The same plan on a page, drawn to scale for printing.',
      label: 'PDF',
      icon: <FileText size={16} />,
      run: () => exportRoomPlanAsPDF(room, { links: usePlanningStore.getState().showLinks }),
    },
    {
      key: 'json',
      title: 'Design file',
      help: 'Keeps every detail, so you can open the room again later or send it on.',
      label: 'JSON',
      icon: <FileJson size={16} />,
      run: async () => {
        exportRoomAsJSON(room);
        return `${room.name}.room.json`;
      },
    },
  ];

  const copyLink = () =>
    run(async () => {
      setManualLink(null);
      const hash = await encodeRoomToHash(room);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        setManualLink(url);
        throw new Error(
          'Your browser would not copy the link automatically. Copy it from the box below.'
        );
      }
    }, 'Link copied. Anyone who opens it gets their own copy of this design. Nothing is uploaded.');

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    run(async () => {
      if (file.size > 5 * 1024 * 1024)
        throw new Error('That file is too large to be a room design.');
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error('That file is not a Room Designer design.');
      }
      await importRoomData(data);
      onClose();
    }, 'Design imported.');
  };

  return (
    <Modal
      title="Share & export"
      subtitle={room ? room.name : undefined}
      onClose={onClose}
      size="md"
    >
      <ul className={styles.options}>
        <li className={styles.option}>
          <div className={styles.optionText}>
            <h3 className={styles.optionTitle}>Share a link</h3>
            <p className={styles.optionHelp}>
              The design is packed into the link itself, so it stays private and nothing is
              uploaded.
            </p>
          </div>
          <div className={styles.optionActions}>
            <Button icon={<Link2 size={16} />} onClick={copyLink} disabled={busy}>
              Copy link
            </Button>
          </div>
        </li>

        {downloads.map((d) => (
          <li className={styles.option} key={d.key}>
            <div className={styles.optionText}>
              <h3 className={styles.optionTitle}>{d.title}</h3>
              <p className={styles.optionHelp}>{d.help}</p>
              {d.note && <p className={styles.optionHelp}>{d.note}</p>}
            </div>
            <div className={styles.optionActions}>
              <Button
                icon={d.icon}
                disabled={busy || d.disabled}
                onClick={() => run(d.run, d.ok, d.key)}
              >
                {busyKey === d.key ? 'Preparing...' : d.label}
              </Button>
            </div>
          </li>
        ))}

        <li className={`${styles.option} ${styles.optionStack}`}>
          <div className={styles.optionRow}>
            <div className={styles.optionText}>
              <h3 className={styles.optionTitle}>Render image</h3>
              <p className={styles.optionHelp}>
                The 3D view as a sharp, high-resolution picture with fine shadows, up to 4096 px
                wide.
              </p>
              {!has3D && (
                <p className={styles.optionHelp}>Switch to the 3D view first, then render.</p>
              )}
            </div>
            <div className={styles.optionActions}>
              <Button
                icon={<Camera size={16} />}
                disabled={busy || !has3D}
                onClick={() =>
                  run(
                    () =>
                      exportRoomRenderAsPNG(room, renderPrefs, (text) =>
                        setMessage({ kind: 'info', text })
                      ),
                    undefined,
                    'render'
                  )
                }
              >
                {busyKey === 'render' ? 'Rendering...' : 'PNG'}
              </Button>
            </div>
          </div>
          <RenderOptions value={renderPrefs} onChange={setRenderPrefs} disabled={busy} />
        </li>

        <li className={styles.option}>
          <div className={styles.optionText}>
            <h3 className={styles.optionTitle}>Open a design file</h3>
            <p className={styles.optionHelp}>Opens as a new room. Your current room is kept.</p>
          </div>
          <div className={styles.optionActions}>
            <Button
              icon={<Upload size={16} />}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              Choose file
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImport}
            aria-label="Design file to open"
          />
        </li>
      </ul>

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {manualLink && (
        <TextField
          label="Share link"
          value={manualLink}
          readOnly
          onFocus={(e) => e.target.select()}
        />
      )}
    </Modal>
  );
}
