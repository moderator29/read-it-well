import Link from "next/link";
import { PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";

/**
 * What a pay screen shows before payment is available.
 *
 * TRACK A. Payment opens only when the agreement is approved. Until then a pay
 * screen does not draw a button that the database would refuse: it says which
 * step the agreement is at and takes the person to it.
 */

const STEP: Record<string, string> = {
  awaiting_parties: "The agreement is waiting for both of you to confirm the terms.",
  in_review: "Both of you have confirmed. Vallo is reviewing the agreement now; you will get an email and a notification when it is decided.",
  rejected: "Vallo sent the agreement back. Read the reason, change the terms and confirm again.",
  cancelled: "This agreement was cancelled, so there is nothing to pay.",
  paid: "This is already paid.",
};

export function PaymentGate({
  agreement,
}: {
  agreement: { id: string; status: string; reason: string | null } | null;
}) {
  const line = agreement ? (STEP[agreement.status] ?? PAYMENT_GATE_SENTENCE) : PAYMENT_GATE_SENTENCE;
  return (
    <section
      aria-labelledby="nf-payment-gate"
      className="nf-card p-card"
      data-testid="payment-gate"
      data-agreement-status={agreement?.status ?? "none"}
    >
      <h2 id="nf-payment-gate" className="nf-h3">
        Payment is not open yet
      </h2>
      <p className="nf-body mt-inline">{line}</p>
      {agreement?.status === "rejected" && agreement.reason ? (
        <p className="nf-body mt-inline">
          <strong>Reason: </strong>
          {agreement.reason}
        </p>
      ) : null}
      <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">{PAYMENT_GATE_SENTENCE}</p>
      {agreement ? (
        <Link href={`/agreements/${agreement.id}`} className="nf-btn nf-btn--primary mt-block inline-flex">
          Open the agreement
        </Link>
      ) : null}
    </section>
  );
}
