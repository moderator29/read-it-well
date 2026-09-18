import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { CheckoutPreviewPanel } from "./CheckoutPreviewPanel";

/**
 * /checkout/[bookingId] with the fixture booking and one saved card, so the
 * saved-card option the page now wires (`chargeSavedCard`) is visible. The
 * charge itself is a stub that answers with the envelope's refusal: the
 * harness proves the look, never a payment.
 */
export default async function CheckoutPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.bookings} subtitle="Checkout" fallback="/preview/f3" />
      <CheckoutPreviewPanel />
    </div>
  );
}
