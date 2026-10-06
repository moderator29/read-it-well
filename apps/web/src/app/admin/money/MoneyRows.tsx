import Link from "next/link";
import { formatMoney, getDictionary, plural, type Locale } from "@vallo/i18n";
import type { AdminRead } from "@/lib/admin/queries";
import type { RefundConsole, RefundState, RefundView } from "@/lib/admin/money-queries";
import { CANCELLATION_REASONS } from "@/lib/trust/cancellation";
import type { AdminUi } from "../_components/ui";
import { CalmNote } from "../_components/panels";
import { fill } from "../_components/copy";
import { DocHead, DocRow, DocRows, DocumentSheet } from "@/components/app/money/DocumentSheet";
import { PaperLedger, PaperLedgerRow, PaperStatus, type PaperState } from "../_components/paper";

/**
 * The money desk's rows and the refund console, out of the page so the
 * preview harness draws the same rows the desk draws.
 */

const PAPER_STATE: Record<RefundState, PaperState> = {
  submitted: "done",
  pending: "waiting",
  failed: "failed",
  nothing_owed: "neutral",
};

/**
 * One refund, as a line of the record. The state is the processor's word with
 * a shape (filled circle back at the card, hollow circle not yet sent, filled
 * square refused, a bar for nothing owed), so a submitted refund is never read
 * as settled and a refused one is never read by its colour alone.
 */
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
  const reason =
    CANCELLATION_REASONS.find((r) => r.code === refund.reason)?.label ?? ui.columnLabel("cancellationReason", refund.reason);
  return (
    <PaperLedgerRow
      when={ui.when(refund.createdAt)}
      title={`${refund.guestName ?? c.noDisplayName} · ${refund.listingTitle ?? c.listingGone} · ${reason}`}
      sub={
        <>
          {/* THE REFERENCE IS NEVER CLIPPED. It is the string the guest quotes
              and the wallet entry carries. Without one, the stay's id is what
              an operator opens. */}
          <span className="font-mono [user-select:all]">{refund.reference ?? refund.bookingId}</span>
          {" · "}
          <Link href={`/admin/bookings/${refund.bookingId}`} className="underline">
            {c.openStay}
          </Link>
        </>
      }
      amount={
        <>
          {formatMoney(refund.refundMinor, locale)}
          {refund.retainedMinor > 0 && (
            <span className="block text-[length:var(--nf-text-overline)] font-normal text-[var(--nf-content-muted)]">
              {fill(c.kept, { amount: formatMoney(refund.retainedMinor, locale) })}
            </span>
          )}
        </>
      }
      status={<PaperStatus state={PAPER_STATE[refund.state]}>{c.refundState[refund.state]}</PaperStatus>}
    />
  );
}

/**
 * THE REFUND RECORD.
 *
 * Two kinds of money go back to a person on this platform and both are decided
 * elsewhere: a stay's refund on the stay's own page, where the published
 * schedule works out the figure and the operator chooses only why. This
 * section is the RECORD of that: every refund decided, with the processor's own
 * word beside it for where the money is now. It is read only, and it is
 * drawn as a statement (a light document sheet on the console's theme, D28.1)
 * because it is exactly what an operator screenshots to show a guest, a
 * colleague or an auditor. Nothing on this section types an amount and nothing
 * here offers a way to refund: that path is the stay's own page and no other.
 */
export function RefundsPanel({
  refunds,
  narrowed,
  locale,
  ui,
  className = "nf-admin-doc nf-admin-anchor",
}: {
  refunds: AdminRead<RefundConsole>;
  /** The container's classes. The desk passes its own; the preview keeps the default. */
  className?: string;
  /** True when a filter is applied, so an empty list is the filter's answer. */
  narrowed: boolean;
  locale: Locale;
  ui: AdminUi;
}) {
  const t = getDictionary(locale);
  const c = t.admin.money;
  const x = t.experienceAdmin.money;
  return (
    <section className={className} id="refunds">
      <DocumentSheet aria-labelledby="refunds-title" data-testid="refund-record">
        <DocHead label={x.refundsOverline} title={c.refundsTitle} id="refunds-title" />
        <p className="nf-doc__note">{c.refundsBody}</p>

        {refunds.state !== "ok" ? (
          <div className="mt-sm">
            <ui.QueueUnavailable />
          </div>
        ) : (
          <>
            <DocRows>
              <DocRow label={c.returned} numeric>
                {formatMoney(refunds.data.totals.refundedMinor, locale)}
              </DocRow>
              <DocRow label={c.notCredited} numeric>
                <PaperStatus state={refunds.data.totals.notSubmitted === 0 ? "done" : "failed"}>
                  {String(refunds.data.totals.notSubmitted)}
                </PaperStatus>
              </DocRow>
            </DocRows>
            <p className="nf-doc__note">
              {plural(refunds.data.totals.count, c.returnedHint, locale)}. {c.notCreditedHint}
            </p>

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
              <PaperLedger label={c.refundsTitle}>
                {refunds.data.rows.map((refund) => (
                  <RefundRow key={refund.id} refund={refund} locale={locale} ui={ui} />
                ))}
              </PaperLedger>
            )}
          </>
        )}
      </DocumentSheet>
    </section>
  );
}
