"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, type Locale } from "@naijafinds/i18n";
import { Button } from "@/components/ui/Button";
import { expireStaleWithdrawalHolds } from "@/lib/admin/payments-actions";
import type { StaleHold } from "@/lib/admin/payments-queries";

/**
 * Releasing the frozen holds, and the sentence that has to come first.
 *
 * THE RULE THIS SCREEN IS BUILT AROUND. A destructive admin action states what
 * it will do before it does it, and a money movement names the amount and the
 * counterparty. So the confirm step is not "Are you sure?" with a red button.
 * It is the count, the total in naira, and every person whose balance changes,
 * listed by name, rendered from the same rows the operator was just reading.
 *
 * WHAT IS AND IS NOT REVERSIBLE. The sweep flips PENDING withdrawal debits to
 * FAILED, which hands the money back to the owner's spendable balance. Nobody
 * is paid and no transfer is cancelled: a hold that is genuinely in flight is
 * still PENDING and still moves only when its webhook lands. But a FAILED entry
 * is not flipped back by this console, so the wording says the withdrawal has
 * to be started again rather than pretending it can be undone here.
 *
 * The window is a control rather than a constant because the right answer
 * differs between a provider having a slow afternoon and a provider that has
 * been down since Tuesday. Ten minutes is the floor, enforced by the server
 * schema as well as by this input, because a one-minute window would fail
 * withdrawals that are merely in progress.
 */

export function SweepHolds({
  holds,
  defaultMinutes,
  locale,
  asOf,
}: {
  holds: StaleHold[];
  defaultMinutes: number;
  locale: Locale;
  /**
   * When the server read these rows, as an ISO instant.
   *
   * Reading the clock during render is impure, and it would also give the
   * server and the browser two different answers about which holds are old
   * enough to sweep. The page is `force-dynamic`, so this is fresh on every
   * request, and every age below is measured against the same moment the list
   * itself was measured against.
   */
  asOf: string;
}) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(String(defaultMinutes));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const parsedMinutes = Number(minutes);
  const windowIsUsable = Number.isInteger(parsedMinutes) && parsedMinutes >= 10;

  /*
   * What this sweep would actually touch, at the window currently typed.
   *
   * The list on the page was read at the server's window. If the operator
   * narrows the window the set shrinks, and showing them the old set would name
   * people whose money is not about to move. Recomputing here from the same
   * rows keeps the confirmation honest as the input changes.
   */
  const readAt = Date.parse(asOf);
  const affected = windowIsUsable
    ? holds.filter((hold) => {
        const age = readAt - Date.parse(hold.createdAt);
        return Number.isFinite(age) && age >= parsedMinutes * 60_000;
      })
    : [];

  const totalMinor = affected.reduce((sum, hold) => sum + hold.amountMinor, 0);

  function run() {
    setError(null);
    start(async () => {
      const result = await expireStaleWithdrawalHolds({ olderThanMinutes: parsedMinutes });
      if (!result.ok) {
        setError(result.fieldErrors?.["olderThanMinutes"] ?? result.error);
        return;
      }
      setConfirming(false);
      setDone(result.data.expired);
      router.refresh();
    });
  }

  return (
    <div className="nf-card p-card">
      <p className="nf-h4">Release the stuck holds</p>
      <p className="nf-body-sm mt-row max-w-[68ch] text-content-2">
        A withdrawal whose transfer never came back leaves a pending debit on the
        wallet, and spendable balance is settled money minus pending debits. Until
        the hold is cleared the owner is short that amount with nothing on their
        screen explaining it.
      </p>

      <label className="mt-group block max-w-[22rem]">
        <span className="nf-label">Older than, in minutes</span>
        <input
          className="nf-field nf-numeric"
          inputMode="numeric"
          value={minutes}
          onChange={(event) => {
            setMinutes(event.target.value.replace(/[^0-9]/g, ""));
            setConfirming(false);
            setDone(null);
          }}
        />
        <span className="nf-caption mt-inline-tight block">
          Ten minutes is the floor. Anything shorter would fail withdrawals that
          are still on their way.
        </span>
      </label>

      {!confirming && (
        <div className="mt-group">
          <Button
            type="button"
            variant="secondary"
            disabled={!windowIsUsable || affected.length === 0}
            onClick={() => {
              setDone(null);
              setConfirming(true);
            }}
          >
            {affected.length === 0
              ? "Nothing is stuck at that window"
              : `Review ${affected.length === 1 ? "1 hold" : `${affected.length} holds`}`}
          </Button>
        </div>
      )}

      {confirming && (
        <div className="mt-group rounded-[var(--nf-radius-md)] border border-[var(--nf-state-warning)] p-card-sm">
          <p className="nf-body font-semibold text-content">
            This will release {formatMoney(totalMinor, locale)} across{" "}
            {affected.length === 1 ? "1 held withdrawal" : `${affected.length} held withdrawals`}.
          </p>
          <p className="nf-body-sm mt-row text-content-2">
            Each one is marked failed and the money returns to the owner&apos;s
            spendable balance. Nobody is paid by this. Anyone who still wants
            their withdrawal has to start it again.
          </p>

          <ul className="nf-rows mt-group">
            {affected.map((hold) => (
              <li key={hold.reference} className="nf-row">
                <span className="min-w-0 flex-1">
                  <span className="nf-body-sm block font-semibold text-content">
                    {hold.ownerName ?? "Name not on file"}
                  </span>
                  <span className="nf-caption block truncate">{hold.reference}</span>
                </span>
                <span className="nf-numeric nf-body shrink-0 font-semibold">
                  {formatMoney(hold.amountMinor, locale)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-group flex flex-wrap gap-inline">
            <Button type="button" variant="danger" loading={pending} onClick={run}>
              Release {formatMoney(totalMinor, locale)}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="nf-body-sm mt-row font-medium text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
      {done !== null && (
        <p className="nf-body-sm mt-row font-medium text-[var(--nf-state-success)]">
          {done === 0
            ? "Nothing needed releasing. Every hold had already settled."
            : `Released ${done === 1 ? "1 hold" : `${done} holds`}, with your name on the record.`}
        </p>
      )}
    </div>
  );
}
