import { useEffect, useState } from 'react';
import {
  useWalletPrepareSend,
  useWalletSend,
  WavelengthError,
  type PrepareSendResult,
} from '@lightninglabs/wavelength-react';

/**
 * Send screen: Lightning invoice only for this slice (on-chain send /
 * cooperative leave is deferred -- not needed for the Slice B acceptance
 * criteria). Two-step prepare/confirm flow.
 *
 * Pass 4 review findings fixed here (docs/security/slice-b-pass4-review.md):
 * - C1: a failed sendPrepared() used to leave the "Confirm payment" button
 *   live for a one-click retry, directly under text telling the user not to
 *   retry. Now a dispatch failure calls resetPrepare() immediately, which
 *   drops the UI back to the invoice-entry step -- a retry requires a fresh
 *   prepare() (a new sendIntentId), not a re-click of the same stale intent.
 * - C2: the confirm screen previously showed only the fee, not the amount
 *   or destination -- the entire point of a two-step confirm flow was not
 *   actually delivered. Now shows amountSat, destinationSummary,
 *   invoiceDescription, expectedFeeSat/feeKnown, and
 *   expectedTotalOutflowSat/totalOutflowKnown.
 * - C3: expiresAtUnix and quoteStatus were never read. Now an expired quote
 *   disables Confirm and forces a fresh prepare(); a quoteStatus of
 *   'local_only' (a non-authoritative, not-server-confirmed quote per the
 *   SDK's own field comment) is shown as a caveat rather than presented as
 *   equally solid as a 'complete' quote.
 * - Also: SendResult.actualAmountSat is now shown on success, per the SDK's
 *   explicit instruction that host UIs should echo it back before treating
 *   a send as confirmed (core/dist/results.d.ts) -- the prior version
 *   silently cleared the form with no success state at all.
 *
 * Follow-up review fixes (docs/security/slice-b-pass4-followup-verification.md):
 * - Gap 3a: the expiry check used to be a value captured once at render
 *   time (`const isExpired = ...`), read later by handleConfirm via
 *   closure. If no re-render happened while the confirm screen sat idle,
 *   that captured value went stale -- an expired quote could be dispatched
 *   because the check itself, not just the disabled-button styling, was
 *   using an old answer. Fixed by recomputing expiry fresh, at call time,
 *   inside isQuoteExpired(); a 1-second interval also forces a re-render
 *   while a quote is pending so the disabled button state stays visually
 *   current, not just correct-if-clicked.
 * - Gap 3b: `expiresAtUnix` could in principle be 0/unset if the daemon
 *   ever omits it for some rail/version -- treating 0 as "already expired"
 *   would permanently disable Send. isQuoteExpired() now only treats a
 *   strictly positive `expiresAtUnix` as a real expiry to check.
 * - Fixed a self-contradicting comment left over from the C1 fix (said
 *   "do NOT resetPrepare()" directly above a resetPrepare() call -- the
 *   actual intent was "do not resetSend()", which is what mattered).
 */
function isQuoteExpired(quote: PrepareSendResult): boolean {
  return quote.expiresAtUnix > 0 && Date.now() / 1000 >= quote.expiresAtUnix;
}

export function Send() {
  const { prepare, prepareData: quote, preparePending, prepareError, resetPrepare } =
    useWalletPrepareSend();
  const { sendPrepared, sendPending, sendError, sendData, resetSend } =
    useWalletSend();
  const [invoice, setInvoice] = useState('');
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  // Forces a re-render every second while a quote is pending, so the
  // expired-quote UI (disabled button, warning text) stays visually
  // current rather than only being correct at the moment of the last
  // unrelated re-render. The actual safety check is isQuoteExpired(),
  // called fresh inside handleConfirm -- this tick is a display aid, not
  // itself the protection.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!quote) return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [quote]);

  const displayExpired = quote ? isQuoteExpired(quote) : false;

  const handlePrepare = async () => {
    setDispatchNotice(null);
    resetSend();
    if (!invoice.trim()) return;
    try {
      await prepare({ invoice: invoice.trim() });
    } catch {
      // prepareError is already set for the declarative render below.
    }
  };

  const handleConfirm = async () => {
    if (!quote) return;
    // Recompute fresh here rather than trusting displayExpired -- this is
    // the actual safety check (gap 3a fix). displayExpired is only for
    // what the button/warning show; this is what decides whether to send.
    if (isQuoteExpired(quote)) {
      setDispatchNotice('This quote expired. Get a fresh quote to continue.');
      resetPrepare();
      return;
    }
    try {
      await sendPrepared(quote);
      setDispatchNotice(null);
      setInvoice('');
      // Deliberately do NOT resetSend() here: the success banner below
      // reads sendData, and we want it to stay visible until the user
      // starts a new send (see the textarea onChange below). resetPrepare()
      // still runs so the confirm screen doesn't linger on a spent intent.
      resetPrepare();
    } catch (err) {
      // C1 fix: a dispatch failure may mean the payment already went out.
      // Clear the quote immediately so the same sendIntentId cannot be
      // confirmed again with one click -- a retry now requires a fresh
      // prepare(), which the user must deliberately choose after checking
      // Activity, not something available to click by reflex.
      resetPrepare();
      const message =
        err instanceof WavelengthError ? err.message : 'Send failed.';
      setDispatchNotice(
        `${message} Check Activity below before trying again -- this payment may have already gone through.`,
      );
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 p-5">
      <h2 className="text-lg font-semibold mb-3">Send</h2>

      {!quote ? (
        <>
          <label className="block text-sm mb-1 text-neutral-300">
            Lightning invoice
          </label>
          <textarea
            className="w-full mb-3 rounded bg-neutral-900 border border-neutral-700 px-3 py-2 font-mono text-xs"
            rows={3}
            value={invoice}
            onChange={(e) => {
              setInvoice(e.target.value);
              if (sendData) resetSend(); // starting a new send clears the old success banner
            }}
            placeholder="lnbc..."
            spellCheck={false}
          />
          <button
            className="w-full rounded bg-neutral-100 hover:bg-white text-black font-medium py-2 disabled:opacity-50"
            onClick={handlePrepare}
            disabled={preparePending || !invoice.trim()}
          >
            {preparePending ? 'Getting quote...' : 'Get fee quote'}
          </button>
          {prepareError && (
            <p role="alert" className="text-sm text-red-400 mt-3">
              {prepareError.message}
            </p>
          )}
          {sendData && !dispatchNotice && (
            <p role="status" className="text-sm text-emerald-400 mt-3">
              Sent {sendData.actualAmountSat.toLocaleString()} sats.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="text-sm text-neutral-300 mb-3 space-y-1">
            <p>
              <span className="text-neutral-500">Amount: </span>
              {quote.amountSat.toLocaleString()} sats
            </p>
            {/* destinationSummary/invoiceDescription come from the payee's
                invoice, not from us. React escapes them (no injection risk),
                but per the follow-up review they're kept visually distinct
                (bordered, monospace, wrapped/clamped) from the authoritative
                amount above so a long or misleading memo can't crowd or
                visually impersonate the real numbers. */}
            <div>
              <span className="text-neutral-500">To: </span>
              <div className="mt-1 font-mono text-xs bg-black/30 rounded p-2 break-all max-h-24 overflow-y-auto">
                {quote.destinationSummary}
              </div>
            </div>
            {quote.invoiceDescription && (
              <div>
                <span className="text-neutral-500">Memo (set by payee): </span>
                <div className="mt-1 font-mono text-xs bg-black/30 rounded p-2 break-all max-h-16 overflow-y-auto">
                  {quote.invoiceDescription}
                </div>
              </div>
            )}
            <p>
              <span className="text-neutral-500">Fee: </span>
              {quote.expectedFeeSat.toLocaleString()} sats
              {!quote.feeKnown && ' (estimate)'}
            </p>
            <p>
              <span className="text-neutral-500">Total: </span>
              {quote.expectedTotalOutflowSat.toLocaleString()} sats
              {!quote.totalOutflowKnown && ' (estimate)'}
            </p>
          </div>
          {quote.quoteStatus === 'local_only' && (
            <p role="alert" className="text-sm text-amber-400 mb-3">
              This quote was computed locally and is not yet confirmed by the
              server -- the actual fee or outcome may differ.
            </p>
          )}
          {displayExpired && (
            <p role="alert" className="text-sm text-red-400 mb-3">
              This quote has expired. Cancel and get a fresh one.
            </p>
          )}
          {quote.warning && (
            <p role="alert" className="text-sm text-amber-400 mb-3">
              {quote.warning}
            </p>
          )}
          <div className="flex gap-2">
            <button
              className="flex-1 rounded bg-neutral-100 hover:bg-white text-black font-medium py-2 disabled:opacity-50"
              onClick={handleConfirm}
              disabled={sendPending || displayExpired}
            >
              {sendPending ? 'Sending...' : 'Confirm payment'}
            </button>
            <button
              className="rounded border border-neutral-700 px-4 py-2 text-neutral-300"
              onClick={() => resetPrepare()}
              disabled={sendPending}
            >
              Cancel
            </button>
          </div>
        </>
      )}
      {(dispatchNotice || sendError) && (
        <p role="alert" className="text-sm text-red-400 mt-3">
          {dispatchNotice ?? sendError?.message}
        </p>
      )}
    </div>
  );
}
