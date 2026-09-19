import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { SegmentedProgress } from "@/components/ui/Progress";
import { CheckoutSummary } from "@/app/(app)/checkout/[bookingId]/CheckoutSummary";
import { HoldCountdown } from "@/app/(app)/checkout/[bookingId]/HoldCountdown";
import { CheckoutPreviewPanel } from "./CheckoutPreviewPanel";
import { CHECKOUT } from "../fixtures";

/**
 * /checkout/[bookingId] with the fixture booking and one saved card, composed
 * from the route's own parts in the route's own order: the step bar, the
 * summary card, the hold clock, then the pay panel with the saved-card option
 * the page wires through `chargeSavedCard`. The charge itself is a stub that
 * answers with the envelope's refusal: the harness proves the look, never a
 * payment.
 */
export default async function CheckoutPreview() {
  const locale = await getLocale();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="calendar-check" />
        <PageHeader title="Checkout" subtitle={CHECKOUT.title} fallback="/preview/f3" />
      </div>
      <div className="mb-md">
        <SegmentedProgress steps={3} current={2} label="Step 2 of 3: review and pay" />
      </div>
      <CheckoutSummary view={CHECKOUT} locale={locale} />
      <div className="mt-md">
        <HoldCountdown expiresAt={CHECKOUT.holdExpiresAt} locale={locale} />
      </div>
      <CheckoutPreviewPanel />
    </div>
  );
}
