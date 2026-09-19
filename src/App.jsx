import React, { useEffect } from 'react';
import { useRoomStore } from './store/roomStore.js';
import { AppShell } from './components/layout/AppShell.jsx';
import './design/global.css';

export default function App() {
  const initStore = useRoomStore((state) => state.initStore);

  useEffect(() => {
    initStore();
  }, [initStore]);

  return <AppShell />;
}

