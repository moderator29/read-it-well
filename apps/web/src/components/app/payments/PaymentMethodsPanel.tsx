"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { RowButton, Sheet } from "@/components/app/account/rows";
import { TYPE } from "@/components/app/Screen";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import {
  removePaymentMethod,
  setDefaultPaymentMethod,
  startCardSetup,
} from "@/lib/payments/methods-actions";
import {
  removeBankAccount,
  setDefaultBankAccount,
  type BankAccount,
} from "@/lib/payments/bank-accounts-actions";
import type { PaymentMethod } from "@/lib/payments/methods";
import { cardBrandLabel, cardExpired, cardExpiry, maskNumber } from "./format";
import { AddBankAccountSheet } from "./AddBankAccountSheet";

/**
 * PAYMENT METHODS, to the block at the foot of the settings render
 * (7F96BE6C): one glass card with a glyph head, the title, its sub-line and
 * "+ Add"; then the card rows (brand mark, masked number, the brand's word,
 * a Default chip, a chevron) and the bank rows (bank glyph, bank name,
 * masked number and the name the bank confirmed, a Verified chip in
 * emerald, a chevron).
 *
 * Every row is a real control. A card's chevron opens the two things you
 * can do to a card (make it the default, remove it, with the confirm inside
 * the sheet and rose on the confirming control only); a bank row does the
 * same for payouts. "+ Add" asks which, then runs the real path: a card is
 * saved by charging ₦100 into the person's own wallet through the hosted
 * window, because the processor only returns a reusable token from a real
 * charge, and the sheet says so before the tap; a bank account is resolved
 * with the bank before it is saved.
 *
 * VERIFIED MEANS THE BANK CONFIRMED THE NAME. Every account in this list
 * was resolved before it was stored (`addBankAccount` refuses otherwise),
 * so the chip states a check that happened, on every row, and the note
 * under the card says what it means.
 */

type PaymentsCopy = Dictionary["paymentsPage"];

export function PaymentMethodsPanel({
  cards,
  accounts,
  cardsFailed,
  accountsFailed,
  copy,
}: {
  cards: PaymentMethod[];
  accounts: BankAccount[];
  cardsFailed: boolean;
  accountsFailed: boolean;
  copy: PaymentsCopy;
}) {
  const router = useRouter();
  const [openCard, setOpenCard] = useState<PaymentMethod | null>(null);
  const [openAccount, setOpenAccount] = useState<BankAccount | null>(null);
  const [chooser, setChooser] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingCard, setAddingCard] = useState(false);

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
    setAddingCard(true);
    setChooser(false);
    startTransition(async () => {
      const result = await startCardSetup();
      if (!result.ok) {
        setAddingCard(false);
        setError(result.error);
        return;
      }
      window.location.assign(result.data.authorizationUrl);
    });
  };

  const close = () => {
    setOpenCard(null);
    setOpenAccount(null);
    setConfirmRemove(false);
  };

  const empty = !cardsFailed && !accountsFailed && cards.length === 0 && accounts.length === 0;

  return (
    <>
      <section className="nf-card" aria-labelledby="nf-pay-title" data-testid="payment-methods-block">
        <div className="nf-pay-head">
          <span className="nf-glyph-tile nf-glyph-tile--lg" aria-hidden="true">
            <UiIcon name="wallet" size={24} />
          </span>
          {/* The title shares its line with the Add control and the sentence
              runs the full width beneath. Beside a 48px plate and a button,
              "Manage your cards and bank accounts." was reading in about 170
              pixels and breaking over three lines. */}
          <h2 id="nf-pay-title" className={`min-w-0 ${TYPE.rowTitle}`}>
            {copy.blockTitle}
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon="plus"
            aria-haspopup="dialog"
            disabled={pending || addingCard}
            onClick={() => setChooser(true)}
            data-testid="payments-add"
          >
            {copy.add}
          </Button>
          <p className={`nf-pay-head__sub ${TYPE.rowMeta}`}>{copy.blockSub}</p>
        </div>

        {(error || addingCard) && (
          <p
            role={error ? "alert" : "status"}
            aria-live={error ? undefined : "polite"}
            className={`px-card-sm pb-row ${TYPE.rowMeta} ${error ? "text-[var(--nf-state-error)]" : ""}`}
          >
            {error ?? copy.adding}
          </p>
        )}

        <div className="nf-pay-rows">
          {cardsFailed && (
            <p role="status" className={TYPE.rowMeta}>
              {copy.readFailed}
            </p>
          )}
          {cards.map((card) => {
            const expired = cardExpired(card.expMonth, card.expYear);
            const brand = cardBrandLabel(card.cardType);
            const sub = !card.reusable
              ? copy.noLongerUsable
              : expired
                ? copy.expired
                : copy.cardWord.replace("{brand}", brand);
            return (
              <button
                key={card.id}
                type="button"
                className="nf-pay-row nf-tap"
                onClick={() => setOpenCard(card)}
                aria-haspopup="dialog"
                data-testid="payments-card-row"
              >
                <span className="nf-pay-brand" aria-hidden="true">
                  {brand}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`nf-numeric block ${TYPE.rowTitle}`}>{maskNumber(card.last4)}</span>
                  <span className={`mt-3xs block ${TYPE.rowMeta}`}>{sub}</span>
                </span>
                {card.isDefault && card.reusable && !expired && (
                  <StatusPill tone="brand" className="shrink-0">
                    {copy.defaultLabel}
                  </StatusPill>
                )}
                <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
              </button>
            );
          })}

          {accountsFailed && (
            <p role="status" className={TYPE.rowMeta}>
              {copy.readFailed}
            </p>
          )}
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className="nf-pay-row nf-tap"
              onClick={() => setOpenAccount(account)}
              aria-haspopup="dialog"
              data-testid="payments-account-row"
            >
              <span className="nf-glyph-tile" aria-hidden="true">
                <UiIcon name="building-apartment" size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>{account.bankName}</span>
                {/* Not truncated. The render shows the masked number and what
                    the account is, and half of the name the bank confirmed is
                    worse than none: this row is how somebody checks they are
                    being paid into the right account. */}
                {/* Two lines, not one with a separator. The name the bank
                    confirmed is somebody's full name, so at 390px the single
                    line wrapped and left the middle dot stranded at the end
                    of the first line. */}
                <span className={`mt-3xs block ${TYPE.rowMeta}`}>
                  <span className="nf-numeric">{maskNumber(account.accountNumber)}</span>
                </span>
                <span className={`block ${TYPE.rowMeta}`}>{account.accountName}</span>
              </span>
              <StatusPill tone="success" icon="verified" className="shrink-0">
                {copy.verified}
              </StatusPill>
              <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
            </button>
          ))}

          {empty && (
            <div className="flex items-center gap-row py-inline" data-testid="payments-empty">
              <span className="block h-12 w-12 shrink-0" aria-hidden="true">
                <BrandIcon name="card-lock" fill />
              </span>
              <p className={TYPE.rowMeta}>{copy.blockEmpty}</p>
            </div>
          )}
        </div>
      </section>

      {/* Which kind. Each row says what really happens before the tap. */}
      <Sheet open={chooser} onClose={() => setChooser(false)} title={copy.addTitle}>
        <RowButton
          icon="wallet"
          label={copy.addCard}
          sub={copy.addCardSub}
          onClick={addCard}
          disabled={pending || addingCard}
          testId="payments-add-card"
        />
        <RowButton
          icon="building-apartment"
          label={copy.addAccount}
          sub={copy.banksNote}
          onClick={() => {
            setChooser(false);
            setAddingAccount(true);
          }}
          disabled={pending}
          testId="payments-add-account"
        />
      </Sheet>

      <Sheet open={openCard !== null} onClose={close} title={copy.cardSheetTitle}>
        {openCard && (
          <div>
            <div className="flex items-center gap-row px-2xs">
              <span className="nf-pay-brand" aria-hidden="true">
                {cardBrandLabel(openCard.cardType)}
              </span>
              <div className="min-w-0">
                <p className={`nf-numeric ${TYPE.rowTitle}`}>{maskNumber(openCard.last4)}</p>
                <p className={TYPE.rowMeta}>
                  {openCard.bank ? `${openCard.bank} · ` : ""}
                  {cardExpiry(openCard.expMonth, openCard.expYear)
                    ? copy.expires.replace("{when}", cardExpiry(openCard.expMonth, openCard.expYear))
                    : copy.cardWord.replace("{brand}", cardBrandLabel(openCard.cardType))}
                </p>
              </div>
            </div>
            <div className="mt-row">
              {!openCard.isDefault && openCard.reusable && (
                <RowButton
                  icon="verified"
                  label={copy.makeDefault}
                  onClick={() => run(() => setDefaultPaymentMethod(openCard.id), close)}
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
                    <Button
                      variant="danger"
                      full
                      loading={pending}
                      onClick={() => run(() => removePaymentMethod(openCard.id), close)}
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

      <Sheet open={openAccount !== null} onClose={close} title={copy.accountSheetTitle}>
        {openAccount && (
          <div>
            <div className="px-2xs">
              <p className={TYPE.rowTitle}>
                {openAccount.bankName}{" "}
                <span className="nf-numeric">{maskNumber(openAccount.accountNumber)}</span>
              </p>
              <p className={TYPE.rowMeta}>{openAccount.accountName}</p>
              <p className={`mt-inline-tight ${TYPE.caption}`}>{copy.accountsNote}</p>
            </div>
            <div className="mt-row">
              {!openAccount.isDefault && (
                <RowButton
                  icon="verified"
                  label={copy.makeDefaultAccount}
                  onClick={() => run(() => setDefaultBankAccount(openAccount.id), close)}
                  disabled={pending}
                  chevron={false}
                />
              )}
              {!confirmRemove ? (
                <RowButton
                  icon="trash"
                  label={copy.removeAccount}
                  danger
                  onClick={() => setConfirmRemove(true)}
                  disabled={pending}
                  chevron={false}
                />
              ) : (
                <div className="px-2xs pt-row">
                  <p className={TYPE.body}>{copy.removeAccountBody}</p>
                  <div className="mt-row flex flex-col gap-inline">
                    <Button
                      variant="danger"
                      full
                      loading={pending}
                      onClick={() => run(() => removeBankAccount(openAccount.id), close)}
                    >
                      {copy.removeAccountConfirm}
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

      {addingAccount && (
        <AddBankAccountSheet
          copy={copy}
          onClose={() => setAddingAccount(false)}
          onSaved={() => {
            setAddingAccount(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
