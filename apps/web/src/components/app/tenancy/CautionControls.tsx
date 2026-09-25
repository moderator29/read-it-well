"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Dictionary, type Locale } from "@vallo/i18n";
import { useMoneyStepUp } from "@/components/app/money/MoneyStepUp";
import { parseNairaToKobo } from "@/lib/agent/listings-schema";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ROOM_COPY, ROOM_ITEMS, type RoomItem } from "@/lib/inspections/report";
import {
  answerCautionDeduction,
  proposeCautionDeduction,
  returnCaution,
} from "@/lib/tenancy/actions";

type Copy = Dictionary["afterTheGate"]["tenancy"];

/**
 * The caution register's three controls. V-36.
 *
 * The tenant answers each deduction line once: accept or dispute. The lister
 * proposes a line (a room, an amount, a move-out photograph: no lump sums),
 * and returns caution money from their own wallet to the tenant's in one
 * step, which lands on the record as it goes through. Every rule is enforced by the database door;
 * these forms only collect the facts and say what came back.
 */

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }
      router.refresh();
    });
  }
  return { pending, error, run };
}

export function DeductionAnswer({
  tenancyId,
  deductionId,
  copy,
}: {
  tenancyId: string;
  deductionId: string;
  copy: Copy;
}) {
  const { pending, error, run } = useRun();
  return (
    <div className="mt-xs">
      <div className="flex flex-wrap gap-sm">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(() =>
              answerCautionDeduction({
                tenancyId,
                deductionId,
                answer: "accepted",
              })
            )
          }
        >
          {copy.accept}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(() =>
              answerCautionDeduction({
                tenancyId,
                deductionId,
                answer: "disputed",
              })
            )
          }
        >
          {copy.dispute}
        </Button>
      </div>
      {error && (
        <p
          className="nf-caption mt-xs text-[var(--nf-state-error)]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function ProposeDeduction({
  tenancyId,
  obligationId,
  photos,
  copy,
}: {
  tenancyId: string;
  obligationId: string;
  photos: { id: string; item: RoomItem | null; label: string }[];
  copy: Copy;
}) {
  const { pending, error, run } = useRun();
  const [item, setItem] = useState<RoomItem>(photos[0]?.item ?? "overall");
  const [amount, setAmount] = useState("");
  const [photoId, setPhotoId] = useState(photos[0]?.id ?? "");
  const [note, setNote] = useState("");

  if (photos.length === 0) {
    return (
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">
        {copy.proposeNeedsPhoto}
      </p>
    );
  }

  return (
    <form
      className="grid gap-md"
      data-testid="caution-propose"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          proposeCautionDeduction({
            tenancyId,
            obligationId,
            item,
            amountNaira: amount,
            photoId,
            note,
          })
        );
      }}
    >
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">
        {copy.proposeHelp}
      </p>
      <Field label={copy.proposeItem}>
        {(control) => (
          <select
            {...control}
            className="nf-field"
            value={item}
            onChange={(e) => setItem(e.target.value as RoomItem)}
          >
            {ROOM_ITEMS.map((room) => (
              <option key={room} value={room}>
                {ROOM_COPY[room].title}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={copy.proposeAmount}>
        {(control) => (
          <input
            {...control}
            className="nf-field"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
      </Field>
      <Field label={copy.proposePhoto}>
        {(control) => (
          <select
            {...control}
            className="nf-field"
            value={photoId}
            onChange={(e) => setPhotoId(e.target.value)}
          >
            {photos.map((photo) => (
              <option key={photo.id} value={photo.id}>
                {photo.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={copy.proposeNote} error={error ?? undefined}>
        {(control) => (
          <input
            {...control}
            className="nf-field"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <Button
        type="submit"
        variant="secondary"
        full
        loading={pending}
        disabled={pending}
      >
        {copy.proposeSubmit}
      </Button>
    </form>
  );
}

export function ReturnCaution({
  tenancyId,
  obligationId,
  outstanding,
  outstandingNaira,
  copy,
  locale,
}: {
  tenancyId: string;
  obligationId: string;
  /** The formatted amount still owed, for the help line. */
  outstanding: string;
  /** The same amount as plain naira, to prefill the field. */
  outstandingNaira: string;
  copy: Copy;
  locale: Locale;
}) {
  const router = useRouter();
  // V-81: the phone lock for exactly this obligation and amount, read the way the server reads it.
  const lock = useMoneyStepUp(locale);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(outstandingNaira);
  // One key per drawn form: a double tap or a retry of this form is the
  // same transfer, and the database moves the money once.
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [sent, setSent] = useState<string | null>(null);
  return (
    <>
      {lock.sheet}
      <form
        className="grid gap-md"
        data-testid="caution-return"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          start(async () => {
            const result = await lock.guard(
              {
                kind: "caution_return",
                target: obligationId,
                amountKobo: parseNairaToKobo(amount),
              },
              (stepUp) =>
                returnCaution({
                  tenancyId,
                  obligationId,
                  amountNaira: amount,
                  idempotencyKey: key,
                  stepUp,
                })
            );
            if (result === null) {
              setError(getDictionary(locale).platform.moneyLock.notConfirmed);
              return;
            }
            if (!result.ok) {
              setError(result.error ?? null);
              return;
            }
            setSent(copy.returnSent);
            setAmount("");
            setKey(crypto.randomUUID());
            router.refresh();
          });
        }}
      >
        <p className="nf-body-sm text-[var(--nf-content-secondary)]">
          {copy.returnHelp.replace("{outstanding}", outstanding)}
        </p>
        {sent && (
          <p
            className="nf-body-sm text-[var(--nf-state-success)]"
            role="status"
            data-testid="caution-return-sent"
          >
            {sent}
          </p>
        )}
        <Field label={copy.returnAmount} error={error ?? undefined}>
          {(control) => (
            <input
              {...control}
              className="nf-field"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setSent(null);
              }}
            />
          )}
        </Field>
        <Button
          type="submit"
          variant="primary"
          full
          loading={pending}
          disabled={pending || amount.trim().length === 0}
        >
          {copy.returnSubmit}
        </Button>
      </form>
    </>
  );
}
