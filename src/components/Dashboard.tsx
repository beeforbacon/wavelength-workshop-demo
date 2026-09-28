import { useWalletBalance, useWalletActivity } from '@lightninglabs/wavelength-react';
import { Receive } from './Receive';
import { Send } from './Send';
import { RecoveryBanner } from './RecoveryBanner';

export function Dashboard() {
  const balance = useWalletBalance();
  const activity = useWalletActivity();

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4 space-y-6">
      <RecoveryBanner />
      <div className="rounded-xl border border-neutral-800 p-5">
        <p className="text-sm text-neutral-400 mb-1">Spendable balance</p>
        <p className="text-3xl font-semibold">
          {balance ? balance.confirmedSat.toLocaleString() : '...'} sats
        </p>
        {balance && (balance.pendingInSat > 0 || balance.pendingOutSat > 0) && (
          <p className="text-xs text-neutral-500 mt-1">
            {balance.pendingInSat > 0 &&
              `+${balance.pendingInSat.toLocaleString()} sats incoming`}
            {balance.pendingInSat > 0 && balance.pendingOutSat > 0 && ' · '}
            {balance.pendingOutSat > 0 &&
              `${balance.pendingOutSat.toLocaleString()} sats outgoing`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Receive />
        <Send />
      </div>

      <div className="rounded-xl border border-neutral-800 p-5">
        <h2 className="text-lg font-semibold mb-3">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between text-sm border-b border-neutral-900 pb-2"
              >
                <span className="text-neutral-300 capitalize">
                  {entry.kind}
                </span>
                <span
                  className={
                    entry.amountSat >= 0 ? 'text-emerald-400' : 'text-neutral-300'
                  }
                >
                  {entry.amountSat >= 0 ? '+' : '-'}
                  {Math.abs(entry.amountSat).toLocaleString()} sats
                </span>
                <span
                  className={
                    entry.status === 'failed'
                      ? 'text-red-400'
                      : entry.status === 'pending'
                        ? 'text-amber-400'
                        : 'text-neutral-500'
                  }
                >
                  {entry.status}
                  {entry.status === 'failed' && entry.failureReason
                    ? `: ${entry.failureReason}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
