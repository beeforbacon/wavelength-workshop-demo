import { useWalletRecovery } from '@lightninglabs/wavelength-react';

/**
 * Shared recovery-status banner. Used in two places that are BOTH genuinely
 * reachable (Pass 4 review N9): Dashboard, for the common case where
 * recovery completes or fails on an already-usable wallet, and Restore,
 * for the case where recovery fails before the wallet becomes usable at
 * all (`recovery.walletUsable === false`), which sends `phase` back to
 * 'needsWallet' and re-renders the Restore screen instead of the
 * Dashboard. Extracted to one component so the two call sites can't drift
 * into inconsistent copy -- an earlier version duplicated this JSX in both
 * files.
 */
export function RecoveryBanner() {
  const { recovery, acknowledge } = useWalletRecovery();

  if (recovery.status === 'restoring') {
    return (
      <div className="rounded-xl border border-blue-800 bg-blue-950/30 p-4 mb-4">
        <p role="status" className="text-sm text-blue-300">
          Restoring your balance and history in the background. This can
          take a few minutes -- your balance will fill in as it is found.
        </p>
      </div>
    );
  }

  if (recovery.status === 'done') {
    return (
      <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 mb-4 flex items-center justify-between">
        <p role="status" className="text-sm text-emerald-300">
          Wallet restored. Recovered {recovery.result.recoveredVTXOs} VTXOs.
        </p>
        <button className="text-sm underline text-emerald-300" onClick={acknowledge}>
          Dismiss
        </button>
      </div>
    );
  }

  if (recovery.status === 'failed') {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 mb-4 flex items-center justify-between">
        <p role="alert" className="text-sm text-red-300">
          {recovery.walletUsable
            ? `Could not finish restoring history, so your balance may be incomplete. The wallet is still usable. ${recovery.error.message}`
            : `Restore failed: ${recovery.error.message}`}
        </p>
        <button className="text-sm underline text-red-300" onClick={acknowledge}>
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}
