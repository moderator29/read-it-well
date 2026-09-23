import { Section, Stack } from "@/components/app/Screen";
import { PageHeader } from "@/components/app/PageHeader";
import { ProposeHeldPayment } from "@/components/app/messages/ProposeHeldPayment";

import "@/app/css/escrow.css";

/**
 * The held payment as it sits in a conversation, above the message box:
 * the payer's view of a fresh proposal, and the closed composer. Tap the
 * composer to open the proposal form. Fixture props; nothing is written.
 */
export default function SweepEscrowThread() {
  return (
    <Stack>
      <PageHeader layout="stacked" title="Held payment in a thread" fallback="/preview/session-b/sweep-stays" />
      <Section>
        <ProposeHeldPayment
          conversationId="c1"
          counterpartyId="0b6c6f0e-0000-4000-8000-0000000000aa"
          counterpartName="Tunde"
          agreement={{ id: "a1", state: "INITIATED", amountMinor: 25_000_000, purpose: "agency_fee", viewer: "payer" }}
        />
        <ProposeHeldPayment
          conversationId="c2"
          counterpartyId="0b6c6f0e-0000-4000-8000-0000000000aa"
          counterpartName="Tunde"
          agreement={null}
        />
      </Section>
    </Stack>
  );
}
