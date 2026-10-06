"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { forgotPasscodeAction, verifyPasscodeAction, type VerifyResult } from "@/lib/passcode/actions";
import { cooldownRemaining, type PasscodeLength } from "@/lib/passcode/rules";
import { thresholdAllowed } from "@/lib/motion/threshold";
import type { LockMode } from "@/lib/passcode/decide";
import { fill, herePath, markTabUnlocked } from "@/lib/passcode/tab";
import { feedback } from "@/lib/ui/feedback";
import { Keypad, PasscodeDots } from "./Keypad";
import { PasskeyUnlockKey } from "./PasskeyUnlockKey";
import { PasscodeFrame } from "./PasscodeFrame";
import { wrongCodeMessage } from "./wrong-message";
import { OPEN_HOLD_MS, OPEN_LEAVE_MS, arriveThroughOpenDoor } from "./open-door";

export type PasscodeCopy = Dictionary["passcode"];

/** How long an accepted unlock waits for the page before loading it outright. */
const UNLOCK_GIVE_UP_MS = 6000;

/**
 * "WELCOME BACK": the lock. docs/PASSCODE.md.
 *
 * The code is sent the moment its last digit is typed, checked by
 * `passcode_verify` in the database, and forgotten here as soon as the answer
 * arrives. MOTION_SYSTEM.md section 6 is the motion:
 *
 *   wrong     the dots shake once and clear (`Keypad.tsx`), one quiet line
 *             beneath says so, and a count appears only when it is the last
 *             one (`wrong-message.ts`). No red, no dialog.
 *   right     the last dot is already full; it holds 80ms, the contents
 *             leave through the door, and the app comes forward through the
 *             startup's own `open` arrival (`open-door.ts`), so unlocking and
 *             launching are the same gesture. The 80ms is a hold on a code the
 *             server has ALREADY accepted, never a wait dressed as checking.
 *   cooldown  the keypad disables and counts down, in real seconds.
 *
 * BIOMETRIC FIRST. A member with a platform key is offered it before the
 * keypad (`PasskeyUnlockKey`, the door), with "Enter your passcode instead"
 * beneath; choosing the keypad, a failed biometric or typing a digit on a
 * keyboard brings the keypad, which keeps the biometric in its corner key.
 *
 * The tenth wrong try signs this browser out and lands on sign-in with the
 * reason.
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
  /* Biometric first where the member has a platform key; the keypad after. */
  const [door, setDoor] = useState<"biometric" | "keypad">(passkey ? "biometric" : "keypad");
  /* The right code has landed and the door is opening. */
  const [opening, setOpening] = useState(false);
  const opened = useRef(false);

  /* The far side of the door: when this lock leaves the screen after a right
     code (the page replaces it, or the guard lets go), the app comes forward
     through the `open` arrival. */
  const stuck = useRef(0);
  /* The hold and the leave are tracked too, and the lock knows whether it is
     still on screen. A right code sets the unlock cookie, so Next re-renders
     the gate as unlocked with the action's response and can unmount this lock
     before the door's 320ms have run. An untracked timer would then refresh
     the route and arm a reload on a lock that no longer exists, and the member
     would be reloaded out of whatever they had started six seconds later. */
  const hold = useRef(0);
  const leave = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(hold.current);
      window.clearTimeout(leave.current);
      window.clearTimeout(stuck.current);
      if (opened.current) arriveThroughOpenDoor();
    };
  }, []);

  /* The lock is unlocked: hold the full row, open the door, then hand over. */
  const unlock = useCallback(() => {
    markTabUnlocked();
    setMessage(null);
    opened.current = true;
    const finish = () => {
      /* Already replaced by the unlocked page: the hand-over has happened. */
      if (!mounted.current) return;
      if (onUnlocked) onUnlocked();
      router.refresh();
      /* The server has already accepted the code. If the refreshed page has
         not replaced the lock in a few seconds (a dropped request), load it
         outright rather than leave somebody at an open door. */
      stuck.current = window.setTimeout(() => window.location.reload(), UNLOCK_GIVE_UP_MS);
    };
    if (!thresholdAllowed()) {
      finish();
      return;
    }
    hold.current = window.setTimeout(() => {
      if (!mounted.current) return;
      setOpening(true);
      leave.current = window.setTimeout(finish, OPEN_LEAVE_MS);
    }, OPEN_HOLD_MS);
  }, [onUnlocked, router]);

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
            unlock();
            /* The row stays full through the hold and the door. */
            return;
          case "wrong":
            feedback("error");
            setShake((n) => n + 1);
            setMessage(wrongCodeMessage(result, copy, locale));
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
        setBusy(false);
        /* A right code keeps its full row and the send lock through the
           door; anything else clears for the next try. */
        if (!opened.current) {
          sending.current = false;
          setCode("");
        }
      }
    },
    [copy, locale, router, unlock, verify],
  );

  const onDigit = useCallback(
    (digit: string) => {
      if (sending.current) return;
      /* A digit typed on a keyboard while the biometric door is offered is
         the person choosing the keypad. */
      setDoor("keypad");
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

  /*
   * LEAVING THE BIOMETRIC DOOR FOR THE KEYPAD. The door's buttons unmount
   * when the keypad replaces them, and focus inside a modal dialog would
   * fall to <body>: a keyboard or screen-reader user would be nowhere. So
   * where focus goes is decided at the switch and applied once the keypad is
   * drawn: choosing "Enter your passcode instead" lands on the first key
   * (the person asked for the keypad, so its first control is where they
   * are); a digit typed on the keyboard lands on the title, the lock's own
   * opening focus, so no key looks pressed that was not (a ring on "1" after
   * typing 5 would read as a 1), and only when focus would otherwise be lost.
   */
  const focusAfterSwitch = useRef<"key" | "title" | null>(null);
  const toKeypad = useCallback((focus: "key" | "title") => {
    focusAfterSwitch.current = focus;
    setDoor("keypad");
  }, []);
  useEffect(() => {
    const want = focusAfterSwitch.current;
    if (door !== "keypad" || !want) return;
    focusAfterSwitch.current = null;
    const frame = document.getElementById(titleId)?.closest<HTMLElement>(".nf-passcode");
    if (!frame) return;
    const active = document.activeElement;
    if (want === "title" && active instanceof HTMLElement && active !== document.body && frame.contains(active)) return;
    const target =
      want === "key"
        ? frame.querySelector<HTMLElement>('[data-testid="passcode-keypad"] button:not(:disabled)')
        : null;
    (target ?? document.getElementById(titleId))?.focus();
  }, [door, titleId]);

  const first = name.trim().split(/\s+/)[0] ?? "";
  const title = first ? fill(copy.welcomeBack, { name: first }) : copy.welcomeBackNoName;
  const passwordOnly = mode === "password-only";
  const status = cooling ? fill(copy.cooldown, { seconds: secondsLeft }) : message;

  const biometricFirst = passkey && door === "biometric" && !cooling;
  const onPasskeyFailed = () => {
    /* From the door the keypad takes over (and focus goes to its first key,
       the door's button having gone); from the keypad's own corner key the
       keypad is already here and focus stays where it is. */
    if (door === "biometric") toKeypad("key");
    setMessage(copy.passkeyFailed);
  };

  /*
   * TYPING ON THE BIOMETRIC DOOR. The keypad listens for the keyboard
   * (`Keypad.tsx`), but on the biometric door the keypad is not drawn, so
   * its listener does not exist and a typed digit did nothing. While the
   * door is offered, a digit is the person choosing the keypad: it switches
   * and the digit lands as the code's first.
   */
  const doorIdle = biometricFirst && !busy && !leaving && !opening;
  useEffect(() => {
    if (!doorIdle) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (!/^[0-9]$/.test(event.key)) return;
      event.preventDefault();
      feedback("select");
      toKeypad("title");
      onDigit(event.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doorIdle, onDigit, toKeypad]);

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
      opening={opening}
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
          {biometricFirst ? (
            <div className="nf-passcode__offer">
              <PasskeyUnlockKey
                variant="door"
                label={copy.passkeyUnlock}
                disabled={busy || leaving || opening}
                onUnlocked={() => {
                  feedback("success");
                  unlock();
                }}
                onFailed={onPasskeyFailed}
              />
              <button
                type="button"
                className="nf-passcode__link"
                onClick={() => toKeypad("key")}
                data-testid="passcode-use-keypad"
              >
                {copy.usePasscode}
              </button>
            </div>
          ) : (
            <Keypad
              onDigit={onDigit}
              onDelete={onDelete}
              disabled={busy || cooling || leaving || opening}
              label={copy.keypadLabel}
              deleteLabel={copy.deleteKey}
              accessory={
                passkey && !cooling ? (
                  <PasskeyUnlockKey
                    label={copy.passkeyUnlock}
                    disabled={busy || leaving || opening}
                    onUnlocked={() => {
                      feedback("success");
                      unlock();
                    }}
                    onFailed={onPasskeyFailed}
                  />
                ) : undefined
              }
            />
          )}
        </>
      )}
      <div className="nf-passcode__foot">
        <button
          type="button"
          className={passwordOnly ? "nf-btn nf-btn--primary nf-passcode__cta" : "nf-passcode__link"}
          onClick={usePassword}
          disabled={leaving || opening}
          data-testid="passcode-use-password"
        >
          {passwordOnly ? copy.signInAgain : copy.usePassword}
        </button>
      </div>
    </PasscodeFrame>
  );
}
