"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { reviewListing } from "@/lib/admin/actions";

type Decision = "approve" | "publish" | "request_changes" | "reject";

/**
 * The action bar under the listing, C1D98B3C panel 2: a reason field and
 * Approve, Ask for more and Reject.
 *
 * Every button calls the existing `reviewListing` server action, unchanged:
 * it re-checks the admin role, validates, moves the listing's status through
 * the admin's own RLS-bound client, tells the lister in the app and by email
 * through `announce`, and appends the `listing.review` row to the audit log.
 * Nothing here is optimistic; the bar waits for the server's answer.
 *
 * WHAT THE RENDER DOES NOT DRAW AND THIS KEEPS. Approve and publish are two
 * separate acts (approve passes the checklist; publish puts the listing in
 * public search), so once a listing is approved the first button reads
 * Publish. Ask for more sends the lister the reason word for word, so it stays
 * disabled until a reason is written, which the server also refuses without.
 * Reject is the one decision a lister cannot undo by editing, so it asks to
 * be pressed a second time within a few seconds.
 *
 * After a decision the next listing in the reviewer's queue loads, or the
 * queue itself when this was the last one.
 */
export function ReviewActionBar({
  listingId,
  status,
  nextHref,
  queueHref,
}: {
  listingId: string;
  status: string;
  nextHref: string | null;
  queueHref: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const disarm = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (disarm.current) clearTimeout(disarm.current);
    },
    [],
  );

  const approving: Decision = status === "APPROVED" ? "publish" : "approve";
  const reason = notes.trim();

  const run = (decision: Decision) => {
    setError(null);
    startTransition(async () => {
      const result = await reviewListing({
        listingId,
        decision,
        ...(reason.length > 0 ? { notes: reason } : {}),
      });
      if (!result.ok) {
        setError(result.fieldErrors?.["notes"] ?? result.error);
        return;
      }
      setDone(
        decision === "approve"
          ? "Approved. The lister has been told."
          : decision === "publish"
            ? "Live in search. The lister has been told."
            : decision === "reject"
              ? "Rejected. The lister has your reason."
              : "Sent back. The lister has your note.",
      );
      setNotes("");
      router.push(nextHref ?? queueHref);
      router.refresh();
    });
  };

  const onReject = () => {
    if (!armed) {
      setArmed(true);
      if (disarm.current) clearTimeout(disarm.current);
      disarm.current = setTimeout(() => setArmed(false), 5000);
      return;
    }
    setArmed(false);
    run("reject");
  };

  return (
    <div className="nf-rv-panel nf-rv-actionbar">
      <label className="sr-only" htmlFor="rv-reason">
        A reason for the lister
      </label>
      <textarea
        id="rv-reason"
        className="nf-rv-field"
        rows={1}
        maxLength={2000}
        value={notes}
        disabled={pending}
        placeholder="Add a reason (optional for Approve, needed to ask for more)"
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className="nf-rv-actionbar__buttons">
        <button
          type="button"
          className="nf-rv-btn nf-rv-btn--approve"
          disabled={pending}
          onClick={() => run(approving)}
        >
          <UiIcon name="verified" size={16} />
          {approving === "publish" ? "Publish" : "Approve"}
        </button>
        <button
          type="button"
          className="nf-rv-btn nf-rv-btn--ask"
          disabled={pending || reason.length === 0}
          title={reason.length === 0 ? "Write what you need from the lister first" : undefined}
          onClick={() => run("request_changes")}
        >
          <UiIcon name="info" size={16} />
          Ask for more
        </button>
        <button
          type="button"
          className="nf-rv-btn nf-rv-btn--reject"
          disabled={pending}
          aria-describedby={armed ? "rv-reject-confirm" : undefined}
          onClick={onReject}
        >
          <UiIcon name="close" size={16} />
          {armed ? "Press again to reject" : "Reject"}
        </button>
      </div>
      <div aria-live="polite">
        {armed ? (
          <p id="rv-reject-confirm" className="nf-rv-msg">
            Rejecting tells the lister it did not pass. Press Reject again to confirm.
          </p>
        ) : null}
        {pending ? <p className="nf-rv-msg">Recording the decision.</p> : null}
        {done ? <p className="nf-rv-msg nf-rv-msg--ok">{done} Loading the next listing.</p> : null}
        {error ? (
          <p className="nf-rv-msg nf-rv-msg--error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
