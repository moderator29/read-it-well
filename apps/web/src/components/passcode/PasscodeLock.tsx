"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { forgotPasscodeAction, verifyPasscodeAction, type VerifyResult } from "@/lib/passcode/actions";
import { ATTEMPTS_PER_COOLDOWN, cooldownRemaining, type PasscodeLength } from "@/lib/passcode/rules";
import type { LockMode } from "@/lib/passcode/decide";
import { fill, herePath, markTabUnlocked } from "@/lib/passcode/tab";
import { feedback } from "@/lib/ui/feedback";
import { Keypad, PasscodeDots } from "./Keypad";
import { PasskeyUnlockKey } from "./PasskeyUnlockKey";
import { PasscodeFrame } from "./PasscodeFrame";

export type PasscodeCopy = Dictionary["passcode"];

/**
 * "WELCOME BACK": the lock. docs/PASSCODE.md.
 *
 * The code is sent the moment its last digit is typed, checked by
 * `passcode_verify` in the database, and forgotten here as soon as the answer
 * arrives. A wrong code shakes the dots and says how many tries are left
 * before the pause and before the sign-out; a cooldown disables the keypad
 * and counts down; the tenth wrong try signs this browser out and lands on
 * sign-in with the reason.
 */
export function PasscodeLock({
  copy,
  locale,
  mode,
  length,
  lockedUntil,
  name,
  avatarUrl,
  onUnlocked,
  verify = verifyPasscodeAction,
  passkey = false,
}: {
  copy: PasscodeCopy;
  locale: Locale;
  mode: LockMode;
  length: PasscodeLength;
  lockedUntil?: string | null;
  name: string;
  avatarUrl?: string | null;
  /** Called after a right code. Without it the route is refreshed from the server. */
  onUnlocked?: () => void;
  /** The check. Always the real action in the app; the preview harness passes a fixture. */
  verify?: (code: string) => Promise<VerifyResult>;
  /** C14: this member has a platform key, so the keypad offers Face ID or fingerprint. */
  passkey?: boolean;
}) {
  const titleId = useId();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(mode === "unavailable" ? copy.unavailable : null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [waitUntil, setWaitUntil] = useState<number>(() => {
    const seconds = cooldownRemaining(lockedUntil ?? null, Date.now());
    return seconds > 0 ? Date.now() + seconds * 1000 : 0;
  });
  const [now, setNow] = useState(() => Date.now());
  const [leaving, startLeaving] = useTransition();
  const sending = useRef(false);

  const cooling = waitUntil > now;
  const secondsLeft = cooling ? Math.ceil((waitUntil - now) / 1000) : 0;

  useEffect(() => {
    if (!waitUntil) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= waitUntil) {
        setWaitUntil(0);
        setMessage(null);
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [waitUntil]);

  const submit = useCallback(
    async (attempt: string) => {
      if (sending.current) return;
      sending.current = true;
      setBusy(true);
      try {
        const result = await verify(attempt);
        switch (result.status) {
          case "ok":
            feedback("success");
            markTabUnlocked();
            setMessage(null);
            if (onUnlocked) onUnlocked();
            router.refresh();
            return;
          case "wrong":
            feedback("error");
            setShake((n) => n + 1);
            setMessage(
              result.beforeSignOut <= ATTEMPTS_PER_COOLDOWN
                ? plural(result.beforeSignOut, copy.wrongLastBeforeSignOut, locale)
                : plural(result.beforeCooldown, copy.wrongLeft, locale),
            );
            break;
          case "cooldown":
          case "paced": {
            feedback("error");
            setShake((n) => n + 1);
            const until = Date.now() + result.retryAfterSeconds * 1000;
            setNow(Date.now());
            setWaitUntil(until);
            setMessage(result.status === "paced" ? copy.paced : null);
            break;
          }
          case "signed-out": {
            const query = new URLSearchParams({ notice: "passcode-locked", next: herePath() });
            window.location.assign(`/sign-in?${query.toString()}`);
            return;
          }
          case "setup":
            router.refresh();
            return;
          default:
            setMessage(copy.error);
        }
      } catch {
        setMessage(copy.error);
      } finally {
        sending.current = false;
        setBusy(false);
        setCode("");
      }
    },
    [copy, locale, onUnlocked, router, verify],
  );

  const onDigit = useCallback(
    (digit: string) => {
      if (sending.current) return;
      setCode((current) => (current.length >= length ? current : current + digit));
    },
    [length],
  );

  /* The last digit sends the code. */
  useEffect(() => {
    if (code.length === length && !sending.current) void submit(code);
  }, [code, length, submit]);
  const onDelete = useCallback(() => setCode((current) => current.slice(0, -1)), []);

  const usePassword = () => startLeaving(() => forgotPasscodeAction(herePath()));

  const first = name.trim().split(/\s+/)[0] ?? "";
  const title = first ? fill(copy.welcomeBack, { name: first }) : copy.welcomeBackNoName;
  const passwordOnly = mode === "password-only";
  const status = cooling ? fill(copy.cooldown, { seconds: secondsLeft }) : message;

  return (
    <PasscodeFrame
      overlay
      wordmark={copy.wordmark}
      titleId={titleId}
      title={title}
      subtitle={passwordOnly ? copy.lockedTitle : copy.enterCode}
      name={name}
      avatarUrl={avatarUrl}
      testId="passcode-lock"
    >
      {passwordOnly ? (
        <p className="nf-passcode__message nf-passcode__message--block" role="status">
          {copy.passwordOnly}
        </p>
      ) : (
        <>
          <PasscodeDots
            length={length}
            filled={code.length}
            shake={shake}
            label={fill(copy.digitsEntered, { count: code.length, total: length })}
          />
          <p className="nf-passcode__message" role="status" aria-live="polite" data-testid="passcode-message">
            {status ?? (busy ? copy.checking : "")}
          </p>
          <Keypad
            onDigit={onDigit}
            onDelete={onDelete}
            disabled={busy || cooling || leaving}
            label={copy.keypadLabel}
            deleteLabel={copy.deleteKey}
            accessory={
              passkey && !cooling ? (
                <PasskeyUnlockKey
                  disabled={busy || leaving}
                  onUnlocked={() => {
                    feedback("success");
                    markTabUnlocked();
                    setMessage(null);
                    if (onUnlocked) onUnlocked();
                    router.refresh();
                  }}
                  onFailed={() => setMessage("That did not work. Enter your passcode instead.")}
                />
              ) : undefined
            }
          />
        </>
      )}
      <div className="nf-passcode__foot">
        <button
          type="button"
          className={passwordOnly ? "nf-btn nf-btn--primary nf-passcode__cta" : "nf-passcode__link"}
          onClick={usePassword}
          disabled={leaving}
          data-testid="passcode-use-password"
        >
          {passwordOnly ? copy.signInAgain : copy.usePassword}
        </button>
      </div>
    </PasscodeFrame>
  );
}
