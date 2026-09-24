"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n";
import { panelClass } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { maskNational } from "@/lib/phone";
import { confirmPhoneCode, sendPhoneCode } from "@/lib/phone-otp/actions";

/**
 * CONFIRMING A MOBILE NUMBER (V-50), the two steps: the number, then the code.
 *
 * Every state is drawn here: typing the number, sending, the code step with
 * the masked number it went to, confirming, done, and each refusal the two
 * actions return, in their words, with what was typed kept in place. The
 * number is shown back masked and grouped, never in full after it is sent.
 */
export function PhoneConfirmForm({ copy }: { copy: Dictionary["trustVisible"]["phone"] }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p role="status" className="nf-body text-[var(--nf-content-primary)]" data-testid="phone-done">
        {copy.done}
      </p>
    );
  }

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
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className={panelClass({ className: "grid gap-md p-card" })} data-testid="phone-form">
      {sentTo === null ? (
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
          <TextField
            label={copy.codeLabel}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <Button type="button" variant="primary" full loading={pending} onClick={confirm} disabled={code.length !== 6}>
            {pending ? copy.confirming : copy.confirm}
          </Button>
          <Button type="button" variant="ghost" full onClick={send} disabled={pending}>
            {copy.resend}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
