/**
 * Standalone backup-confirmation screen. Rendered by App.tsx whenever a
 * mnemonic is pending confirmation -- deliberately not gated on the SDK's
 * `phase`, which is already 'ready' by the time this shows (see App.tsx).
 */
export function ConfirmBackup({
  mnemonic,
  onConfirmed,
}: {
  mnemonic: string[];
  onConfirmed: () => void;
}) {
  return (
    <div className="max-w-md mx-auto mt-16 p-6 rounded-xl border border-amber-600 bg-amber-950/30">
      <h2 className="text-lg font-semibold text-amber-300 mb-2">
        Write down your recovery phrase
      </h2>
      <p className="text-sm text-amber-200/80 mb-4">
        This is the only time this phrase will be shown. Anyone with these
        words can spend your funds. This is a Signet test wallet -- do not
        reuse this phrase or password anywhere else.
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-sm bg-black/30 rounded p-3">
        {mnemonic.map((word, i) => (
          <div key={i} className="text-neutral-200">
            <span className="text-neutral-500">{i + 1}. </span>
            {word}
          </div>
        ))}
      </div>
      <button
        className="w-full rounded bg-amber-600 hover:bg-amber-500 text-black font-medium py-2"
        onClick={onConfirmed}
      >
        I've written it down
      </button>
    </div>
  );
}
