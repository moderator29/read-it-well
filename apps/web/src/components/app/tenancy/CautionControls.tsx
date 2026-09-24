"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ROOM_COPY, ROOM_ITEMS, type RoomItem } from "@/lib/inspections/report";
import {
  answerCautionDeduction,
  proposeCautionDeduction,
  recordCautionReturn,
} from "@/lib/tenancy/actions";

type Copy = Dictionary["afterTheGate"]["tenancy"];

/**
 * The caution register's three controls. V-36.
 *
 * The tenant answers each deduction line once: accept or dispute. The lister
 * proposes a line (a room, an amount, a move-out photograph: no lump sums),
 * and records a return by pasting the reference of a transfer they already
 * made from their own wallet. Every rule is enforced by the database door;
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
          onClick={() => run(() => answerCautionDeduction({ tenancyId, deductionId, answer: "accepted" }))}
        >
          {copy.accept}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => answerCautionDeduction({ tenancyId, deductionId, answer: "disputed" }))}
        >
          {copy.dispute}
        </Button>
      </div>
      {error && (
        <p className="nf-caption mt-xs text-[var(--nf-state-error)]" role="alert">
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
    return <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.proposeNeedsPhoto}</p>;
  }

  return (
    <form
      className="grid gap-md"
      data-testid="caution-propose"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => proposeCautionDeduction({ tenancyId, obligationId, item, amountNaira: amount, photoId, note }));
      }}
    >
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.proposeHelp}</p>
      <Field label={copy.proposeItem}>
        {(control) => (
          <select {...control} className="nf-field" value={item} onChange={(e) => setItem(e.target.value as RoomItem)}>
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
          <select {...control} className="nf-field" value={photoId} onChange={(e) => setPhotoId(e.target.value)}>
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
          <input {...control} className="nf-field" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        )}
      </Field>
      <Button type="submit" variant="secondary" full loading={pending} disabled={pending}>
        {copy.proposeSubmit}
      </Button>
    </form>
  );
}

export function RecordReturn({
  tenancyId,
  obligationId,
  sendHref,
  copy,
}: {
  tenancyId: string;
  obligationId: string;
  sendHref: string;
  copy: Copy;
}) {
  const { pending, error, run } = useRun();
  const [reference, setReference] = useState("");
  return (
    <form
      className="grid gap-md"
      data-testid="caution-return"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => recordCautionReturn({ tenancyId, obligationId, reference }));
      }}
    >
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.returnHelp}</p>
      <ButtonLink href={sendHref} variant="secondary" full trailingIcon="arrow-right">
        {copy.returnSend}
      </ButtonLink>
      <Field label={copy.returnReference} error={error ?? undefined}>
        {(control) => (
          <input
            {...control}
            className="nf-field"
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        )}
      </Field>
      <Button type="submit" variant="primary" full loading={pending} disabled={pending || reference.trim().length < 4}>
        {copy.returnSubmit}
      </Button>
    </form>
  );
}
