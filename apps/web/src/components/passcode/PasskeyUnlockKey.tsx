"use client";

import { useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { assertPlatformKey, platformLockAvailable } from "@/lib/security/webauthn-client";
import { beginPasskeyUnlock, finishPasskeyUnlock } from "@/lib/passcode/passkey-unlock";

/**
 * The keypad's bottom-left key (C14): "Unlock with Face ID or fingerprint".
 * The device proves the person with the platform key the member already set
 * up for the money lock; the SERVER verifies the assertion and only then
 * writes the unlock cookie (`lib/passcode/passkey-unlock.ts`). Nothing is
 * trusted from the device's own "passed". A refusal or a cancel leaves the
 * keypad exactly as it was.
 */
export function PasskeyUnlockKey({
  disabled,
  onUnlocked,
  onFailed,
}: {
  disabled?: boolean;
  onUnlocked: () => void;
  onFailed: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await platformLockAvailable())) return onFailed();
      const start = await beginPasskeyUnlock();
      if (start.state !== "ready") return onFailed();
      const proof = await assertPlatformKey({ challenge: start.challenge, rpId: start.rpId, allow: start.credentialIds });
      if (!proof) return onFailed();
      const result = await finishPasskeyUnlock({ challenge: start.challenge, ...proof });
      if ("ok" in result) onUnlocked();
      else onFailed();
    } catch {
      onFailed();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="nf-passcode__key nf-passcode__key--quiet"
      onClick={() => void run()}
      disabled={disabled || busy}
      aria-label="Unlock with Face ID or fingerprint"
      data-testid="passcode-passkey"
    >
      <UiIcon name="key" size={26} />
    </button>
  );
}
