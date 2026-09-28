import { useState } from 'react';
import { useWalletCreate } from '@lightninglabs/wavelength-react';

/** Create-a-wallet form. Password-only (no passkey) per Slice B scope. */
export function Onboard({
  onRestore,
  onCreated,
}: {
  onRestore: () => void;
  onCreated: (mnemonic: string[]) => void;
}) {
  const { create, createPending, createError } = useWalletCreate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreate = async () => {
    setValidationError(null);
    if (password.length < 8) {
      setValidationError('Use a password of at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    const result = await create({ password });
    // Report the mnemonic to the parent immediately. The parent owns
    // deciding whether to show the backup screen, independently of the
    // SDK's `phase` (which flips to 'ready' right here, before the user
    // has seen or confirmed the phrase -- see App.tsx for why that matters).
    onCreated(result.mnemonic);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 rounded-xl border border-neutral-800">
      <h1 className="text-xl font-semibold mb-1">Wavelength MVP</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Signet test wallet -- not real money.
      </p>
      <label className="block text-sm mb-1 text-neutral-300">Password</label>
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
      {(validationError || createError) && (
        <p role="alert" className="text-sm text-red-400 mb-3">
          {validationError ?? createError?.message}
        </p>
      )}
      <button
        className="w-full rounded bg-neutral-100 hover:bg-white text-black font-medium py-2 disabled:opacity-50"
        onClick={handleCreate}
        disabled={createPending}
      >
        {createPending ? 'Creating...' : 'Create wallet'}
      </button>
      <button
        className="w-full mt-3 text-sm text-neutral-400 underline"
        onClick={onRestore}
      >
        Restore instead
      </button>
    </div>
  );
}
