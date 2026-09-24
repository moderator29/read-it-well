"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { getDictionary, type Locale } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/Field";
import {
  beginMoneyConfirm,
  confirmWithFallback,
  finishMoneyConfirm,
  sendFallbackCode,
  stepUpStatus,
  type StepUpStatus,
} from "@/lib/security/money-step-up-actions";
import type { MoneyIntent } from "@/lib/security/money-intent";
import { assertPlatformKey, platformLockAvailable } from "@/lib/security/webauthn-client";

/**
 * THE LOCK ON MONEY, IN FRONT OF A MONEY ACTION. V-81.
 *
 * Two ways to use it.
 *
 * A FORM (send, withdraw):
 *   const lock = useMoneyStepUp(locale, (form) => intentFromForm("send", form));
 *   <form onSubmit={(e) => { if (!lock.pass(e)) return; ... }}>
 *     <input type="hidden" name="stepUp" value={lock.token} />
 *     {lock.sheet}
 *
 * A CALL (add a bank account, confirm a held payment):
 *   const stepUp = await lock.prove({ kind: "bank_add", target });
 *   if (stepUp === null) return;            // cancelled or refused
 *   await addBankAccount({ ...input, stepUp });
 *
 * For somebody who never locked money with their phone, nothing changes:
 * `pass` lets the submit through and `prove` answers "" at once. For somebody
 * who did, the sheet asks for this phone's face or fingerprint lock (or the
 * password, or an emailed code for an account with no password), the server
 * checks the proof and hands back a single-use step-up FOR THIS ACTION, and
 * the action goes ahead carrying it. When the lock state cannot be read, the
 * action goes ahead and the server decides. The server refuses a movement
 * without a matching proof regardless (`lib/security/money-lock-guard.ts`).
 */
export function useMoneyStepUp(
  locale: Locale,
  intentOf?: (form: FormData) => MoneyIntent,
): {
  pass: (event: FormEvent<HTMLFormElement>) => boolean;
  prove: (intent: MoneyIntent) => Promise<string | null>;
  token: string;
  sheet: ReactNode;
} {
  const copy = getDictionary(locale).platform.moneyLock;
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StepUpStatus | null>(null);
  const [sensor, setSensor] = useState(false);
  const [mode, setMode] = useState<"sensor" | "fallback">("sensor");
  const [secret, setSecret] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"rejected" | "failed" | "password_recent" | null>(null);
  const bypass = useRef(false);
  const form = useRef<HTMLFormElement | null>(null);
  const intent = useRef<MoneyIntent | null>(null);
  const settle = useRef<((stepUp: string | null) => void) | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([stepUpStatus().catch(() => null), platformLockAvailable()]).then(([next, can]) => {
      if (!live) return;
      setStatus(next);
      setSensor(can);
    });
    return () => {
      live = false;
    };
  }, []);

  const reset = () => {
    setBusy(false);
    setSecret("");
    setCodeSent(false);
  };

  const release = (id: string) => {
    if (settle.current) {
      const done = settle.current;
      settle.current = null;
      flushSync(() => {
        setOpen(false);
        reset();
      });
      done(id);
      return;
    }
    const target = form.current;
    flushSync(() => {
      setToken(id);
      setOpen(false);
      reset();
    });
    bypass.current = true;
    target?.requestSubmit();
  };

  const close = () => {
    setOpen(false);
    reset();
    if (settle.current) {
      const done = settle.current;
      settle.current = null;
      done(null);
    }
  };

  /** Ask, if a proof is needed. Resolves after the sheet is shown or not. */
  const ask = async (): Promise<"none" | "shown"> => {
    const fresh = status ?? (await stepUpStatus().catch(() => null));
    if (fresh) setStatus(fresh);
    /* Unknown or unlocked: go ahead and let the server decide. */
    if (!fresh || !fresh.needed) return "none";
    setError(null);
    setMode(sensor ? "sensor" : "fallback");
    setOpen(true);
    return "shown";
  };

  const pass = (event: FormEvent<HTMLFormElement>): boolean => {
    if (bypass.current) {
      bypass.current = false;
      return true;
    }
    if (status && !status.needed) return true;
    event.preventDefault();
    form.current = event.currentTarget;
    intent.current = intentOf ? intentOf(new FormData(event.currentTarget)) : null;
    void ask().then((shown) => {
      if (shown === "none") release("");
    });
    return false;
  };

  const prove = (next: MoneyIntent): Promise<string | null> => {
    intent.current = next;
    if (status && !status.needed) return Promise.resolve("");
    return new Promise((resolve) => {
      settle.current = resolve;
      void ask().then((shown) => {
        if (shown === "none" && settle.current) {
          settle.current = null;
          resolve("");
        }
      });
    });
  };

  const proveWithSensor = async () => {
    if (!status || !intent.current) return;
    setBusy(true);
    setError(null);
    const begun = await beginMoneyConfirm(intent.current).catch(() => ({ error: "failed" as const }));
    if ("error" in begun) {
      setBusy(false);
      setError(begun.error);
      return;
    }
    const proof = await assertPlatformKey({ challenge: begun.challenge, rpId: status.rpId, allow: status.credentialIds });
    if (!proof) {
      setBusy(false);
      setError("rejected");
      return;
    }
    const done = await finishMoneyConfirm({ challenge: begun.challenge, ...proof }).catch(() => ({ error: "failed" as const }));
    if ("error" in done) {
      setBusy(false);
      setError(done.error);
      return;
    }
    release(done.stepUp);
  };

  const byCode = status?.fallback === "email-code";

  const askForCode = async () => {
    setBusy(true);
    setError(null);
    const sent = await sendFallbackCode().catch(() => ({ error: "failed" as const }));
    setBusy(false);
    if ("error" in sent) setError("failed");
    else setCodeSent(true);
  };

  const proveWithFallback = async () => {
    if (!intent.current) return;
    setBusy(true);
    setError(null);
    const proof = byCode ? { code: secret.trim() } : { password: secret };
    const done = await confirmWithFallback({ proof, intent: intent.current }).catch(() => ({ error: "failed" as const }));
    if ("error" in done) {
      setBusy(false);
      setError(done.error);
      return;
    }
    release(done.stepUp);
  };

  const sheet = (
    <Sheet open={open} onOpenChange={(next) => !busy && (next ? setOpen(true) : close())} title={copy.confirmTitle} detents={[0.6]}>
      <div className="space-y-row" data-testid="money-step-up">
        <p className="nf-body text-[var(--nf-content-secondary)]">{copy.confirmBody}</p>
        {mode === "sensor" ? (
          <Button type="button" variant="primary" full loading={busy} disabled={busy} onClick={() => void proveWithSensor()}>
            {copy.confirm}
          </Button>
        ) : byCode && !codeSent ? (
          <Button type="button" variant="primary" full loading={busy} disabled={busy} onClick={() => void askForCode()}>
            {copy.sendCode}
          </Button>
        ) : (
          <>
            <TextField
              label={byCode ? copy.codeLabel : copy.passwordLabel}
              type={byCode ? "text" : "password"}
              inputMode={byCode ? "numeric" : undefined}
              autoComplete={byCode ? "one-time-code" : "current-password"}
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
            />
            <Button
              type="button"
              variant="primary"
              full
              loading={busy}
              disabled={busy || secret.trim().length === 0}
              onClick={() => void proveWithFallback()}
            >
              {copy.passwordConfirm}
            </Button>
          </>
        )}
        {mode === "sensor" && (
          <Button type="button" variant="ghost" full disabled={busy} onClick={() => setMode("fallback")}>
            {byCode ? copy.useCode : copy.usePassword}
          </Button>
        )}
        <Button type="button" variant="ghost" full disabled={busy} onClick={close}>
          {copy.cancel}
        </Button>
        {error && (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
            {error === "rejected" ? copy.rejected : error === "password_recent" ? copy.passwordRecent : copy.failed}
          </p>
        )}
      </div>
    </Sheet>
  );

  return { pass, prove, token, sheet };
}
