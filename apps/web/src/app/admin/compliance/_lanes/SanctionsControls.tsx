"use client";

import { useActionState, useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n";
import { approveSanctionsDecision, proposeSanctionsDecision, uploadSanctionsList, type DeskAnswer } from "@/lib/compliance/sanctions/actions";
import type { SanctionsHit } from "@/lib/compliance/sanctions/desk";
import { Button } from "@/components/ui/Button";

type Copy = Dictionary["compliance"]["sanctions"];

/** Load a list file (SCUML items 8, 9). A new version re-screens everyone. */
export function SanctionsUpload({ copy }: { copy: Copy }) {
  const [answer, act, pending] = useActionState<DeskAnswer | null, FormData>(uploadSanctionsList, null);
  const said =
    answer === null
      ? null
      : answer.ok
        ? answer.message === "same"
          ? copy.uploadSame
          : copy.uploadDone.replace("{count}", answer.message.replace("loaded:", ""))
        : copy.uploadFailed;
  return (
    <form action={act} className="mt-group">
      <h3 className="nf-overline">{copy.upload}</h3>
      <p className="nf-caption mt-inline">{copy.uploadHelp}</p>
      <label className="nf-body-sm mt-row block">
        {copy.uploadSource}{" "}
        <select name="source" defaultValue="un" className="nf-admin-select">
          <option value="un">{copy.sourceUn}</option>
          <option value="ng">{copy.sourceNg}</option>
        </select>
      </label>
      <label className="nf-body-sm mt-row block">
        {copy.uploadFile} <input type="file" name="file" accept=".xml,.csv,text/xml,text/csv" required />
      </label>
      <div className="mt-row">
        <Button type="submit" variant="secondary" loading={pending}>
          {copy.uploadGo}
        </Button>
      </div>
      {said && (
        <p className="nf-body-sm mt-row" role={answer?.ok ? "status" : "alert"}>
          {said}
        </p>
      )}
    </form>
  );
}

/** Propose, or approve somebody else's proposal (SCUML item 19). */
export function SanctionsDecision({ copy, hit, me }: { copy: Copy; hit: SanctionsHit; me: string }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (work: () => Promise<DeskAnswer>) =>
    start(async () => {
      setError(null);
      const answer = await work().catch(() => ({ ok: false as const, error: "failed" }));
      if (!answer.ok) setError(copy.decisionFailed);
    });

  if (hit.pending) {
    const decision = hit.pending.decision === "confirm" ? copy.proposeConfirm : copy.proposeClear;
    return (
      <div className="mt-row">
        <p className="nf-body-sm">{copy.proposed.replace("{who}", hit.pending.proposedBy === me ? copy.byYou : copy.byColleague).replace("{decision}", decision)}</p>
        <p className="nf-caption">{hit.pending.note}</p>
        {hit.pending.proposedBy === me ? (
          <p className="nf-caption mt-inline">{copy.ownProposal}</p>
        ) : (
          <div className="mt-inline">
            <Button variant="primary" loading={pending} onClick={() => run(() => approveSanctionsDecision({ decisionId: hit.pending!.id }))}>
              {copy.approve}
            </Button>
          </div>
        )}
        {error && <p className="nf-caption" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-row">
      <textarea className="nf-field w-full resize-y" rows={2} maxLength={2000} placeholder={copy.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-inline flex flex-wrap gap-inline">
        <Button variant="secondary" disabled={pending || note.trim().length < 3} onClick={() => run(() => proposeSanctionsDecision({ hitId: hit.id, decision: "clear", note }))}>
          {copy.proposeClear}
        </Button>
        <Button variant="danger" disabled={pending || note.trim().length < 3} onClick={() => run(() => proposeSanctionsDecision({ hitId: hit.id, decision: "confirm", note }))}>
          {copy.proposeConfirm}
        </Button>
      </div>
      {error && <p className="nf-caption" role="alert">{error}</p>}
    </div>
  );
}
