import React, { useState, useEffect, Suspense } from 'react';
import { useRoomStore } from '../../store/roomStore.js';
import { TopBar } from './TopBar.jsx';
import { NewRoomModal } from './NewRoomModal.jsx';
import { LandingPage } from './LandingPage.jsx';
import { AboutPage } from './AboutPage.jsx';
import { useMediaQuery, usePersistentFlag } from './hooks.js';
import { FurnitureCatalog } from '../catalog/FurnitureCatalog.jsx';
import { RoomCanvas } from '../canvas/RoomCanvas.jsx';
import { SelectedItemPanel } from '../inspector/SelectedItemPanel.jsx';
import { ModalHost } from '../tools/ModalHost.jsx';
import { useFlatStore } from '../../store/flatStore.js';
import { FlatDesigner } from '../flat/FlatDesigner.jsx';
import { NewFlatModal } from '../flat/NewFlatModal.jsx';
import { Modal } from '../common/Modal.jsx';
import { CanvasLoader } from '../common/CanvasLoader.jsx';
import { Button } from '../common/Button.jsx';
import { Tour } from '../onboarding/Tour.jsx';
import { decodeRoomFromHash } from '../../engine/share.js';
import styles from './AppShell.module.css';

// The 3D view is loaded on demand to keep the first screen light
const Room3DView = React.lazy(() =>
  import('../preview3d/Room3DView.jsx').then((m) => ({ default: m.Room3DView }))
);

// Below this width the side panels become drawers over the canvas
const DOCK_QUERY = '(min-width: 1100px)';

export function AppShell() {
  const room = useRoomStore((state) => state.room);
  const viewMode = useRoomStore((state) => state.viewMode);

  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [isNewFlatModalOpen, setIsNewFlatModalOpen] = useState(false);
  const flatMode = useFlatStore((state) => state.mode);
  const [currentPage, setCurrentPage] = useState('main'); // 'main' | 'about'
  const [incoming, setIncoming] = useState(null); // { room } | { error }
  const importRoomData = useRoomStore((state) => state.importRoomData);

  const docked = useMediaQuery(DOCK_QUERY);
  const [catalogDock, setCatalogDock] = usePersistentFlag('rd.catalogOpen', true);
  const [inspectorDock, setInspectorDock] = usePersistentFlag('rd.inspectorOpen', true);
  const [drawer, setDrawer] = useState(null); // 'catalog' | 'inspector' | null (narrow screens only)

  const catalogOpen = docked ? catalogDock : drawer === 'catalog';
  const inspectorOpen = docked ? inspectorDock : drawer === 'inspector';
  const showInspector = viewMode === '2d';

  const toggleCatalog = () =>
    docked ? setCatalogDock((v) => !v) : setDrawer((d) => (d === 'catalog' ? null : 'catalog'));
  const toggleInspector = () =>
    docked
      ? setInspectorDock((v) => !v)
      : setDrawer((d) => (d === 'inspector' ? null : 'inspector'));
  const closeDrawer = () => setDrawer(null);

  // Designing one room of a flat: browser Back and Escape return to the flat plan. The room
  // is saved first (backToFlat flushes it), so no work is lost.
  const inFlatRoom = flatMode === 'room';
  useEffect(() => {
    if (!inFlatRoom) return undefined;
    let popped = false;
    window.history.pushState({ rdFlatRoom: true }, '');
    const goBack = () => useFlatStore.getState().backToFlat();
    const onPop = () => {
      popped = true;
      goBack();
    };
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (useRoomStore.getState().viewMode !== '2d') return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (document.querySelector('[role="dialog"], [role="menu"], [aria-modal="true"]')) return;
      if (useRoomStore.getState().activeModal) return;
      goBack();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      // Left by a button: drop the history entry added on entry
      if (!popped && window.history.state?.rdFlatRoom) window.history.back();
    };
  }, [inFlatRoom]);

  // Escape closes an open drawer
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawer(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  // Open designs shared as a link (#share=...) after confirmation, both when the app loads
  // with the link and when a link is pasted while it is already open
  useEffect(() => {
    let alive = true;
    const openShared = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#share=')) return;
      decodeRoomFromHash(hash)
        .then((shared) => alive && setIncoming({ room: shared }))
        .catch(() => alive && setIncoming({ error: 'This share link is damaged or incomplete.' }));
    };
    openShared();
    window.addEventListener('hashchange', openShared);
    return () => {
      alive = false;
      window.removeEventListener('hashchange', openShared);
    };
  }, []);

  const closeIncoming = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setIncoming(null);
  };

  const acceptIncoming = async () => {
    try {
      await importRoomData(incoming.room);
      closeIncoming();
    } catch {
      setIncoming({ error: 'This design could not be saved on this device.' });
    }
  };

  const shareDialog = incoming && (
    <Modal
      title={incoming.error ? 'Link could not be opened' : 'Open shared design?'}
      subtitle={
        incoming.error ||
        `"${incoming.room.name}" with ${incoming.room.placedFurniture.length} ${incoming.room.placedFurniture.length === 1 ? 'piece' : 'pieces'}`
      }
      onClose={closeIncoming}
      size="sm"
      footer={
        incoming.error ? (
          <Button variant="primary" onClick={closeIncoming}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={closeIncoming}>
              Not now
            </Button>
            <Button variant="primary" onClick={acceptIncoming}>
              Open as new room
            </Button>
          </>
        )
      }
    >
      {!incoming.error && <p>It opens as a new room. Your existing rooms are not changed.</p>}
    </Modal>
  );

  // Global Undo / Redo keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Leave undo to the text box while the user is typing
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

  // Flat designer (multi-room plan)
  if (flatMode === 'flat') {
    return (
      <>
        <FlatDesigner />
        <Tour kind="flat" launcher />
        {shareDialog}
      </>
    );
  }

  // Dedicated full-page About view
  if (currentPage === 'about') {
    return (
      <>
        <AboutPage
          onBack={() => setCurrentPage('main')}
          onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)}
          onOpenNewFlatModal={() => setIsNewFlatModalOpen(true)}
        />
        {isNewFlatModalOpen && <NewFlatModal onClose={() => setIsNewFlatModalOpen(false)} />}
        <NewRoomModal isOpen={isNewRoomModalOpen} onClose={() => setIsNewRoomModalOpen(false)} />
        {shareDialog}
      </>
    );
  }

  if (!room) {
    return (
      <>
        <LandingPage
          onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)}
          onOpenNewFlatModal={() => setIsNewFlatModalOpen(true)}
          onNavigateAbout={() => setCurrentPage('about')}
        />
        {isNewFlatModalOpen && <NewFlatModal onClose={() => setIsNewFlatModalOpen(false)} />}
        <NewRoomModal isOpen={isNewRoomModalOpen} onClose={() => setIsNewRoomModalOpen(false)} />
        <ModalHost />
        {shareDialog}
      </>
    );
  }

  const catalogPanel = (
    <FurnitureCatalog
      onClose={docked ? toggleCatalog : closeDrawer}
      onPlaced={docked ? undefined : closeDrawer}
    />
  );
  const inspectorPanel = <SelectedItemPanel onClose={docked ? toggleInspector : closeDrawer} />;

  return (
    <div className={styles.appContainer}>
      <TopBar
        onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)}
        catalogOpen={catalogOpen}
        inspectorOpen={inspectorOpen}
        onToggleCatalog={toggleCatalog}
        onToggleInspector={toggleInspector}
        showInspectorToggle={showInspector}
      />

      <main className={styles.workspace}>
        {docked && (
          <div
            className={`${styles.dock} ${styles.dockLeft} ${catalogOpen ? '' : styles.dockClosed}`}
            data-tour="catalog"
            inert={!catalogOpen}
          >
            <div className={styles.dockInner}>{catalogPanel}</div>
          </div>
        )}

        <div className={styles.canvasWrapper}>
          {viewMode === '2d' ? (
            <RoomCanvas />
          ) : (
            <Suspense fallback={<CanvasLoader label="Loading 3D view" />}>
              <Room3DView />
            </Suspense>
          )}
        </div>

        {docked && (
          <div
            className={`${styles.dock} ${styles.dockRight} ${showInspector && inspectorOpen ? '' : styles.dockClosed}`}
            data-tour="inspector"
            inert={!(showInspector && inspectorOpen)}
          >
            <div className={styles.dockInner}>{inspectorPanel}</div>
          </div>
        )}

        {!docked && drawer && (
          <>
            <div className={styles.scrim} onClick={closeDrawer} aria-hidden="true" />
            {drawer === 'catalog' && (
              <div className={`${styles.drawer} ${styles.drawerLeft}`}>{catalogPanel}</div>
            )}
            {drawer === 'inspector' && showInspector && (
              <div className={`${styles.drawer} ${styles.drawerRight}`}>{inspectorPanel}</div>
            )}
          </>
        )}
      </main>

      <NewRoomModal isOpen={isNewRoomModalOpen} onClose={() => setIsNewRoomModalOpen(false)} />
      <ModalHost />
      <Tour kind="room" />
      {shareDialog}
    </div>
  );
}
