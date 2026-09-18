"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { RowButton, Sheet, SettingsGroup } from "@/components/app/account/rows";
import { EmptyState, ICON, TYPE } from "@/components/app/Screen";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NUBAN_LENGTH, digitsOnly, groupNuban } from "@/lib/agent/payout-schema";
import {
  addBankAccount,
  listBanks,
  removeBankAccount,
  resolveBankAccount,
  setDefaultBankAccount,
  type BankAccount,
} from "@/lib/payments/bank-accounts-actions";
import { maskNumber } from "./format";

/**
 * BANK ACCOUNTS, in the settings grammar, shared by every side that is paid.
 *
 * Rows of bank, "•••• 6789" and the name the bank gave back; a pill on the
 * one payouts go to; a chevron into a sheet with make-default and
 * remove-with-confirm. The add sheet keeps the agent screen's proven three
 * beats: pick the bank (with a search field, because the list is long), type
 * the ten digits grouped 0123 456 789, and confirm the name the bank returns
 * before anything is saved. The server resolves the account again on save,
 * so the name shown here is a courtesy and never the guard.
 *
 * Every state is honest: a bank list that failed to load says so and offers
 * a retry; a number that does not resolve says so in rose; a name the person
 * does not recognise has a way back to the number without saving anything.
 */

type PaymentsCopy = Dictionary["paymentsPage"];
type Bank = { name: string; code: string };
type Beat = "bank" | "number" | "confirm";

export function BankAccounts({
  accounts,
  readFailed,
  copy,
}: {
  accounts: BankAccount[];
  readFailed: boolean;
  copy: PaymentsCopy;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<BankAccount | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  const close = () => {
    setOpen(null);
    setConfirmRemove(false);
  };

  return (
    <>
      <SettingsGroup
        label={copy.banksLabel}
        note={
          error && !open && !adding ? (
            <span role="alert" className="text-[var(--nf-state-error)]">
              {error}
            </span>
          ) : (
            copy.banksNote
          )
        }
      >
        {readFailed ? (
          <p className={`px-lg py-md ${TYPE.rowMeta}`} role="status">
            {copy.readFailed}
          </p>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon="wallet"
            title={copy.accountsEmptyTitle}
            body={copy.accountsEmptyBody}
            className="py-block"
            data-testid="payments-accounts-empty"
          />
        ) : (
          accounts.map((account) => (
            <RowButton
              key={account.id}
              icon="building-apartment"
              label={`${account.bankName} ${maskNumber(account.accountNumber)}`}
              sub={account.accountName}
              value={
                account.isDefault ? (
                  <StatusPill tone="brand">{copy.defaultPayouts}</StatusPill>
                ) : undefined
              }
              onClick={() => setOpen(account)}
              testId="payments-account-row"
            />
          ))
        )}
        <RowButton
          icon="plus"
          label={copy.addAccount}
          onClick={() => setAdding(true)}
          disabled={pending}
          chevron={false}
          testId="payments-add-account"
        />
      </SettingsGroup>

      <Sheet open={open !== null} onClose={close} title={copy.accountSheetTitle}>
        {open && (
          <div>
            <div className="px-2xs">
              <p className={TYPE.rowTitle}>
                {open.bankName} {maskNumber(open.accountNumber)}
              </p>
              <p className={TYPE.rowMeta}>{open.accountName}</p>
            </div>
            <div className="mt-row">
              {!open.isDefault && (
                <RowButton
                  icon="verified"
                  label={copy.makeDefaultAccount}
                  onClick={() => run(() => setDefaultBankAccount(open.id), close)}
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
                      onClick={() => run(() => removeBankAccount(open.id), close)}
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

      {adding && (
        <AddAccountSheet
          copy={copy}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

/**
 * Three beats: bank, number, name. Mounted only while open, so every attempt
 * starts clean and nothing from a previous try can be saved by accident.
 */
function AddAccountSheet({
  copy,
  onClose,
  onSaved,
}: {
  copy: PaymentsCopy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [beat, setBeat] = useState<Beat>("bank");
  const [banks, setBanks] = useState<
    { state: "loading" } | { state: "ready"; banks: Bank[] } | { state: "failed"; reason: string }
  >({ state: "loading" });
  const [search, setSearch] = useState("");
  const [bank, setBank] = useState<Bank | null>(null);
  const [number, setNumber] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    void listBanks().then((result) => {
      if (!live) return;
      if (result.ok) setBanks({ state: "ready", banks: result.data });
      else setBanks({ state: "failed", reason: result.error });
    });
    return () => {
      live = false;
    };
  }, [reload]);

  const digits = digitsOnly(number);
  const complete = digits.length === NUBAN_LENGTH && bank !== null;
  const q = search.trim().toLowerCase();
  const shown =
    banks.state === "ready"
      ? banks.banks.filter((one) => q.length === 0 || one.name.toLowerCase().includes(q)).slice(0, 60)
      : [];

  const resolve = () => {
    if (!bank) return;
    setError(null);
    startTransition(async () => {
      const result = await resolveBankAccount({ bankCode: bank.code, accountNumber: digits });
      if (!result.ok) {
        setError(result.fieldErrors?.accountNumber ?? result.error);
        return;
      }
      setName(result.data.accountName);
      setBeat("confirm");
    });
  };

  const save = () => {
    if (!bank) return;
    setError(null);
    startTransition(async () => {
      const result = await addBankAccount({ bankCode: bank.code, accountNumber: digits });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  };

  return (
    <Sheet open onClose={onClose} title={copy.addSheetTitle}>
      {beat === "bank" && (
        <div>
          <TextField
            label={copy.pickBank}
            hideLabel
            type="search"
            leadingIcon="search"
            placeholder={copy.searchBanks}
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {banks.state === "loading" && (
            <p role="status" aria-live="polite" className={`mt-row px-2xs ${TYPE.rowMeta}`}>
              {copy.banksLoading}
            </p>
          )}
          {banks.state === "failed" && (
            <div className="mt-row px-2xs">
              <p role="alert" className={`${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
                {banks.reason || copy.banksFailed}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-inline"
                onClick={() => {
                  setBanks({ state: "loading" });
                  setReload((n) => n + 1);
                }}
              >
                {copy.tryAgain}
              </Button>
            </div>
          )}
          {banks.state === "ready" && (
            <div className="mt-row" role="listbox" aria-label={copy.pickBank}>
              {shown.map((one) => (
                <RowButton
                  key={one.code}
                  label={one.name}
                  onClick={() => {
                    setBank(one);
                    setBeat("number");
                  }}
                />
              ))}
              {shown.length === 0 && (
                <p className={`px-2xs py-row ${TYPE.rowMeta}`}>{copy.noBankMatch}</p>
              )}
            </div>
          )}
        </div>
      )}

      {beat === "number" && bank && (
        <div>
          <RowButton
            icon="building-apartment"
            label={bank.name}
            sub={copy.changeBank}
            onClick={() => setBeat("bank")}
            disabled={pending}
          />
          <div className="mt-row">
            <TextField
              label={copy.accountNumber}
              hint={copy.accountNumberHint}
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              placeholder="0123 456 789"
              value={groupNuban(number)}
              onChange={(event) => setNumber(digitsOnly(event.target.value))}
              inputClassName="nf-numeric tracking-[0.08em]"
              error={error ?? undefined}
            />
          </div>
          <Button
            variant="primary"
            full
            className="mt-block"
            disabled={!complete}
            loading={pending}
            onClick={resolve}
          >
            {pending ? copy.checking : copy.checkName}
          </Button>
        </div>
      )}

      {beat === "confirm" && bank && name && (
        <div className="px-2xs">
          <p className={TYPE.sectionTitle}>{copy.isThisYou}</p>
          <div className="mt-row flex items-start gap-row rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] p-row">
            <UiIcon
              name="verified"
              size={ICON.inline}
              className="mt-3xs shrink-0 text-[var(--nf-state-success)]"
            />
            <div className="min-w-0">
              <p className={TYPE.rowMeta}>{copy.confirmsBelongs.replace("{bank}", bank.name)}</p>
              <p className={`mt-3xs ${TYPE.rowTitle}`}>{name}</p>
              <p className={`nf-numeric mt-3xs ${TYPE.caption}`}>{groupNuban(number)}</p>
            </div>
          </div>
          {error && (
            <p role="alert" className={`mt-row ${TYPE.rowMeta} text-[var(--nf-state-error)]`}>
              {error}
            </p>
          )}
          <div className="mt-block flex flex-col gap-inline">
            <Button variant="primary" full loading={pending} onClick={save}>
              {pending ? copy.saving : copy.yesSave}
            </Button>
            <Button
              variant="ghost"
              full
              disabled={pending}
              onClick={() => {
                setName(null);
                setError(null);
                setBeat("number");
              }}
            >
              {copy.notMe}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
