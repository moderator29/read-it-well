/* Preview harness for STEP 8, FUNDED (D68d): the held payment, drawn by the
   real HeldPaymentBody from recorded facts, one state per link. Nothing is
   read and the release control is never confirmed here.

     /preview/held                  the renter: the money is protected
     ?state=lister                  the lister: held for you, what you receive
     ?state=stages                  the lister, released in stages

   Closed outside development by the preview layout. */
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { HeldPaymentBody } from "@/app/(app)/agreements/[id]/held/HeldPaymentBody";
import type { HeldFacts } from "@/lib/money/held-model";

const RENTER: HeldFacts = {
  role: "renter",
  status: "protected",
  amountMinor: 120_000_000,
  providerFeeMinor: null,
  paused: false,
  counterpartName: "Adaeze Okafor",
  placeTitle: "Two-bedroom flat, Yaba",
  moveIn: "1 November 2026",
  milestones: [],
};

const STATES: Record<string, HeldFacts> = {
  renter: RENTER,
  lister: { ...RENTER, role: "lister", providerFeeMinor: 1_500_000 },
  stages: {
    ...RENTER,
    role: "lister",
    providerFeeMinor: 1_500_000,
    milestones: [
      {
        position: 1,
        title: "Keys handed over",
        amountMinor: 60_000_000,
        status: "released",
      },
      {
        position: 2,
        title: "First month settled",
        amountMinor: 60_000_000,
        status: "pending",
      },
    ],
  },
};

export default async function PreviewHeldPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const [{ state }, locale] = await Promise.all([searchParams, getLocale()]);
  const facts = STATES[state ?? "renter"] ?? RENTER;
  return (
    <div className="mx-auto max-w-xl px-md pb-2xl">
      <PageHeader title="Escrow payment" fallback="/preview" />
      <HeldPaymentBody
        facts={facts}
        locale={locale}
        agreementId="00000000-0000-4000-8000-000000000001"
        arrangementId="00000000-0000-4000-8000-000000000002"
      />
    </div>
  );
}
