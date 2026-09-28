import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@lightninglabs/wavelength-react';
import { defaultConfig } from '@lightninglabs/wavelength-web';
import { Onboard } from './components/Onboard';
import { ConfirmBackup } from './components/ConfirmBackup';
import { Restore } from './components/Restore';
import { Unlock } from './components/Unlock';
import { Dashboard } from './components/Dashboard';

/**
 * Slice B: one-user minimal wallet. Signet only, password-only auth.
 * Phase-gated per https://wavelength.lightning.engineering/guides/handle-phases-and-errors/
 *
 * One deliberate exception to pure phase-gating: `pendingMnemonic`.
 * The SDK's own `phase` has no "wallet created, waiting on the user to
 * confirm they wrote down the mnemonic" state -- create() jumps straight
 * to 'ready'. An earlier version of this file gated the backup screen on
 * `phase` inside the Onboard component itself; the instant create()
 * resolved, phase left 'needsWallet', this switch stopped rendering
 * <Onboard> at all, and the Dashboard appeared with the recovery phrase
 * never shown. Found by manual testing, not by review. Fix: App owns the
 * mnemonic directly and renders the backup screen from it, independent of
 * `phase`, before this switch ever runs.
 *
 * Pass 4 review fixes (docs/security/slice-b-pass4-review.md):
 * - C5: `phase === 'error'` is reachable mid-session (a background
 *   refresh/sync-poll failure budget exhausted, not just a startup
 *   failure), and previously always showed "runtime failed to start" with
 *   no way to recover except a manual page reload. Now tracks whether the
 *   wallet was ever 'ready' before, shows different copy for a mid-session
 *   failure vs. a genuine startup failure, and offers a real retry button
 *   that calls start() again rather than dead-ending.
 * - C6: the backup-confirmation screen holds the mnemonic only in React
 *   state. The SDK returns it exactly once at creation and never again, so
 *   a reload/crash/navigation while this screen is showing permanently
 *   loses the phrase -- this already happened once during Pass 2 testing.
 *   The SDK gives no way to re-fetch a shown mnemonic, so the only
 *   available mitigation is reducing the chance of an accidental exit: a
 *   beforeunload guard now warns before the tab can be closed or reloaded
 *   while a mnemonic is pending confirmation. This does not eliminate the
 *   risk (a user can still confirm the browser's "leave site?" prompt) --
 *   documented as a residual accepted risk on Signet, where funds are
 *   worthless, not one we'd accept unmodified on mainnet.
 *
 * Follow-up review fixes (docs/security/slice-b-pass4-followup-verification.md):
 * - C5 gap 5a: the Retry button's start() call was a bare, unhandled
 *   promise -- a failed retry produced an uncaught rejection with no
 *   feedback. Now wrapped with its own pending/error state.
 */
export default function App() {
  const { phase, error, start } = useWallet();
  const [showRestore, setShowRestore] = useState(false);
  const [pendingMnemonic, setPendingMnemonic] = useState<string[] | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const hasBeenReady = useRef(false);

  useEffect(() => {
    if (phase === 'ready') hasBeenReady.current = true;
  }, [phase]);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await start(defaultConfig('signet'));
    } catch (err) {
      // Follow-up review gap 5a: this used to be a bare, unhandled
      // onClick={() => start(...)}. A failed retry produced an uncaught
      // promise rejection and left the user on the same error card with
      // no new information at all.
      setRetryError(
        err instanceof Error ? err.message : 'Retry failed. Try again.',
      );
    } finally {
      setRetrying(false);
    }
  };


  useEffect(() => {
    if (!pendingMnemonic) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Some browsers require this for the confirmation prompt to appear.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pendingMnemonic]);

  if (pendingMnemonic) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <Header />
        <ConfirmBackup
          mnemonic={pendingMnemonic}
          onConfirmed={() => setPendingMnemonic(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Header />
      {(() => {
        switch (phase) {
          case 'loading':
          case 'runtimeReady':
          case 'starting':
            return (
              <p className="text-center mt-16 text-neutral-400">
                Starting wallet runtime...
              </p>
            );
          case 'needsWallet':
            return showRestore ? (
              <Restore onCancel={() => setShowRestore(false)} />
            ) : (
              <Onboard
                onRestore={() => setShowRestore(true)}
                onCreated={setPendingMnemonic}
              />
            );
          case 'locked':
            return <Unlock />;
          case 'syncing':
          case 'restoring':
            return (
              <p className="text-center mt-16 text-neutral-400">
                Syncing with the wallet server...
              </p>
            );
          case 'ready':
            return <Dashboard />;
          case 'stopping':
          case 'stopped':
            return (
              <p className="text-center mt-16 text-neutral-400">
                Wallet stopped.
              </p>
            );
          case 'error':
            return (
              <div className="max-w-md mx-auto mt-16 p-6 rounded-xl border border-red-800 bg-red-950/30">
                <p className="text-red-300">
                  {hasBeenReady.current
                    ? 'The wallet stopped responding and needs to reconnect.'
                    : 'The wallet runtime failed to start.'}
                </p>
                {error && (
                  <p className="text-sm text-red-400/80 mt-2">
                    {error.message}
                  </p>
                )}
                <button
                  className="mt-4 w-full rounded bg-red-800 hover:bg-red-700 text-white font-medium py-2 disabled:opacity-50"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? 'Retrying...' : 'Retry'}
                </button>
                {retryError && (
                  <p className="text-sm text-red-400/80 mt-2">{retryError}</p>
                )}
              </div>
            );
          default:
            return null;
        }
      })()}
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-neutral-900 px-4 py-3">
      <p className="text-sm font-medium">
        Wavelength MVP{' '}
        <span className="text-amber-500 font-semibold">· SIGNET (test funds only)</span>
      </p>
    </header>
  );
}
