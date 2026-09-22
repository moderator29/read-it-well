import type { Metadata } from "next";

import { EmptyState, Section, Stack } from "@/components/app/Screen";
import { HeldPaymentSheet } from "@/components/app/escrow/HeldPaymentSheet";
import { resolveSession } from "@/lib/actions/session";
import { isSettled } from "@/lib/escrow/copy";
import { readHeldPayments } from "@/lib/escrow/queries";

import "@/app/css/escrow.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Held payments",
    robots: { index: false, follow: false },
  };
}

/**
 * /escrow: every payment set aside, from both sides, in two groups.
 *
 * A person can be on either side of this table, and on a marketplace where an
 * agent is also a renter they will eventually be on both, in different rows.
 * The side is decided PER ROW by `readHeldPayments`, which is why every
 * sentence on the card is a function of the viewer and not of the session.
 *
 * OPEN is anything still waiting on somebody. SETTLED is a record. A person
 * checking this screen wants the first group; the second is what they show
 * somebody later.
 *
 * AN UNREADABLE LIST AND AN EMPTY ONE LOOK IDENTICAL AND MEAN OPPOSITE
 * THINGS, so the read says which it had and the screen says so in words.
 * Telling somebody they have no held payments when the query failed is how a
 * person concludes their money is gone.
 */
export default async function HeldPaymentsPage() {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return (
      <Stack>
        <Section title="Held payments">
          <EmptyState
            icon="shield-lock"
            title="Sign in to see your held payments"
            body="Money set aside between two people is only ever visible to those two people."
          />
        </Section>
      </Stack>
    );
  }

  const { payments, readFailed } = await readHeldPayments();

  if (readFailed) {
    return (
      <Stack>
        <Section title="Held payments">
          <EmptyState
            icon="alert-triangle"
            title="We could not read your held payments"
            body="Nothing has changed and nothing has moved. Refresh in a moment and they will be here."
          />
        </Section>
      </Stack>
    );
  }

  const open = payments.filter((p) => !isSettled(p.state));
  const settled = payments.filter((p) => isSettled(p.state));

  return (
    <Stack>
      <Section title="Held payments">
        {open.length === 0 ? (
          <EmptyState
            icon="wallet-secure"
            title="Nothing is set aside"
            body="When you agree an agency fee with somebody on Vallo, you can set the money aside until the work is done. It stays out of both balances until then."
          />
        ) : (
          open.map((payment) => (
            <HeldPaymentSheet key={payment.id} payment={payment} href={`/escrow/${payment.id}`} />
          ))
        )}
      </Section>

      {settled.length > 0 ? (
        <Section title="Settled">
          {settled.map((payment) => (
            <HeldPaymentSheet key={payment.id} payment={payment} href={`/escrow/${payment.id}`} />
          ))}
        </Section>
      ) : null}
    </Stack>
  );
}
