"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { payWithWallet, startCardCheckout } from "@/lib/bookings/checkout";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { MomentScreen } from "@/components/app/MomentScreen";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The two ways to pay.
 *
 * Card opens a hosted Paystack page; wallet settles inside the platform in one
 * atomic database call. Neither button prices anything: the amount comes from
 * the stored booking row and the server actions read it again for themselves, so
 * nothing a browser could edit reaches the ledger.
 *
 * One idempotency key is minted per method per mount, so the second of two taps
 * on a flaky connection replays the first answer instead of paying twice. Every
 * failure lands as one plain sentence saying what happened and what the guest
 * can do next; no code, no stack, no silence.
 */

/** A key per submit. crypto.randomUUID exists in every browser this ships to. */
function newKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

type Phase =
  | { kind: "idle" }
  | { kind: "card-starting" }
  | { kind: "card-redirecting" }
  | { kind: "wallet-paying" }
  | { kind: "wallet-paid" }
  | { kind: "error"; message: string };

function Option({
  icon,
  title,
  body,
  action,
  note,
}: {
  icon: BrandIconName;
  title: string;
  body: string;
  action?: React.ReactNode;
  note?: string;
}) {
  return (
    <li className="nf-card flex items-start gap-3.5 p-4">
      <span className="block h-12 w-12 shrink-0">
        <BrandIcon name={icon} fill />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">{title}</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {body}
        </p>
        {note && (
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            {note}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </li>
  );
}

export function PayPanel({ view }: { view: CheckoutView }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const cardKey = useMemo(newKey, []);
  const walletKey = useMemo(newKey, []);

  const busy =
    phase.kind === "card-starting" ||
    phase.kind === "card-redirecting" ||
    phase.kind === "wallet-paying";

  const payByCard = async () => {
    setPhase({ kind: "card-starting" });
    const result = await startCardCheckout({
      bookingId: view.bookingId,
      idempotencyKey: cardKey,
    });
    if (result.ok && result.data) {
      setPhase({ kind: "card-redirecting" });
      window.location.assign(result.data.authorizationUrl);
      return;
    }
    setPhase({
      kind: "error",
      message: result.ok
        ? "The secure payment page could not be opened. Nothing was charged."
        : result.error,
    });
  };

  const payFromWallet = async () => {
    setPhase({ kind: "wallet-paying" });
    const result = await payWithWallet({
      bookingId: view.bookingId,
      idempotencyKey: walletKey,
    });
    if (result.ok && result.data) {
      setPhase({ kind: "wallet-paid" });
      router.refresh();
      return;
    }
    setPhase({
      kind: "error",
      message: result.ok ? "The payment could not be completed." : result.error,
    });
  };

  if (phase.kind === "wallet-paid") {
    return (
      <MomentScreen
        variant="success"
        icon="calendar-check"
        title="Your stay is confirmed"
        description={`${view.totalDisplay} left your wallet and these dates are yours. The details are in your bookings.`}
        actions={
          <>
            <ButtonLink href="/bookings" variant="primary" size="lg">
              View my booking
            </ButtonLink>
            <ButtonLink href={`/listing/${view.listingId}`} variant="secondary" size="lg">
              Back to the stay
            </ButtonLink>
          </>
        }
        footnote="Paid inside RentMe, recorded to the kobo."
      />
    );
  }

  return (
    <section aria-labelledby="nf-checkout-pay">
      <h2 id="nf-checkout-pay" className="nf-h3">
        How would you like to pay?
      </h2>

      {phase.kind === "error" && (
        <p
          role="alert"
          className="nf-card mt-3 flex items-start gap-2.5 p-3.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
        >
          <UiIcon name="bell" size={16} className="mt-0.5 shrink-0" />
          <span>{phase.message}</span>
        </p>
      )}

      <ul className="mt-3 grid gap-3">
        {view.cardAvailable ? (
          <Option
            icon="card-lock"
            title="Pay by card"
            body="A secure page in naira, then straight back here. Your card details never touch RentMe."
            action={
              <Button
                variant="primary"
                full
                onClick={payByCard}
                disabled={busy}
                loading={phase.kind === "card-starting" || phase.kind === "card-redirecting"}
              >
                {`Pay ${view.totalDisplay} by card`}
              </Button>
            }
          />
        ) : (
          <Option
            icon="card-lock"
            title="Pay by card"
            body="Card payment switches on the moment payment keys land."
            note="Your dates stay held in the meantime, and nothing has been charged."
          />
        )}

        {view.walletCovers ? (
          <Option
            icon="wallet-secure"
            title="Pay from your RentMe wallet"
            body={`Your wallet holds ${view.walletBalanceDisplay}. Paying from it confirms this stay straight away.`}
            action={
              <Button
                variant="secondary"
                full
                onClick={payFromWallet}
                disabled={busy}
                loading={phase.kind === "wallet-paying"}
              >
                {`Pay ${view.totalDisplay} from my wallet`}
              </Button>
            }
          />
        ) : (
          <Option
            icon="wallet-secure"
            title="Pay from your RentMe wallet"
            body={`Your wallet holds ${view.walletBalanceDisplay}, and this stay comes to ${view.totalDisplay}.`}
            note="Add money to your wallet first, or pay by card."
            action={
              <ButtonLink href="/wallet" variant="ghost" full trailingIcon="arrow-right">
                Open my wallet
              </ButtonLink>
            }
          />
        )}
      </ul>

      <p className="mt-4 flex items-start gap-2.5 text-[0.78rem] leading-relaxed text-[var(--nf-content-muted)]">
        <span className="mt-0.5 block h-4 w-4 shrink-0">
          <BrandIcon name="shield-check" fill tile={false} />
        </span>
        <span>
          Money moves inside RentMe, so the stay and the payment stay attached to each other. Keep
          every conversation and every payment on the platform.
        </span>
      </p>
    </section>
  );
}
