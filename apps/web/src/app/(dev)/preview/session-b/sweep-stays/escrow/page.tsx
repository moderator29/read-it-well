import { Section, Stack } from "@/components/app/Screen";
import { PageHeader } from "@/components/app/PageHeader";
import { HeldPaymentSheet } from "@/components/app/escrow/HeldPaymentSheet";
import { DISPUTED, HELD, RELEASED } from "./fixtures";

import "@/app/css/escrow.css";

/** /escrow on fixture rows: one live, one disputed, one settled. */
export default function SweepEscrowList() {
  return (
    <Stack>
      <PageHeader layout="stacked" title="Held payments" fallback="/preview/session-b/sweep-stays" />
      <Section>
        {[HELD, DISPUTED, RELEASED].map((payment) => (
          <HeldPaymentSheet key={payment.id} payment={payment} href="/preview/session-b/sweep-stays/escrow-detail" />
        ))}
      </Section>
    </Stack>
  );
}
