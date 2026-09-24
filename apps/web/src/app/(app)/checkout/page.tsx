import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getStayDetail } from "@/lib/stays/queries";
import { readStayDates } from "@/components/app/stays/model";
import { PageHeader } from "@/components/app/PageHeader";
import { ResultScreen } from "@/components/app/ResultSheet";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Panel } from "@/components/ui/Panel";
import { ICON, TYPE } from "@/components/app/Screen";
import { formatMoneyDate } from "@/lib/money/dates";
import { cancelStanding, termsFromPolicyRules } from "@/lib/trust/cancellation";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * Where a room's Reserve control lands: `/checkout?stay=…&room=…&rate=…`.
 *
 * THE HONEST STATE, NOT A DEAD LINK. The rate sheet on `/stay/[id]` builds
 * this address (`reserveHref` in RoomTypes.tsx) and until now nothing
 * answered it, so the one control that says Reserve opened a page that did
 * not exist. A booking row still needs `bookings.listing_id` to point at a
 * catalogue listing; the relaxation that lets it carry a business-grade
 * room (M6) is drafted and waits on the founder's word. So this screen says
 * exactly what is true: what was picked, that nothing was held, that
 * nothing was charged, and where to go. When M6 lands, the reserve action
 * writes the row here and this page hands over to `/checkout/[bookingId]`.
 *
 * Every figure is read again from the property's own rate plan, never from
 * the address bar: a query string names a plan, it never prices one.
 */
export default async function RoomCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const stayId = typeof query.stay === "string" ? query.stay : "";
  const roomId = typeof query.room === "string" ? query.room : "";
  const rateId = typeof query.rate === "string" ? query.rate : "";
  if (!stayId) redirect("/stays");

  const [locale, detail] = await Promise.all([getLocale(), getStayDetail(stayId)]);
  const t = getDictionary(locale);
  const copy = t.stayDetail;
  const { checkIn, checkOut, nights, guests } = readStayDates(query);

  const room = detail?.room_types.find((row) => row.id === roomId) ?? null;
  const plan = room?.rate_plans.find((row) => row.id === rateId) ?? null;
  const total = plan && nights !== null && nights > 0 ? plan.rate_minor * nights : null;
  /* V-20 and V-24. The chosen rate's own cancellation terms, as a date, under
     the total; and the stay's dates as weekdays rather than ISO strings. The
     terms come from the policy's rules, never its sentence. */
  const cancelCopy = t.afterTheGate.cancel;
  const checkInHour = Number.parseInt(detail?.accommodation.check_in_from ?? "", 10);
  const terms = plan?.policy
    ? termsFromPolicyRules(plan.policy.id, plan.policy.rules, Number.isInteger(checkInHour) ? checkInHour : 15)
    : null;
  // A closed free window is never printed as a promise: from now the rate
  // is priced by its next tier (a dynamic route, so this is the reading time).
  const standing = terms && checkIn ? cancelStanding(terms, checkIn, new Date()) : null;
  const cancelLine = standing
    ? standing.kind === "free"
      ? cancelCopy.freeUntil.replace("{date}", formatMoneyDate(standing.until, locale, { withTime: true }) ?? "")
      : standing.kind === "share"
        ? cancelCopy.shareNow.replace("{percent}", String(standing.refundBps / 100))
        : cancelCopy.nonRefundable
    : null;
  const checkInLabel = checkIn ? (formatMoneyDate(checkIn, locale) ?? checkIn) : null;
  const checkOutLabel = checkOut ? (formatMoneyDate(checkOut, locale) ?? checkOut) : null;
  const backHref = detail
    ? `/stay/${detail.accommodation.id}${checkIn && checkOut ? `?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}` : ""}`
    : "/stays";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Checkout" subtitle={detail?.accommodation.name} fallback={backHref} />

      {detail && room && plan && (
        <Panel variant="card" aria-labelledby="nf-room-pick" data-testid="room-pick">
          <h2 id="nf-room-pick" className="nf-h3">
            {room.name}
          </h2>
          <p className={`mt-2xs ${TYPE.rowMeta}`}>
            {plan.name} &middot; {copy.sleeps.replace("{count}", String(room.sleeps))}
          </p>
          <dl className="mt-md grid gap-xs border-t border-[var(--nf-panel-hair)] pt-md">
            {checkIn && checkOut && (
              <div className="flex items-start justify-between gap-md">
                <dt className={TYPE.rowMeta}>{t.catalogue.stays.checkIn}</dt>
                <dd className={`text-right ${TYPE.rowTitle}`}>
                  <span className="nf-numeric">{checkInLabel}</span>
                </dd>
              </div>
            )}
            {checkIn && checkOut && (
              <div className="flex items-start justify-between gap-md">
                <dt className={TYPE.rowMeta}>{t.catalogue.stays.checkOut}</dt>
                <dd className={`text-right ${TYPE.rowTitle}`}>
                  <span className="nf-numeric">{checkOutLabel}</span>
                </dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-md">
              <dt className={TYPE.rowMeta}>{t.catalogue.stays.guests}</dt>
              <dd className={`text-right ${TYPE.rowTitle}`}>{copy.guests.replace("{count}", String(guests))}</dd>
            </div>
            <div className="flex items-start justify-between gap-md">
              <dt className={TYPE.rowMeta}>{copy.perNight}</dt>
              <dd className={`text-right ${TYPE.rowTitle}`}>
                <Amount minorUnits={plan.rate_minor} locale={locale} />
              </dd>
            </div>
            {total !== null && nights !== null && (
              <div className="flex items-start justify-between gap-md border-t border-[var(--nf-panel-hair)] pt-xs">
                <dt className={TYPE.rowMeta}>{copy.totalFor.replace("{count}", String(nights))}</dt>
                <dd className="nf-numeric text-right nf-h4 text-[var(--nf-content-primary)]">
                  <Amount minorUnits={total} locale={locale} />
                </dd>
              </div>
            )}
          </dl>
          {cancelLine && total !== null && (
            <p className="nf-body mt-xs font-semibold text-[var(--nf-content-primary)]" data-testid="room-cancel-line">
              {cancelLine}
            </p>
          )}
        </Panel>
      )}

      <ResultScreen
        state="expired"
        mark="calendar-check"
        verdict={detail ? "Vallo cannot hold this room" : "We could not find that stay"}
        consequence={
          detail
            ? "Rooms at this property are not reserved through Vallo, so nothing has been held and nothing has been charged. Go back to the stay for its rates and the ways to reach the property, or find another stay."
            : "It may have been taken off the shelf, or the link is incomplete. Nothing has been held and nothing has been charged."
        }
        actions={[
          { label: detail ? "Back to the stay" : t.stays.findStay, href: backHref, tone: "primary" },
          { label: t.stays.findStay, href: "/stays/search", tone: "quiet" },
        ]}
        data-testid="room-checkout-state"
      />

      <p className={`flex items-start gap-inline ${TYPE.caption}`}>
        <UiIcon name="verified" size={ICON.inline} className="mt-3xs shrink-0 text-[var(--nf-brand-secondary)]" />
        <span>Money moves inside Vallo only once a booking exists and its total is stored to the kobo.</span>
      </p>
    </div>
  );
}
