"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { shareRenterPassport } from "@/lib/trust/passport-actions";
import { Button } from "@/components/ui/Button";

/**
 * V-100 IN A THREAD, FOR THE RENTER: show the passport to this lister, or take
 * it back. With the passport off, nothing is drawn. Never shown to the lister,
 * who never gets a way to ask for it.
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

  /* Off means off: nothing in the thread, not even a nudge to turn it on.
     Vallo never asks for the passport, and a prompt here would be asking. */
  if (!initial.enabled) return null;

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
      {/* The one Button primitive (Session 3, W13), which is what the classes
          written here by hand were imitating (`button-classes.test.ts`). */}
      <Button variant="secondary" full onClick={flip} disabled={pending}>
        {pending ? copy.working : shared ? copy.unshare : copy.share}
      </Button>
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
