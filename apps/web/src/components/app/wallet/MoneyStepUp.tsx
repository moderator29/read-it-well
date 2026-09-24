"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { getDictionary, type Locale } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/Field";
import {
  beginMoneyConfirm,
  confirmWithPassword,
  finishMoneyConfirm,
  stepUpStatus,
  type StepUpStatus,
} from "@/lib/security/money-step-up-actions";
import { assertPlatformKey, platformLockAvailable } from "@/lib/security/webauthn-client";

/**
 * THE LOCK ON MONEY, IN FRONT OF A MONEY FORM. V-81.
 *
 *   const lock = useMoneyStepUp(locale);
 *   <form onSubmit={(e) => { if (!lock.pass(e)) return; ... }}>
 *     <input type="hidden" name="stepUp" value={lock.token} />
 *     {lock.sheet}
 *
 * For somebody who never locked money with their phone, `pass` lets the
 * submit straight through and nothing changes. For somebody who did, the
 * submit is held, this sheet asks for the phone's face or fingerprint lock
 * (or the password when the sensor will not answer), the server checks the
 * proof and hands back a single-use step-up id, and the form is submitted
 * again carrying it. The server refuses a movement without one regardless
 * (`lib/security/money-lock-guard.ts`); this is only the way to supply it.
 */
export function useMoneyStepUp(locale: Locale): {
  pass: (event: FormEvent<HTMLFormElement>) => boolean;
  token: string;
  sheet: ReactNode;
} {
  const copy = getDictionary(locale).platform.moneyLock;
  const [token, setToken] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StepUpStatus | null>(null);
  const [sensor, setSensor] = useState(false);
  const [mode, setMode] = useState<"sensor" | "password">("sensor");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"rejected" | "failed" | null>(null);
  const bypass = useRef(false);
  const form = useRef<HTMLFormElement | null>(null);

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

  const release = (id: string) => {
    const target = form.current;
    flushSync(() => {
      setToken(id);
      setOpen(false);
      setBusy(false);
      setPassword("");
    });
    bypass.current = true;
    target?.requestSubmit();
  };

  const pass = (event: FormEvent<HTMLFormElement>): boolean => {
    if (bypass.current) {
      bypass.current = false;
      return true;
    }
    /* Known to need nothing: straight through, as before V-81. */
    if (status && !status.needed) return true;
    event.preventDefault();
    form.current = event.currentTarget;
    void (async () => {
      const fresh = status ?? (await stepUpStatus().catch(() => null));
      if (fresh) setStatus(fresh);
      if (fresh && !fresh.needed) {
        release("");
        return;
      }
      setError(null);
      setMode(sensor && fresh ? "sensor" : "password");
      setOpen(true);
    })();
    return false;
  };

  const proveWithSensor = async () => {
    if (!status) return;
    setBusy(true);
    setError(null);
    const begun = await beginMoneyConfirm().catch(() => ({ error: "failed" as const }));
    if ("error" in begun) {
      setBusy(false);
      setError("failed");
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

  const proveWithPassword = async () => {
    setBusy(true);
    setError(null);
    const done = await confirmWithPassword(password).catch(() => ({ error: "failed" as const }));
    if ("error" in done) {
      setBusy(false);
      setError(done.error);
      return;
    }
    release(done.stepUp);
  };

  const sheet = (
    <Sheet open={open} onOpenChange={(next) => !busy && setOpen(next)} title={copy.confirmTitle} detents={[0.6]}>
      <div className="space-y-row" data-testid="money-step-up">
        <p className="nf-body text-[var(--nf-content-secondary)]">{copy.confirmBody}</p>
        {mode === "sensor" ? (
          <Button type="button" variant="primary" full loading={busy} disabled={busy} onClick={() => void proveWithSensor()}>
            {copy.confirm}
          </Button>
        ) : (
          <>
            <TextField
              label={copy.passwordLabel}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button
              type="button"
              variant="primary"
              full
              loading={busy}
              disabled={busy || password.length === 0}
              onClick={() => void proveWithPassword()}
            >
              {copy.passwordConfirm}
            </Button>
          </>
        )}
        {mode === "sensor" && (
          <Button type="button" variant="ghost" full disabled={busy} onClick={() => setMode("password")}>
            {copy.usePassword}
          </Button>
        )}
        <Button type="button" variant="ghost" full disabled={busy} onClick={() => setOpen(false)}>
          {copy.cancel}
        </Button>
        {error && (
          <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
            {error === "rejected" ? copy.rejected : copy.failed}
          </p>
        )}
      </div>
    </Sheet>
  );

  return { pass, token, sheet };
}
