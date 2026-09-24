"use client";

import { useState, useTransition } from "react";
import { plural, type Locale } from "@vallo/i18n";
import type { Dictionary } from "@vallo/i18n";
import { ResultSheet } from "@/components/app/ResultSheet";
import { reportNotMe, type NotMeResult } from "@/lib/security/device-alert-actions";
import { formatHoldUntil } from "@/lib/security/account-hold";

/**
 * "THIS WAS NOT ME". V-19.
 *
 * Used twice: at the foot of the devices screen, and on the alert a new
 * sign-in sends (`/settings/devices/alert`). Tap once to arm, tap again to
 * act, the same tap-again grammar as every other destructive control on the
 * devices screen, because a hold on somebody's money must not fire on a
 * brush of the thumb.
 *
 * What it does is stated before it is done (the panel's body) and after (the
 * ResultSheet), and the two say the same thing: every other device signed
 * out, withdrawals and sends held for 24 hours, and the password is theirs to
 * change now. The one action on the sheet is that change, because it is the
 * step that locks the door the stranger came in by, and the server cannot
 * take it for them.
 *
 * The hold's end is printed in Lagos time with the weekday, because "held
 * until 21:14" read at 23:00 does not say whether that is tonight or
 * tomorrow.
 */

export type NotMeCopy = Dictionary["platform"]["notMe"];

type Outcome =
  | { kind: "held"; result: NotMeResult }
  | { kind: "failed"; signedOut: boolean }
  | null;

export function NotMePanel({
  title,
  body,
  button,
  copy,
  locale,
}: {
  title: string;
  body: string;
  button: { idle: string; confirm: string; working: string };
  copy: NotMeCopy;
  locale: Locale;
}) {
  const [armed, setArmed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();

  const press = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    startTransition(async () => {
      const result = await reportNotMe();
      if (result.ok) setOutcome({ kind: "held", result: result.data });
      else
        setOutcome({
          kind: "failed",
          signedOut: result.error === "signed-out",
        });
    });
  };

  const endedLine =
    outcome?.kind === "held"
      ? outcome.result.ended === 0
        ? copy.endedNone
        : plural(outcome.result.ended, copy.ended, locale)
      : "";
  const until =
    outcome?.kind === "held" && outcome.result.holdUntil ? formatHoldUntil(outcome.result.holdUntil, locale) : "";
  const heldConsequence = (result: NotMeResult): string => {
    if (result.rateLimited) return result.holdUntil ? copy.rateLimitedHeld : copy.rateLimitedNoHold;
    if (result.holdPlaced) return copy.heldConsequence;
    if (result.holdExtended) return copy.extendedConsequence;
    /* Pressing again does not change a hold, and the sentence says whose
       hold it is: the person's own earlier press, or a support change. */
    return result.holdReason === "not_me" ? copy.alreadyHeldConsequence : copy.alreadyHeldOtherConsequence;
  };

  return (
    <div className="nf-panel nf-panel--card block p-card" data-testid="not-me-panel">
      <p className="nf-body font-semibold text-content">{title}</p>
      <p className="nf-body-sm mt-row text-content-2">{body}</p>
      <button
        type="button"
        onClick={press}
        disabled={pending}
        aria-busy={pending || undefined}
        data-testid="not-me"
        className={`nf-btn nf-btn--sm mt-group w-full ${armed ? "nf-btn--danger" : "nf-btn--danger-quiet"}`}
      >
        {pending ? button.working : armed ? button.confirm : button.idle}
      </button>

      {outcome?.kind === "held" && (
        <ResultSheet
          open
          onOpenChange={(open) => {
            if (!open) setOutcome(null);
          }}
          state="confirmed"
          verdict={outcome.result.holdUntil ? copy.heldVerdict : copy.signedOutVerdict}
          consequence={heldConsequence(outcome.result).replace("{until}", until).replace("{ended}", endedLine).trim()}
          actions={[
            { label: copy.changePassword, href: "/reset-password", tone: "primary" },
            { label: copy.close, onClick: () => setOutcome(null), tone: "quiet" },
          ]}
        />
      )}

      {outcome?.kind === "failed" && (
        <ResultSheet
          open
          onOpenChange={(open) => {
            if (!open) setOutcome(null);
          }}
          state="failed"
          verdict={copy.failedVerdict}
          consequence={
            outcome.signedOut ? copy.signedOut : copy.failedConsequence
          }
          actions={[{ label: copy.close, onClick: () => setOutcome(null), tone: "quiet" }]}
        />
      )}
    </div>
  );
}
