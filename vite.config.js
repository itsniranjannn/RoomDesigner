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
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          lucide: ['lucide-react'],
        },
      },
    },
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
