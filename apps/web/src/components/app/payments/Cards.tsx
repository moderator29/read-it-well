"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { RowButton, Sheet, SettingsGroup } from "@/components/app/account/rows";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import {
  removePaymentMethod,
  setDefaultPaymentMethod,
  startCardSetup,
} from "@/lib/payments/methods-actions";
import type { PaymentMethod } from "@/lib/payments/methods";
import { cardBrandLabel, cardExpired, cardExpiry, maskNumber } from "./format";

/**
 * SAVED CARDS, in the settings grammar.
 *
 * Rows of brand, "•••• 4081" and expiry, a Default pill, a chevron into a
 * sheet holding the two things you can do to a card: make it the default, or
 * remove it, with the confirm inside the sheet and rose on the confirming
 * control only.
 *
 * ADD A CARD TELLS THE TRUTH. Saving a card means charging it once, because
 * the processor only returns a reusable token from a real charge. The charge
 * is ₦100 and it lands in the person's own wallet, so nothing is lost; the
 * row says exactly that before the tap, not after.
 *
 * The brand is a `UiIcon`-tier glyph through `RowButton`'s icon slot, never a
 * glass object: a glass mark in a list row is the one thing the surface
 * language forbids. The glass mark appears once, on the empty state.
 */

type PaymentsCopy = Dictionary["paymentsPage"];

export function Cards({
  cards,
  readFailed,
  copy,
}: {
  cards: PaymentMethod[];
  readFailed: boolean;
  copy: PaymentsCopy;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<PaymentMethod | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function run(work: () => Promise<{ ok: boolean; error?: string }>, then?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? copy.readFailed);
        return;
      }
      then?.();
      router.refresh();
    });
  }

  const addCard = () => {
    setError(null);
    setAdding(true);
    startTransition(async () => {
      const result = await startCardSetup();
      if (!result.ok) {
        setAdding(false);
        setError(result.error);
        return;
      }
      window.location.assign(result.data.authorizationUrl);
    });
  };

  const close = () => {
    setOpen(null);
    setConfirmRemove(false);
  };

  return (
    <>
      <SettingsGroup
        label={copy.cardsLabel}
        note={
          error ? (
            <span role="alert" className="text-[var(--nf-state-error)]">
              {error}
            </span>
          ) : adding ? (
            <span role="status" aria-live="polite">
              {copy.adding}
            </span>
          ) : (
            copy.cardsNote
          )
        }
      >
        {readFailed ? (
          <p className={`px-lg py-md ${TYPE.rowMeta}`} role="status">
            {copy.readFailed}
          </p>
        ) : cards.length === 0 ? (
          <EmptyState
            icon="card-lock"
            title={copy.cardsEmptyTitle}
            body={copy.cardsEmptyBody}
            className="py-block"
            data-testid="payments-cards-empty"
          />
        ) : (
          cards.map((card) => {
            const expiry = cardExpiry(card.expMonth, card.expYear);
            const expired = cardExpired(card.expMonth, card.expYear);
            const sub = !card.reusable
              ? copy.noLongerUsable
              : expired
                ? copy.expired
                : expiry
                  ? copy.expires.replace("{when}", expiry)
                  : undefined;
            return (
              <RowButton
                key={card.id}
                icon="wallet"
                label={`${cardBrandLabel(card.cardType)} ${maskNumber(card.last4)}`}
                sub={sub}
                value={card.isDefault ? <StatusPill tone="brand">{copy.defaultLabel}</StatusPill> : undefined}
                onClick={() => setOpen(card)}
                testId="payments-card-row"
              />
            );
          })
        )}
        <RowButton
          icon="plus"
          label={copy.addCard}
          sub={copy.addCardSub}
          onClick={addCard}
          disabled={pending || adding}
          chevron={false}
          testId="payments-add-card"
        />
      </SettingsGroup>

      <Sheet open={open !== null} onClose={close} title={copy.cardSheetTitle}>
        {open && (
          <div>
            <div className="flex items-center gap-row px-2xs">
              <span className="block h-11 w-11 shrink-0">
                <BrandIcon name="card-lock" fill />
              </span>
              <div className="min-w-0">
                <p className={TYPE.rowTitle}>
                  {cardBrandLabel(open.cardType)} {maskNumber(open.last4)}
                </p>
                <p className={TYPE.rowMeta}>
                  {open.bank ? `${open.bank} · ` : ""}
                  {cardExpiry(open.expMonth, open.expYear)}
                </p>
              </div>
            </div>

            <div className="mt-row">
              {!open.isDefault && open.reusable && (
                <RowButton
                  icon="verified"
                  label={copy.makeDefault}
                  onClick={() => run(() => setDefaultPaymentMethod(open.id), close)}
                  disabled={pending}
                  chevron={false}
                />
              )}
              {!confirmRemove ? (
                <RowButton
                  icon="trash"
                  label={copy.removeCard}
                  danger
                  onClick={() => setConfirmRemove(true)}
                  disabled={pending}
                  chevron={false}
                />
              ) : (
                <div className="px-2xs pt-row">
                  <p className={TYPE.body}>{copy.removeCardBody}</p>
                  <div className="mt-row flex flex-col gap-inline">
                    {/* Rose on the confirming control only. */}
                    <Button
                      variant="danger"
                      full
                      loading={pending}
                      onClick={() => run(() => removePaymentMethod(open.id), close)}
                    >
                      {copy.removeCardConfirm}
                    </Button>
                    <Button variant="ghost" full disabled={pending} onClick={() => setConfirmRemove(false)}>
                      {copy.keep}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className={`mt-row px-2xs ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
                {error}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
