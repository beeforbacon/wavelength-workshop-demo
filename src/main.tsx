import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebWalletEngine, defaultConfig } from '@lightninglabs/wavelength-web';
import { WavelengthProvider } from '@lightninglabs/wavelength-react';
import App from './App.tsx';
import './index.css';

// Signet only, hardcoded. This prototype does not offer a network picker —
// see docs/decisions/slice-b-scope.md for why that's an explicit choice,
// not an oversight.
//
// runtimeBaseUrl must be an absolute URL: the worker thread receives this
// string as-is (see @lightninglabs/wavelength-web's clients/worker.js
// spawnWorker()) and calls `new URL(name, runtimeBaseUrl)` inside the
// worker, which throws if runtimeBaseUrl is not already absolute. A
// relative path (as the quickstart docs show) fails here with
// "URL constructor: ... is not a valid URL" -- observed directly, not
// just inferred from docs.
const engine = createWebWalletEngine({
  runtimeBaseUrl: new URL('/wavewalletdk/0.1.2/', window.location.origin).href,
  config: defaultConfig('signet'),
  autoStart: true,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WavelengthProvider engine={engine}>
      <App />
    </WavelengthProvider>
  </StrictMode>,
);
