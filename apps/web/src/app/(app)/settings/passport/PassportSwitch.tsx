"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { setRenterPassport } from "@/lib/trust/passport-actions";

/**
 * V-100: the one switch, as the settings row everything else uses (the switch
 * primitive's spring and a light tap in the hand come with `RowSwitch`). Off
 * also takes the passport back from every thread, which is said under it.
 *
 * Optimistic and reverting, like every account switch: it moves at once, the
 * server decides, and a refusal puts it back with the reason. The page
 * remounts it by key when the server's answer changes (the sheet can turn the
 * passport off too), so its own state never goes stale.
 */
export function PassportSwitch({
  copy,
  legacy,
  initialEnabled,
  sharedLine,
}: {
  copy: Dictionary["experienceAccount"]["passport"];
  /** The existing passport words: the note that turning it off takes it back. */
  legacy: Dictionary["trustVisible"]["passport"];
  initialEnabled: boolean;
  /** "Shown in 3 conversations", only while it is on. */
  sharedLine: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flip(next: boolean) {
    setError(null);
    setEnabled(next);
    startTransition(async () => {
      const result = await setRenterPassport({ enabled: next });
      if (result.ok) setEnabled(result.data.enabled);
      else {
        setEnabled(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div data-testid="passport-switch">
      <SettingsGroup
        label={copy.shareLabel}
        note={
          error ? (
            <span role="alert" className="text-[var(--nf-state-error)]">
              {error}
            </span>
          ) : enabled ? (
            <>
              {sharedLine ? <span data-testid="passport-shared-in">{sharedLine} </span> : null}
              {legacy.offNote}
            </>
          ) : undefined
        }
      >
        <RowSwitch
          icon="id-card"
          label={copy.switchLabel}
          sub={enabled ? copy.switchOnSub : copy.switchOffSub}
          value={enabled ? copy.on : copy.off}
          checked={enabled}
          onChange={flip}
          disabled={pending}
        />
      </SettingsGroup>
    </div>
  );
}
