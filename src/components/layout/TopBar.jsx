import React, { useState } from 'react';
import {
  Box,
  ChevronDown,
  Home,
  Layers,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  Redo2,
  Share2,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { useFlatStore } from '../../store/flatStore.js';
import { Button } from '../common/Button.jsx';
import { BrandMark } from '../common/BrandMark.jsx';
import { ConfirmDialog } from '../common/ConfirmDialog.jsx';
import { Modal } from '../common/Modal.jsx';
import { Popover, MenuItem, MenuLabel, MenuDivider } from '../common/Popover.jsx';
import { IconButton } from '../common/Section.jsx';
import { Segmented, TextField } from '../common/Field.jsx';
import { useMediaQuery } from './hooks.js';
import styles from './TopBar.module.css';

const VIEW_OPTIONS = [
  { value: '2d', label: '2D', icon: <Layers size={15} />, ariaLabel: '2D plan' },
  { value: '3d', label: '3D', icon: <Box size={15} />, ariaLabel: '3D view' },
];

function RenameDialog({ room, onClose }) {
  const renameRoom = useRoomStore((state) => state.renameRoom);
  const [name, setName] = useState(room.name);
  const trimmed = name.trim();

  const save = async (e) => {
    e?.preventDefault();
    if (!trimmed) return;
    await renameRoom(room.id, trimmed);
    onClose();
  };

  return (
    <Modal
      title="Rename room"
      onClose={onClose}
      width={420}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="rename-room-form" disabled={!trimmed}>Save name</Button>
        </>
      }
    >
      <form id="rename-room-form" onSubmit={save}>
        <TextField
          label="Room name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          error={trimmed ? undefined : 'Enter a name for the room.'}
        />
      </form>
    </Modal>
  );
}

export function TopBar({ onOpenNewRoomModal, catalogOpen, inspectorOpen, onToggleCatalog, onToggleInspector, showInspectorToggle }) {
  const room = useRoomStore((state) => state.room);
  const allRooms = useRoomStore((state) => state.allRooms);
  const switchRoom = useRoomStore((state) => state.switchRoom);
  const deleteRoom = useRoomStore((state) => state.deleteRoom);
  const viewMode = useRoomStore((state) => state.viewMode);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const saveStatus = useRoomStore((state) => state.saveStatus);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const canUndo = useRoomStore((state) => state.canUndo);
  const canRedo = useRoomStore((state) => state.canRedo);
  const closeRoom = useRoomStore((state) => state.closeRoom);
  const openModal = useRoomStore((state) => state.openModal);
  const flatMode = useFlatStore((state) => state.mode);
  const flatName = useFlatStore((state) => state.flat?.name);
  const backToFlat = useFlatStore((state) => state.backToFlat);
  const inFlat = flatMode === 'room';

  const phone = useMediaQuery('(max-width: 560px)');
  const [dialog, setDialog] = useState(null); // 'rename' | 'delete' | null

  if (!room) return null;

  const goBack = () => (inFlat ? backToFlat() : closeRoom());
  const backLabel = inFlat ? `Back to ${flatName}` : 'Back to all rooms';
  const dims = `${(room.widthCm / 100).toFixed(2)} x ${(room.depthCm / 100).toFixed(2)} m`;
  const saving = saveStatus === 'saving';

  const confirmDelete = async () => {
    setDialog(null);
    await deleteRoom(room.id);
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.left}>
        <IconButton
          label={catalogOpen ? 'Hide furniture list' : 'Show furniture list'}
          aria-pressed={catalogOpen}
          className={`${styles.panelToggle} ${catalogOpen ? styles.panelToggleOn : ''}`}
          onClick={onToggleCatalog}
        >
          <PanelLeft size={18} />
        </IconButton>

        {!phone && (
          <button type="button" className={styles.logo} onClick={goBack} aria-label={backLabel} title={backLabel}>
            <BrandMark size={28} />
            <span className={styles.wordmark}>Room Designer</span>
          </button>
        )}

        <Popover
          role="menu"
          label="Room menu"
          className={styles.roomMenu}
          renderTrigger={(props) => (
            <button type="button" className={styles.roomButton} aria-label={`Room menu for ${room.name}`} {...props}>
              <span className={styles.roomName}>{room.name}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <MenuLabel>{dims}</MenuLabel>
              <MenuItem icon={<Pencil size={16} />} onClick={() => { close(); setDialog('rename'); }}>Rename room</MenuItem>
              <MenuItem icon={<Trash2 size={16} />} danger onClick={() => { close(); setDialog('delete'); }}>Delete room</MenuItem>
              {phone && (
                <>
                  <MenuDivider />
                  <MenuItem icon={<Home size={16} />} onClick={() => { close(); goBack(); }}>{backLabel}</MenuItem>
                  <MenuItem icon={<Plus size={16} />} onClick={() => { close(); onOpenNewRoomModal(); }}>New room</MenuItem>
                </>
              )}
              {!inFlat && allRooms.length > 1 && (
                <>
                  <MenuDivider />
                  <MenuLabel>Switch room</MenuLabel>
                  {allRooms.map((r) => (
                    <MenuItem
                      key={r.id}
                      active={r.id === room.id}
                      onClick={() => {
                        close();
                        if (r.id !== room.id) switchRoom(r.id);
                      }}
                    >
                      {r.name}
                    </MenuItem>
                  ))}
                </>
              )}
            </>
          )}
        </Popover>

        <span className={styles.save} role="status" title={saving ? 'Saving your changes' : 'All changes saved'}>
          <span className={`${styles.saveDot} ${saving ? styles.saveDotBusy : ''}`} aria-hidden="true" />
          <span className={styles.saveText}>{saving ? 'Saving' : 'Saved'}</span>
        </span>
      </div>

      <div className={styles.center}>
        {!phone && (
          <div className={styles.history} role="group" aria-label="History">
            <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Undo2 size={18} /></IconButton>
            <IconButton label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}><Redo2 size={18} /></IconButton>
          </div>
        )}
        <Segmented
          ariaLabel="View"
          value={viewMode}
          onChange={setViewMode}
          options={VIEW_OPTIONS}
          className={styles.viewSwitch}
        />
      </div>

      <div className={styles.right}>
        <Button
          variant="secondary"
          icon={<Share2 size={16} />}
          onClick={() => openModal('share')}
          aria-label="Share and export"
          title="Share and export"
          className={styles.action}
        >
          <span className={styles.actionText}>Share &amp; export</span>
        </Button>
        {!phone && (
          <Button
            variant="secondary"
            icon={<Plus size={16} />}
            onClick={onOpenNewRoomModal}
            aria-label="New room"
            title="New room"
            className={styles.action}
          >
            <span className={styles.actionText}>New room</span>
          </Button>
        )}
        {showInspectorToggle && (
          <IconButton
            label={inspectorOpen ? 'Hide details panel' : 'Show details panel'}
            aria-pressed={inspectorOpen}
            className={`${styles.panelToggle} ${inspectorOpen ? styles.panelToggleOn : ''}`}
            onClick={onToggleInspector}
          >
            <PanelRight size={18} />
          </IconButton>
        )}
      </div>

      {dialog === 'rename' && <RenameDialog room={room} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && (
        <ConfirmDialog
          title={`Delete "${room.name}"?`}
          message="The furniture, doors and windows in this room are removed for good. This cannot be undone."
          confirmLabel="Delete room"
          onConfirm={confirmDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </header>
  );
}
