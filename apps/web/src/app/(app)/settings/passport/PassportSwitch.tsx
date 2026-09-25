"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { setRenterPassport } from "@/lib/trust/passport-actions";

/** V-100: the one switch. Off also takes the passport back from every thread. */
export function PassportSwitch({
  copy,
  initialEnabled,
}: {
  copy: Dictionary["trustVisible"]["passport"];
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flip() {
    setError(null);
    startTransition(async () => {
      const result = await setRenterPassport({ enabled: !enabled });
      if (result.ok) setEnabled(result.data.enabled);
      else setError(result.error);
    });
  }

  return (
    <div className="grid gap-xs" data-testid="passport-switch">
      <p className="nf-body font-semibold text-[var(--nf-content-primary)]" role="status">
        {enabled ? copy.on : copy.off}
      </p>
      <button
        type="button"
        onClick={flip}
        disabled={pending}
        className={`nf-btn ${enabled ? "nf-btn--secondary" : "nf-btn--primary"} min-h-[44px] w-full`}
      >
        {pending ? copy.working : enabled ? copy.turnOff : copy.turnOn}
      </button>
      {enabled && <p className="nf-caption text-[var(--nf-content-muted)]">{copy.offNote}</p>}
      {error && (
        <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
