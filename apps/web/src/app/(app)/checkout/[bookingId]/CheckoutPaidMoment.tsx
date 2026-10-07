import { getDictionary } from "@vallo/i18n";
import type { Locale } from "@vallo/i18n/core";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { MoneyMoment } from "@/components/money/kit";

/**
 * THE PAID MOMENT (PREMIUM-STANDARD references 4 and 7): a small green
 * check dot, the title, one line saying what it settled. The receipt follows
 * it on the page, with "Download receipt" and the quiet way on under it; the
 * dot pops once (A.1) and is still under reduced motion, Calm and Off.
 *
 * Drawn only for `view.paid`, which is a SUCCESSFUL transaction row and
 * nothing else; it decides nothing about the money.
 */
export function CheckoutPaidMoment({ view, locale }: { view: CheckoutView; locale: Locale }) {
  const c = getDictionary(locale).checkout;
  return <MoneyMoment tone="done" as="h2" title={c.stayPaidFor} line={c.stayPaidBody.replace("{total}", view.totalDisplay)} testId="checkout-paid-moment" />;
}
