import { useState } from 'react';
import { useWalletReceive, useWalletDeposit } from '@lightninglabs/wavelength-react';

/**
 * Receive screen: Lightning invoice or on-chain deposit address.
 * Slice A2 found the official faucet only pays on-chain addresses, so both
 * paths matter for actually getting Signet funds into this wallet.
 */
export function Receive() {
  const [mode, setMode] = useState<'lightning' | 'onchain'>('lightning');
  const [amountSat, setAmountSat] = useState('4000');

  const { receive, receivePending, receiveError, receiveData } =
    useWalletReceive();
  const { deposit, depositPending, depositError, depositData } =
    useWalletDeposit();

  const handleReceive = async () => {
    const amount = Number(amountSat);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await receive({ amountSat: amount });
  };

  return (
    <div className="rounded-xl border border-neutral-800 p-5">
      <h2 className="text-lg font-semibold mb-3">Receive</h2>
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded text-sm ${
            mode === 'lightning'
              ? 'bg-neutral-100 text-black'
              : 'border border-neutral-700 text-neutral-300'
          }`}
          onClick={() => setMode('lightning')}
        >
          Lightning invoice
        </button>
        <button
          className={`px-3 py-1 rounded text-sm ${
            mode === 'onchain'
              ? 'bg-neutral-100 text-black'
              : 'border border-neutral-700 text-neutral-300'
          }`}
          onClick={() => setMode('onchain')}
        >
          On-chain address
        </button>
      </div>

      {mode === 'lightning' ? (
        <>
          <label className="block text-sm mb-1 text-neutral-300">
            Amount (sats)
          </label>
          <input
            type="number"
            className="w-full mb-3 rounded bg-neutral-900 border border-neutral-700 px-3 py-2"
            value={amountSat}
            onChange={(e) => setAmountSat(e.target.value)}
          />
          <button
            className="w-full rounded bg-neutral-100 hover:bg-white text-black font-medium py-2 disabled:opacity-50"
            onClick={handleReceive}
            disabled={receivePending}
          >
            {receivePending ? 'Generating...' : 'Generate invoice'}
          </button>
          {receiveError && (
            <p role="alert" className="text-sm text-red-400 mt-3">
              {receiveError.message}
            </p>
          )}
          {receiveData && (
            <div className="mt-3">
              <p className="text-xs text-neutral-500 mb-1">
                Invoice (copy and pay from another wallet):
              </p>
              <textarea
                readOnly
                className="w-full font-mono text-xs bg-black/30 rounded p-2"
                rows={3}
                value={receiveData.invoice}
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-400 mb-3">
            On-chain deposits are not instant like Lightning -- they need to
            be seen and confirmed on Signet before they're spendable. Exact
            timing was not measured during testing.
          </p>
          <button
            className="w-full rounded bg-neutral-100 hover:bg-white text-black font-medium py-2 disabled:opacity-50"
            onClick={() => deposit()}
            disabled={depositPending}
          >
            {depositPending ? 'Generating...' : 'Get deposit address'}
          </button>
          {depositError && (
            <p role="alert" className="text-sm text-red-400 mt-3">
              {depositError.message}
            </p>
          )}
          {depositData && (
            <div className="mt-3">
              <p className="text-xs text-neutral-500 mb-1">
                Signet address:
              </p>
              <textarea
                readOnly
                className="w-full font-mono text-xs bg-black/30 rounded p-2"
                rows={2}
                value={depositData.address}
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
