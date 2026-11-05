import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/space-grotesk';
import App from './App.jsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { useRoomStore } from './store/roomStore.js';
import { installGlobalErrorHandlers } from './utils/errorLog.js';

// Keep a small local log of uncaught errors for bug reports (nothing leaves the device)
installGlobalErrorHandlers();

// Handy for poking at state from the browser console during development only
if (import.meta.env.DEV) {
  window.useRoomStore = useRoomStore;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Offline support: only in production builds so dev hot-reload is never cached
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is optional */
    });
  });
}
