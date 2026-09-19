import Link from "next/link";
import { formatMoney, type Locale } from "@vallo/i18n";
import type { AdminRead } from "@/lib/admin/queries";
import type { RefundConsole, RefundState, RefundView, WalletEntryView } from "@/lib/admin/money-queries";
import type { StatusTone } from "@/components/ui/StatusPill";
import { CANCELLATION_REASONS } from "@/lib/trust/cancellation";
import type { AdminUi } from "../_components/ui";

/**
 * The money desk's rows and the refund console, out of the page so the
 * preview harness draws the same rows the desk draws.
 */

/**
 * Where a refund's money is, in words and in a tone that survives greyscale.
 * The word is the signal; the tone only agrees with it.
 */
export const REFUND_STATE: Record<RefundState, { label: string; tone: StatusTone }> = {
  credited: { label: "In the guest's wallet", tone: "success" },
  not_settled: { label: "Credit not settled yet", tone: "info" },
  failed: { label: "Credit failed", tone: "danger" },
  not_credited: { label: "Recorded, no credit found", tone: "danger" },
  nothing_owed: { label: "Nothing was owed", tone: "neutral" },
};

export function EntryRow({
  entry,
  locale,
  ui,
}: {
  entry: WalletEntryView;
  locale: Locale;
  ui: AdminUi;
}) {
  const outgoing = entry.direction === "debit";
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs border-t border-[var(--nf-border-subtle)] py-sm">
      <span className="min-w-0">
        <span className="block text-[var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
          {/* Same column-keyed lookup as the status chip beside it, rather
              than a second hand-rolled `replace(/_/g, " ")` that would print
              "escrow hold" in lower case beside a properly named status. */}
          {entry.note ?? ui.columnLabel("walletEntryKind", entry.kind)}
          {entry.ownerName ? ` · ${entry.ownerName}` : ""}
        </span>
        {/* THE REFERENCE IS NEVER CLIPPED. It is the only string an operator
            can trace a payment by with Paystack or Yellow Card, and it was
            rendered at 11px monospace with an ellipsis, so the money screen
            could not do the one thing it exists for. `user-select: all` means
            one tap takes the whole string. */}
        <span className="block font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
          {entry.reference}
        </span>
      </span>
      <span className="flex shrink-0 items-baseline gap-sm">
        {/*
          NOT `label={entry.status}`. That printed `PENDING`, `COMPLETED`,
          `FAILED` and `REVERSED` in shouting capitals on the money screen,
          which is the column, not a word for a person.

          And not the bare `status={entry.status}` either, which would have
          fallen through to `statusLabel` and `t.admin.common.status`, where
          `PENDING` reads "Requested". That is right for a booking and wrong
          for a wallet entry, where PENDING means the money has not settled.
          `columnLabel` is keyed by column as well as by value for exactly
          this collision. `status` is still passed, because the TONE is
          shared across every queue and only the word is per-column.
        */}
        <ui.StatusChip
          label={ui.columnLabel("walletEntryStatus", entry.status)}
          status={entry.status}
        />
        <span className="nf-numeric text-[var(--nf-text-body-sm)] font-semibold">
          {outgoing ? "-" : "+"}
          {formatMoney(entry.amountMinor, locale)}
        </span>
        <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {ui.when(entry.createdAt)}
        </span>
      </span>
    </li>
  );
}

export function RefundRow({
  refund,
  locale,
  ui,
}: {
  refund: RefundView;
  locale: Locale;
  ui: AdminUi;
}) {
  const state = REFUND_STATE[refund.state];
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs border-t border-[var(--nf-border-subtle)] py-sm">
      <span className="min-w-0">
        <span className="block text-[var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
          {refund.guestName ?? "No display name"}
          {" · "}
          {refund.listingTitle ?? "A listing that is no longer there"}
          {" · "}
          {CANCELLATION_REASONS.find((r) => r.code === refund.reason)?.label ??
            ui.columnLabel("cancellationReason", refund.reason)}
        </span>
        {/* THE REFERENCE IS NEVER CLIPPED. It is the string the guest quotes
            and the wallet entry carries. Without one, the stay's id is what
            an operator opens. */}
        <span className="block font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
          {refund.reference ?? refund.bookingId}
        </span>
        <Link
          href={`/admin/bookings/${refund.bookingId}`}
          className="mt-2xs inline-block text-[var(--nf-text-caption)] underline"
        >
          Open the stay
        </Link>
      </span>
      <span className="flex shrink-0 flex-wrap items-baseline gap-sm">
        <ui.StatusChip label={state.label} tone={state.tone} />
        <span className="nf-numeric text-[var(--nf-text-body-sm)] font-semibold">
          {formatMoney(refund.refundMinor, locale)}
        </span>
        {refund.retainedMinor > 0 && (
          <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {formatMoney(refund.retainedMinor, locale)} kept
          </span>
        )}
        <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {ui.when(refund.createdAt)}
        </span>
      </span>
    </li>
  );
}

/**
 * THE REFUND CONSOLE.
 *
 * Two kinds of money go back to a person on this platform and both are
 * decided elsewhere: a stay's refund on the stay's own page, where the
 * published schedule works out the figure and the operator chooses only
 * why, and a disputed escrow on the escrow desk, where an operator rules
 * release or refund with a reason both sides read. This section is where
 * an operator answers "did the guest get it": every refund decided, with
 * the wallet entry's own status beside it. Nothing on this section types
 * an amount.
 */
export function RefundsPanel({
  refunds,
  narrowed,
  locale,
  ui,
}: {
  refunds: AdminRead<RefundConsole>;
  /** True when a filter is applied, so an empty list is the filter's answer. */
  narrowed: boolean;
  locale: Locale;
  ui: AdminUi;
}) {
  return (
    <section className="nf-card mb-md p-md sm:p-lg">
      <h2 className="text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
        Refunds
      </h2>
      <p className="mt-2xs max-w-[62ch] text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
        Every refund decided on the console, newest first, with where the money
        is now. A stay is refunded from its own page under the published
        schedule; open a stay from the Stays queue to decide one. The state
        beside each row is the wallet entry&apos;s own status, not a guess.
      </p>

      {refunds.state !== "ok" ? (
        <div className="mt-sm">
          <ui.QueueUnavailable />
        </div>
      ) : (
        <>
          <div className="mt-sm">
            <ui.StatRow>
              <ui.Stat
                label="Returned"
                value={formatMoney(refunds.data.totals.refundedMinor, locale)}
                hint={`Across ${refunds.data.totals.count === 1 ? "1 refund" : `${refunds.data.totals.count} refunds`} on the platform`}
              />
              <ui.Stat
                label="Recorded without a credit"
                value={String(refunds.data.totals.notCredited)}
                hint="A refund owed with no wallet entry behind it needs an engineer"
                tone={refunds.data.totals.notCredited === 0 ? "success" : "danger"}
              />
            </ui.StatRow>
          </div>

          {refunds.data.rows.length === 0 ? (
            narrowed ? null : (
              <p className="mt-xs text-[var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
                No refund has been decided yet.
              </p>
            )
          ) : (
            <ul className="mt-xs">
              {refunds.data.rows.map((refund) => (
                <RefundRow key={refund.id} refund={refund} locale={locale} ui={ui} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
