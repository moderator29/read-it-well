"use client";

import { useEffect, useState } from "react";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink, Button } from "@/components/ui/Button";
import { ReportSheet } from "@/components/app/ReportSheet";
import { SAFETY_EDUCATION_COPY } from "@/lib/messages/education";
import { readAccountCheck } from "@/lib/messages/account-check-actions";
import { accountCardState, CHECKING_WINDOW_MS, type AccountCheckView } from "@/lib/messages/account-check";
import type { ChargeOffer } from "@/lib/messages/charge-offer";

/**
 * THE CARD ABOVE AN ACCOUNT NUMBER, FOR THE PERSON RECEIVING IT (V-04).
 *
 * The words in `lib/messages/education.ts` were right and were shown to the
 * wrong person: the one typing. This card is where they belong, above the
 * digits, on the receiver's side, at the second before a transfer. It does
 * three things, in this order:
 *
 *   1. WHOSE ACCOUNT. One sentence, from the stored boolean: the account
 *      belongs to the verified lister (and Vallo still cannot protect a
 *      transfer to it), or it does not. The resolved name is never shown,
 *      because it is never stored and never sent. While the check is still
 *      running (the first minute after a message lands) the card says it is
 *      checking; after that, a missing answer prints NOTHING about ownership.
 *      "unresolved", "no verified name" and "limited" also print nothing:
 *      each is a fact about Vallo, not about the account, and the claims rule
 *      does not allow a sentence the code cannot prove.
 *
 *   2. THE REAL CHARGE. The move-in total with a Pay button when the renter
 *      holds an accepted inspection, or "Pay only after inspection. Request
 *      one here." when they do not (`charge-offer.ts` decides).
 *
 *   3. REPORT AND BLOCK, on the card, because this is the moment somebody
 *      decides a stranger is steering them off the platform.
 *
 * Colour is never the signal: the "does not belong" sentence carries its own
 * icon and its own words, and the "belongs" sentence is deliberately not
 * green, because an account that belongs to the lister is still a transfer
 * nobody can reverse.
 */
export function AccountMomentCard({
  messageId,
  createdAt,
  initialCheck,
  numberCount,
  offer,
  copy,
  locale,
  onBlock,
}: {
  messageId: string;
  /** When the message was sent, for the one-minute "checking" window. Null for older rows. */
  createdAt: string | null;
  initialCheck: AccountCheckView | null;
  /** How many ten-digit numbers the message holds. Only exactly one is ever checked. */
  numberCount: number;
  offer: ChargeOffer;
  copy: Dictionary["trustVisible"]["account"];
  locale: Locale;
  /** Opens the thread's own options sheet, where Block already lives. */
  onBlock?: () => void;
}) {
  const [check, setCheck] = useState<AccountCheckView | null>(initialCheck);
  const [now, setNow] = useState(() => Date.now());
  const state = accountCardState(check, createdAt, now, numberCount);

  /* A message that arrived live has no answer yet: ask again, a few times,
     inside the checking window, then stop. Never more than four requests. */
  useEffect(() => {
    if (state !== "checking") return;
    let cancelled = false;
    let tries = 0;
    const timer = window.setInterval(async () => {
      tries += 1;
      const next = await readAccountCheck(messageId);
      if (cancelled) return;
      if (next) setCheck(next);
      setNow(Date.now());
      if (next || tries >= 4) window.clearInterval(timer);
    }, CHECKING_WINDOW_MS / 6);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [state, messageId]);

  return (
    <aside
      aria-label={copy.label}
      className="nf-panel nf-context-card nf-context-card--calm mb-xs flex-col items-stretch gap-sm"
      data-testid="account-moment-card"
      data-state={state}
    >
      {state === "checking" && (
        <p role="status" className="flex items-start gap-inline-tight nf-body-sm text-[var(--nf-content-muted)]">
          <UiIcon name="history" size={16} className="mt-3xs shrink-0" />
          <span>{copy.checking}</span>
        </p>
      )}
      {/* Not a name on record: the same words either way, because that is
          what the comparison proves. Only a total mismatch (no name shared
          at all) takes the error colour; the icon and the words carry it
          either way, so colour is never the only signal. */}
      {(state === "not_on_record" || state === "not_on_record_total") && (
        <p
          className={`flex items-start gap-inline-tight nf-body-sm font-semibold ${
            state === "not_on_record_total" ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-primary)]"
          }`}
        >
          <UiIcon name="shield-stop" size={16} className="mt-3xs shrink-0" />
          <span>{copy.notOnRecord}</span>
        </p>
      )}
      {state === "belongs" && (
        <p className="flex items-start gap-inline-tight nf-body-sm text-[var(--nf-content-secondary)]">
          <UiIcon name="info" size={16} className="mt-3xs shrink-0" />
          <span>{copy.belongs}</span>
        </p>
      )}

      {offer.kind === "pay" && (
        <div className="grid gap-xs">
          <p className="nf-body-sm text-[var(--nf-content-primary)]">
            {copy.payLead.replace("{amount}", formatMoney(offer.totalMinor, locale, offer.currency))}
          </p>
          <ButtonLink href={`/rent/pay/${offer.inspectionId}`} variant="primary" size="sm" leadingIcon="wallet">
            {copy.payButton}
          </ButtonLink>
        </div>
      )}
      {offer.kind === "request" && (
        <div className="grid gap-xs">
          <p className="nf-body-sm text-[var(--nf-content-primary)]">{copy.requestLead}</p>
          <ButtonLink href={`/listing/${offer.listingId}`} variant="secondary" size="sm" leadingIcon="calendar-booking">
            {copy.requestButton}
          </ButtonLink>
        </div>
      )}

      <p className="nf-body-sm leading-relaxed text-[var(--nf-content-muted)]">{SAFETY_EDUCATION_COPY}</p>

      <div className="flex flex-wrap items-center gap-sm">
        <ReportSheet targetType="message" targetId={messageId} targetLabel={copy.label} signedIn />
        {onBlock && (
          <Button type="button" variant="dangerQuiet" size="sm" leadingIcon="block" onClick={onBlock}>
            {copy.block}
          </Button>
        )}
      </div>
    </aside>
  );
}
