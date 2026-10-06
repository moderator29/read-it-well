"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { panelClass } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { maskNational } from "@/lib/phone";
import { feedback } from "@/lib/ui/feedback";
import { confirmPhoneCode, sendPhoneCode } from "@/lib/phone-otp/actions";
import { hapticOnPop } from "@/components/verification/payoff-haptic";
import "@/components/verification/verified-face.css";

/** The button morph's payoff pop (`buttons.css`, "THE ACTION MORPH"). */
const POP = "nf-btn-pop";

/**
 * CONFIRMING A MOBILE NUMBER (V-50), the two steps: the number, then the code.
 *
 * Every state is drawn here: typing the number, sending, the code step with
 * the masked number it went to, confirming, done, and each refusal the two
 * actions return, in their words, with what was typed kept in place. The
 * number is shown back masked and grouped, never in full after it is sent.
 *
 * ONE PANEL FROM "CONFIRM" TO "CONFIRMED" (round 5, something verified). The
 * Confirm control is the moment: pressed, it closes to a circle and holds its
 * ring while the code is checked (never a spinner); when the SERVER says the
 * number is confirmed it closes the ring, draws the tick and pops once, with
 * the one heavy haptic on that frame (reference 7060 to 7061: the same control
 * becomes the confirmed state). Only once the pop has settled does the panel's
 * face turn to the confirmed words, in the same panel. It used to drop the
 * panel and print a line where it had been.
 *
 * A REFUSAL IS IMMEDIATE. The words arrive with no motion, one error haptic,
 * and focus goes to the next action: back into the code to retype it, or to
 * "Send a new code" when the code itself is spent.
 */
export function PhoneConfirmForm({ copy }: { copy: Dictionary["trustVisible"]["phone"] }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  /* The server said confirmed (the control morphs to the tick)... */
  const [done, setDone] = useState(false);
  /* ...and the payoff has settled (the panel's face turns). */
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const panel = useRef<HTMLDivElement | null>(null);
  const codeField = useRef<HTMLDivElement | null>(null);
  const resend = useRef<HTMLButtonElement | null>(null);
  const next = useRef<"code" | "resend" | null>(null);

  /* The payoff: the haptic on the pop, the face turns when the pop ends (at
     once in a quiet mode, where there is no pop). */
  useEffect(() => {
    const el = panel.current;
    if (!done || settled || !el) return;
    const stop = hapticOnPop(el, POP);
    const turn = () => setSettled(true);
    const onEnd = (event: AnimationEvent) => {
      if (event.animationName === POP) turn();
    };
    el.addEventListener("animationend", onEnd);
    const pops = typeof el.getAnimations === "function" ? el.getAnimations({ subtree: true }).filter((a) => (a as CSSAnimation).animationName === POP) : [];
    /* No pop to wait for, or one that was cancelled: never leave the control
       standing as a tick with no words. */
    const timer = window.setTimeout(turn, pops.length === 0 ? 0 : 1000);
    return () => {
      stop();
      el.removeEventListener("animationend", onEnd);
      window.clearTimeout(timer);
    };
  }, [done, settled]);

  /* The next action after a refusal, once the words are on screen and the
     wait has let go of the controls (a disabled button cannot take focus). */
  useEffect(() => {
    if (!error || pending || !next.current) return;
    if (next.current === "resend") resend.current?.focus();
    else codeField.current?.querySelector("input")?.select();
    next.current = null;
  }, [error, pending]);

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await sendPhoneCode({ phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSentTo(result.data.sentTo);
      setCode("");
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmPhoneCode({ code });
      if (!result.ok) {
        feedback("error");
        next.current = [copy.confirmExpired, copy.confirmLocked, copy.confirmNoCode].includes(result.error) ? "resend" : "code";
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <div ref={panel} className={panelClass({ className: "grid gap-md p-card" })} data-testid="phone-form">
      {settled ? (
        <div role="status" className="nf-vface" data-testid="phone-done">
          <span className="nf-vface__mark" aria-hidden="true">
            <svg viewBox="0 0 16 16" focusable="false">
              <path d="M4.2 8.4 6.9 11 11.8 5.4" fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="nf-body text-[var(--nf-content-primary)]">{copy.done}</p>
        </div>
      ) : sentTo === null ? (
        <>
          <TextField
            label={copy.numberLabel}
            hint={copy.numberHint}
            inputMode="tel"
            autoComplete="tel-national"
            value={maskNational(phone)}
            onChange={(event) => setPhone(event.target.value)}
            leadingIcon="phone"
          />
          <Button type="button" variant="primary" full loading={pending} onClick={send} disabled={phone.trim() === ""}>
            {pending ? copy.sending : copy.send}
          </Button>
        </>
      ) : (
        <>
          <p className="nf-body-sm text-[var(--nf-content-secondary)]">
            {copy.sentTo.replace("{number}", `+234 ${maskNational(sentTo)}`)}
          </p>
          <div ref={codeField}>
            <TextField
              label={copy.codeLabel}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              readOnly={done}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            full
            morph
            loading={pending}
            done={done}
            onClick={confirm}
            disabled={code.length !== 6}
          >
            {pending ? copy.confirming : copy.confirm}
          </Button>
          <Button ref={resend} type="button" variant="ghost" full onClick={send} disabled={pending || done}>
            {copy.resend}
          </Button>
        </>
      )}
      {error && !settled && (
        <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
