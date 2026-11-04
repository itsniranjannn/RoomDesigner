import React, { useState } from 'react';
import { Download, Image as ImageIcon, FileText } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import { Button } from '../common/Button.jsx';
import { Popover, MenuItem, MenuLabel } from '../common/Popover.jsx';
import styles from './FlatDesigner.module.css';

/** Header menu that downloads the active floor as a PNG picture or a PDF plan. */
export function FlatExportMenu() {
  const flat = useFlatStore((s) => s.flat);
  const levelId = useFlatStore((s) => s.levelId);
  const [busy, setBusy] = useState(false);
  if (!flat) return null;
  const level = flat.levels.find((l) => l.id === levelId) || flat.levels[0];

  const run = async (kind) => {
    setBusy(true);
    try {
      const st = useFlatStore.getState();
      const { exportFlatPlanAsPNG, exportFlatPlanAsPDF } =
        await import('../../engine/exportPlan.js');
      const fn = kind === 'pdf' ? exportFlatPlanAsPDF : exportFlatPlanAsPNG;
      await fn(st.flat, st.rooms, st.levelId);
    } catch (err) {
      useFlatUi.getState().setNotice(err.message || 'The plan could not be exported.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover
      role="menu"
      align="end"
      label="Export this floor"
      renderTrigger={(props) => (
        <Button
          variant="secondary"
          icon={<Download size={16} aria-hidden="true" />}
          aria-label="Export this floor"
          title="Export this floor as a picture or a printable plan"
          disabled={busy}
          className={styles.exportButton}
          {...props}
        >
          <span className={styles.exportText}>{busy ? 'Preparing…' : 'Export'}</span>
        </Button>
      )}
    >
      {({ close }) => (
        <>
          <MenuLabel>{level.name}</MenuLabel>
          <MenuItem
            icon={<ImageIcon size={16} aria-hidden="true" />}
            onClick={() => {
              close();
              run('png');
            }}
          >
            Picture (PNG)
          </MenuItem>
          <MenuItem
            icon={<FileText size={16} aria-hidden="true" />}
            onClick={() => {
              close();
              run('pdf');
            }}
          >
            Printable plan (PDF)
          </MenuItem>
        </>
      )}
    </Popover>
  );
}
