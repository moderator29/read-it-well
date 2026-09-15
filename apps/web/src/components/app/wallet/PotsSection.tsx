"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@vallo/i18n";
import { Amount } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/Field";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import type { ActionResult } from "@/lib/actions/envelope";
import { createPot, moveIntoPot, moveOutOfPot } from "@/lib/wallet/pot-actions";
import type { Pot } from "@/lib/wallet/pots";

/**
 * Savings pots on the wallet.
 *
 * ---------------------------------------------------------------------------
 * WHAT A POT IS, IN THE WORDS THIS SCREEN USES.
 *
 * Money the person has set aside inside their own wallet so that spending it
 * takes a deliberate act. It is theirs the whole time and comes back in one
 * tap.
 *
 * NOTHING ON THIS SCREEN SAYS OR IMPLIES A RETURN. No rate, no "grow your
 * savings", no projected total. Pots earn nothing, the schema has no column
 * that could hold a rate, and copy that hints at one is a financial promise the
 * platform is not licensed to make. The word used throughout is "set aside",
 * never "invest" and never "save with us".
 *
 * ---------------------------------------------------------------------------
 * WHY THE TARGET IS A LINE AND NOT A BADGE.
 *
 * A target is a private note somebody wrote to themselves. Nothing enforces it,
 * missing it costs nothing, and a pot without one is completely normal - so it
 * reads as "₦120,000 of ₦500,000" under the bar rather than as a status the
 * pot is failing to meet.
 */

const EMPTY: ActionResult<null> = { ok: false, error: "" };

/** The narrowing `WalletDeck` already does: a successful result has no errors. */
function fieldError<T>(state: ActionResult<T>, field: string): string | undefined {
  return state.ok ? undefined : state.fieldErrors?.[field];
}
const CREATE_EMPTY: ActionResult<{ id: string } | null> = { ok: false, error: "" };

export function PotsSection({ pots, locale }: { pots: Pot[]; locale: Locale }) {
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState<{ pot: Pot; direction: "in" | "out" } | null>(null);

  return (
    <section aria-labelledby="nf-wallet-pots">
      <div className="mb-heading flex items-baseline justify-between gap-md">
        <h2 id="nf-wallet-pots" className="nf-overline">
          Set aside
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-haspopup="dialog"
          className="nf-tap inline-flex items-center gap-2xs text-[0.8125rem] font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          <UiIcon name="plus" size={16} />
          New pot
        </button>
      </div>

      {pots.length === 0 ? (
        <p className={`py-row ${TYPE.rowMeta}`}>
          Keep rent money separate from spending money. A pot holds what you set
          aside; it is still your money and comes back whenever you want it.
        </p>
      ) : (
        <ul className="space-y-row">
          {pots.map((pot) => (
            <li
              key={pot.id}
              className="rounded-[var(--nf-radius-control)] border border-[var(--nf-border-subtle)] p-card-sm"
            >
              <div className="flex items-baseline justify-between gap-md">
                <p className={TYPE.rowTitle}>{pot.name}</p>
                <Amount
                  minorUnits={pot.balanceMinor}
                  locale={locale}
                  showFraction
                  className="nf-numeric nf-body font-semibold text-[var(--nf-content-primary)]"
                  secondaryClassName="text-[0.62em] font-medium opacity-60"
                />
              </div>

              {pot.targetMinor !== null && (
                <>
                  {/* A bar with no percentage shouted at anybody. It is a shape
                      that says roughly how far along they are, and the exact
                      figures are on the line under it. */}
                  <div
                    className="mt-row h-1.5 overflow-hidden rounded-[var(--nf-radius-pill)] bg-[var(--nf-surface-sunken)]"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-[var(--nf-radius-pill)] bg-[var(--nf-brand-primary)]"
                      style={{
                        width: `${Math.min(100, Math.round((pot.balanceMinor / pot.targetMinor) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className={`mt-inline-tight ${TYPE.caption}`}>
                    of <Amount minorUnits={pot.targetMinor} locale={locale} /> set aside
                  </p>
                </>
              )}

              <div className="mt-row grid grid-cols-2 gap-row">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setMoving({ pot, direction: "in" })}
                >
                  Top up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pot.balanceMinor === 0}
                  onClick={() => setMoving({ pot, direction: "out" })}
                >
                  Take out
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreateSheet open={creating} onClose={() => setCreating(false)} />
      {moving && (
        <MoveSheet
          pot={moving.pot}
          direction={moving.direction}
          locale={locale}
          onClose={() => setMoving(null)}
        />
      )}
    </section>
  );
}

function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createPot, CREATE_EMPTY);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.data) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()} title="New pot">
      <form action={formAction} noValidate className="mx-auto w-full max-w-md space-y-row">
        <p className={TYPE.rowMeta}>
          Name it for what it is for. Money you set aside is still yours and
          comes back whenever you want it.
        </p>
        <TextField
          label="Name"
          name="name"
          type="text"
          autoComplete="off"
          maxLength={40}
          placeholder="Rent"
          error={fieldError(state, "name")}
        />
        <TextField
          label="Target (₦)"
          name="target"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Optional"
          error={fieldError(state, "target")}
        />
        {/* Said plainly, once, where somebody is deciding whether this is a
            savings account. It is not one. */}
        <p className={TYPE.caption}>
          A pot does not earn anything. It keeps money separate so you do not
          spend it by accident.
        </p>
        <Button type="submit" variant="primary" full loading={pending}>
          Create pot
        </Button>
        {!state.ok && state.error && (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-warning)]">
            {state.error}
          </p>
        )}
      </form>
    </Sheet>
  );
}

function MoveSheet({
  pot,
  direction,
  locale,
  onClose,
}: {
  pot: Pot;
  direction: "in" | "out";
  locale: Locale;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    direction === "in" ? moveIntoPot : moveOutOfPot,
    EMPTY,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  return (
    <Sheet
      open
      onOpenChange={(next) => !next && onClose()}
      title={direction === "in" ? `Top up ${pot.name}` : `Take out of ${pot.name}`}
    >
      <form action={formAction} noValidate className="mx-auto w-full max-w-md space-y-row">
        <input type="hidden" name="potId" value={pot.id} />
        <p className={TYPE.rowMeta}>
          {direction === "in" ? (
            "This comes out of your available balance and stays yours."
          ) : (
            <>
              This pot holds{" "}
              <Amount minorUnits={pot.balanceMinor} locale={locale} showFraction />. It
              goes straight back to your available balance.
            </>
          )}
        </p>
        <TextField
          label="Amount (₦)"
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="5000"
          error={fieldError(state, "amount")}
        />
        <Button type="submit" variant="primary" full loading={pending}>
          {direction === "in" ? "Set aside" : "Take out"}
        </Button>
        {!state.ok && state.error && (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-warning)]">
            {state.error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
