import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState, Section, Stack } from "@/components/app/Screen";
import { EvidenceFiler } from "@/components/app/escrow/EvidenceFiler";
import { EvidenceList } from "@/components/app/escrow/EvidenceList";
import { HeldPaymentControls } from "@/components/app/escrow/HeldPaymentControls";
import { HeldPaymentReceipt } from "@/components/app/escrow/HeldPaymentReceipt";
import { HeldPaymentSheet } from "@/components/app/escrow/HeldPaymentSheet";
import { resolveSession } from "@/lib/actions/session";
import { SET_ASIDE_SENTENCE, custodySentence, isLive } from "@/lib/escrow/copy";
import { readHeldPayment } from "@/lib/escrow/queries";

import "@/app/css/escrow.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Held payment", robots: { index: false, follow: false } };
}

/**
 * /escrow/[id]: one held payment, everything about it, and what to do next.
 *
 * WHAT IS ON THE PAGE, in the order a person reads it. The amount and what it
 * is for. The state, as a word. What that state means to THIS reader, which
 * differs by side. The payout date, as a date. The controls that are actually
 * open. Then, if it has settled, the receipt; and if anything is disputed,
 * everything both sides have filed.
 *
 * CUSTODY IS NOT ON THIS PAGE AND CANNOT BE PUT ON IT BY ACCIDENT.
 * `custodySentence()` returns null while the structure is undecided, so the
 * paragraph below simply does not render. There is no fallback string to fall
 * back to. The page says what is TRUE under every structure instead: the money
 * is set aside and neither of you can spend it.
 *
 * A ROW THE CALLER IS NOT A PARTY TO IS A 404, not a refusal, because
 * `escrows_select_party` returns nothing and a page that said "you may not see
 * this" would confirm the agreement exists to somebody who should not know.
 */
export default async function HeldPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ payment, evidence, readFailed }, session] = await Promise.all([
    readHeldPayment(id),
    resolveSession(),
  ]);

  if (readFailed) {
    return (
      <Stack>
        <Section title="Held payment">
          <EmptyState
            icon="alert-triangle"
            title="We could not read this"
            body="Nothing has changed and nothing has moved. Refresh in a moment."
          />
        </Section>
      </Stack>
    );
  }

  if (!payment) notFound();

  const custody = custodySentence();

  return (
    <Stack>
      <Section title="Held payment">
        <HeldPaymentSheet payment={payment} />
        <p className="nf-esc-line">{SET_ASIDE_SENTENCE}</p>
        {custody ? <p className="nf-esc-line">{custody}</p> : null}
        <HeldPaymentControls id={payment.id} state={payment.state} viewer={payment.viewer} />
      </Section>

      {payment.disputeReason ? (
        <Section title="What was said">
          <p className="nf-esc-line">{payment.disputeReason}</p>
        </Section>
      ) : null}

      {payment.resolutionNote ? (
        <Section title="Vallo's decision">
          <p className="nf-esc-line">{payment.resolutionNote}</p>
        </Section>
      ) : null}

      <Section title="Receipt">
        <HeldPaymentReceipt payment={payment} />
      </Section>

      <Section
        title="What has been filed"
        description="Files and facts, from both of you. Everything here is visible to both sides and nothing can be changed once it is filed."
      >
        <EvidenceList evidence={evidence} />
        {/*
          THE FILER APPEARS ONLY WHILE THE QUESTION IS STILL OPEN, and the
          states are exactly the ones `escrow_file_evidence_as` accepts: set
          aside, payout asked for, under review. Once it has settled the
          question is answered and filing against it would be an appeal rather
          than evidence, so the database refuses it and the screen does not
          offer it. The list above stays, because a settled agreement's file is
          the record of how it settled.

          The author id comes from the session rather than from the row,
          because it decides where in the bucket the bytes go and the storage
          policy checks that folder against the caller.
        */}
        {isLive(payment.state) && session.state === "signed-in" ? (
          <EvidenceFiler id={payment.id} authorId={session.user.id} />
        ) : null}
      </Section>
    </Stack>
  );
}
