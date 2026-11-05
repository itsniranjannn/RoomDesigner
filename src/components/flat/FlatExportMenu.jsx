import React, { useState } from 'react';
import { Download, Image as ImageIcon, FileText, Box, Images } from 'lucide-react';
import { useFlatStore } from '../../store/flatStore.js';
import { useFlatUi } from '../../store/flatUiStore.js';
import { Button } from '../common/Button.jsx';
import { canCapture3D } from '../../engine/snapshot3d.js';
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
    const ui = useFlatUi.getState();
    try {
      const st = useFlatStore.getState();
      const x = await import('../../engine/exportPlan.js');
      const names = [];
      if (kind === 'pdf') names.push(await x.exportFlatPlanAsPDF(st.flat, st.rooms, st.levelId));
      if (kind === 'png' || kind === 'both')
        names.push(await x.exportFlatPlanAsPNG(st.flat, st.rooms, st.levelId));
      if (kind === 'png3d' || kind === 'both')
        names.push(await x.exportFlat3DAsPNG(st.flat, st.levelId));
      ui.setNotice(`Saved ${names.join(' and ')}.`);
    } catch (err) {
      ui.setNotice(err.message || 'The picture could not be exported.');
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
      {({ close }) => {
        const has3D = canCapture3D();
        return (
          <>
            <MenuLabel>{level.name}</MenuLabel>
            <MenuItem
              icon={<ImageIcon size={16} aria-hidden="true" />}
              onClick={() => {
                close();
                run('png');
              }}
            >
              Floor plan picture (PNG)
            </MenuItem>
            <MenuItem
              icon={<Box size={16} aria-hidden="true" />}
              disabled={!has3D}
              onClick={() => {
                close();
                run('png3d');
              }}
            >
              {has3D ? '3D picture (PNG)' : '3D picture (open the 3D tab first)'}
            </MenuItem>
            <MenuItem
              icon={<Images size={16} aria-hidden="true" />}
              disabled={!has3D}
              onClick={() => {
                close();
                run('both');
              }}
            >
              Plan and 3D pictures (2 PNGs)
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
        );
      }}
    </Popover>
  );
}
