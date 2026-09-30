"use client";

import { useActionState, useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import type { ActionResult } from "@/lib/actions/envelope";
import { saveEmailPreferences } from "@/lib/email/preferences-actions";

type Copy = Dictionary["publicDoors"]["prefs"];
type Channel = keyof Copy["channels"];
const ORDER: Channel[] = ["bookings", "messages", "wallet", "marketing"];

/** A12. The four email switches, saved on the authority of the link's token. */
export function PreferencesForm({
  copy,
  token,
  initial,
}: {
  copy: Copy;
  token: string;
  initial: Record<Channel, boolean>;
}) {
  const [values, setValues] = useState(initial);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveEmailPreferences, null);

  return (
    <form action={action} className="grid gap-md">
      <input type="hidden" name="token" value={token} />
      <ul className="nf-list-group">
        {ORDER.map((channel) => (
          <li key={channel} className="nf-list-item">
            <div className="nf-list-row nf-list-row--two">
              <input type="hidden" name={channel} value={values[channel] ? "on" : "off"} />
              <Switch
                checked={values[channel]}
                onCheckedChange={(next) => setValues((prev) => ({ ...prev, [channel]: next }))}
                label={copy.channels[channel].title}
                description={copy.channels[channel].body}
                data-testid={`prefs-${channel}`}
                className="w-full"
              />
            </div>
          </li>
        ))}
      </ul>
      <Button type="submit" variant="primary" size="lg" full loading={pending} data-testid="prefs-save">
        {copy.save}
      </Button>
      <div aria-live="polite">
        {state?.ok && <p className="nf-body-sm text-[var(--nf-state-success)]">{copy.saved}</p>}
        {state && !state.ok && (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
            {state.error === "invalid-token" ? copy.invalidTitle : copy.failed}
          </p>
        )}
      </div>
    </form>
  );
}
