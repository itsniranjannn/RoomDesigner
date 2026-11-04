import React, { useState } from 'react';
import {
  Box,
  ChevronDown,
  Home,
  Layers,
  PanelLeft,
  PanelRight,
  Plus,
  Redo2,
  Share2,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { useFlatStore } from '../../store/flatStore.js';
import { Button } from '../common/Button.jsx';
import { ConfirmDialog } from '../common/ConfirmDialog.jsx';
import { EditableTitle } from '../common/EditableTitle.jsx';
import { SaveStatus } from '../common/SaveStatus.jsx';
import { AppHeader } from './SiteHeader.jsx';
import { Popover, MenuItem, MenuLabel, MenuDivider } from '../common/Popover.jsx';
import { IconButton } from '../common/Section.jsx';
import { Segmented } from '../common/Field.jsx';
import { useMediaQuery } from './hooks.js';
import styles from './TopBar.module.css';

const VIEW_OPTIONS = [
  { value: '2d', label: '2D', icon: <Layers size={15} />, ariaLabel: '2D plan' },
  { value: '3d', label: '3D', icon: <Box size={15} />, ariaLabel: '3D view' },
];

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
  const renameRoom = useRoomStore((state) => state.renameRoom);
  const openModal = useRoomStore((state) => state.openModal);
  const flatMode = useFlatStore((state) => state.mode);
  const flatName = useFlatStore((state) => state.flat?.name);
  const backToFlat = useFlatStore((state) => state.backToFlat);
  const inFlat = flatMode === 'room';

  const phone = useMediaQuery('(max-width: 640px)');
  const [dialog, setDialog] = useState(null); // 'delete' | null

  if (!room) return null;

  const goBack = () => (inFlat ? backToFlat() : closeRoom());
  const backLabel = inFlat ? `Back to ${flatName}` : 'Back to all rooms';
  const dims = `${(room.widthCm / 100).toFixed(2)} x ${(room.depthCm / 100).toFixed(2)} m`;
  const saving = saveStatus === 'saving';

  const confirmDelete = async () => {
    setDialog(null);
    await deleteRoom(room.id);
  };

  const roomMenu = (
    <Popover
      role="menu"
      label="Room menu"
      className={styles.roomMenu}
      renderTrigger={(props) => (
        <IconButton label="Room menu" {...props}>
          <ChevronDown size={18} aria-hidden="true" />
        </IconButton>
      )}
    >
      {({ close }) => (
        <>
          <MenuLabel>{dims}</MenuLabel>
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
  );

  return (
    <>
      <AppHeader
        onHome={goBack}
        homeLabel={backLabel}
        start={
          <>
            <EditableTitle value={room.name} onCommit={(name) => renameRoom(room.id, name)} label="Room name" maxLength={40} />
            {roomMenu}
            <SaveStatus saving={saving} />
            <IconButton
              label={catalogOpen ? 'Hide furniture list' : 'Show furniture list'}
              active={catalogOpen}
              quiet
              onClick={onToggleCatalog}
            >
              <PanelLeft size={18} />
            </IconButton>
          </>
        }
        center={
          <>
            {!phone && (
              <div className={styles.history} role="group" aria-label="History">
                <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Undo2 size={18} /></IconButton>
                <IconButton label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}><Redo2 size={18} /></IconButton>
              </div>
            )}
            <Segmented ariaLabel="View" value={viewMode} onChange={setViewMode} options={VIEW_OPTIONS} className={styles.viewSwitch} />
          </>
        }
        end={
          <>
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
                variant="primary"
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
                active={inspectorOpen}
                quiet
                  onClick={onToggleInspector}
              >
                <PanelRight size={18} />
              </IconButton>
            )}
          </>
        }
      />

      {dialog === 'delete' && (
        <ConfirmDialog
          title={`Delete "${room.name}"?`}
          message="The furniture, doors and windows in this room are removed for good. This cannot be undone."
          confirmLabel="Delete room"
          onConfirm={confirmDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
