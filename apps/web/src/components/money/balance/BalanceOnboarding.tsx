"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { openBalanceAccount } from "@/lib/money/member-wallet-actions";
import { GAP_LABEL, HELD_BY, HELD_BY_HREF, HELD_BY_LINK, ONBOARDING_COPY, OPEN_ACTION } from "@/lib/money/balance-copy";
import type { OnboardingState, ProfileGap } from "@/lib/money/funds";
import { FinancePlate } from "./balance-ui";

/**
 * FINANCIAL ONBOARDING (founder section 9): "Do not make financial
 * onboarding feel like an ugly fintech form. It should feel like Vallo."
 *
 * So there is no form here at all. The member is told why, what the partner
 * does, what Vallo does and what is shared; anything missing is a row that
 * goes to the profile, where those details already live; and opening is one
 * button. Each of the seven states has its own words.
 */
const WHO_DOES_WHAT: { icon: "shield-lock" | "user-check" | "eye-off"; title: string; sub: string }[] = [
  { icon: "shield-lock", title: "Our escrow partner holds the money", sub: "In an account in your name. Vallo never holds it." },
  { icon: "user-check", title: "Vallo keeps the record", sub: "Every movement, with where it is and when the partner confirmed it." },
  { icon: "eye-off", title: "Only what is needed is shared", sub: "Your name, email and phone. Nothing else, and no card or bank details." },
];

export function BalanceOnboarding({ state, gaps }: { state: OnboardingState; gaps: ProfileGap[] }) {
  const router = useRouter();
  const [current, setCurrent] = useState(state);
  const [missing, setMissing] = useState(gaps);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = ONBOARDING_COPY[current];
  const canOpen = missing.length === 0 && (current === "NOT_STARTED" || current === "FAILED" || current === "PENDING" || current === "VERIFICATION_REQUIRED");

  const open = async () => {
    setBusy(true);
    setError(null);
    const r = await openBalanceAccount();
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setCurrent(r.data.state);
    setMissing(r.data.gaps);
    if (r.data.state === "ACTIVE") router.refresh();
  };

  return (
    <div className="mt-inline space-y-block" data-testid="balance-onboarding" data-state={current}>
      <div className="grid justify-items-start gap-sm">
        <FinancePlate glyph="secure" />
        <h2 className="nf-h2 text-[var(--nf-content-primary)]">{copy.title}</h2>
        <p className="nf-body text-[var(--nf-content-secondary)]">{copy.body}</p>
      </div>

      {missing.length > 0 ? (
        <ListGroup label="Add to your profile">
          {missing.map((g) => (
            <ListRow
              key={g}
              leading={
                <IconPlate size="sm" tone="warning">
                  <UiIcon name="pencil" />
                </IconPlate>
              }
              title={GAP_LABEL[g]}
              href={g === "phone" ? "/settings/phone" : "/settings/account"}
              chevron
            />
          ))}
        </ListGroup>
      ) : null}

      <ListGroup label="Who does what">
        {WHO_DOES_WHAT.map((row) => (
          <ListRow
            key={row.title}
            leading={
              <IconPlate size="sm">
                <UiIcon name={row.icon} />
              </IconPlate>
            }
            title={row.title}
            sub={row.sub}
          />
        ))}
      </ListGroup>

      {canOpen ? (
        <Button variant="primary" size="lg" loading={busy} onClick={open} data-testid="balance-open">
          {current === "FAILED" ? "Try again" : current === "PENDING" ? "Check again" : OPEN_ACTION}
        </Button>
      ) : current === "RESTRICTED" || current === "SUSPENDED" ? (
        <ButtonLink href="/support" variant="secondary" size="lg">
          Contact support
        </ButtonLink>
      ) : null}

      {error ? (
        <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
          {error}
        </p>
      ) : null}

      <p className="nf-caption text-[var(--nf-content-muted)]">
        {HELD_BY}{" "}
        <Link href={HELD_BY_HREF} className="underline">
          {HELD_BY_LINK}
        </Link>
      </p>
    </div>
  );
}
