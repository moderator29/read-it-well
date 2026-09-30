"use client";

import { useState, useTransition } from "react";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { ruleCautionDispute, ruleCautionReturn } from "@/lib/admin/caution-desk-actions";
import type { CautionDesk, CautionDispute, ContestedReturn } from "@/lib/admin/reads/caution-desk";

/**
 * THE CAUTION DESK. V-36.
 *
 * Vallo never holds a caution; it rules on the record of one. A disputed
 * deduction gets the amount that stands (zero to what the lister proposed)
 * and a reason both parties read. A return the tenant says never arrived is
 * found received or not received, with a reason. What is left owed after the
 * due date can then be claimed from the Vallo Guarantee by the tenant.
 */

const ITEM_LABEL: Record<string, string> = {
  exterior: "Exterior",
  interior: "Interior",
  kitchen: "Kitchen",
  bathrooms: "Bathrooms",
  utilities: "Utilities",
  appliances: "Appliances",
  safety: "Safety",
  overall: "Overall condition",
};

const METHOD_LABEL: Record<string, string> = { bank_transfer: "bank transfer", cash: "cash", other: "other" };

function useRun() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      const result = await fn();
      setMessage(result.ok ? done : (result.error ?? "That did not go through."));
    });
  return { pending, message, run };
}

function DisputeItem({ row, locale }: { row: CautionDispute; locale: Locale }) {
  const { pending, message, run } = useRun();
  const [allowed, setAllowed] = useState(String(row.amountMinor / 100));
  const [reason, setReason] = useState("");
  return (
    <li className="nf-admin-queue-row" data-testid="caution-dispute-row">
      <div className="nf-admin-queue-row__main">
        <p className="font-semibold">
          {ITEM_LABEL[row.item] ?? row.item} · {formatMoney(row.amountMinor, locale)} proposed of a {formatMoney(row.cautionMinor, locale)} caution
        </p>
        {row.note ? <p className="mt-2xs text-[length:var(--nf-text-caption)]">Lister: {row.note}</p> : null}
        <p className="mt-2xs text-[length:var(--nf-text-caption)]">
          <a className="text-[var(--nf-content-link)]" href={`/tenancy/${row.rentPaymentId}`}>
            Open the tenancy file (both sides&apos; reports)
          </a>
        </p>
        {row.photoUrl ? (
          // A signed, short-lived URL to a private object.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.photoUrl} alt="" className="mt-xs h-24 w-24 rounded-[var(--nf-radius-sm)] object-cover" />
        ) : null}
        {message ? (
          <p role="status" className="mt-2xs text-[length:var(--nf-text-caption)]">
            {message}
          </p>
        ) : null}
      </div>
      <div className="nf-admin-queue-row__actions">
        <div className="grid gap-inline">
          <label className="text-[length:var(--nf-text-caption)]">
            Amount that stands (₦, 0 to allow none)
            <input className="nf-field mt-3xs" inputMode="decimal" value={allowed} onChange={(e) => setAllowed(e.target.value)} />
          </label>
          <label className="text-[length:var(--nf-text-caption)]">
            Reason (both parties read it)
            <input className="nf-field mt-3xs" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            type="button"
            className="nf-btn nf-btn--primary"
            disabled={pending || reason.trim().length < 10}
            onClick={() =>
              run(
                () => ruleCautionDispute({ deductionId: row.deductionId, allowedNaira: allowed, reason }),
                "Ruled. Both parties were told.",
              )
            }
          >
            Rule
          </button>
        </div>
      </div>
    </li>
  );
}

function ReturnItem({ row, locale }: { row: ContestedReturn; locale: Locale }) {
  const { pending, message, run } = useRun();
  const [reason, setReason] = useState("");
  const rule = (outcome: "received" | "not_received") =>
    run(() => ruleCautionReturn({ returnId: row.returnId, outcome, reason }), "Ruled. Both parties were told.");
  return (
    <li className="nf-admin-queue-row" data-testid="caution-return-row">
      <div className="nf-admin-queue-row__main">
        <p className="font-semibold">
          {formatMoney(row.amountMinor, locale)} recorded as returned on {row.returnedOn} by {METHOD_LABEL[row.method] ?? row.method}
          {row.reference ? `, ref ${row.reference}` : ""}
        </p>
        <p className="mt-2xs text-[length:var(--nf-text-caption)]">Tenant: {row.contestNote}</p>
        <p className="mt-2xs text-[length:var(--nf-text-caption)]">
          <a className="text-[var(--nf-content-link)]" href={`/tenancy/${row.rentPaymentId}`}>
            Open the tenancy file
          </a>
        </p>
        {message ? (
          <p role="status" className="mt-2xs text-[length:var(--nf-text-caption)]">
            {message}
          </p>
        ) : null}
      </div>
      <div className="nf-admin-queue-row__actions">
        <div className="grid gap-inline">
          <label className="text-[length:var(--nf-text-caption)]">
            Reason (both parties read it)
            <input className="nf-field mt-3xs" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex gap-inline">
            <button type="button" className="nf-btn nf-btn--primary" disabled={pending || reason.trim().length < 10} onClick={() => rule("received")}>
              Received
            </button>
            <button type="button" className="nf-btn nf-btn--ghost" disabled={pending || reason.trim().length < 10} onClick={() => rule("not_received")}>
              Not received
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CautionRulings({ desk, locale }: { desk: CautionDesk; locale: Locale }) {
  if (desk.state === "forbidden") {
    return <p className="nf-body text-[var(--nf-content-secondary)]">Your account cannot rule on cautions.</p>;
  }
  if (desk.state !== "ok") {
    return <p className="nf-body text-[var(--nf-content-secondary)]">The caution desk could not be read just now. Refresh to try again.</p>;
  }
  if (desk.disputes.length === 0 && desk.returns.length === 0) {
    return <p className="nf-body text-[var(--nf-content-secondary)]">No disputed deduction or contested return is waiting.</p>;
  }
  return (
    <div className="grid gap-md" data-testid="caution-desk">
      {desk.disputes.length > 0 ? (
        <ul className="nf-admin-queue">
          {desk.disputes.map((row) => (
            <DisputeItem key={row.deductionId} row={row} locale={locale} />
          ))}
        </ul>
      ) : null}
      {desk.returns.length > 0 ? (
        <ul className="nf-admin-queue">
          {desk.returns.map((row) => (
            <ReturnItem key={row.returnId} row={row} locale={locale} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
