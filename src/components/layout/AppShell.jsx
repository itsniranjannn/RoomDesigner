import React, { useState, useEffect, Suspense } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { TopBar } from './TopBar.jsx';
import { NewRoomModal } from './NewRoomModal.jsx';
import { LandingPage } from './LandingPage.jsx';
import { AboutPage } from './AboutPage.jsx';
import { FurnitureCatalog } from '../catalog/FurnitureCatalog.jsx';
import { RoomCanvas } from '../canvas/RoomCanvas.jsx';
import { SelectedItemPanel } from '../inspector/SelectedItemPanel.jsx';
import { ModalHost } from '../tools/ModalHost.jsx';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { decodeRoomFromHash } from '../../engine/share.js';
import styles from './AppShell.module.css';

// Dynamically lazy-load 3D Studio to keep initial 2D drafting bundle ultralight
const Room3DView = React.lazy(() =>
  import('../preview3d/Room3DView.jsx').then((m) => ({ default: m.Room3DView }))
);

export function AppShell() {
  const room = useRoomStore((state) => state.room);
  const viewMode = useRoomStore((state) => state.viewMode);
  const selectedItemId = useRoomStore((state) => state.selectedItemId);

  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); // 'main' | 'about'
  const [incoming, setIncoming] = useState(null); // { room } | { error }
  const importRoomData = useRoomStore((state) => state.importRoomData);

  // Open designs shared as a link (#share=...) after confirmation
  useEffect(() => {
    if (!window.location.hash.startsWith('#share=')) return;
    decodeRoomFromHash(window.location.hash)
      .then((shared) => setIncoming({ room: shared }))
      .catch(() => setIncoming({ error: 'This share link is damaged or incomplete.' }));
  }, []);

  const closeIncoming = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setIncoming(null);
  };

  const acceptIncoming = async () => {
    await importRoomData(incoming.room);
    closeIncoming();
  };

  const shareDialog = incoming && (
    <Modal
      title={incoming.error ? 'Link could not be opened' : 'Open shared design?'}
      subtitle={incoming.error || `"${incoming.room.name}" · ${incoming.room.placedFurniture.length} pieces`}
      onClose={closeIncoming}
      width={440}
      footer={
        incoming.error ? (
          <Button variant="primary" size="small" onClick={closeIncoming}>Close</Button>
        ) : (
          <>
            <Button variant="ghost" size="small" onClick={closeIncoming}>Not now</Button>
            <Button variant="primary" size="small" onClick={acceptIncoming}>Open as new sheet</Button>
          </>
        )
      }
    >
      {!incoming.error && (
        <p style={{ margin: 0 }}>It opens as a new sheet. Your existing rooms are not changed.</p>
      )}
    </Modal>
  );

  // Global Undo / Redo keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Do not trigger undo/redo if user is editing text inputs, textareas, or dropdowns
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useRoomStore.getState().redo();
        } else {
          useRoomStore.getState().undo();
        }
      } else if (key === 'y') {
        e.preventDefault();
        useRoomStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Dedicated full-page About View
  if (currentPage === 'about') {
    return (
      <>
        <AboutPage
          onBack={() => setCurrentPage('main')}
          onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)}
        />
        <NewRoomModal
          isOpen={isNewRoomModalOpen}
          onClose={() => setIsNewRoomModalOpen(false)}
        />
        {shareDialog}
      </>
    );
  }

  if (!room) {
    return (
      <>
        <LandingPage
          onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)}
          onNavigateAbout={() => setCurrentPage('about')}
        />
        <NewRoomModal
          isOpen={isNewRoomModalOpen}
          onClose={() => setIsNewRoomModalOpen(false)}
        />
        <ModalHost />
        {shareDialog}
      </>
    );
  }

  return (
    <div className={styles.appContainer}>
      <TopBar onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)} />

      <main className={styles.workspace}>
        {/* Left rail: Furniture Catalog */}
        <FurnitureCatalog />

        {/* Center: Room Canvas (2D Drafting or 3D Studio) */}
        <div className={styles.canvasWrapper}>
          {viewMode === '2d' ? (
            <RoomCanvas />
          ) : (
            <Suspense
              fallback={
                <div className={styles.loadingScreen}>
                  <div className={styles.loadingLogo} aria-hidden="true" />
                  <span className={styles.loadingText}>Loading 3D Studio...</span>
                </div>
              }
            >
              <Room3DView />
            </Suspense>
          )}
        </div>

        {/* Right contextual panel: Selected Item / Room Inspector (2D mode only) */}
        {viewMode === '2d' && <SelectedItemPanel />}
      </main>

      <NewRoomModal
        isOpen={isNewRoomModalOpen}
        onClose={() => setIsNewRoomModalOpen(false)}
      />
      <ModalHost />
      {shareDialog}
    </div>
  );
}
