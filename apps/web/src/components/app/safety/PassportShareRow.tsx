"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n";
import { shareRenterPassport } from "@/lib/trust/passport-actions";

/**
 * V-100 IN A THREAD, FOR THE RENTER: show the passport to this lister, or take
 * it back. With the passport off, the row says where to turn it on instead of
 * offering a switch that cannot work. Never shown to the lister, who never
 * gets a way to ask for it.
 */
export function PassportShareRow({
  copy,
  conversationId,
  initial,
}: {
  copy: Dictionary["trustVisible"]["passport"];
  conversationId: string;
  initial: { enabled: boolean; shared: boolean };
}) {
  const [shared, setShared] = useState(initial.shared);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!initial.enabled) {
    return (
      <p className="mt-md nf-caption text-[var(--nf-content-muted)]" data-testid="passport-share-off">
        <Link href="/settings/passport" className="underline underline-offset-2">
          {copy.turnOnFirst}
        </Link>
      </p>
    );
  }

  function flip() {
    setError(null);
    startTransition(async () => {
      const result = await shareRenterPassport({ conversationId, share: !shared });
      if (result.ok) setShared(result.data.shared);
      else setError(result.error);
    });
  }

  return (
    <div className="mt-md grid gap-2xs" data-testid="passport-share">
      <button type="button" onClick={flip} disabled={pending} className="nf-btn nf-btn--secondary min-h-[44px] w-full">
        {pending ? copy.working : shared ? copy.unshare : copy.share}
      </button>
      <p className="nf-caption text-[var(--nf-content-muted)]" role="status">
        {shared ? copy.shared : copy.shareHint}
      </p>
      {error && (
        <p role="alert" className="nf-caption text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
