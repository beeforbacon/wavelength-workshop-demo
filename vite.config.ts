import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Wavelength requires cross-origin isolation (COOP/COEP/CORP) for its
// SharedArrayBuffer + OPFS-backed WASM runtime. Without these exact headers
// the wallet daemon cannot start. See:
// https://wavelength.lightning.engineering/web/get-started/cross-origin-isolation/
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: crossOriginIsolation, port: 5175 },
  preview: { headers: crossOriginIsolation },
  // @lightninglabs/wavelength-web spawns its worker via
  // `new Worker(new URL('../wavewalletdk-worker.js', import.meta.url))`.
  // If Vite's esbuild dependency pre-bundler flattens this package into
  // node_modules/.vite/deps/, import.meta.url no longer points at the
  // real package directory and the relative worker URL 404s (observed:
  // the dev server served index.html instead, which the browser then
  // rejected for MIME-type reasons). Excluding it from pre-bundling keeps
  // the file at its real path so the relative URL resolves correctly.
  // Confirmed via an isolated toggle test (2026-09-16): removing this
  // line and letting Vite's own automatic config-diff re-optimization
  // run (no manual cache clearing) reproduces the exact failure; adding
  // it back the same way fixes it.
  optimizeDeps: {
    exclude: ['@lightninglabs/wavelength-web'],
  },
});
