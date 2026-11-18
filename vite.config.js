import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Writes dist/asset-manifest.json: every file the build makes. The service worker reads it when it
 * installs, so the parts that load only when they are needed (3D, the photo dialog, printable
 * plans) are stored for offline use before anyone opens them.
 */
function assetManifest() {
  return {
    name: 'asset-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((name) => name !== 'asset-manifest.json')
        .map((name) => `./${name}`)
        .sort();
      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify(files),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), assetManifest()],
  build: {
    // No manualChunks: Rollup splits at the dynamic-import boundaries the app already has, so
    // three.js travels with the 3D views instead of the first page. Naming a chunk for three
    // also pulls in everything those packages import -- react, react-dom, zustand -- which puts
    // the whole 1.1 MB bundle on the critical path for the landing page.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    globals: true,
    // Playwright specs live in e2e/ and run with `npm run e2e`
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    environment: 'node',
    testTimeout: 30000,
  },
});
