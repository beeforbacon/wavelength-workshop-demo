import { useState } from 'react';
import { useWalletRestore } from '@lightninglabs/wavelength-react';
import { RecoveryBanner } from './RecoveryBanner';

/**
 * Restore-from-mnemonic screen. Always sets recoverState: true so balance
 * and activity history come back, not just the bare keys -- Slice A2
 * observed this working correctly in the reference demo and we want the
 * same behavior here, not a silently empty restored wallet.
 */
export function Restore({ onCancel }: { onCancel: () => void }) {
  const { restore, restorePending, restoreError } = useWalletRestore();
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRestore = async () => {
    setValidationError(null);
    const words = mnemonicInput.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setValidationError(
        `Recovery phrases are 12 or 24 words. Found ${words.length}.`,
      );
      return;
    }
    if (password.length < 8) {
      setValidationError('Use a password of at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    await restore({ password, mnemonic: words, recoverState: true });
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 rounded-xl border border-neutral-800">
      <h1 className="text-xl font-semibold mb-1">Restore wallet</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Enter your 12 or 24 word recovery phrase, separated by spaces.
      </p>
      <label className="block text-sm mb-1 text-neutral-300">
        Recovery phrase
      </label>
      <textarea
        className="w-full mb-3 rounded bg-neutral-900 border border-neutral-700 px-3 py-2 font-mono text-sm"
        rows={3}
        value={mnemonicInput}
        onChange={(e) => setMnemonicInput(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
      <label className="block text-sm mb-1 text-neutral-300">
        New password for this device
      </label>
      <input
        type="password"
        className="w-full mb-3 rounded bg-neutral-900 border border-neutral-700 px-3 py-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <label className="block text-sm mb-1 text-neutral-300">
        Confirm password
      </label>
      <input
        type="password"
        className="w-full mb-4 rounded bg-neutral-900 border border-neutral-700 px-3 py-2"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
      />
      {(validationError || restoreError) && (
        <p role="alert" className="text-sm text-red-400 mb-3">
          {validationError ?? restoreError?.message}
        </p>
      )}
      <RecoveryBanner />
      <div className="flex gap-2">
        <button
          className="flex-1 rounded bg-neutral-100 hover:bg-white text-black font-medium py-2 disabled:opacity-50"
          onClick={handleRestore}
          disabled={restorePending}
        >
          {restorePending ? 'Restoring...' : 'Restore wallet'}
        </button>
        <button
          className="rounded border border-neutral-700 px-4 py-2 text-neutral-300"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
