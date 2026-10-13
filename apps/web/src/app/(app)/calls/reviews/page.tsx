import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { reviewCallsOn } from "@/lib/calls/flags";
import { myReviewCalls } from "@/lib/calls/review-actions";
import { subjectStatusWords } from "@/lib/calls/reviews";
import { lagosWords } from "@/lib/calls/screen";
import "@/app/css/calls.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.calls.review.listTitle, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** /calls/reviews: every review call invitation about the reader's cases (last 180 days). */
export default async function ReviewInvitationsPage() {
  const t = getDictionary(await getLocale());
  const c = t.calls;
  const on = await reviewCallsOn();
  const reviews = on ? await myReviewCalls() : null;
  const list = reviews?.ok ? reviews.data : [];

  return (
    <div className="mx-auto grid max-w-2xl gap-md px-gutter">
      <PageHeader title={c.review.listTitle} fallback="/messages" />
      {!on ? (
        <div className="nf-review-call__card text-center">
          <p className="font-semibold">{c.notAvailable.reviewTitle}</p>
          <p className="nf-call__note mx-auto">{c.notAvailable.reviewBody}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="nf-review-call__card text-center">
          <p className="font-semibold">{c.review.listEmpty}</p>
          <p className="nf-call__note mx-auto">{c.review.listEmptyBody}</p>
        </div>
      ) : (
        <ul className="grid gap-xs">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/calls/reviews/${r.id}`} className="nf-call-row" style={{ width: "100%" }}>
                <span className="nf-call-row__glyph" aria-hidden="true">
                  <UiIcon name={r.kind === "VIDEO" ? "video" : "phone"} size={20} filled />
                </span>
                <span className="nf-call-row__text">
                  <span className="nf-call-row__title">{r.caseWords || c.staff.caseKinds[r.caseKind]}</span>
                  <span className="nf-call-row__meta">
                    {[subjectStatusWords(r.status), r.scheduledFor ? lagosWords(r.scheduledFor) : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <UiIcon name="chevron-right" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
