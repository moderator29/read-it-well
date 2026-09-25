import Link from "next/link";
import { formatMoney, getDictionary, plural, type Locale } from "@vallo/i18n";
import type { AdminRead } from "@/lib/admin/queries";
import type { RefundConsole, RefundState, RefundView } from "@/lib/admin/money-queries";
import type { StatusTone } from "@/components/ui/StatusPill";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { CANCELLATION_REASONS } from "@/lib/trust/cancellation";
import type { AdminUi } from "../_components/ui";
import { CalmNote } from "../_components/panels";
import { fill } from "../_components/copy";

/**
 * The money desk's rows and the refund console, out of the page so the
 * preview harness draws the same rows the desk draws.
 */

/** Where a refund is, as a tone: back at the card is done, a refusal needs a person. */
export const REFUND_TONE: Record<RefundState, StatusTone> = {
  submitted: "success",
  pending: "warning",
  failed: "danger",
  nothing_owed: "neutral",
};

export function RefundRow({
  refund,
  locale,
  ui,
}: {
  refund: RefundView;
  locale: Locale;
  ui: AdminUi;
}) {
  const c = getDictionary(locale).admin.money;
  const state = { label: c.refundState[refund.state], tone: REFUND_TONE[refund.state] };
  return (
    <li className="flex flex-wrap items-baseline gap-x-md gap-y-2xs border-t border-[var(--nf-border-subtle)] py-sm">
      {/* The row's glass object, small: money going back to a person. The
          render carries one per row and this is the row's subject in a mark. */}
      <BrandIcon name="payment-received" size={26} className="mt-3xs shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
          {refund.guestName ?? c.noDisplayName}
          {" · "}
          {refund.listingTitle ?? c.listingGone}
          {" · "}
          {CANCELLATION_REASONS.find((r) => r.code === refund.reason)?.label ??
            ui.columnLabel("cancellationReason", refund.reason)}
        </span>
        {/* THE REFERENCE IS NEVER CLIPPED. It is the string the guest quotes
            and the wallet entry carries. Without one, the stay's id is what
            an operator opens. */}
        <span className="block font-mono text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
          {refund.reference ?? refund.bookingId}
        </span>
        <Link
          href={`/admin/bookings/${refund.bookingId}`}
          className="mt-2xs inline-block text-[length:var(--nf-text-caption)] underline"
        >
          {c.openStay}
        </Link>
      </span>
      <span className="flex shrink-0 flex-wrap items-baseline gap-sm">
        <ui.StatusChip label={state.label} tone={state.tone} />
        <span className="nf-numeric text-[length:var(--nf-text-body-sm)] font-semibold">
          {formatMoney(refund.refundMinor, locale)}
        </span>
        {refund.retainedMinor > 0 && (
          <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {fill(c.kept, { amount: formatMoney(refund.retainedMinor, locale) })}
          </span>
        )}
        <span className="text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
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
  className = "nf-panel nf-panel--card nf-admin-card mb-md p-md sm:p-lg",
}: {
  refunds: AdminRead<RefundConsole>;
  /** The container. The desk passes its own lit panel; the preview keeps the card. */
  className?: string;
  /** True when a filter is applied, so an empty list is the filter's answer. */
  narrowed: boolean;
  locale: Locale;
  ui: AdminUi;
}) {
  const c = getDictionary(locale).admin.money;
  return (
    <section className={className}>
      <h2 className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
        {c.refundsTitle}
      </h2>
      <p className="mt-2xs max-w-[62ch] text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
        {c.refundsBody}
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
                label={c.returned}
                value={formatMoney(refunds.data.totals.refundedMinor, locale)}
                hint={plural(refunds.data.totals.count, c.returnedHint, locale)}
              />
              <ui.Stat
                label={c.notCredited}
                value={String(refunds.data.totals.notSubmitted)}
                hint={c.notCreditedHint}
                tone={refunds.data.totals.notSubmitted === 0 ? "success" : "danger"}
              />
            </ui.StatRow>
          </div>

          {refunds.data.rows.length === 0 ? (
            narrowed ? null : (
              <div className="mt-sm">
                <CalmNote
                  title={c.refundsNoneTitle}
                  fills={c.refundsNoneFills}
                  creates={c.refundsNoneCreates}
                  action={{ href: "/admin/bookings", label: c.openBookings }}
                />
              </div>
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
