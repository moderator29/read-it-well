"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { formatDate, plural, type Dictionary, type Locale } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { feedback } from "@/lib/ui/feedback";
import { buildPack, type InspectionPack } from "@/lib/offline/pack";
import { deletePack, forgetCheckin, queueCheckin, readCheckins, readPack, savePack } from "@/lib/offline/pack-store";
import { hexToBytes, matchesCode, secondsLeft, totp } from "@/lib/offline/totp";
import { nameDelegate, prepareHandshake, recordCheckins } from "@/lib/inspections/handshake-actions";

/**
 * THE GATE HANDSHAKE. V-35.
 *
 * One component, two faces, and it works with no signal on either phone.
 *
 * THE ONE WHO SHOWS (the lister, or the delegate they named) sees a six-digit
 * code that changes every 30 seconds. THE ONE WHO CHECKS (the renter) types
 * the code the person at the gate shows them. Both codes come from the same
 * seed, held in each phone's inspection pack (`lib/offline/pack.ts`), and the
 * same clock (`lib/offline/totp.ts`). Nothing is asked of a server at the
 * gate.
 *
 * WHAT A MATCH SAYS, AND WHAT IT DOES NOT. Emerald, a tick and the words
 * "This phone is signed in as Ada Okafor, the person Vallo has showing this
 * inspection". Not "verified": the code proves which account's phone is at
 * the gate, and the verification ladder is a separate fact that lives on the
 * listing. A mismatch, or no code at all, is cyan with a stop glyph and the
 * one sentence that matters: do not pay anybody anything. Colour is never the
 * only signal; every state has a glyph and words.
 *
 * WITH SIGNAL, the pack is refreshed from `inspection_handshake` and saved.
 * WITHOUT, it is read from IndexedDB. What happened at the gate is queued
 * on the phone and handed over by `recordCheckins` the next time there is
 * signal, here or on the offline page.
 *
 * `live` is false on the offline page, which has no server to ask and is
 * handed the pack directly.
 */

type Copy = Dictionary["platform"]["gate"];

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; pack: InspectionPack }
  | { kind: "none"; reason: "notReady" | "expired" | "noPack" | "failed" };

type Verdict = null | "match" | "mismatch" | "skipped";

function online(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

/** Hand the queued check-ins over, if there is signal. Never throws. */
export async function flushCheckins(): Promise<void> {
  if (!online()) return;
  try {
    const queued = await readCheckins();
    if (queued.length === 0) return;
    const { settled } = await recordCheckins(queued);
    for (const checkin of settled) await forgetCheckin(checkin);
  } catch {
    /* Kept for next time. */
  }
}

function dayOf(iso: string, locale: Locale): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return "";
  return formatDate(at, locale, { weekday: "long", timeZone: "Africa/Lagos" });
}

export function GateHandshake({
  inspectionId,
  listingTitle,
  locale,
  copy,
  live = true,
  initialPack = null,
}: {
  inspectionId: string;
  listingTitle: string | null;
  locale: Locale;
  copy: Copy;
  live?: boolean;
  initialPack?: InspectionPack | null;
}) {
  const [phase, setPhase] = useState<Phase>(
    initialPack ? { kind: "ready", pack: initialPack } : { kind: "loading" },
  );

  const load = useCallback(async () => {
    const now = Date.now();
    const stored = await readPack(inspectionId, now);
    if (!live || !online()) {
      setPhase(stored ? { kind: "ready", pack: stored } : { kind: "none", reason: "noPack" });
      return;
    }
    const answer = await prepareHandshake(inspectionId);
    if (answer.state === "ok") {
      const pack = buildPack(answer.pack, listingTitle, Date.now());
      await savePack(pack);
      setPhase({ kind: "ready", pack });
      return;
    }
    if (answer.state === "expired" || answer.state === "not_found") {
      await deletePack(inspectionId);
      setPhase({ kind: "none", reason: answer.state === "expired" ? "expired" : "noPack" });
      return;
    }
    if (answer.state === "not_ready") {
      await deletePack(inspectionId);
      setPhase({ kind: "none", reason: "notReady" });
      return;
    }
    /* The server could not answer: a pack already on the phone still works. */
    setPhase(stored ? { kind: "ready", pack: stored } : { kind: "none", reason: "failed" });
  }, [inspectionId, listingTitle, live]);

  useEffect(() => {
    if (initialPack) return;
    /* Every state update in `load` follows an await; the microtask makes
       that visible to the effect rule as well as true. */
    void Promise.resolve().then(load);
  }, [initialPack, load]);

  useEffect(() => {
    void flushCheckins();
    const onOnline = () => void flushCheckins();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <section className="nf-panel nf-panel--card block p-card" aria-label={copy.title} data-testid="gate-handshake">
      <p className="nf-overline">{copy.title}</p>
      {phase.kind === "loading" && (
        <p className="nf-body-sm mt-row text-content-2" role="status">
          {copy.loading}
        </p>
      )}
      {phase.kind === "none" && (
        <p className="nf-body-sm mt-row text-content-2" data-testid="gate-none">
          {phase.reason === "notReady"
            ? copy.notReady
            : phase.reason === "expired"
              ? copy.expired
              : phase.reason === "failed"
                ? copy.failed
                : copy.noPack}
        </p>
      )}
      {phase.kind === "ready" && (
        <>
          <p className="nf-caption mt-row flex items-center gap-inline-tight text-content-2" data-testid="gate-ready">
            <UiIcon name="bolt" size="xs" />
            {copy.ready.replace("{day}", dayOf(phase.pack.slotAt, locale))}
          </p>
          {phase.pack.role === "shower" ? (
            <ShowCode pack={phase.pack} copy={copy} locale={locale} />
          ) : (
            <CheckCode pack={phase.pack} copy={copy} />
          )}
          {live && phase.pack.role === "shower" && phase.pack.canNameDelegate && (
            <DelegateForm inspectionId={inspectionId} copy={copy} onChanged={load} />
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- the shower */

function ShowCode({ pack, copy, locale }: { pack: InspectionPack; copy: Copy; locale: Locale }) {
  const [code, setCode] = useState<string | null>(null);
  const [left, setLeft] = useState<number>(30);

  useEffect(() => {
    const key = hexToBytes(pack.seed);
    if (!key) return;
    let cancelled = false;
    const tick = async () => {
      const now = Date.now();
      const next = await totp(key, now);
      if (cancelled) return;
      setCode(next);
      setLeft(secondsLeft(now));
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 1000);
    /* Shown is recorded once per opening, queued for signal. */
    void queueCheckin({ inspectionId: pack.inspectionId, result: "shown", observedAt: new Date().toISOString() });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pack.seed, pack.inspectionId]);

  return (
    <div className="mt-group">
      <p className="nf-body font-semibold text-content">{copy.showHeading}</p>
      <p className="nf-body-sm mt-row text-content-2">{copy.showBody}</p>
      <p
        className="nf-h1 mt-group text-center font-semibold tabular-nums tracking-[0.2em] text-content"
        aria-live="polite"
        data-testid="gate-code"
      >
        {code ? `${code.slice(0, 3)} ${code.slice(3)}` : "--- ---"}
      </p>
      <p className="nf-caption mt-row text-center text-muted">{plural(left, copy.secondsLeft, locale)}</p>
      {pack.isDelegate && pack.principalName && (
        <p className="nf-caption mt-row text-center text-content-2">
          {copy.showingFor.replace("{principal}", pack.principalName)}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ the checker */

function CheckCode({ pack, copy }: { pack: InspectionPack; copy: Copy }) {
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [checking, startChecking] = useTransition();

  const record = (result: "match" | "mismatch" | "skipped") => {
    void queueCheckin({ inspectionId: pack.inspectionId, result, observedAt: new Date().toISOString() }).then(
      () => flushCheckins(),
    );
  };

  const check = () =>
    startChecking(async () => {
      const key = hexToBytes(pack.seed);
      const ok = key ? await matchesCode(key, typed, Date.now()) : false;
      setVerdict(ok ? "match" : "mismatch");
      feedback(ok ? "success" : "error");
      record(ok ? "match" : "mismatch");
    });

  const name = pack.shownByName ?? copy.unnamed;

  if (verdict === "match") {
    return (
      <div className="mt-group flex items-start gap-inline" role="status" data-testid="gate-match">
        <IconPlate size="md" tone="success">
          <UiIcon name="verified" size={ICON_PLATE_GLYPH.md} />
        </IconPlate>
        <div className="min-w-0">
          <p className="nf-body font-semibold text-content">{copy.matchTitle}</p>
          <p className="nf-body-sm mt-row text-content-2">
            {pack.isDelegate && pack.principalName
              ? copy.matchDelegate.replaceAll("{name}", name).replace("{principal}", pack.principalName)
              : copy.matchBody.replace("{name}", name)}
          </p>
          <p className="nf-caption mt-row text-muted">{copy.recorded}</p>
        </div>
      </div>
    );
  }

  if (verdict === "mismatch" || verdict === "skipped") {
    return (
      <div className="mt-group" role="alert" data-testid="gate-warning">
        <div className="flex items-start gap-inline">
          <IconPlate size="md" tone="pending">
            <UiIcon name="shield-stop" size={ICON_PLATE_GLYPH.md} />
          </IconPlate>
          <div className="min-w-0">
            {verdict === "mismatch" && <p className="nf-body font-semibold text-content">{copy.mismatchTitle}</p>}
            <p className="nf-body mt-row font-semibold text-content">{copy.warning}</p>
            <p className="nf-caption mt-row text-muted">{copy.recorded}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          full
          className="mt-group"
          onClick={() => {
            setTyped("");
            setVerdict(null);
          }}
        >
          {copy.tryAgain}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-group">
      <p className="nf-body font-semibold text-content">{copy.checkHeading}</p>
      <p className="nf-body-sm mt-row text-content-2">{copy.checkBody}</p>
      <TextField
        className="mt-group"
        label={copy.codeLabel}
        id={`gate-${pack.inspectionId}`}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        value={typed}
        onChange={(event) => setTyped(event.target.value.replace(/[^\d\s]/g, ""))}
        inputClassName="text-center tabular-nums tracking-[0.2em]"
        data-testid="gate-input"
      />
      <Button
        variant="primary"
        full
        className="mt-row"
        disabled={checking || typed.replace(/\s/g, "").length !== 6}
        onClick={check}
        data-testid="gate-check"
      >
        {copy.check}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        full
        className="mt-row"
        onClick={() => {
          setVerdict("skipped");
          feedback("warning");
          record("skipped");
        }}
        data-testid="gate-no-code"
      >
        {copy.noCode}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------ naming a delegate */

function DelegateForm({
  inspectionId,
  copy,
  onChanged,
}: {
  inspectionId: string;
  copy: Copy;
  onChanged: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ tone: "done" | "problem"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (value: string) =>
    startTransition(async () => {
      const answer = await nameDelegate({ inspectionId, email: value });
      if (answer.state === "ok") {
        setMessage({ tone: "done", text: copy.delegateNamed.replace("{name}", answer.name ?? value) });
        setEmail("");
        await onChanged();
      } else if (answer.state === "cleared") {
        setMessage({ tone: "done", text: copy.delegateCleared });
        await onChanged();
      } else {
        setMessage({
          tone: "problem",
          text:
            answer.state === "not_eligible"
              ? copy.delegateNotEligible
              : answer.state === "closed"
                ? copy.delegateClosed
                : copy.delegateFailed,
        });
      }
    });

  return (
    <div className="mt-section border-t border-[var(--nf-border-subtle)] pt-group">
      <p className="nf-body font-semibold text-content">{copy.delegateHeading}</p>
      <p className="nf-body-sm mt-row text-content-2">{copy.delegateBody}</p>
      <TextField
        className="mt-group"
        label={copy.delegateLabel}
        id={`delegate-${inspectionId}`}
        type="email"
        autoComplete="off"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      {message && (
        <p
          role="status"
          className={`nf-body-sm mt-row ${message.tone === "problem" ? "text-danger" : "text-content"}`}
        >
          {message.text}
        </p>
      )}
      <Button
        variant="secondary"
        size="sm"
        full
        className="mt-row"
        disabled={pending || email.trim().length === 0}
        onClick={() => submit(email.trim())}
      >
        {copy.delegateSave}
      </Button>
      <Button variant="ghost" size="sm" full className="mt-row" disabled={pending} onClick={() => submit("")}>
        {copy.delegateClear}
      </Button>
    </div>
  );
}
