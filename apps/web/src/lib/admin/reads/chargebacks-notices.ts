import { formatMoney, getDictionary } from "@vallo/i18n";
import type { NoticeRow } from "@/lib/notify/in-app";
import { LISTER_NOTICE_HREF, payerNoticeHref, type NoticePlan } from "./chargebacks-model";

/**
 * The notice rows the chargebacks desk writes after a move, from the plan
 * `noticesForMove` makes. In English like every app-side notice, and of kind
 * `booking` like the payment notices (nt02), so the person's Bookings switch
 * governs them exactly as `private.notify` would once they go through
 * `writeInAppNotices`. A plan whose person is not on the charge is dropped.
 *
 * Kept out of `chargebacks-model.ts` so the desk's client components do not
 * carry the whole dictionary.
 */
export function noticeRowsFor(
  plans: readonly NoticePlan[],
  people: { listerId: string | null; payerId: string | null; bookingId: string | null },
  amountMinor: number,
  currency: string,
): NoticeRow[] {
  const n = getDictionary("en").chargebacks.notices;
  const amount = formatMoney(amountMinor, "en", currency);
  const rows: NoticeRow[] = [];
  for (const plan of plans) {
    const to = plan.to === "lister" ? people.listerId : people.payerId;
    if (!to) continue;
    const words = n[plan.key];
    rows.push({
      user_id: to,
      kind: "booking",
      title: words.title,
      body: words.body.replace("{amount}", amount),
      href: plan.to === "lister" ? LISTER_NOTICE_HREF : payerNoticeHref(people.bookingId),
    });
  }
  return rows;
}
