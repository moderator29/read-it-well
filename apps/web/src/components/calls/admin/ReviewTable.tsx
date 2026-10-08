import Link from "next/link";
import "@/app/css/calls.css";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { lagosWords } from "@/lib/calls/screen";
import type { StaffReview } from "@/lib/calls/types";
import type { CallsCopy } from "../views";

/**
 * The staff list of review calls: case, status, time (Lagos), outcome, and
 * the purpose under them. A list of rows rather than a table, so it reads on
 * a phone as well as on the console's wide desk.
 */
export function ReviewTable({ reviews, copy }: { reviews: StaffReview[]; copy: CallsCopy }) {
  const s = copy.staff;
  if (reviews.length === 0) {
    return (
      <div className="nf-review-call__card" data-testid="review-calls-empty">
        <p className="font-semibold">{s.empty}</p>
        <p className="nf-call__note">{s.emptyBody}</p>
      </div>
    );
  }
  return (
    <ul className="nf-review-call__list" aria-label={s.title}>
      {reviews.map((r) => (
        <li key={r.id} data-testid="review-calls-row">
          <Link className="nf-review-call__item" href={`/admin/review-calls/${r.id}`}>
            <span className="nf-call-row__glyph" aria-hidden="true">
              <UiIcon name={r.kind === "VIDEO" ? "video" : "phone"} size={20} filled />
            </span>
            <span className="nf-review-call__item-text">
              <span className="nf-review-call__item-head">
                <strong>{s.caseKinds[r.caseKind]}</strong>
                <span className="nf-review-call__status" data-status={r.status}>
                  {r.outcome ? s.outcomes[r.outcome] : s.statuses[r.status]}
                </span>
              </span>
              <span className="nf-review-call__item-purpose">{r.purpose}</span>
              <span className="nf-call-row__meta">
                {r.scheduledFor ? `${lagosWords(r.scheduledFor)} (${copy.review.lagosTime})` : copy.review.noTimeYet}
              </span>
            </span>
            <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
