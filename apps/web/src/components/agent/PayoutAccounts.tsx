"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/actions/envelope";
import {
  addPayoutAccount,
  removePayoutAccount,
  resolvePayoutAccount,
  setDefaultPayoutAccount,
  type ResolvedName,
} from "@/lib/agent/payout-actions";
import type { PayoutAccount } from "@/lib/agent/payout-queries";
import { NUBAN_LENGTH, digitsOnly, groupNuban } from "@/lib/agent/payout-schema";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Where earnings are paid.
 *
 * Two steps on purpose. The agent picks a bank and types ten digits, we ask the
 * bank whose account it is, and only once they have seen the real name can they
 * save it. That is how every Nigerian banking app behaves and it is the single
 * best defence against paying the wrong person.
 *
 * The name is never trusted from this component: the add action re-resolves it
 * server side and stores what the bank said, not what this form carried.
 */

type Bank = { name: string; code: string };

export function PayoutAccounts({
  accounts,
  banks,
  resolveAvailable,
}: {
  accounts: PayoutAccount[];
  banks: Bank[];
  resolveAvailable: boolean;
}) {
  const router = useRouter();

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const [resolveState, resolveAction, resolving] = useActionState<
    ActionResult<ResolvedName> | null,
    FormData
  >(resolvePayoutAccount, null);
  const [addState, addAction, adding] = useActionState<ActionResult<null> | null, FormData>(
    addPayoutAccount,
    null,
  );

  const bankName = banks.find((b) => b.code === bankCode)?.name ?? "";
  const complete = digitsOnly(accountNumber).length === NUBAN_LENGTH && bankCode.length > 0;

  useEffect(() => {
    if (resolveState?.ok) setConfirmed(resolveState.data.accountName);
  }, [resolveState]);

  /* Changing either field invalidates a confirmation that was for the old one. */
  useEffect(() => {
    setConfirmed(null);
  }, [bankCode, accountNumber]);

  useEffect(() => {
    if (addState?.ok) {
      setBankCode("");
      setAccountNumber("");
      setConfirmed(null);
      router.refresh();
    }
  }, [addState, router]);

  return (
    <section aria-labelledby="payout-accounts-heading" className="mt-8">
      <h2 id="payout-accounts-heading" className="nf-h3">
        Where your earnings are paid
      </h2>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        Add the bank account your settled earnings should reach. We confirm the
        name with the bank before saving it, and RentMe takes nothing for holding
        or moving it.
      </p>

      {accounts.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {accounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </ul>
      ) : (
        <div className="nf-card mt-4 p-6 text-center">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="naira-hand" fill />
          </span>
          <p className="mt-3 font-semibold text-[var(--nf-content-primary)]">
            No payout account yet
          </p>
          <p className="mx-auto mt-1 max-w-[40ch] text-[0.875rem] text-[var(--nf-content-muted)]">
            Your earnings are safe and waiting. Add an account below and the
            first one becomes your default automatically.
          </p>
        </div>
      )}

      {!resolveAvailable ? (
        <div className="nf-card mt-4 flex items-start gap-3 p-4">
          <span className="mt-0.5 block h-8 w-8 shrink-0">
            <BrandIcon name="card-lock" fill tile={false} />
          </span>
          <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            Adding an account switches on the moment the payment keys land. We
            will not store an account we cannot confirm belongs to you, because
            an unconfirmed payout target is how money reaches the wrong person.
          </p>
        </div>
      ) : (
        <div className="nf-card mt-4 p-4 sm:p-5">
          <h3 className="nf-overline text-[var(--nf-content-muted)]">Add an account</h3>

          <div className="mt-3 grid gap-3">
            <div>
              <label
                htmlFor="payout-bank"
                className="block text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]"
              >
                Bank
              </label>
              <select
                id="payout-bank"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="nf-field mt-1.5 w-full"
              >
                <option value="">Choose your bank</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="payout-number"
                className="block text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]"
              >
                Account number
              </label>
              <input
                id="payout-number"
                inputMode="numeric"
                autoComplete="off"
                maxLength={12}
                value={groupNuban(accountNumber)}
                onChange={(e) => setAccountNumber(digitsOnly(e.target.value))}
                placeholder="0123 456 789"
                aria-describedby="payout-number-hint"
                className="nf-numeric nf-field mt-1.5 w-full tracking-[0.08em]"
              />
              <p id="payout-number-hint" className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
                Ten digits. We show the account name before anything is saved.
              </p>
            </div>
          </div>

          {confirmed === null ? (
            <form action={resolveAction} className="mt-4">
              <input type="hidden" name="bankCode" value={bankCode} />
              <input type="hidden" name="accountNumber" value={digitsOnly(accountNumber)} />
              <button
                type="submit"
                disabled={!complete || resolving}
                className="nf-btn nf-btn--glass w-full disabled:opacity-55"
              >
                {resolving ? "Checking with the bank..." : "Confirm account name"}
              </button>
            </form>
          ) : (
            <form action={addAction} className="mt-4">
              <input type="hidden" name="bankCode" value={bankCode} />
              <input type="hidden" name="bankName" value={bankName} />
              <input type="hidden" name="accountNumber" value={digitsOnly(accountNumber)} />
              <input type="hidden" name="accountName" value={confirmed} />

              <p className="flex items-start gap-2.5 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3">
                <UiIcon
                  name="verified"
                  size={20}
                  className="mt-0.5 shrink-0 text-[var(--nf-state-success)]"
                />
                <span className="leading-snug">
                  <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                    {bankName} confirms this account belongs to
                  </span>
                  <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                    {confirmed}
                  </span>
                </span>
              </p>

              <button
                type="submit"
                disabled={adding}
                className="nf-btn nf-btn--primary mt-3 w-full disabled:opacity-60"
              >
                {adding ? "Saving..." : "Save this account"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmed(null)}
                className="mt-2 w-full text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
              >
                Not my account, change it
              </button>
            </form>
          )}

          {resolveState && !resolveState.ok && (
            <p
              role="alert"
              className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
            >
              {resolveState.error}
            </p>
          )}
          {addState && !addState.ok && (
            <p
              role="alert"
              className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
            >
              {addState.error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** One saved account, with the two things an agent can do to it. */
function AccountRow({ account }: { account: PayoutAccount }) {
  const router = useRouter();
  const [defaultState, defaultAction, settingDefault] = useActionState<
    ActionResult<null> | null,
    FormData
  >(setDefaultPayoutAccount, null);
  const [removeState, removeAction, removing] = useActionState<
    ActionResult<null> | null,
    FormData
  >(removePayoutAccount, null);

  useEffect(() => {
    if (defaultState?.ok || removeState?.ok) router.refresh();
  }, [defaultState, removeState, router]);

  const error = (defaultState && !defaultState.ok && defaultState.error) ||
    (removeState && !removeState.ok && removeState.error) ||
    null;

  return (
    <li className="nf-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
            {account.accountName}
          </p>
          <p className="nf-numeric mt-1 text-[0.8125rem] text-[var(--nf-content-secondary)]">
            {groupNuban(account.accountNumber)}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
            {account.bankName}
          </p>
        </div>
        {account.isDefault && (
          <span className="nf-badge nf-badge--neutral shrink-0">Paid here</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[var(--nf-border-subtle)] pt-3">
        {!account.isDefault && (
          <form action={defaultAction}>
            <input type="hidden" name="accountId" value={account.id} />
            <button
              type="submit"
              disabled={settingDefault}
              className="text-[0.8125rem] font-semibold text-[var(--nf-electric-300)] underline-offset-4 hover:underline disabled:opacity-60"
            >
              {settingDefault ? "Switching..." : "Pay me here instead"}
            </button>
          </form>
        )}
        <form action={removeAction}>
          <input type="hidden" name="accountId" value={account.id} />
          <button
            type="submit"
            disabled={removing}
            className="text-[0.8125rem] font-semibold text-[var(--nf-content-muted)] underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline disabled:opacity-60"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        </form>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-warning)]"
        >
          {error}
        </p>
      )}
    </li>
  );
}
