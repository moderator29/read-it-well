import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { getRentPayView } from "@/lib/rent/queries";
import { isBookingReference } from "@/lib/payments/references";
import { listPaymentMethods } from "@/lib/payments/methods-actions";
import type { PaymentMethod } from "@/lib/payments/methods";
import { ResultScreen } from "@/components/app/ResultSheet";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { PaymentReturn } from "@/app/(app)/checkout/[bookingId]/PaymentReturn";
import { RENT_PAID_PAGE_CONSEQUENCE } from "@/app/(app)/checkout/[bookingId]/payment-copy";
import { PayPanel } from "./PayPanel";
import { RentSummary } from "./RentSummary";
import { chargeRentSavedCardFor } from "./saved-card-action";

export const metadata: Metadata = { title: "Pay the rent" };

/**
 * The rent payment step.
 *
 * Where the inspection journey ends on the platform: the move-in ledger the
 * listing page led with, now as the figure to pay, and the three ways to pay
 * it. Every figure is the listing's own move-in arithmetic in integer kobo,
 * frozen on the charge by the database the moment it opens, read under the
 * tenant's own RLS, so the amount on screen is the amount the payment actions
 * charge.
 *
 * The platform charges nothing, so the total is the lister's move-in figure
 * and nothing else. A rent paid by card comes back to this route as
 * ?paid=1&reference=rm-book-... exactly as a stay does, where `PaymentReturn`
 * verifies the charge and settles it through the identical function the
 * webhook calls.
 *
 * Every state that is not "ready to pay" is a designed, honest screen: no
 * keys yet, signed out, no such inspection, not accepted yet, no figure to
 * pay, the lister looking at the tenant's page, already paid. None is a crash
 * and none leaks a code.
 */
export default async function RentPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ inspectionId: string }>;
  searchParams: Promise<{ paid?: string; reference?: string }>;
}) {
  const { inspectionId } = await params;
  const { paid, reference } = await searchParams;
  const locale = await getLocale();
  const read = await getRentPayView(inspectionId, locale);

  const settling =
    paid === "1" && typeof reference === "string" && isBookingReference(reference) ? reference : null;

  if (read.state === "unconfigured") {
    return (
      <Shell>
        <ResultScreen
          state="pending"
          mark="card-lock"
          verdict="We cannot reach payment right now"
          consequence="This is on our side, not yours. Nothing has been charged and your inspection is unchanged. Try again in a few minutes."
          actions={[{ label: "See your inspections", href: "/inspections", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "signed-out") {
    return (
      <Shell>
        <ResultScreen
          state="confirmed"
          mark="shield-check"
          verdict="Sign in to pay the rent"
          consequence="Your inspection is kept. Sign in and you land straight back here."
          actions={[{ label: "Sign in", href: "/sign-in", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "missing") {
    return (
      <Shell>
        <ResultScreen
          state="missing"
          verdict="We could not find that inspection"
          consequence="It may have been withdrawn, or it belongs to another account. Your inspections are all in one place."
          actions={[{ label: "See your inspections", href: "/inspections", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "unavailable") {
    return (
      <Shell>
        <ResultScreen
          state="failed"
          mark="alert-triangle"
          verdict="The payment step did not open"
          consequence="Nothing has been charged. Try again in a few minutes."
          actions={[{ label: "See your inspections", href: "/inspections", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "not-tenant") {
    return (
      <Shell subtitle={read.title}>
        <ResultScreen
          state="confirmed"
          mark="shield-check"
          verdict="This is your listing"
          consequence="The person who inspected it pays the move-in total here, and you are told the moment it lands."
          actions={[{ label: "See your inspections", href: "/agent/inspections", tone: "primary" }]}
        />
      </Shell>
    );
  }

  if (read.state === "not-accepted") {
    return (
      <Shell subtitle={read.title}>
        <ResultScreen
          state="pending"
          mark="calendar-check"
          verdict="Waiting on the lister"
          consequence="Nothing can be paid until the lister accepts your inspection. You will be told the moment they do, and this page opens then."
          actions={[
            { label: "See your inspections", href: "/inspections", tone: "primary" },
            { label: "Back to the listing", href: `/listing/${read.listingId}`, tone: "quiet" },
          ]}
        />
      </Shell>
    );
  }

  if (read.state === "no-charge") {
    return (
      <Shell subtitle={read.title}>
        <ResultScreen
          state="failed"
          mark="seal-cross"
          verdict="There is no figure to pay yet"
          consequence="This listing does not state a rent and its fees, so there is nothing to charge. Ask the lister in your thread to put the move-in figure on the listing."
          actions={[
            { label: "Open messages", href: "/messages", tone: "primary" },
            { label: "Back to the listing", href: `/listing/${read.listingId}`, tone: "quiet" },
          ]}
        />
      </Shell>
    );
  }

  const view = read.view;

  if (view.paid) {
    return (
      <Shell subtitle={view.title}>
        <ResultScreen
          state="confirmed"
          mark="shield-check"
          verdict="The rent is paid"
          consequence={RENT_PAID_PAGE_CONSEQUENCE}
          actions={[
            { label: "Open messages", href: "/messages", tone: "primary" },
            { label: "Back to the listing", href: `/listing/${view.listingId}`, tone: "quiet" },
          ]}
        />
      </Shell>
    );
  }

  const cardsRead = await listPaymentMethods();
  const savedCards: PaymentMethod[] = cardsRead.ok ? cardsRead.data : [];
  const savedCardKey = crypto.randomUUID();
  const chargeSavedCard = chargeRentSavedCardFor.bind(null, inspectionId, savedCardKey);

  return (
    <Shell subtitle={view.title}>
      {settling && (
        <PaymentReturn
          reference={settling}
          amountMinor={view.totalMinor}
          currency={view.currency}
          subject={view.title}
          locale={locale}
          retryHref={`/rent/pay/${inspectionId}`}
        />
      )}

      <Reveal>
        <RentSummary view={view} />
      </Reveal>

      <div className="mt-lg">
        <PayPanel view={view} savedCards={savedCards} chargeSavedCard={chargeSavedCard} />
      </div>
    </Shell>
  );
}

function Shell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pay the rent" subtitle={subtitle ?? "The move-in total, paid inside Vallo"} fallback="/inspections" />
      {children}
    </div>
  );
}
