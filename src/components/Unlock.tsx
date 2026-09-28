import { useState } from 'react';
import { useWalletUnlock, WavelengthError } from '@lightninglabs/wavelength-react';

/**
 * Unlock screen for a returning wallet on this device. Password-only.
 *
 * Pass 4 review (C4): every unlock failure used to render "Incorrect
 * password, or the wallet could not be unlocked," regardless of cause.
 * That's misleading for a self-custodial wallet -- telling a user their
 * password is wrong when the real problem is a runtime/asset/lock issue
 * can push them toward an unnecessary, risky seed restore. Now branches on
 * `err.code`: only the codes that are NOT a password rejection get their
 * own specific message; the generic 'wavelength_error' (which is what a
 * genuine bad-password rejection from the daemon surfaces as, per the SDK
 * docs -- there is no dedicated "bad_password" code) keeps the
 * password-specific copy.
 */
export function Unlock() {
  const { unlock, unlockPending, unlockError } = useWalletUnlock();
  const [password, setPassword] = useState('');

  const handleUnlock = async () => {
    try {
      await unlock({ password });
    } catch {
      // unlockError is already set for the declarative render below.
    }
  };

  const errorMessage = (): string | null => {
    if (!unlockError) return null;
    if (!(unlockError instanceof WavelengthError)) {
      return 'Incorrect password, or the wallet could not be unlocked.';
    }
    switch (unlockError.code) {
      case 'wallet_locked':
        return 'This wallet is already open in another tab. Close it, then try again.';
      case 'runtime_lock_unavailable':
        return 'The browser could not grant the wallet lock. Try again.';
      case 'runtime_not_ready':
        return 'The wallet runtime is still starting. Wait a moment and try again.';
      case 'asset_load_failed':
        return 'Could not load the wallet runtime files. Check your connection and reload the page.';
      case 'asset_integrity_failed':
        return 'The wallet runtime files on this page do not match what is expected. Reload the page.';
      case 'worker_error':
        return 'The wallet runtime crashed. Reload the page and try again.';
      default:
        // Includes 'wavelength_error', the daemon-originated catch-all a
        // genuine bad-password rejection surfaces as.
        return 'Incorrect password, or the wallet could not be unlocked.';
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 rounded-xl border border-neutral-800">
      <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Unlock your Signet wallet on this device.
      </p>
      <label className="block text-sm mb-1 text-neutral-300">Password</label>
      <input
        type="password"
        className="w-full mb-4 rounded bg-neutral-900 border border-neutral-700 px-3 py-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
      />
      {unlockError && (
        <p role="alert" className="text-sm text-red-400 mb-3">
          {errorMessage()}
        </p>
      )}
      <button
        className="w-full rounded bg-neutral-100 hover:bg-white text-black font-medium py-2 disabled:opacity-50"
        onClick={handleUnlock}
        disabled={unlockPending || password.length === 0}
      >
        {unlockPending ? 'Unlocking...' : 'Unlock'}
      </button>
    </div>
  );
}
