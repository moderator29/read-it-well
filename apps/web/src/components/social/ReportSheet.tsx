"use client";

import { useRef, useState, useTransition } from "react";
import { PostGlyph } from "./feed/PostGlyph";
import { useOverlay } from "@/lib/ui/use-overlay";
import { REPORT_REASON_LABEL, type ReportReason } from "@/lib/social/posts-schema";
import type { ActionResult } from "@/lib/actions/envelope";

/**
 * Reporting something, with a reason.
 *
 * Before this existed, both report paths in the product sent `reason: "OTHER"`
 * the instant somebody chose Report from a menu. That is two separate defects
 * wearing one coat: a queue where every item says "Something else" cannot be
 * triaged, and a destructive-feeling action that fires on the first tap with no
 * way back is a control people learn not to touch.
 *
 * So: a full page rather than a partial sheet, which is the house rule and also
 * the right shape, because choosing why is the whole job and it deserves the
 * screen. One reason, chosen deliberately. An optional sentence, because the
 * category is rarely the whole story. And a confirmation that says what happens
 * next, including the part people actually worry about, which is whether the
 * person being reported gets told.
 *
 * The sheet knows nothing about what it is reporting. It is handed a `submit`
 * that closes over the target, so the same component serves a post, a profile
 * and whatever the next reportable thing turns out to be.
 */

export function ReportSheet({
  title,
  subject,
  reasons,
  submit,
  onClose,
}: {
  /** "Report this post", "Report @tolu". */
  title: string;
  /** The one line naming exactly what is being reported. */
  subject: string;
  /** Only the reasons that can actually apply to this kind of thing. */
  reasons: readonly ReportReason[];
  submit: (input: { reason: ReportReason; detail: string }) => Promise<ActionResult<unknown>>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  /* Escape closes, focus starts inside, the page behind does not scroll, Tab
     stays in and focus goes home on close. All five from the one hook.

     This sheet opens FROM the action sheet, which is the case the hand-rolled
     version got wrong twice over: its bare overflow flag captured "hidden"
     from the sheet underneath and restored that on close, and nothing trapped
     Tab, so a keyboard could leave a report form mid-sentence and land in the
     feed it was reporting. */
  useOverlay({ open: true, onClose, panelRef });

  const send = () => {
    if (!reason) return;
    setError(null);
    startTransition(async () => {
      const result = await submit({ reason, detail: detail.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  };

  return (
    <div className="nf-social-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div ref={panelRef} className="nf-social-sheet__panel">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="nf-h3 text-[1.15rem]">{sent ? "Thank you" : title}</h2>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              {subject}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="nf-post__act shrink-0"
          >
            <PostGlyph name="close" size={20} />
          </button>
        </header>

        {sent ? (
          <>
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Somebody will read this. We never tell the person who reported
              them, and we do not tell them what was said about them either.
            </p>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              If you would rather not see them at all in the meantime, mute or
              block them from the same menu. Neither of those tells them
              anything.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="nf-btn nf-btn--primary mt-6 w-full"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <fieldset>
              <legend className="nf-overline mb-2.5">What is wrong</legend>
              <div className="flex flex-col gap-2">
                {reasons.map((key) => (
                  <label key={key} className="nf-social-reason">
                    <input
                      type="radio"
                      name="nf-report-reason"
                      value={key}
                      checked={reason === key}
                      onChange={() => setReason(key)}
                    />
                    <span>{REPORT_REASON_LABEL[key]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block">
              <span className="nf-overline">Anything else, if it helps</span>
              <textarea
                className="nf-field mt-2 min-h-[88px] w-full resize-y text-[0.9375rem] leading-[1.5]"
                value={detail}
                maxLength={600}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="Optional. A sentence is plenty."
              />
            </label>

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-3 py-2 text-sm leading-relaxed text-[var(--nf-content-primary)]"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={send}
                disabled={!reason || pending}
                className="nf-btn nf-btn--primary flex-1"
              >
                {pending ? "Sending" : "Send report"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="nf-btn nf-btn--ghost flex-1"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
