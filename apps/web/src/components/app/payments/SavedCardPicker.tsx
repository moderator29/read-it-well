"use client";

import { useId } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON, TYPE } from "@/components/app/Screen";
import { StatusPill } from "@/components/ui/StatusPill";
import type { PaymentMethod } from "@/lib/payments/methods";
import { cardBrandLabel, cardExpired, cardExpiry, maskNumber } from "./format";

export { preselectedCardId } from "./format";

/**
 * CHOOSING A SAVED CARD.
 *
 * A radio group, not a select and not a row of cards: the person is choosing
 * one of a short list of things they already own, which is exactly what radios
 * are for, and it keeps the whole set visible so the one that is about to be
 * charged cannot be hidden behind a closed control on the screen carrying the
 * largest amount of money on the platform.
 *
 * ONLY REUSABLE CARDS APPEAR. `payment_methods.reusable` goes false the moment
 * the processor says a token can no longer be charged, and `chargeSavedCard`
 * marks it so itself when it meets that decline. Offering one would be offering
 * a payment that is known to fail.
 *
 * AN EXPIRED CARD IS SHOWN AND IS NOT SELECTABLE. Hiding it would leave a
 * person wondering where their card went; showing it greyed with the reason
 * answers that and points at the fix. The expiry we hold can lag the bank, so
 * this never claims a card is dead, only that the date we were given has passed.
 *
 * The brand is a `UiIcon`-tier glyph, never a glass object: a brand mark in a
 * row is the one thing the surface language forbids, and the tiers never mix.
 */
export function SavedCardPicker({
  cards,
  value,
  onChange,
  disabled = false,
  label = "Pay with a saved card",
}: {
  cards: PaymentMethod[];
  /** The chosen card's id, or null while none is chosen. */
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const name = useId();
  const usable = cards.filter((card) => card.reusable);
  if (usable.length === 0) return null;

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <ul className="nf-rows nf-rows--inset">
        {usable.map((card) => {
          const expired = cardExpired(card.expMonth, card.expYear);
          const expiry = cardExpiry(card.expMonth, card.expYear);
          const chosen = value === card.id;
          return (
            <li key={card.id} className="nf-row">
              <label
                className={`flex w-full items-center gap-sm ${
                  expired ? "opacity-60" : "cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name={name}
                  value={card.id}
                  checked={chosen}
                  disabled={expired}
                  onChange={() => onChange(card.id)}
                  /* The platform has no radio class, and inventing one here
                     would put a control style in a component file instead of
                     the stylesheet that owns them. The native control, sized to
                     the 20px inline rung and tinted with the brand token, is
                     the honest interim; it is also the one control that already
                     behaves correctly with a hardware keyboard. */
                  className="h-5 w-5 shrink-0 accent-[var(--nf-brand-primary)]"
                />
                <span className="shrink-0 text-[var(--nf-content-secondary)]" aria-hidden="true">
                  <UiIcon name="wallet" size={ICON.row} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${TYPE.rowTitle}`}>
                    {cardBrandLabel(card.cardType)} {maskNumber(card.last4)}
                  </span>
                  <span className={`mt-3xs block ${TYPE.rowMeta}`}>
                    {expired
                      ? `The expiry we hold, ${expiry}, has passed`
                      : expiry
                        ? `Expires ${expiry}`
                        : card.bank ?? ""}
                  </span>
                </span>
                {card.isDefault && !expired && (
                  <StatusPill tone="brand" className="shrink-0">
                    Default
                  </StatusPill>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
