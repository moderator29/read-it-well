"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatDate, getDictionary, plural, type Locale } from "@vallo/i18n";
import { RowButton, RowValue, SettingsGroup } from "@/components/app/account/rows";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useMoneyStepUp } from "@/components/app/wallet/MoneyStepUp";
import { beginEnrol, finishEnrol, removeMoneyCredential, sendFallbackCode } from "@/lib/security/money-step-up-actions";
import { createPlatformKey, platformLockAvailable } from "@/lib/security/webauthn-client";
import type { MoneyCredentialList } from "@/lib/security/money-step-up";

/**
 * LOCK MONEY WITH THIS PHONE. V-81.
 *
 * The settings half of the lock: enrol this phone's face or fingerprint lock
 * (after the password, so a thief holding an unlocked session cannot add
 * their own finger), see which phones lock money, and remove one (which asks
 * for the same proof as sending money). The list is read as the person
 * through the column grant, so it never carries a key.
 *
 * States: loading is the server render itself; `unreadable` says the list
 * could not be read and that the lock still works; an empty list offers the
 * enrolment; a browser that cannot ask the phone's lock says so and offers
 * nothing it cannot do.
 */
export function MoneyLockGroup({ list, locale }: { list: MoneyCredentialList; locale: Locale }) {
  const copy = getDictionary(locale).platform.moneyLock;
  const router = useRouter();
  const lock = useMoneyStepUp(locale);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [password, setPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    void platformLockAvailable().then((can) => {
      if (live) setSupported(can);
    });
    return () => {
      live = false;
    };
  }, []);

  if (list.state === "signed-out") return null;
  const byCode = list.state === "ok" && list.fallback === "email-code";

  const enrol = () =>
    start(async () => {
      setError(null);
      const proof = byCode ? { code: password.trim() } : { password };
      const begun = await beginEnrol(proof).catch(() => ({ error: "failed" as const }));
      if ("error" in begun) {
        setError(begun.error === "rejected" ? copy.rejected : begun.error === "password_recent" ? copy.passwordRecent : copy.failed);
        return;
      }
      const made = await createPlatformKey({
        challenge: begun.challenge,
        userId: begun.userId,
        email: begun.email,
        rpId: begun.rpId,
        rpName: "Vallo",
        exclude: [],
      });
      if (!made) {
        setError(copy.rejected);
        return;
      }
      const done = await finishEnrol({ challenge: begun.challenge, ...made, label: null }).catch(() => ({
        error: "failed" as const,
      }));
      if ("error" in done) {
        setError(done.error === "rejected" ? copy.rejected : copy.failed);
        return;
      }
      setEnrolling(false);
      setPassword("");
      setNote(copy.settingsDone);
      router.refresh();
    });

  const remove = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = String(new FormData(event.currentTarget).get("id") ?? "");
    start(async () => {
      /* Removing a phone asks for a proof for exactly that. */
      const stepUp = await lock.prove({ kind: "remove_lock", target: id });
      if (stepUp === null) return;
      const done = await removeMoneyCredential({ id, stepUp }).catch(() => ({ error: "failed" as const }));
      if ("error" in done) {
        setError(done.error === "rejected" ? copy.rejected : copy.failed);
        return;
      }
      setNote(copy.settingsRemoved);
      router.refresh();
    });
  };

  const rows = list.state === "ok" ? list.rows : [];
  const groupNote = note ?? error ?? (list.state === "unreadable" ? copy.settingsUnknown : copy.settingsBody);

  return (
    <SettingsGroup label={copy.settingsTitle} note={<span role={error ? "alert" : undefined}>{groupNote}</span>}>
      {rows.length > 0 && (
        <RowValue icon="key" label={copy.settingsTitle} value={copy.settingsEnrolled.replace("{count}", plural(rows.length, copy.phones, locale))} testId="money-lock-count" />
      )}
      {rows.map((row) => (
        <form key={row.id} onSubmit={remove} data-testid="money-lock-phone">
          <input type="hidden" name="id" value={row.id} />
          <RowSubmit
            label={row.label ?? copy.thisPhone}
            sub={`${copy.added.replace("{when}", formatDate(new Date(row.createdAt), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }))} ${copy.settingsRemoveNeedsProof}`}
            action={copy.settingsRemove}
            disabled={pending}
          />
        </form>
      ))}
      {list.state === "ok" && (
        <RowButton
          icon="key"
          label={copy.settingsEnrol}
          sub={supported === false ? copy.settingsUnsupported : copy.settingsPasswordFirst}
          disabled={supported !== true || pending}
          onClick={() => {
            setError(null);
            setNote(null);
            setEnrolling(true);
          }}
          testId="money-lock-enrol"
        />
      )}
      {lock.sheet}
      <Sheet open={enrolling} onOpenChange={(open) => !pending && setEnrolling(open)} title={copy.settingsTitle} detents={[0.6]}>
        <div className="space-y-row">
          <p className="nf-body text-[var(--nf-content-secondary)]">{copy.settingsPasswordFirst}</p>
          {byCode && !codeSent ? (
            <Button
              type="button"
              variant="primary"
              full
              loading={pending}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const sent = await sendFallbackCode().catch(() => ({ error: "failed" as const }));
                  if ("error" in sent) setError(copy.failed);
                  else setCodeSent(true);
                })
              }
            >
              {copy.sendCode}
            </Button>
          ) : (
            <>
              <TextField
                label={byCode ? copy.codeLabel : copy.passwordLabel}
                type={byCode ? "text" : "password"}
                inputMode={byCode ? "numeric" : undefined}
                autoComplete={byCode ? "one-time-code" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button type="button" variant="primary" full loading={pending} disabled={pending || password.trim().length === 0} onClick={enrol}>
                {copy.settingsEnrol}
              </Button>
            </>
          )}
          <Button type="button" variant="ghost" full disabled={pending} onClick={() => setEnrolling(false)}>
            {copy.cancel}
          </Button>
          {error && (
            <p role="alert" className="nf-body-sm text-[var(--nf-state-error)]">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    </SettingsGroup>
  );
}

/** A settings row that submits its own small form. */
function RowSubmit({ label, sub, action, disabled }: { label: string; sub: string; action: string; disabled: boolean }) {
  return (
    <button type="submit" className="nf-srow nf-srow--danger" disabled={disabled}>
      <span className="nf-srow__body">
        <span className="nf-srow__label">{label}</span>
        <span className="nf-srow__sub">{sub}</span>
      </span>
      <span className="nf-srow__value">{action}</span>
    </button>
  );
}
