import React, { useState, useEffect, Suspense } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { TopBar } from './TopBar.jsx';
import { NewRoomModal } from './NewRoomModal.jsx';
import { LandingPage } from './LandingPage.jsx';
import { FurnitureCatalog } from '../catalog/FurnitureCatalog.jsx';
import { RoomCanvas } from '../canvas/RoomCanvas.jsx';
import { SelectedItemPanel } from '../inspector/SelectedItemPanel.jsx';
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

  if (!room) {
    return (
      <>
        <LandingPage onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)} />
        <NewRoomModal
          isOpen={isNewRoomModalOpen}
          onClose={() => setIsNewRoomModalOpen(false)}
        />
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
    </div>
  );
}
