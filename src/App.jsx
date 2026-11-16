import React, { useEffect } from 'react';
import { useRoomStore } from './store/roomStore.js';
import { useFlatStore } from './store/flatStore.js';
import { AppShell } from './components/layout/AppShell.jsx';
import './design/global.css';

export default function App() {
  const initStore = useRoomStore((state) => state.initStore);

  const loadFlats = useFlatStore((state) => state.loadFlats);
  const restoreOpenFlat = useFlatStore((state) => state.restoreOpenFlat);

  useEffect(() => {
    initStore();
    loadFlats();
    // A flat being designed reopens on the next visit, the way the open room does
    restoreOpenFlat();
  }, [initStore, loadFlats, restoreOpenFlat]);

  return <AppShell />;
}
