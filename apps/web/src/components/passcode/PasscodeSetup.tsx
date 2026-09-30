"use client";

import { useCallback, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { plural, type Locale } from "@vallo/i18n/core";
import { forgotPasscodeAction, setPasscodeAction } from "@/lib/passcode/actions";
import { signOut } from "@/lib/profile/actions";
import {
  ATTEMPTS_PER_COOLDOWN,
  DEFAULT_PASSCODE_LENGTH,
  isTrivialCode,
  type PasscodeLength,
} from "@/lib/passcode/rules";
import { fill, herePath, markTabUnlocked } from "@/lib/passcode/tab";
import { feedback } from "@/lib/ui/feedback";
import { showSuccess } from "@/lib/ui/success-moments";
import { Keypad, PasscodeDots } from "./Keypad";
import { PasscodeFrame } from "./PasscodeFrame";
import type { PasscodeCopy } from "./PasscodeLock";

type Step = "current" | "enter" | "confirm";

/**
 * SETUP, CONFIRM, AND CHANGE. docs/PASSCODE.md.
 *
 * `first`: after sign-up, or the first visit after the passcode shipped.
 * `reset`: after "Use your password instead" or ten wrong tries, once the
 * member has signed in again. `change`: from Settings, where the current code
 * is asked first unless the member signed in within the last fifteen minutes.
 *
 * The code is typed twice. A trivial code (a repeat, a run, the birth year) is
 * refused here before it is sent and again by the database, which is the
 * authority. Six digits by default; one tap switches to four.
 */
export function PasscodeSetup({
  copy,
  locale,
  mode,
  name,
  avatarUrl,
  overlay,
  askCurrent = false,
  currentLength = DEFAULT_PASSCODE_LENGTH,
  initialLength = DEFAULT_PASSCODE_LENGTH,
  onDone,
}: {
  copy: PasscodeCopy;
  locale: Locale;
  mode: "first" | "reset" | "change";
  name: string;
  avatarUrl?: string | null;
  overlay: boolean;
  askCurrent?: boolean;
  currentLength?: PasscodeLength;
  initialLength?: PasscodeLength;
  onDone?: (event: "set" | "change" | "reset") => void;
}) {
  const titleId = useId();
  const router = useRouter();
  const [step, setStep] = useState<Step>(askCurrent ? "current" : "enter");
  const [length, setLength] = useState<PasscodeLength>(initialLength);
  const [code, setCode] = useState("");
  const [first, setFirst] = useState("");
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [needsProof, setNeedsProof] = useState(false);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [leaving, startLeaving] = useTransition();
  const sending = useRef(false);

  /* The typed digits, mirrored in a ref so two keys pressed inside one
     render are both kept. */
  const typed = useRef("");
  const put = useCallback((value: string) => {
    typed.current = value;
    setCode(value);
  }, []);

  const width = step === "current" ? currentLength : length;

  const refuse = useCallback((text: string, back: Step) => {
    feedback("error");
    setShake((n) => n + 1);
    setMessage(text);
    setStep(back);
    setFirst("");
    setCode("");
    typed.current = "";
  }, []);

  const save = useCallback(
    async (confirm: string) => {
      if (sending.current) return;
      sending.current = true;
      setBusy(true);
      try {
        const result = await setPasscodeAction({ code: first, confirm, length, current: current || null });
        if (result.ok) {
          /* The success card lives in the root layout, so it outlasts the
             refresh that swaps this screen for the page. It brings its own
             success haptic. */
          showSuccess(result.event === "set" ? "passcode-set" : "passcode-changed");
          markTabUnlocked();
          setMessage(result.event === "change" ? copy.changed : copy.saved);
          put("");
          setFirst("");
          setCurrent("");
          if (onDone) onDone(result.event);
          else router.refresh();
          return;
        }
        switch (result.reason) {
          case "trivial":
            refuse(copy.trivial, "enter");
            break;
          case "mismatch":
          case "length":
            refuse(copy.mismatch, "enter");
            break;
          case "current": {
            const attempt = result.attempt;
            setCurrent("");
            if (attempt?.status === "wrong") {
              refuse(
                attempt.beforeSignOut <= ATTEMPTS_PER_COOLDOWN
                  ? plural(attempt.beforeSignOut, copy.wrongLastBeforeSignOut, locale)
                  : plural(attempt.beforeCooldown, copy.wrongLeft, locale),
                "current",
              );
            } else if (attempt?.status === "cooldown") {
              refuse(fill(copy.cooldown, { seconds: attempt.retryAfterSeconds }), "current");
            } else {
              refuse(copy.wrong, "current");
            }
            break;
          }
          case "proof_required":
            setNeedsProof(true);
            refuse(copy.proofRequired, askCurrent ? "current" : "enter");
            break;
          case "locked-out":
          case "signed-out": {
            const query = new URLSearchParams({ notice: "passcode-locked", next: herePath() });
            window.location.assign(`/sign-in?${query.toString()}`);
            return;
          }
          case "paced":
            refuse(copy.paced, "enter");
            break;
          default:
            refuse(copy.error, "enter");
        }
      } catch {
        refuse(copy.error, "enter");
      } finally {
        sending.current = false;
        setBusy(false);
      }
    },
    [askCurrent, copy, current, first, length, locale, onDone, put, refuse, router],
  );

  /* The last digit moves the flow on, from the key press itself. */
  const advance = (value: string) => {
    if (step === "current") {
      setCurrent(value);
      put("");
      setMessage(null);
      setStep("enter");
      return;
    }
    if (step === "enter") {
      if (isTrivialCode(value)) {
        refuse(copy.trivial, "enter");
        typed.current = "";
        return;
      }
      setFirst(value);
      put("");
      setMessage(null);
      setStep("confirm");
      return;
    }
    if (value !== first) {
      refuse(copy.mismatch, "enter");
      typed.current = "";
      return;
    }
    put(value);
    void save(value);
  };

  const onDigit = (digit: string) => {
    if (sending.current) return;
    const current = typed.current;
    if (current.length >= width) return;
    const value = current + digit;
    if (value.length < width) {
      put(value);
      return;
    }
    advance(value);
  };
  const onDelete = useCallback(() => put(typed.current.slice(0, -1)), [put]);

  const switchLength = () => {
    setLength((value) => (value === 6 ? 4 : 6));
    put("");
    setFirst("");
    setMessage(null);
  };

  const title =
    step === "current"
      ? copy.currentTitle
      : step === "confirm"
        ? copy.confirmTitle
        : mode === "reset"
          ? copy.resetTitle
          : copy.setupTitle;
  const subtitle =
    step === "current"
      ? copy.currentBody
      : step === "confirm"
        ? fill(copy.confirmBody, { count: length })
        : mode === "reset"
          ? copy.resetBody
          : copy.setupBody;

  return (
    <PasscodeFrame
      overlay={overlay}
      wordmark={copy.wordmark}
      titleId={titleId}
      title={title}
      subtitle={subtitle}
      name={name}
      avatarUrl={avatarUrl}
      focal="lock"
      testId={`passcode-setup-${step}`}
    >
      <PasscodeDots length={width} filled={code.length} shake={shake} label={fill(copy.digitsEntered, { count: code.length, total: width })} />
      <p className="nf-passcode__message" role="status" aria-live="polite" data-testid="passcode-message">
        {message ?? (busy ? copy.checking : "")}
      </p>
      <Keypad onDigit={onDigit} onDelete={onDelete} disabled={busy || leaving} label={copy.keypadLabel} deleteLabel={copy.deleteKey} />
      <div className="nf-passcode__foot">
        {step === "enter" ? (
          <button type="button" className="nf-passcode__link" onClick={switchLength} data-testid="passcode-length-switch">
            {length === 6 ? copy.useFour : copy.useSix}
          </button>
        ) : null}
        {needsProof || mode === "reset" ? (
          <button
            type="button"
            className="nf-passcode__link"
            onClick={() => startLeaving(() => forgotPasscodeAction(herePath()))}
            disabled={leaving}
          >
            {copy.usePassword}
          </button>
        ) : null}
        {overlay && mode === "first" ? (
          <button
            type="button"
            className="nf-passcode__link nf-passcode__link--quiet"
            disabled={leaving}
            onClick={() =>
              startLeaving(async () => {
                await signOut();
                window.location.assign("/");
              })
            }
          >
            {copy.signOut}
          </button>
        ) : null}
      </div>
    </PasscodeFrame>
  );
}
