import { Section, Stack } from "@/components/app/Screen";
import { PageHeader } from "@/components/app/PageHeader";
import { EvidenceFiler } from "@/components/app/escrow/EvidenceFiler";
import { EvidenceList } from "@/components/app/escrow/EvidenceList";
import { HeldPaymentControls } from "@/components/app/escrow/HeldPaymentControls";
import { HeldPaymentReceipt } from "@/components/app/escrow/HeldPaymentReceipt";
import { HeldPaymentSheet } from "@/components/app/escrow/HeldPaymentSheet";
import { SET_ASIDE_SENTENCE } from "@/lib/escrow/copy";
import { DISPUTED, EVIDENCE, HELD, RELEASED } from "../escrow/fixtures";

import "@/app/css/escrow.css";

/**
 * /escrow/[id] in the order the route draws it. `?state=held` shows the
 * payer's live controls, `?state=released` the receipt; the default is the
 * disputed agreement with evidence and the filer open.
 */
export default async function SweepEscrowDetail({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = (await searchParams).state;
  const payment = state === "held" ? HELD : state === "released" ? RELEASED : DISPUTED;
  return (
    <Stack>
      <PageHeader layout="stacked" title="Held payment" fallback="/preview/session-b/sweep-stays/escrow" />
      <Section>
        <HeldPaymentSheet payment={payment} />
        <p className="nf-esc-line">{SET_ASIDE_SENTENCE}</p>
        <HeldPaymentControls id={payment.id} state={payment.state} viewer={payment.viewer} />
      </Section>
      {payment.disputeReason ? (
        <Section title="What was said">
          <p className="nf-esc-line">{payment.disputeReason}</p>
        </Section>
      ) : null}
      <Section title="Receipt">
        <HeldPaymentReceipt payment={payment} />
      </Section>
      <Section
        title="What has been filed"
        description="Files and facts, from both of you. Everything here is visible to both sides and nothing can be changed once it is filed."
      >
        <EvidenceList evidence={payment === DISPUTED ? EVIDENCE : []} />
        {payment !== RELEASED ? <EvidenceFiler id={payment.id} authorId="me" /> : null}
      </Section>
    </Stack>
  );
}
