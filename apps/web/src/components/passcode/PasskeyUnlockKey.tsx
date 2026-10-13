"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { assertPlatformKey, platformLockAvailable } from "@/lib/security/webauthn-client";
import { beginPasskeyUnlock, finishPasskeyUnlock } from "@/lib/passcode/passkey-unlock";

/**
 * "Unlock with Face ID or fingerprint" (C14). The device proves the person
 * with the platform key the member already set up for the money lock; the
 * SERVER verifies the assertion and only then writes the unlock cookie
 * (`lib/passcode/passkey-unlock.ts`). Nothing is trusted from the device's own
 * "passed". A refusal or a cancel leaves the screen exactly as it was.
 *
 * Two shapes for one ceremony (MOTION_SYSTEM.md section 6, "biometric, where
 * available, is offered first"):
 *
 *   door   the lock's first offer (the founder's reference 6, "Use Face ID"):
 *          a full-width primary with the face-scan glyph, the keypad one tap
 *          away on the capsule under it. A tap starts the ceremony, because a
 *          browser will not start one without a gesture.
 *   key    the keypad's bottom-left key, once the person has chosen the
 *          keypad, so the biometric is never more than one tap away.
 */
export function PasskeyUnlockKey({
  disabled,
  onUnlocked,
  onFailed,
  label,
  variant = "key",
}: {
  disabled?: boolean;
  onUnlocked: () => void;
  onFailed: () => void;
  /** `passcode.passkeyUnlock`. */
  label: string;
  variant?: "key" | "door";
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await platformLockAvailable())) return onFailed();
      const start = await beginPasskeyUnlock();
      if (start.state !== "ready") return onFailed();
      const proof = await assertPlatformKey({
        challenge: start.challenge,
        rpId: start.rpId,
        allow: start.credentialIds,
      });
      if (!proof) return onFailed();
      const result = await finishPasskeyUnlock({
        challenge: start.challenge,
        ...proof,
      });
      if ("ok" in result) onUnlocked();
      else onFailed();
    } catch {
      onFailed();
    } finally {
      setBusy(false);
    }
  };

  if (variant === "door") {
    return (
      <Button
        type="button"
        variant="primary"
        size="lg"
        full
        className="nf-passcode__bio"
        onClick={() => void run()}
        disabled={disabled || busy}
        data-testid="passcode-passkey"
      >
        <FaceScan />
        {label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      className="nf-passcode__key nf-passcode__key--quiet"
      onClick={() => void run()}
      disabled={disabled || busy}
      aria-label={label}
      data-testid="passcode-passkey"
    >
      <UiIcon name="key" size={26} />
    </button>
  );
}

/** The face-scan glyph of the biometric door: four corners and a face, at the
    line weight of `UiIcon`. Decorative; the label names the action. */
function FaceScan() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="nf-passcode__bio-glyph"
    >
      <path d="M3.5 8V6a2.5 2.5 0 0 1 2.5-2.5h2M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2" />
      <path d="M9 9.25v1.25M15 9.25v1.25M12 9.5v3.5h-1M9.25 15.5c1.5 1.25 4 1.25 5.5 0" />
    </svg>
  );
}
