import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, formatParty, getDictionary, plural } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { lagosToday } from "@/lib/bookings/schema";
import { getBookingDetail } from "@/lib/admin/bookings-queries";
import type { CancellationReason } from "@/lib/trust/cancellation";
import { StayCancel } from "../../_components/AdminActions";
import { fill } from "../../_components/copy";
import { adminUi } from "../../_components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.bookings.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * One stay, in full, and the only place on Vallo where a paid stay can be
 * cancelled and the money returned.
 *
 * Everything an operator needs to make that decision is on this page before
 * the decision is offered: what was paid, what has already gone back, every
 * payment attempt, every refund already decided and the whole of the stay's
 * history with a name against each line. The control itself is last, after all
 * of it, because a refund is somebody's money and the reading comes first.
 *
 * A stay whose last night has passed is deliberately NOT cancellable here.
 * Releasing nights nobody can rebook helps nobody, and the money question on a
 * stay that already happened is a different conversation with a different
 * answer, so the page says so rather than offering a button that would do the
 * wrong thing quietly.
 */
export default async function AdminBookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.admin.bookings;
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const { bookingId } = await params;
  const read = await getBookingDetail(bookingId);

  const backLink = (
    <Link href="/admin/bookings" className="nf-chip mb-4 inline-flex w-fit items-center gap-1.5">
      {copy.back}
    </Link>
  );

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        {backLink}
        <ui.QueueUnavailable />
      </div>
    );
  }

  const stay = read.data;
  if (!stay) {
    return (
      <div className="nf-console">
        {backLink}
        <ui.QueueEmpty title={copy.goneTitle} body={copy.goneBody} />
      </div>
    );
  }

  const f = copy.fields;
  const money = (minor: number) => formatMoney(minor, locale);
  const place = [stay.area, stay.city].filter(Boolean).join(", ");
  const over = stay.checkOut < lagosToday();
  const cancellable = stay.status !== "CANCELLED" && !over;

  return (
    <div className="nf-console">
      {backLink}

      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <ui.StatusChip status={stay.status} />
          {stay.paidMinor > 0 ? (
            <ui.StatusChip
              label={fill(copy.settledChip, { amount: money(stay.paidMinor) })}
              tone="success"
            />
          ) : (
            <ui.StatusChip label={copy.unpaidChip} tone="neutral" />
          )}
          {stay.refundedMinor > 0 && (
            <ui.StatusChip
              label={fill(copy.refundedChip, { amount: money(stay.refundedMinor) })}
              tone="warning"
            />
          )}
        </div>
        <h1 className="nf-h1 mt-2.5 text-[1.5rem] sm:text-[1.75rem]">{stay.listingTitle}</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--nf-content-secondary)]">
          {place.length > 0 ? `${place} · ` : ""}
          {fill(copy.bookedWhen, { when: ui.when(stay.createdAt) })}
        </p>
      </header>

      <div className="nf-card p-4 sm:p-5">
        <ui.DetailSection title={copy.sections.stay}>
          <ui.DetailRow label={f.reference} value={<span className="nf-numeric">{stay.id}</span>} />
          <ui.DetailRow
            label={f.dates}
            value={`${ui.day(stay.checkIn)} to ${ui.day(stay.checkOut)}`}
          />
          <ui.DetailRow label={f.length} value={plural(stay.nights, t.counts.nights, locale)} />
          {/* This row read "1 adults" for a party of one, in every language, for
              the whole life of the console. The count nouns now go through
              `Intl.PluralRules` for the request's locale, and the adults-only
              case is decided by `formatParty` rather than by a ternary here, so
              every surface that states a party states it the same way. */}
          <ui.DetailRow
            label={f.party}
            value={formatParty(stay.adults, stay.children, t.counts, locale)}
          />
          <ui.DetailRow label={f.status} value={ui.statusLabel(stay.status)} />
        </ui.DetailSection>

        <ui.DetailSection title={copy.sections.people}>
          <ui.DetailRow label={f.guest} value={stay.guestName ?? copy.unnamed} />
          <ui.DetailRow label={f.host} value={stay.agentName} />
          <ui.DetailRow
            label={f.listing}
            value={
              <Link href={`/listing/${stay.listingId}`} className="underline">
                {stay.listingTitle}
              </Link>
            }
          />
          {stay.arrivingName && (
            <>
              <ui.DetailRow label={f.arriving} value={stay.arrivingName} />
              <ui.DetailRow label={f.arrivingPhone} value={stay.arrivingPhone} />
              <ui.DetailRow label={f.arrivingEmail} value={stay.arrivingEmail} />
            </>
          )}
        </ui.DetailSection>

        <ui.DetailSection title={copy.sections.money}>
          <ui.DetailRow label={f.perNight} value={money(stay.pricePerNightMinor)} />
          <ui.DetailRow label={f.cleaning} value={money(stay.cleaningFeeMinor)} />
          <ui.DetailRow label={f.service} value={money(stay.serviceFeeMinor)} />
          <ui.DetailRow label={f.subtotal} value={money(stay.subtotalMinor)} />
          <ui.DetailRow
            label={f.total}
            value={<span className="font-semibold">{money(stay.totalMinor)}</span>}
          />
          <ui.DetailRow label={f.settled} value={money(stay.paidMinor)} />
          <ui.DetailRow label={f.returned} value={money(stay.refundedMinor)} />
        </ui.DetailSection>

        <ui.DetailSection title={copy.sections.payments}>
          {stay.payments.length === 0 ? (
            <p className="py-2 text-[0.875rem] text-[var(--nf-content-muted)]">
              {copy.noPayments}
            </p>
          ) : (
            stay.payments.map((payment) => (
              <ui.DetailRow
                key={payment.id}
                label={ui.when(payment.createdAt)}
                value={
                  <span>
                    <span className="nf-numeric font-semibold">{money(payment.amountMinor)}</span>
                    {" · "}
                    {payment.provider}
                    {" · "}
                    {payment.status}
                    {payment.reference ? (
                      <span className="mt-0.5 block break-all text-[0.75rem] text-[var(--nf-content-muted)]">
                        {payment.reference}
                      </span>
                    ) : null}
                  </span>
                }
              />
            ))
          )}
        </ui.DetailSection>

        <ui.DetailSection title={copy.sections.refunds}>
          {stay.refunds.length === 0 ? (
            <p className="py-2 text-[0.875rem] text-[var(--nf-content-muted)]">{copy.noRefunds}</p>
          ) : (
            stay.refunds.map((refund) => (
              <ui.DetailRow
                key={refund.id}
                label={fill(copy.decidedBy, {
                  who: refund.decidedByName ?? copy.unnamed,
                  when: ui.when(refund.createdAt),
                })}
                value={
                  <span>
                    <span className="block">
                      {fill(copy.refundLine, {
                        refund: money(refund.refundMinor),
                        retained: money(refund.retainedMinor),
                      })}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-[var(--nf-content-muted)]">
                      {copy.reasons[refund.reason as CancellationReason] ?? refund.reason}
                    </span>
                    {refund.note ? <span className="mt-0.5 block">{refund.note}</span> : null}
                    {refund.reference ? (
                      <span className="mt-0.5 block break-all text-[0.75rem] text-[var(--nf-content-muted)]">
                        {refund.reference}
                      </span>
                    ) : null}
                  </span>
                }
              />
            ))
          )}
        </ui.DetailSection>

        <ui.DetailSection title={copy.sections.history}>
          {stay.events.map((event) => (
            <ui.DetailRow
              key={event.id}
              label={ui.when(event.createdAt)}
              value={
                <span>
                  <span className="block">
                    {event.from ? `${ui.statusLabel(event.from)} to ` : ""}
                    {ui.statusLabel(event.to)}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </span>
                  {event.note ? (
                    <span className="mt-0.5 block text-[0.8125rem] text-[var(--nf-content-secondary)]">
                      {event.note}
                    </span>
                  ) : null}
                </span>
              }
            />
          ))}
        </ui.DetailSection>

        {cancellable ? (
          <StayCancel bookingId={stay.id} copy={copy} common={common} locale={locale} />
        ) : (
          <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {stay.status === "CANCELLED" ? copy.cancelledAlready : copy.pastNote}
          </p>
        )}
      </div>
    </div>
  );
}
