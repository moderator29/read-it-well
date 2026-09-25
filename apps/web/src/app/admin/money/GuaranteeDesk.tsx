"use client";

import { useState, useTransition } from "react";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { decideClaim, markClaimPaid } from "@/lib/admin/agreements-actions";
import type { ClaimRow } from "@/lib/admin/reads/agreements";

/**
 * GUARANTEE CLAIMS, DECIDED BY A PERSON.
 *
 * A claim is never paid automatically. The reviewer approves an amount (the
 * database refuses anything above what the claim asked, what the booking
 * still has to claim against, or what the reserve actually holds), or rejects
 * with a reason the claimant reads. An approved claim is paid from the
 * reserve's own bank account by transfer and marked paid here with the bank
 * reference, so the reserve's ledger and the bank statement agree line for
 * line.
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

function ClaimItem({ claim, locale }: { claim: ClaimRow; locale: Locale }) {
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(String(claim.requestedMinor / 100));
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      const result = await fn();
      setMessage(result.ok ? done : (result.error ?? "That did not go through."));
    });

  return (
    <li className="nf-admin-queue-row" data-testid="claim-row" data-status={claim.status}>
      <div className="nf-admin-queue-row__main">
        <p className="font-semibold">
          {claim.listingTitle} · {claim.claimantName}
          <span className="ml-inline nf-admin-badge nf-admin-badge--info">{claim.status}</span>
        </p>
        <p className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
          Asked {formatMoney(claim.requestedMinor, locale)}
          {claim.approvedMinor ? ` · approved ${formatMoney(claim.approvedMinor, locale)}` : ""}
          {claim.items.length ? ` · cites ${claim.items.map((i) => ITEM_LABEL[i] ?? i).join(", ")}` : ""}
          {claim.evidenceCount ? ` · ${claim.evidenceCount} new evidence files` : ""}
          {claim.paidReference ? ` · paid, ref ${claim.paidReference}` : ""}
        </p>
        <p className="mt-2xs text-[length:var(--nf-text-caption)]">{claim.description}</p>
        {claim.decisionReason ? (
          <p className="mt-2xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
            Reason: {claim.decisionReason}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="mt-2xs text-[length:var(--nf-text-caption)]">
            {message}
          </p>
        ) : null}
      </div>
      <div className="nf-admin-queue-row__actions">
        {claim.status === "submitted" ? (
          <div className="grid gap-inline">
            <label className="text-[length:var(--nf-text-caption)]">
              Pay from the Guarantee (₦)
              <input className="nf-input mt-3xs" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="text-[length:var(--nf-text-caption)]">
              Reason (required to reject)
              <input className="nf-input mt-3xs" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="flex gap-inline">
              <button
                type="button"
                className="nf-btn nf-btn--primary"
                disabled={pending}
                onClick={() =>
                  run(
                    () => decideClaim({ claimId: claim.id, decision: "approve", amountNaira: amount, reason }),
                    "Approved. The claimant was told; pay it from the reserve account and mark it paid.",
                  )
                }
              >
                Approve
              </button>
              <button
                type="button"
                className="nf-btn nf-btn--secondary"
                disabled={pending || reason.trim().length < 10}
                onClick={() =>
                  run(() => decideClaim({ claimId: claim.id, decision: "reject", reason }), "Rejected. The claimant was told why.")
                }
              >
                Reject
              </button>
            </div>
          </div>
        ) : claim.status === "approved" ? (
          <div className="grid gap-inline">
            <label className="text-[length:var(--nf-text-caption)]">
              Bank transfer reference
              <input className="nf-input mt-3xs" value={reference} onChange={(e) => setReference(e.target.value)} />
            </label>
            <button
              type="button"
              className="nf-btn nf-btn--primary"
              disabled={pending || reference.trim().length < 4}
              onClick={() => run(() => markClaimPaid({ claimId: claim.id, reference }), "Marked paid. The claimant was told.")}
            >
              Mark paid
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function GuaranteeClaims({ claims, locale }: { claims: ClaimRow[]; locale: Locale }) {
  if (claims.length === 0) {
    return <p className="nf-body text-[var(--nf-content-secondary)]">No claims have been made on the Guarantee.</p>;
  }
  return (
    <ul className="nf-admin-queue" data-testid="guarantee-claims">
      {claims.map((claim) => (
        <ClaimItem key={claim.id} claim={claim} locale={locale} />
      ))}
    </ul>
  );
}
