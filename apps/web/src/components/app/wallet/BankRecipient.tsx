"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { listBanks, resolveBankAccount } from "@/lib/payments/bank-accounts-actions";
import { WALLET_BANKS } from "@/lib/wallet/banks";
import { MoneyGlyph } from "./MoneyGlyph";

/**
 * SEND TO A BANK ACCOUNT: the recipient half (founder item 3, 23 September).
 *
 * The account number, the bank, and the name the BANK gives back, shown
 * before anything can be confirmed. There is no second resolver: this calls
 * the payout side's own `resolveBankAccount` and `listBanks`
 * (`lib/payments/bank-accounts-actions.ts`), the pair that resolve-verifies a
 * bank account when a person adds one for refunds and payouts. Both are
 * server actions, signed in, rate limited on the money guard.
 *
 * The bank list is the payout side's live Paystack registry; when Paystack is
 * not configured that answers an empty list, and the curated
 * `WALLET_BANKS` (the withdraw sheet's list, the same institutions with their
 * Paystack codes) stands in so the select is never empty.
 *
 * What this does NOT do is move money. The transfer-to-bank action is Session
 * A's (scope request B-BANK (b)); until it lands `SendFlow` keeps the send
 * button off in this mode and says so.
 */

export type BankOption = { name: string; code: string };

export type BankCheck =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "found"; name: string }
  | { state: "refused"; reason: string };

export type ResolveBank = (input: {
  bankCode: string;
  accountNumber: string;
}) => Promise<{ ok: true; data: { accountName: string } | null } | { ok: false; error: string }>;

export type LoadBanks = () => Promise<{ ok: true; data: BankOption[] | null } | { ok: false; error: string }>;

const defaultResolve: ResolveBank = (input) => resolveBankAccount(input);
const defaultLoad: LoadBanks = () => listBanks();

/** The name check, keyed on the pair it answered for; debounced and ordered. */
export function useBankRecipient({
  enabled,
  bankCode,
  accountNumber,
  resolve = defaultResolve,
  load = defaultLoad,
}: {
  enabled: boolean;
  bankCode: string;
  accountNumber: string;
  resolve?: ResolveBank;
  load?: LoadBanks;
}): { banks: BankOption[]; check: BankCheck } {
  const [banks, setBanks] = useState<BankOption[]>([...WALLET_BANKS]);
  const loaded = useRef(false);
  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    void load().then((result) => {
      if (result.ok && result.data && result.data.length > 0) {
        setBanks(result.data.map((b) => ({ name: b.name, code: b.code })));
      }
    });
  }, [enabled, load]);

  const digits = accountNumber.replace(/\D/g, "");
  const key = `${bankCode}|${digits}`;
  const ready = enabled && bankCode.length > 0 && digits.length === 10;
  const [answer, setAnswer] = useState<{ for: string; check: BankCheck } | null>(null);
  const attempt = useRef(0);
  useEffect(() => {
    if (!ready) return;
    const mine = ++attempt.current;
    const timer = window.setTimeout(() => {
      setAnswer({ for: key, check: { state: "checking" } });
      void resolve({ bankCode, accountNumber: digits }).then((result) => {
        if (mine !== attempt.current) return;
        setAnswer({
          for: key,
          check:
            result.ok && result.data
              ? { state: "found", name: result.data.accountName }
              : { state: "refused", reason: result.ok ? "" : result.error },
        });
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [ready, key, bankCode, digits, resolve]);

  const check: BankCheck = ready && answer && answer.for === key ? answer.check : { state: "idle" };
  return { banks, check };
}

/** The two rows and the confirmation, in the send form's anatomy. */
export function BankRecipientRows({
  copy,
  banks,
  bankCode,
  onBankCode,
  accountNumber,
  onAccountNumber,
  check,
  plate,
}: {
  copy: Dictionary["walletSend"];
  banks: BankOption[];
  bankCode: string;
  onBankCode: (code: string) => void;
  accountNumber: string;
  onAccountNumber: (value: string) => void;
  check: BankCheck;
  /** The row plate, drawn by `SendFlow` so both modes share one plate. */
  plate: (art: string) => React.ReactNode;
}) {
  return (
    <>
      <div className="nf-send-row">
        {plate("plate-bank")}
        <div className="nf-send-row__body">
          <label htmlFor="nf-send-bank" className="nf-send-row__label">
            {copy.bankRowLabel}
          </label>
          <select
            id="nf-send-bank"
            className="nf-send-row__input nf-send-row__select"
            name="bankCode"
            value={bankCode}
            onChange={(event) => onBankCode(event.target.value)}
          >
            <option value="" disabled>
              {copy.bankRowPlaceholder}
            </option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>
        <UiIcon name="chevron-down" size={20} className="nf-send-row__chevron" />
      </div>

      <div className="nf-send-row">
        {plate("plate-recipient")}
        <div className="nf-send-row__body">
          <label htmlFor="nf-send-account" className="nf-send-row__label">
            {copy.accountNumberLabel}
          </label>
          <input
            id="nf-send-account"
            className="nf-send-row__input nf-numeric"
            name="accountNumber"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder={copy.accountNumberPlaceholder}
            value={accountNumber}
            onChange={(event) => onAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
            aria-describedby="nf-send-account-note"
          />
        </div>
      </div>

      <div id="nf-send-account-note" className="nf-send-row__notes">
        {check.state === "checking" ? (
          <p role="status" aria-live="polite" className="nf-send-row__hint">
            {copy.accountChecking}
          </p>
        ) : check.state === "found" ? (
          <p role="status" aria-live="polite" className="nf-recipient-found" data-testid="wallet-send-bank-found">
            <MoneyGlyph name="shield-check" size={20} className="shrink-0 text-[var(--nf-state-success)]" />
            <span className="min-w-0">
              <span className="nf-send-row__label block">{copy.accountNameLabel}</span>
              <span className="nf-send-found__name block truncate">{check.name}</span>
            </span>
          </p>
        ) : check.state === "refused" ? (
          <p role="alert" className="nf-send-row__error">
            {check.reason || copy.accountNotConfirmed}
          </p>
        ) : (
          <p className="nf-send-row__hint">{copy.accountHint}</p>
        )}
      </div>
    </>
  );
}
