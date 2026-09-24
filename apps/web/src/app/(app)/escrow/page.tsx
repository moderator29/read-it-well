import type { Metadata } from "next";

import { EmptyState, Section, Stack } from "@/components/app/Screen";
import { PageHeader } from "@/components/app/PageHeader";
import { HeldPaymentSheet } from "@/components/app/escrow/HeldPaymentSheet";
import { resolveSession } from "@/lib/actions/session";
import { isSettled } from "@/lib/escrow/copy";
import { readHeldPayments } from "@/lib/escrow/queries";
import { heldPaymentsAreOpen } from "@/lib/escrow/flag";

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
        {/* THE WAY UP. This screen had none: no header, no arrow, and no inbound
          link anywhere in the product either, so the only way anybody reaches it
          is by pressing back from a held payment or by typing the address, and
          until now both of those were one-way. `/wallet` is the declared parent
          in `lib/nav/route-parents.ts`; the fallback repeats it for the same
          reason every other call site passes one, and is never read while the
          route is declared. */}
        <PageHeader layout="stacked" title="Held payments" fallback="/wallet" />
        <Section>
          <EmptyState
            icon="shield-lock"
            title="Sign in to see your held payments"
            body="Money set aside between two people is only ever visible to those two people."
          />
        </Section>
      </Stack>
    );
  }

  const [{ payments, readFailed }, gateOpen] = await Promise.all([readHeldPayments(), heldPaymentsAreOpen()]);

  if (readFailed) {
    return (
      <Stack>
        {/* THE WAY UP. This screen had none: no header, no arrow, and no inbound
          link anywhere in the product either, so the only way anybody reaches it
          is by pressing back from a held payment or by typing the address, and
          until now both of those were one-way. `/wallet` is the declared parent
          in `lib/nav/route-parents.ts`; the fallback repeats it for the same
          reason every other call site passes one, and is never read while the
          route is declared. */}
        <PageHeader layout="stacked" title="Held payments" fallback="/wallet" />
        <Section>
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
      <PageHeader layout="stacked" title="Held payments" fallback="/wallet" />
      <Section>
        {open.length === 0 ? (
          gateOpen ? (
            <EmptyState
              icon="wallet-secure"
              title="Nothing is set aside"
              body="When you agree an agency fee with somebody on Vallo, you can set the money aside until the work is done. It stays out of both balances until then."
            />
          ) : (
            /* ESC-13. While the held-payments switch is off nothing can be set
               aside, so the empty state says that instead of describing it. */
            <EmptyState
              icon="wallet-secure"
              title="Held payments are not open yet"
              body="Nothing can be set aside on Vallo today. Anything you set aside before stays on this page."
            />
          )
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
