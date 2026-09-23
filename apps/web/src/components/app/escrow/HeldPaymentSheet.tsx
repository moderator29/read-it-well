
import {
  PURPOSE_LABEL,
  STATE_LABEL,
  amountLine,
  countdown,
  countdownForPayer,
  isSettled,
  stateLine,
} from "@/lib/escrow/copy";
import type { HeldPayment } from "@/lib/escrow/queries";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

/**
 * One held payment, as a card in a list.
 *
 * WHAT IT SAYS AND IN WHAT ORDER. The amount, because it is what a person came
 * to check. What the payment is for. The state, as a word with a dot beside it
 * rather than a dot on its own. What that state means to THIS reader, which is
 * different on the two sides. And the payout date, where there is one.
 *
 * THE DOT IS NEVER THE SIGNAL. It sits beside the word, so a reader who cannot
 * tell one hue from another loses nothing. That is rule D-4 and it is the
 * reason the label is not a coloured chip.
 */

/** Three tones, and each one has its word printed next to it. */
function toneFor(payment: HeldPayment): "live" | "done" | "stopped" {
  if (payment.state === "DISPUTED") return "stopped";
  if (isSettled(payment.state)) return "done";
  return "live";
}

export function HeldPaymentSheet({
  payment,
  href,
}: {
  payment: HeldPayment;
  href?: string;
}): React.ReactElement {
  const due = countdown(payment.autoReleaseAt, payment.state);
  const when = payment.viewer === "payer" ? countdownForPayer(due) : due.kind === "none" ? null : due.line;

  const body = (
    <>
      <div>
        <p className="nf-esc-purpose">{PURPOSE_LABEL[payment.purpose]}</p>
        <p className="nf-esc-amount">{amountLine(payment.amountMinor)}</p>
      </div>

      <span className="nf-esc-state">
        <span className="nf-esc-dot" data-tone={toneFor(payment)} aria-hidden="true" />
        {STATE_LABEL[payment.state]}
      </span>

      <p className="nf-esc-line">{stateLine(payment.state, payment.viewer)}</p>

      {when ? (
        <div className="nf-esc-when">
          <span className="nf-esc-when-label">
            {due.kind === "passed" ? "Payout date" : "Pays out"}
          </span>
          <span className="nf-esc-when-value">{when}</span>
        </div>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <Panel as="article" variant="card" className="nf-esc-sheet">
        {body}
      </Panel>
    );
  }

  return (
    <Panel as="article" variant="card" className="nf-esc-sheet">
      {body}
      <ButtonLink href={href} variant="secondary" trailingIcon="arrow-right" className="self-start">
        Open it
      </ButtonLink>
    </Panel>
  );
}
