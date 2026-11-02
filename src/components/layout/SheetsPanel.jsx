import React, { useEffect, useRef, useState } from 'react';
import { Building2, DoorClosed, Plus, Trash2, X } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { useFlatStore } from '../../store/flatStore.js';
import { Button } from '../common/Button.jsx';
import { ConfirmDialog } from '../common/ConfirmDialog.jsx';
import { IconButton } from '../common/Section.jsx';
import styles from './SheetsPanel.module.css';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Slide-in list of saved rooms and flats ("My designs"). */
export function SheetsPanel({ isOpen, onClose, onOpenNewRoomModal, onOpenNewFlatModal }) {
  const allRooms = useRoomStore((state) => state.allRooms);
  const switchRoom = useRoomStore((state) => state.switchRoom);
  const flats = useFlatStore((state) => state.flats);
  const openFlat = useFlatStore((state) => state.openFlat);
  const deleteFlat = useFlatStore((state) => state.deleteFlat);
  const panelRef = useRef(null);
  const [pendingFlat, setPendingFlat] = useState(null);

  // Escape closes the panel; focus moves in on open and back to the trigger on close
  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    panelRef.current?.querySelector('button')?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const total = allRooms.length + flats.length;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        ref={panelRef}
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="My designs"
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>My designs</h2>
            <p className={styles.subtitle}>{total === 0 ? 'Nothing saved yet' : `${plural(allRooms.length, 'room')}, ${plural(flats.length, 'flat')}`}</p>
          </div>
          <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
        </header>

        <div className={styles.list}>
          {flats.map((f) => (
            <div key={f.id} className={styles.row}>
              <button
                type="button"
                className={styles.open}
                onClick={() => {
                  openFlat(f.id);
                  onClose();
                }}
              >
                <span className={styles.icon}><Building2 size={18} aria-hidden="true" /></span>
                <span className={styles.text}>
                  <span className={styles.name}>{f.name}</span>
                  <span className={styles.meta}>
                    Flat, {plural(f.levels.length, 'floor')}, {plural(f.spaces.length, 'space')}
                    {f.stairs.length > 0 && `, ${plural(f.stairs.length, 'staircase')}`}
                  </span>
                </span>
              </button>
              <IconButton label={`Delete flat ${f.name}`} danger onClick={() => setPendingFlat(f)}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          ))}

          {allRooms.map((r) => {
            const count = (r.placedFurniture || []).length;
            return (
              <div key={r.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.open}
                  onClick={() => {
                    switchRoom(r.id);
                    onClose();
                  }}
                >
                  <span className={styles.icon}><DoorClosed size={18} aria-hidden="true" /></span>
                  <span className={styles.text}>
                    <span className={styles.name}>{r.name}</span>
                    <span className={styles.meta}>
                      {(r.widthCm / 100).toFixed(2)} x {(r.depthCm / 100).toFixed(2)} m, {plural(count, 'piece')}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}

          {total === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No designs yet</p>
              <p className={styles.emptyText}>Start a room or a flat and it will be saved here automatically.</p>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              onOpenNewRoomModal();
              onClose();
            }}
          >
            New room
          </Button>
          <Button
            variant="secondary"
            icon={<Building2 size={16} />}
            onClick={() => {
              onOpenNewFlatModal?.();
              onClose();
            }}
          >
            Design a flat
          </Button>
        </footer>
      </aside>

      {pendingFlat && (
        <ConfirmDialog
          title={`Delete "${pendingFlat.name}"?`}
          message="The flat and all of its rooms are removed for good. This cannot be undone."
          confirmLabel="Delete flat"
          onClose={() => setPendingFlat(null)}
          onConfirm={() => {
            deleteFlat(pendingFlat.id);
            setPendingFlat(null);
          }}
        />
      )}
    </div>
  );
}
