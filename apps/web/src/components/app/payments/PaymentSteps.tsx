import { UiIcon } from "@/design-system/icons/UiIcon";
import type { PaymentStep } from "./payment-steps";

export { cardPaymentSteps, type PaymentStep, type PaymentStepState } from "./payment-steps";

/**
 * THE PAYMENT'S REAL STEPS (motion 14, reference 7076; the founder's
 * `payment-status.tsx` with its infinite spinners replaced).
 *
 * The founder's source drew "processing" and "verifying" as rings rotating
 * forever. A ring that rotates forever is a loading state that looks exactly
 * like a dead one, and Vallo ships no loop that is not the aurora or the
 * assistant thinking. What replaces it is the list of steps this payment
 * actually goes through, each one ticking ONLY when the state that proves it
 * has arrived: the caller passes the state of each step from the phase it is
 * really in, never from a timer. There is no step state for "probably done".
 *
 *   done     a tick in the success ink, and the word stays
 *   active   a still ring in the brand ink: this is where the payment is now
 *   waiting  a hollow ring in muted ink
 *
 * Nothing here moves on its own. When a step turns done, its tick scales in
 * once (money-surface.css, `.nf-paysteps`), transform and opacity only, and
 * under reduced motion it simply appears.
 *
 * Labels are passed in, in the dictionary's words, so this file holds no copy.
 */
export function PaymentSteps({ steps, label }: { steps: readonly PaymentStep[]; label: string }) {
  return (
    <ol className="nf-paysteps" aria-label={label}>
      {steps.map((step) => (
        <li
          key={step.key}
          className="nf-paysteps__step"
          data-state={step.state}
          aria-current={step.state === "active" ? "step" : undefined}
        >
          <span className="nf-paysteps__mark" aria-hidden="true">
            {step.state === "done" ? <UiIcon name="check" size={14} /> : null}
          </span>
          <span className="nf-paysteps__label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
