"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { formatReceiptCode } from "@/lib/receipts/code";
import { createReceiptCode, revokeReceiptCode } from "@/lib/receipts/actions";

/**
 * V-55. The tenant's proof of payment: a code anybody can check at /r.
 *
 * Share goes through the device's own share sheet (the one exit the rules
 * allow), with the copy link as the fallback. The shared text carries the
 * link and nothing else: no amount, no address, no name. Whoever opens it
 * sees what the check page decides to show, which is area-level only.
 */
export function ReceiptCodePanel({
  tenancyId,
  live,
  copy,
}: {
  tenancyId: string;
  live: { id: string; code: string } | null;
  copy: Dictionary["afterTheGate"]["receipt"];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const link = live ? `${typeof window === "undefined" ? "" : window.location.origin}/r/${formatReceiptCode(live.code)}` : "";

  function run(work: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok) {
        setNote(result.error ?? copy.failed);
        return;
      }
      if (done) setNote(done);
      router.refresh();
    });
  }

  return (
    <div className="nf-panel nf-panel--card block p-md" data-testid="tenancy-receipt">
      <h3 className="nf-h4">{copy.heading}</h3>
      <p className="nf-body-sm mt-xs text-[var(--nf-content-secondary)]">{copy.lede}</p>
      {live ? (
        <div className="mt-md grid gap-sm">
          <p className="nf-caption">{copy.code}</p>
          <p className="nf-h3 nf-numeric tracking-wide">{formatReceiptCode(live.code)}</p>
          <div className="grid gap-sm sm:grid-cols-2">
            <Button
              variant="primary"
              full
              onClick={async () => {
                const text = copy.shareText.replace("{link}", link);
                try {
                  if (navigator.share) {
                    await navigator.share({ text, url: link });
                    return;
                  }
                } catch {
                  return;
                }
                try {
                  await navigator.clipboard.writeText(link);
                  setNote(copy.copied);
                } catch {
                  setNote(copy.failed);
                }
              }}
            >
              {copy.share}
            </Button>
            <Button
              variant="secondary"
              full
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setNote(copy.copied);
                } catch {
                  setNote(copy.failed);
                }
              }}
            >
              {copy.copy}
            </Button>
          </div>
          <Button
            variant="ghost"
            full
            disabled={pending}
            onClick={() => run(() => revokeReceiptCode({ tenancyId, codeId: live.id }), copy.revoked)}
          >
            {copy.revoke}
          </Button>
        </div>
      ) : (
        <Button className="mt-md" variant="secondary" full disabled={pending} onClick={() => run(() => createReceiptCode({ tenancyId }))}>
          {copy.make}
        </Button>
      )}
      {note && (
        <p className="nf-caption mt-sm" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
