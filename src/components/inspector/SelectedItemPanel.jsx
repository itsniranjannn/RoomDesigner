import React from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { resolveItemDef } from '../../data/furnitureCatalog.js';
import { GroupPanel } from './GroupPanel.jsx';
import { PiecePanel } from './PiecePanel.jsx';
import { RoomPanel } from './RoomPanel.jsx';

/** Right-hand panel: shows the room, one selected piece, or a group of pieces. */
export function SelectedItemPanel({ onClose }) {
  const room = useRoomStore((state) => state.room);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);
  const selectedItemIds = useRoomStore((state) => state.selectedItemIds);

  if (!room) return null;

  if (selectedItemIds.length > 1) {
    return <GroupPanel count={selectedItemIds.length} onClose={onClose} />;
  }

  const item = (room.placedFurniture || []).find((i) => i.id === selectedItemId);
  const def = item ? resolveItemDef(item) : null;
  if (item && def) {
    return <PiecePanel key={item.id} item={item} def={def} onClose={onClose} />;
  }

  return <RoomPanel onClose={onClose} />;
}
