import React, { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import {
  Box,
  Layers,
  Plus,
  Undo2,
  Redo2,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  Download,
} from 'lucide-react';
import { exportRoomPlanAsPNG } from '../../engine/exportPlan.js';
import { BrandMark } from '../common/BrandMark.jsx';
import { ArchitecturalSelect } from '../common/ArchitecturalSelect.jsx';
import styles from './TopBar.module.css';

export function TopBar({ onOpenNewRoomModal }) {
  const room = useRoomStore((state) => state.room);
  const allRooms = useRoomStore((state) => state.allRooms);
  const switchRoom = useRoomStore((state) => state.switchRoom);
  const renameRoom = useRoomStore((state) => state.renameRoom);
  const deleteRoom = useRoomStore((state) => state.deleteRoom);
  const viewMode = useRoomStore((state) => state.viewMode);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const saveStatus = useRoomStore((state) => state.saveStatus);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const canUndo = useRoomStore((state) => state.canUndo);
  const canRedo = useRoomStore((state) => state.canRedo);
  const closeRoom = useRoomStore((state) => state.closeRoom);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (room) {
      setRenameValue(room.name);
    }
  }, [room?.name]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Click outside to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleStartRename = () => {
    setIsMenuOpen(false);
    setIsRenaming(true);
    setRenameValue(room?.name || '');
  };

  const handleConfirmRename = async (e) => {
    if (e) e.preventDefault();
    const trimmed = renameValue.trim();
    if (trimmed && room) {
      await renameRoom(room.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setRenameValue(room?.name || '');
    setIsRenaming(false);
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    setIsDeleting(false);
    setIsMenuOpen(false);
    await deleteRoom(room.id);
  };

  const handleExportPlan = async () => {
    if (!room || isExporting) return;
    setIsExporting(true);
    try {
      await exportRoomPlanAsPNG(room);
    } finally {
      setIsExporting(false);
    }
  };

  if (!room) return null;

  const widthMeters = (room.widthCm / 100).toFixed(2);
  const depthMeters = (room.depthCm / 100).toFixed(2);

  return (
    <header className={styles.topBar}>
      <div className={styles.leftSection}>
        <button
          type="button"
          className={styles.studioBtn}
          onClick={() => closeRoom()}
          title="Return to Studio Overview"
          aria-label="Return to Studio Overview"
        >
          <BrandMark size={28} className={styles.brandMarkIcon} />
          <div className={styles.mastheadLockup}>
            <span className={styles.studioBrandText}>ROOM STUDIO</span>
            <span className={styles.studioSubTag}>CAD // 3D DRAFTING</span>
          </div>
        </button>

        <div className={styles.roomInfo} ref={menuRef}>
          {isRenaming ? (
            <form className={styles.renameForm} onSubmit={handleConfirmRename}>
              <input
                ref={renameInputRef}
                type="text"
                className={styles.renameInput}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancelRename();
                }}
                maxLength={40}
                aria-label="Room name"
              />
              <button
                type="submit"
                className={styles.renameBtn}
                title="Save name (Enter)"
                aria-label="Save room name"
              >
                <Check size={13} color="var(--color-pine)" />
              </button>
              <button
                type="button"
                className={styles.renameBtn}
                onClick={handleCancelRename}
                title="Cancel (Esc)"
                aria-label="Cancel rename"
              >
                <X size={13} color="var(--color-clay)" />
              </button>
            </form>
          ) : (
            <>
              {allRooms.length > 1 ? (
                <ArchitecturalSelect
                  value={room.id}
                  onChange={(val) => switchRoom(val)}
                  options={allRooms.map((r) => ({ value: r.id, label: r.name }))}
                  ariaLabel="Select active room sheet"
                  className={styles.roomSelectWrapper}
                />
              ) : (
                <span className={styles.roomTitle}>{room.name}</span>
              )}

              {/* Room Actions Menu Button (•••) */}
              <button
                type="button"
                className={styles.roomMenuTrigger}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Room options"
                aria-expanded={isMenuOpen}
                title="Room options (Rename, Delete)"
              >
                <MoreVertical size={14} />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className={styles.roomDropdownMenu} role="menu">
                  <button
                    type="button"
                    className={styles.roomMenuItem}
                    onClick={handleStartRename}
                    role="menuitem"
                  >
                    <Edit2 size={12} />
                    <span>Rename room</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.roomMenuItem} ${styles.roomMenuItemDanger}`}
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsDeleting(true);
                    }}
                    role="menuitem"
                  >
                    <Trash2 size={12} />
                    <span>Delete room</span>
                  </button>
                </div>
              )}
            </>
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
          onClick={handleExportPlan}
          icon={<Download size={13} />}
          disabled={isExporting}
          title="Export architectural 2D floor plan as high-resolution PNG"
        >
          {isExporting ? 'Exporting...' : 'Export plan'}
        </Button>

        <Button
          variant="secondary"
          size="small"
          onClick={onOpenNewRoomModal}
          icon={<Plus size={13} />}
        >
          New room
        </Button>
      </div>

      {/* Delete Room Confirmation Modal */}
      {isDeleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 26, 23, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-linen)',
              border: '1px solid var(--color-taupe)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              maxWidth: '380px',
              width: '90%',
              boxShadow: 'var(--shadow-lift)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3
              id="delete-dialog-title"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '18px',
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              Delete '{room.name}'?
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                color: 'var(--color-ink-muted)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              All furniture, door, and window arrangements in this room will be permanently removed.
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setIsDeleting(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={handleDeleteRoom}
              >
                Delete room
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


