/**
 * THE BIOMETRIC HOOK, LEFT EMPTY ON PURPOSE. docs/PASSCODE.md, "Native".
 *
 * Face ID and fingerprint unlock in the Capacitor app are out of scope for
 * the first passcode release. When they land, this is the one place that
 * changes:
 *
 *   1. `nativeUnlockAvailable()` answers true in the shell when the platform
 *      authenticator is enrolled (a Capacitor biometric plugin, reached the
 *      way `lib/ui/feedback.ts` reaches Haptics, only after `looksNative()`).
 *   2. The lock screen draws a key in the keypad's empty bottom-left slot
 *      (`Keypad`'s `accessory`) that calls `nativeUnlock()`.
 *   3. `nativeUnlock()` must NOT unlock on the device's say-so alone. It
 *      should run the V-81 WebAuthn ceremony the money lock already has
 *      (`lib/security/webauthn.ts`, `money-step-up.ts`) against a new
 *      `unlock` purpose, and the server writes the unlock cookie only after
 *      verifying that assertion, exactly as `verifyPasscodeAction` does after
 *      a right code. A local "biometric passed" boolean is not a proof.
 *
 * Until then both answer "not available", and the keypad is the only way in
 * besides "Use your password instead".
 */
export function nativeUnlockAvailable(): boolean {
  return false;
}

export async function nativeUnlock(): Promise<"unlocked" | "unavailable"> {
  return "unavailable";
}
