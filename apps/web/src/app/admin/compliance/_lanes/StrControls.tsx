"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n";
import {
  approveStr,
  decideStr,
  holdStrSubject,
  linkStr,
  releaseStrHold,
  approveStrRelease,
  openStrCase,
  recordStrFiling,
} from "@/lib/admin/str-actions";
import {
  STR_LINK_KINDS,
  STR_SOURCES,
  lagosLocalToIso,
  lagosTime,
  type StrCase,
  type StrSource,
} from "@/lib/admin/str";

/**
 * SCUML item 6: the STR lane's controls. Every button calls a server action
 * that calls a definer function; the database enforces who may do what.
 * Staff only.
 */

type Copy = Dictionary["complianceStr"];
type Said = { ok: boolean; text: string } | null;

function Message({ said }: { said: Said }) {
  if (!said || !said.text) return null;
  return (
    <p
      role={said.ok ? "status" : "alert"}
      className={`nf-body-sm mt-inline ${
        said.ok
          ? "text-[var(--nf-content-primary)]"
          : "text-[var(--nf-state-error)]"
      }`}
    >
      {said.text}
    </p>
  );
}

const field = "nf-field w-full";
const label = "nf-body-sm text-[var(--nf-content-secondary)]";

export function StrOpenForm({
  copy,
  prefill,
}: {
  copy: Copy;
  prefill: { from: StrSource; id: string; subject: string };
}) {
  const [from, setFrom] = useState<StrSource>(prefill.from);
  const [sourceId, setSourceId] = useState(prefill.id);
  const [subject, setSubject] = useState(prefill.subject);
  const [grounds, setGrounds] = useState("");
  const [said, setSaid] = useState<Said>(null);
  const [pending, start] = useTransition();

  function submit() {
    setSaid(null);
    start(async () => {
      const result = await openStrCase({
        sourceKind: from,
        sourceId,
        subjectId: subject,
        grounds,
      });
      if (!result.ok) return setSaid({ ok: false, text: result.error });
      const due =
        (result.data.data as { due_at?: string } | null)?.due_at ?? "";
      setSaid({ ok: true, text: copy.opened.replace("{due}", lagosTime(due)) });
      setGrounds("");
    });
  }

  return (
    <form
      className="grid gap-row"
      data-testid="str-open"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="grid gap-inline-tight">
        <span className={label}>{copy.sourceKind}</span>
        <select
          className={field}
          value={from}
          onChange={(e) => setFrom(e.target.value as StrSource)}
        >
          {STR_SOURCES.map((s) => (
            <option key={s} value={s}>
              {copy.sources[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-inline-tight">
        <span className={label}>{copy.sourceId}</span>
        <input
          className={field}
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          required
          maxLength={200}
        />
      </label>
      {from !== "person" && (
        <label className="grid gap-inline-tight">
          <span className={label}>{copy.subject}</span>
          <input
            className={field}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={36}
          />
        </label>
      )}
      <label className="grid gap-inline-tight">
        <span className={label}>{copy.grounds}</span>
        <textarea
          className={`${field} min-h-[7rem]`}
          value={grounds}
          onChange={(e) => setGrounds(e.target.value)}
          required
          minLength={20}
          maxLength={8000}
        />
        <span className="nf-caption">{copy.groundsHint}</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="nf-btn nf-btn--primary w-full min-h-[44px]"
      >
        {pending ? copy.opening : copy.open}
      </button>
      <Message said={said} />
    </form>
  );
}

export function StrCaseControls({ copy, c }: { copy: Copy; c: StrCase }) {
  const [said, setSaid] = useState<Said>(null);
  const [pending, start] = useTransition();
  const [reasons, setReasons] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [filedAt, setFiledAt] = useState("");
  const [linkKind, setLinkKind] =
    useState<(typeof STR_LINK_KINDS)[number]>("transaction");
  const [linkRef, setLinkRef] = useState("");
  const [releaseNote, setReleaseNote] = useState("");

  function run(
    action: () => Promise<
      { ok: true; data: { text: string } } | { ok: false; error: string }
    >
  ) {
    setSaid(null);
    start(async () => {
      const result = await action();
      setSaid(
        result.ok
          ? { ok: true, text: result.data.text }
          : { ok: false, text: result.error }
      );
    });
  }

  return (
    <div className="mt-row grid gap-row">
      {c.state === "open" && (
        <div className="grid gap-inline" data-testid="str-decide">
          <label className="grid gap-inline-tight">
            <span className={label}>{copy.reasons}</span>
            <textarea
              className={`${field} min-h-[5rem]`}
              value={reasons}
              onChange={(e) => setReasons(e.target.value)}
              maxLength={8000}
            />
            <span className="nf-caption">{copy.reasonsHint}</span>
          </label>
          <div className="grid gap-inline sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              className="nf-btn nf-btn--danger min-h-[44px]"
              onClick={() =>
                run(() =>
                  decideStr({ caseId: c.id, decision: "file", reasons })
                )
              }
            >
              {copy.decisionFile}
            </button>
            <button
              type="button"
              disabled={pending}
              className="nf-btn nf-btn--secondary min-h-[44px]"
              onClick={() =>
                run(() =>
                  decideStr({ caseId: c.id, decision: "no_file", reasons })
                )
              }
            >
              {copy.decisionNoFile}
            </button>
          </div>
        </div>
      )}

      {c.state === "awaiting_approval" && c.decision && (
        <div className="grid gap-inline" data-testid="str-approve">
          <p className="nf-caption">{copy.secondPerson}</p>
          <label className="grid gap-inline-tight">
            <span className={label}>{copy.approveNote}</span>
            <input
              className={field}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={4000}
            />
          </label>
          <div className="grid gap-inline sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              className="nf-btn nf-btn--primary min-h-[44px]"
              onClick={() =>
                run(() =>
                  approveStr({
                    decisionId: c.decision!.id,
                    approve: true,
                    note,
                  })
                )
              }
            >
              {copy.approve}
            </button>
            <button
              type="button"
              disabled={pending}
              className="nf-btn nf-btn--secondary min-h-[44px]"
              onClick={() =>
                run(() =>
                  approveStr({
                    decisionId: c.decision!.id,
                    approve: false,
                    note,
                  })
                )
              }
            >
              {copy.reject}
            </button>
          </div>
        </div>
      )}

      {c.state === "to_file" && (
        <div className="grid gap-inline" data-testid="str-record">
          <label className="grid gap-inline-tight">
            <span className={label}>{copy.goaml}</span>
            <input
              className={field}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="grid gap-inline-tight">
            <span className={label}>{copy.filedAt}</span>
            <input
              className={field}
              type="datetime-local"
              value={filedAt}
              onChange={(e) => setFiledAt(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={pending || !lagosLocalToIso(filedAt)}
            className="nf-btn nf-btn--primary min-h-[44px]"
            onClick={() =>
              run(() =>
                recordStrFiling({
                  caseId: c.id,
                  reference,
                  filedAt: lagosLocalToIso(filedAt) ?? "",
                })
              )
            }
          >
            {copy.recordFiling}
          </button>
        </div>
      )}

      {(c.state === "open" ||
        c.state === "awaiting_approval" ||
        c.state === "to_file") && (
        <div
          className="grid gap-inline sm:grid-cols-[10rem_1fr_auto] sm:items-end"
          data-testid="str-link"
        >
          <label className="grid gap-inline-tight">
            <span className={label}>{copy.linkKind}</span>
            <select
              className={field}
              value={linkKind}
              onChange={(e) => setLinkKind(e.target.value as typeof linkKind)}
            >
              {STR_LINK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {copy.linkKinds[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-inline-tight">
            <span className={label}>{copy.linkRef}</span>
            <input
              className={field}
              value={linkRef}
              onChange={(e) => setLinkRef(e.target.value)}
              maxLength={200}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            className="nf-btn nf-btn--secondary min-h-[44px]"
            onClick={() =>
              run(() => linkStr({ caseId: c.id, kind: linkKind, ref: linkRef }))
            }
          >
            {copy.link}
          </button>
        </div>
      )}

      {c.subjectId && (
        <div
          className="grid gap-inline"
          data-testid="str-hold"
        >
          {c.state !== "not_filed" && (
            <>
              <button
                type="button"
                disabled={pending}
                className="nf-btn nf-btn--danger min-h-[44px]"
                onClick={() =>
                  run(() => holdStrSubject({ caseId: c.id }))
                }
              >
                {copy.hold}
              </button>
              <p className="nf-caption">{copy.holdHint}</p>
            </>
          )}
          <label className="grid gap-inline-tight">
            <span className={label}>{copy.releaseNote}</span>
            <input
              className={field}
              value={releaseNote}
              onChange={(e) => setReleaseNote(e.target.value)}
              maxLength={2000}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            className="nf-btn nf-btn--secondary min-h-[44px]"
            onClick={() =>
              run(() => releaseStrHold({ caseId: c.id, note: releaseNote }))
            }
          >
            {copy.release}
          </button>
        </div>
      )}

      {pending && (
        <p className="nf-caption" role="status">
          {copy.working}
        </p>
      )}
      <Message said={said} />
    </div>
  );
}

/** SCUML items 6 and 19: the second person on a hold release. */
export function StrApproveRelease({ copy, releaseId }: { copy: Copy; releaseId: string }) {
  const [said, setSaid] = useState<Said>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-row">
      <button
        type="button"
        disabled={pending}
        className="nf-btn nf-btn--secondary min-h-[44px] w-full"
        onClick={() =>
          start(async () => {
            const result = await approveStrRelease({ releaseId });
            setSaid(result.ok ? { ok: true, text: result.data.text } : { ok: false, text: result.error });
          })
        }
      >
        {pending ? copy.working : copy.approveRelease}
      </button>
      <Message said={said} />
    </div>
  );
}
