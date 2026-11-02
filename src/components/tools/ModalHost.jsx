import React, { Suspense } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { ShortcutsModal } from './ShortcutsModal.jsx';
import { CostModal } from './CostModal.jsx';
import { LayoutModal } from './LayoutModal.jsx';
import { ShareModal } from './ShareModal.jsx';

const PhotoModelModal = React.lazy(() =>
  import('./PhotoModelModal.jsx').then((m) => ({ default: m.PhotoModelModal }))
);

/** Renders whichever tool dialog is open (state lives in the room store). */
export function ModalHost() {
  const activeModal = useRoomStore((state) => state.activeModal);
  const closeModal = useRoomStore((state) => state.closeModal);
  const room = useRoomStore((state) => state.room);

  if (!activeModal) return null;
  if (activeModal === 'shortcuts') return <ShortcutsModal onClose={closeModal} />;
  if (activeModal === 'photo') {
    return (
      <Suspense fallback={null}>
        <PhotoModelModal onClose={closeModal} />
      </Suspense>
    );
  }
  if (!room) return null;
  if (activeModal === 'cost') return <CostModal onClose={closeModal} />;
  if (activeModal === 'layout') return <LayoutModal onClose={closeModal} />;
  if (activeModal === 'share') return <ShareModal onClose={closeModal} />;
  return null;
}
