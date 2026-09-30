"use client";

import { useEffect, useState } from "react";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { Switch } from "@/components/ui/Switch";
import { readLongIdle, writeLongIdle } from "@/lib/passcode/idle-setting";

/**
 * C14 in Settings, Passcode. With a platform key the lock offers Face ID or
 * fingerprint, and this phone may wait fifteen minutes idle before locking
 * instead of five. Without one, it says where the key is added. The setting
 * lives on this device only, which the row says.
 */
export function PasskeyIdleSetting({ hasPasskey }: { hasPasskey: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(readLongIdle()), []);

  if (!hasPasskey) {
    return (
      <ListGroup label="Face ID or fingerprint">
        <ListRow
          title="Unlock with Face ID or fingerprint"
          sub="Set up the money lock in Settings first. The same key then unlocks the passcode."
          href="/settings"
          chevron
        />
      </ListGroup>
    );
  }

  return (
    <ListGroup label="Face ID or fingerprint">
      <ListRow title="Unlock with Face ID or fingerprint" sub="On the lock screen, the key at the bottom left of the keypad." />
      <ListRow
        title="Lock after 15 minutes idle"
        sub="Instead of 5, on this phone only. Getting back in is one touch, because this phone holds your key."
        trailing={
          <Switch
            checked={on}
            onCheckedChange={(next) => {
              setOn(next);
              writeLongIdle(next);
            }}
            aria-label="Lock after 15 minutes idle on this phone"
            data-testid="passcode-long-idle"
          />
        }
      />
    </ListGroup>
  );
}
