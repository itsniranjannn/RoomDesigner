import React, { useEffect, useRef } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { Plus, X } from 'lucide-react';
import styles from './SheetsPanel.module.css';

export function SheetsPanel({ isOpen, onClose, onOpenNewRoomModal }) {
  const allRooms = useRoomStore((state) => state.allRooms);
  const switchRoom = useRoomStore((state) => state.switchRoom);
  const panelRef = useRef(null);

  // Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        ref={panelRef}
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Saved Sheets"
      >
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderLeft}>
            <h2 className={styles.panelTitle}>Saved Sheets</h2>
            <span className={styles.panelCount}>
              {allRooms.length} {allRooms.length === 1 ? 'SHEET' : 'SHEETS'}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close sheets panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.brassRule} />

        <div className={styles.sheetsList}>
          {allRooms.length > 0 ? (
            allRooms.map((r, index) => {
              const widthM = (r.widthCm / 100).toFixed(2);
              const depthM = (r.depthCm / 100).toFixed(2);
              const furnitureCount = (r.placedFurniture || []).length;
              const sheetCode = `SHEET // #0${index + 1}`;

              return (
                <button
                  key={r.id}
                  type="button"
                  className={styles.sheetRow}
                  onClick={() => {
                    switchRoom(r.id);
                    onClose();
                  }}
                >
                  <span className={styles.sheetCode}>{sheetCode}</span>
                  <span className={styles.sheetName}>{r.name}</span>
                  <div className={styles.sheetMeta}>
                    <span className={styles.sheetDims}>
                      {widthM} × {depthM}m
                    </span>
                    <span className={styles.sheetSpecBadge}>
                      {furnitureCount} {furnitureCount === 1 ? 'SPEC' : 'SPECS'}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className={styles.sheetsEmpty}>
              <span className={styles.sheetsEmptyText}>
                No sheets in folio
              </span>
            </div>
          )}
        </div>

        <div className={styles.panelFooter}>
          <Button
            variant="primary"
            size="normal"
            icon={<Plus size={14} />}
            onClick={() => {
              onOpenNewRoomModal();
              onClose();
            }}
            className={styles.newRoomBtn}
          >
            Start a new room
          </Button>
        </div>
      </aside>
    </div>
  );
}
