import React from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { Box, Layers, Plus, Undo2, Redo2 } from 'lucide-react';
import styles from './TopBar.module.css';

export function TopBar({ onOpenNewRoomModal }) {
  const room = useRoomStore((state) => state.room);
  const allRooms = useRoomStore((state) => state.allRooms);
  const switchRoom = useRoomStore((state) => state.switchRoom);
  const viewMode = useRoomStore((state) => state.viewMode);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const saveStatus = useRoomStore((state) => state.saveStatus);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const canUndo = useRoomStore((state) => state.canUndo);
  const canRedo = useRoomStore((state) => state.canRedo);

  if (!room) return null;

  const widthMeters = (room.widthCm / 100).toFixed(2);
  const depthMeters = (room.depthCm / 100).toFixed(2);

  return (
    <header className={styles.topBar}>
      <div className={styles.leftSection}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true" />
        </div>

        <div className={styles.roomInfo}>
          {allRooms.length > 1 ? (
            <select
              className={styles.roomSelect}
              value={room.id}
              onChange={(e) => switchRoom(e.target.value)}
              aria-label="Select room"
            >
              {allRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : (
            <span className={styles.roomTitle}>{room.name}</span>
          )}

          <span className={styles.roomDimensions}>
            {widthMeters}m × {depthMeters}m
          </span>
        </div>

        <div className={styles.saveIndicator} aria-live="polite">
          <span
            className={`${styles.statusDot} ${saveStatus === 'saving' ? styles.statusSaving : ''}`}
            aria-hidden="true"
          />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
        </div>
      </div>

      <div className={styles.centerSection}>
        {/* Undo / Redo Action Stack */}
        <div className={styles.historyGroup} role="toolbar" aria-label="History actions">
          <button
            type="button"
            className={styles.historyBtn}
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last action"
          >
            <Undo2 size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.historyBtn}
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
            aria-label="Redo last action"
          >
            <Redo2 size={13} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.viewToggle} role="radiogroup" aria-label="View Mode">
          <button
            type="button"
            className={`${styles.toggleOption} ${viewMode === '2d' ? styles.toggleOptionActive : ''}`}
            onClick={() => setViewMode('2d')}
            role="radio"
            aria-checked={viewMode === '2d'}
          >
            <Layers size={13} aria-hidden="true" />
            <span>2D Drafting</span>
          </button>
          <button
            type="button"
            className={`${styles.toggleOption} ${viewMode === '3d' ? styles.toggleOptionActive : ''}`}
            onClick={() => setViewMode('3d')}
            role="radio"
            aria-checked={viewMode === '3d'}
          >
            <Box size={13} aria-hidden="true" />
            <span>3D Studio</span>
          </button>
        </div>
      </div>

      <div className={styles.rightSection}>
        <Button
          variant="secondary"
          size="small"
          onClick={onOpenNewRoomModal}
          icon={<Plus size={13} />}
        >
          New room
        </Button>
      </div>
    </header>
  );
}

