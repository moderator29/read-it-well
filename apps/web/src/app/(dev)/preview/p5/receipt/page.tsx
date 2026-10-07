import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PageHeader } from "@/components/app/PageHeader";
import { CheckoutSummary } from "@/app/(app)/checkout/[bookingId]/CheckoutSummary";
import { CheckoutPaidMoment } from "@/app/(app)/checkout/[bookingId]/CheckoutPaidMoment";
import { CHECKOUT } from "../../f3/fixtures";

export const dynamic = "force-dynamic";

/**
 * The paid checkout, composed in the route's order: the payoff, then the one
 * receipt (`ReceiptSheet`, the same model as the receipt email). ?state=due
 * shows the summary before payment.
 */
export default async function ReceiptPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const due = (await searchParams).state === "due";
  const view = { ...CHECKOUT, paid: !due, status: due ? CHECKOUT.status : ("CONFIRMED" as const) };
  const c = getDictionary("en").checkout;
  return (
    <main className="nf-page nf-md">
      <PageHeader title={c.title} fallback="/preview/p5" />
      {due ? null : <CheckoutPaidMoment view={view} locale="en" />}
      <CheckoutSummary view={view} locale="en" back={due ? undefined : { href: "/preview/p5", label: "See your stays" }} />
    </main>
  );
}
