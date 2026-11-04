import React from 'react';
import { Copy, CopyPlus, Trash2 } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore.js';
import { Button } from '../common/Button.jsx';
import { InspectorShell } from './InspectorShell.jsx';
import styles from './Inspector.module.css';

export function GroupPanel({ count, onClose }) {
  const deselectItem = useRoomStore((state) => state.deselectItem);
  const copySelection = useRoomStore((state) => state.copySelection);
  const duplicateSelection = useRoomStore((state) => state.duplicateSelection);
  const removeSelection = useRoomStore((state) => state.removeSelection);

  return (
    <InspectorShell
      label="Selected pieces"
      title={`${count} pieces selected`}
      subtitle="Drag any selected piece to move them all. Arrow keys nudge the group."
      onClose={onClose}
      onBack={deselectItem}
      backLabel="Room overview"
      footer={
        <Button variant="danger" icon={<Trash2 size={16} />} onClick={removeSelection}>
          Delete {count} pieces
        </Button>
      }
    >
      <div className={styles.groupActions}>
        <Button variant="secondary" icon={<Copy size={16} />} onClick={copySelection}>
          Copy
        </Button>
        <Button variant="secondary" icon={<CopyPlus size={16} />} onClick={duplicateSelection}>
          Duplicate
        </Button>
      </div>
      <p className={styles.note}>
        Ctrl+C copies and Ctrl+V pastes. Hold Shift and click to add or remove a piece.
      </p>
    </InspectorShell>
  );
}
