"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { openBalanceAccount } from "@/lib/money/member-wallet-actions";
import { GAP_LABEL, HELD_BY, HELD_BY_HREF, HELD_BY_LINK, ONBOARDING_COPY, OPEN_ACTION } from "@/lib/money/balance-copy";
import type { OnboardingState, ProfileGap } from "@/lib/money/funds";
import { StepPath, type PathState } from "../StepPath";
import { reach } from "./reach";

/**
 * FINANCIAL ONBOARDING (founder section 9): "Do not make financial
 * onboarding feel like an ugly fintech form. It should feel like Vallo."
 *
 * So there is no form here at all, and the shape is the path (PREMIUM-
 * STANDARD reference 2, named there for financial onboarding): three steps,
 * each a 3D tile, two lines and a round status, joined by a line that fills
 * as they complete. Anything missing is a row inside the first step that goes
 * to the profile, where those details already live; opening is one button
 * inside the second. Each of the seven states has its own words.
 */
const WHO_DOES_WHAT: { icon: "shield-lock" | "user-check" | "eye-off"; title: string; sub: string }[] = [
  { icon: "shield-lock", title: "Our escrow partner holds the money", sub: "In an account in your name. Vallo never holds it." },
  { icon: "user-check", title: "Vallo keeps the record", sub: "Every movement, with where it is and when the partner confirmed it." },
  { icon: "eye-off", title: "Only what is needed is shared", sub: "Your name, email and phone. Nothing else, and no card or bank details." },
];

/** Where each state stands on the three steps: your details, opening, adding money. */
function pathFor(state: OnboardingState, missing: number): [PathState, PathState, PathState] {
  if (missing > 0) return ["current", "upcoming", "upcoming"];
  switch (state) {
    case "ACTIVE":
      return ["done", "done", "current"];
    case "PENDING":
      return ["done", "waiting", "upcoming"];
    case "FAILED":
    case "RESTRICTED":
    case "SUSPENDED":
      return ["done", "problem", "upcoming"];
    case "VERIFICATION_REQUIRED":
    case "NOT_STARTED":
    default:
      return ["done", "current", "upcoming"];
  }
}

export function BalanceOnboarding({ state, gaps }: { state: OnboardingState; gaps: ProfileGap[] }) {
  const router = useRouter();
  const [current, setCurrent] = useState(state);
  const [missing, setMissing] = useState(gaps);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = ONBOARDING_COPY[current];
  const canOpen = missing.length === 0 && (current === "NOT_STARTED" || current === "FAILED" || current === "PENDING" || current === "VERIFICATION_REQUIRED");
  const [details, opening, adding] = pathFor(current, missing.length);

  const open = async () => {
    setBusy(true);
    setError(null);
    const r = await reach(() => openBalanceAccount());
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
    <div className="nf-onboard mt-inline space-y-block" data-testid="balance-onboarding" data-state={current}>
      <div className="nf-mhead">
        <span className="nf-mhead__art">
          <IconPlate size="lg" tone="brand">
            <UiIcon name="wallet" size={ICON_PLATE_GLYPH.lg} />
          </IconPlate>
        </span>
        <h2 className="nf-mhead__title">{copy.title}</h2>
        <p className="nf-mhead__body">{copy.body}</p>
      </div>

      <StepPath
        label="Opening your wallet"
        testId="balance-onboarding-path"
        steps={[
          {
            key: "details",
            title: "Your details",
            sub: missing.length > 0 ? "Add these to your profile first." : "Your name, email and a Nigerian mobile are on your profile.",
            state: details,
            children:
              missing.length > 0 ? (
                <ListGroup label="Add to your profile">
                  {missing.map((g) => (
                    <ListRow
                      key={g}
                      leading={
                        <IconPlate size="sm" tone="warning">
                          <UiIcon name="pencil" size={ICON_PLATE_GLYPH.sm} />
                        </IconPlate>
                      }
                      title={GAP_LABEL[g]}
                      href={g === "phone" ? "/settings/phone" : "/settings/account"}
                      chevron
                    />
                  ))}
                </ListGroup>
              ) : undefined,
          },
          {
            key: "open",
            title: "Open with our escrow partner",
            sub:
              current === "PENDING"
                ? "Asked. Waiting for their answer; this updates on its own."
                : current === "RESTRICTED" || current === "SUSPENDED"
                  ? "On hold with our partner. Support can find out why."
                  : "We ask them to open it in your name. Nothing is charged.",
            state: opening,
            children: canOpen ? (
              <Button variant="primary" size="lg" full loading={busy} onClick={open} data-testid="balance-open">
                {current === "FAILED" ? "Try again" : current === "PENDING" ? "Check again" : OPEN_ACTION}
              </Button>
            ) : current === "RESTRICTED" || current === "SUSPENDED" ? (
              <ButtonLink href="/support" variant="secondary" size="lg" full>
                Contact support
              </ButtonLink>
            ) : undefined,
          },
          {
            key: "add",
            title: "Add money",
            sub: "From your own bank or card, once your wallet is open.",
            state: adding,
          },
        ]}
      />

      {error ? (
        <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
          {error}
        </p>
      ) : null}

      <ListGroup label="Who does what">
        {WHO_DOES_WHAT.map((row) => (
          <ListRow
            key={row.title}
            leading={
              <IconPlate size="sm">
                <UiIcon name={row.icon} size={ICON_PLATE_GLYPH.sm} />
              </IconPlate>
            }
            title={row.title}
            sub={row.sub}
          />
        ))}
      </ListGroup>

      <p className="nf-caption text-[var(--nf-content-muted)]">
        {HELD_BY}{" "}
        <Link href={HELD_BY_HREF} className="underline">
          {HELD_BY_LINK}
        </Link>
      </p>
    </div>
  );
}
